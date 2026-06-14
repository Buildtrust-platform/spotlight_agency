// Central configuration for the agentic agency.
//
// Everything tunable lives here so the runtime, agents, and tools read from one
// place. Defaults are chosen for "scaffold-first": no outward-facing action
// fires unless SAFE_MODE is explicitly turned off.

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Model + reasoning. Opus 4.8 with adaptive thinking; effort defaults to "high"
// for agentic work (see Anthropic guidance — xhigh/high for agentic tasks).
export const MODEL = process.env.AGENCY_MODEL || "claude-opus-4-8";
export const EFFORT = process.env.AGENCY_EFFORT || "high"; // low | medium | high | xhigh | max

// Non-streaming create() stays well under SDK HTTP timeouts at 16k.
export const MAX_TOKENS = Number(process.env.AGENCY_MAX_TOKENS || 16000);

// Hard stop on the agentic loop so a misbehaving agent can't spin forever.
export const MAX_TURNS = Number(process.env.AGENCY_MAX_TURNS || 24);

// SAFE_MODE gates every outward-facing ("external") tool. Default ON.
// Set AGENCY_SAFE_MODE=false to actually reach Apollo/Gmail/Mailchimp/etc.
export const SAFE_MODE = process.env.AGENCY_SAFE_MODE !== "false";

// Where deliverables and the approval ledger are written.
export const ARTIFACTS_DIR = process.env.AGENCY_ARTIFACTS_DIR || path.join(ROOT, "artifacts");
export const ACTION_LOG = path.join(ARTIFACTS_DIR, "_action-ledger.jsonl");
