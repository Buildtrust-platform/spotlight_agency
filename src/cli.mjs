#!/usr/bin/env node
// CLI entry point: run the agency against a client brief.
//
//   node src/cli.mjs "Launch a DTC oat-milk brand called Moonmilk..."
//   node src/cli.mjs --file brief.txt
//
// Scaffold mode (default) produces real deliverables under artifacts/ and logs
// every outward-facing action to artifacts/_action-ledger.jsonl WITHOUT firing
// it. Set AGENCY_SAFE_MODE=false to go live (requires wiring the adapters).

import fs from "node:fs";
import { runBrief } from "./agency.mjs";
import { SAFE_MODE, MODEL, EFFORT, ARTIFACTS_DIR, ACTION_LOG } from "./config.mjs";

const SAMPLE_BRIEF = `Client: Moonmilk — a new direct-to-consumer barista oat milk.
Goal: launch in 8 weeks to urban specialty-coffee drinkers (25-40), build an email list, and land wholesale meetings with independent cafes.
Budget: lean. Tone: warm, witty, design-forward. We have no brand identity yet.`;

function getBrief(argv) {
  const fileFlag = argv.indexOf("--file");
  if (fileFlag !== -1 && argv[fileFlag + 1]) return fs.readFileSync(argv[fileFlag + 1], "utf8");
  const positional = argv.filter((a) => !a.startsWith("--")).join(" ").trim();
  return positional || SAMPLE_BRIEF;
}

function short(obj) {
  const s = JSON.stringify(obj);
  return s.length > 160 ? s.slice(0, 157) + "..." : s;
}

function onEvent(e) {
  switch (e.type) {
    case "delegate":
      console.log(`\n\x1b[1m\x1b[36m→ Delegating to ${e.team}\x1b[0m`);
      break;
    case "tool":
      console.log(`  \x1b[33m• ${e.agent}: ${e.name}\x1b[0m ${short(e.input)}`);
      break;
    case "error":
      console.log(`  \x1b[31m✗ ${e.agent}: ${e.name} — ${e.message}\x1b[0m`);
      break;
    case "message":
      // Specialist/director narrative — keep it brief in the live log.
      break;
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.error("Set ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN) before running.");
    process.exit(1);
  }

  const brief = getBrief(process.argv.slice(2));
  console.log(`\x1b[1mAgentic Agency\x1b[0m  model=${MODEL} effort=${EFFORT}  mode=${SAFE_MODE ? "SCAFFOLD (no live actions)" : "LIVE"}`);
  console.log(`Brief:\n${brief}\n${"─".repeat(60)}`);

  const t0 = Date.now();
  const { text } = await runBrief(brief, onEvent);
  const secs = ((Date.now() - t0) / 1000).toFixed(0);

  console.log(`\n${"─".repeat(60)}\n\x1b[1mExecutive Summary\x1b[0m (${secs}s)\n`);
  console.log(text);
  console.log(`\nDeliverables → ${ARTIFACTS_DIR}`);
  if (fs.existsSync(ACTION_LOG)) {
    const n = fs.readFileSync(ACTION_LOG, "utf8").trim().split("\n").filter(Boolean).length;
    console.log(`Approval ledger → ${ACTION_LOG} (${n} gated action${n === 1 ? "" : "s"} awaiting review)`);
  }
}

main().catch((err) => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});
