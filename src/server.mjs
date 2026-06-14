// Web dashboard server for the agency.
//
// Serves a single-page UI where you enter a client brief, run the agents, and
// watch progress stream in live (Server-Sent Events), then read every
// deliverable rendered in the browser. Runs locally:
//
//   export ANTHROPIC_API_KEY=sk-ant-...
//   npm run dashboard      # then open http://localhost:4000
//
// Separate from app.js (the Mailchimp signup app) — different port, own routes.

import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runBrief } from "./agency.mjs";
import { MODEL, EFFORT, SAFE_MODE, ARTIFACTS_DIR } from "./config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.AGENCY_PORT || 4000);
const app = express();

const SAMPLE_BRIEF = `Client: Moonmilk — a new direct-to-consumer barista oat milk.
Goal: launch in 8 weeks to urban specialty-coffee drinkers (25-40), build an email list, and land wholesale meetings with independent cafes.
Budget: lean. Tone: warm, witty, design-forward. We have no brand identity yet.`;

app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "dashboard.html")));

app.get("/api/config", (_req, res) =>
  res.json({ model: MODEL, effort: EFFORT, safeMode: SAFE_MODE, hasKey: !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) })
);

// Stream a run as Server-Sent Events.
app.get("/api/run", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const brief = (req.query.brief && String(req.query.brief).trim()) || SAMPLE_BRIEF;
  send("start", { model: MODEL, effort: EFFORT, safeMode: SAFE_MODE, brief });

  const before = listDeliverables().map((f) => f.path);
  try {
    const { text } = await runBrief(brief, (e) => send("event", e));
    const after = listDeliverables();
    const fresh = new Set(after.map((f) => f.path).filter((p) => !before.includes(p)));
    send("done", {
      summary: text,
      files: after.map((f) => ({ ...f, isNew: fresh.has(f.path) })),
    });
  } catch (err) {
    send("error", { message: err.message });
  }
  res.end();
});

// Read one deliverable (sandboxed to ARTIFACTS_DIR).
app.get("/api/file", (req, res) => {
  const rel = String(req.query.path || "");
  const full = path.resolve(ARTIFACTS_DIR, rel);
  if (!full.startsWith(path.resolve(ARTIFACTS_DIR))) return res.status(400).send("bad path");
  if (!fs.existsSync(full)) return res.status(404).send("not found");
  res.type("text/plain").send(fs.readFileSync(full, "utf8"));
});

function listDeliverables() {
  if (!fs.existsSync(ARTIFACTS_DIR)) return [];
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        const rel = path.relative(ARTIFACTS_DIR, full);
        out.push({ path: rel, name: entry.name, client: rel.split(path.sep)[0] });
      }
    }
  };
  walk(ARTIFACTS_DIR);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

const server = app.listen(PORT, () => console.log(`Agency dashboard → http://localhost:${PORT}`));
// A full run can take several minutes; disable the 5-min default request timeout
// so the SSE stream isn't cut off mid-run.
server.requestTimeout = 0;
server.keepAliveTimeout = 0;
