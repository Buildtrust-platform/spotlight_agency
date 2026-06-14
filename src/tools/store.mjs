// Shared, safe side effects: writing deliverables to disk and recording any
// outward-facing action to an append-only approval ledger.
//
// These are the only two things the whole system writes to the filesystem.

import fs from "node:fs";
import path from "node:path";
import { ARTIFACTS_DIR, ACTION_LOG, SAFE_MODE } from "../config.mjs";

/** Slug-safe a string for use in a filename. */
export function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "untitled";
}

/** Persist a deliverable under artifacts/. Returns the relative path. */
export function saveArtifact(relPath, content) {
  const full = path.join(ARTIFACTS_DIR, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  return path.relative(ARTIFACTS_DIR, full);
}

/**
 * Record an outward-facing action to the ledger. In scaffold mode this is the
 * record of what *would* have happened; once live, it's an audit trail.
 */
export function recordAction(action) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const entry = { ts: new Date().toISOString(), mode: SAFE_MODE ? "scaffold" : "live", ...action };
  fs.appendFileSync(ACTION_LOG, JSON.stringify(entry) + "\n");
  return entry;
}
