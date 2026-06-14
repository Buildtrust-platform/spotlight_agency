#!/usr/bin/env node
// Self-check: validates that every agent, tool, and the safe-mode gate are
// wired correctly. Runs with NO Anthropic API key and makes NO network calls —
// safe for CI. Exits non-zero on any failure.

import assert from "node:assert";
import { AGENTS, ORCHESTRATOR_SYSTEM } from "./agents.mjs";
import { saveDeliverable } from "./tools/common.mjs";
import { leadGenTools } from "./tools/leadgen.mjs";
import { SAFE_MODE } from "./config.mjs";

let failures = 0;
const ok = (name) => console.log(`  ✓ ${name}`);
function check(name, fn) {
  try { fn(); ok(name); } catch (e) { failures++; console.log(`  ✗ ${name} — ${e.message}`); }
}

console.log("Agents & tools");
for (const [id, a] of Object.entries(AGENTS)) {
  check(`${id} (${a.name}) is well-formed`, () => {
    assert(a.system && a.system.length > 50, "system prompt missing/short");
    assert(Array.isArray(a.tools) && a.tools.length > 0, "no tools");
    for (const t of a.tools) {
      assert(t.definition?.name, "tool missing name");
      assert(t.definition?.description, `${t.definition?.name}: missing description`);
      assert(t.definition?.input_schema?.type === "object", `${t.definition?.name}: bad schema`);
      assert(typeof t.handler === "function", `${t.definition?.name}: no handler`);
    }
  });
}
check("orchestrator system prompt present", () => assert(ORCHESTRATOR_SYSTEM.length > 100));

console.log("\nSafe-mode gate");
check("SAFE_MODE defaults ON", () => assert(SAFE_MODE === true, "expected scaffold default"));
await check_async("external tool simulates (no network) in scaffold mode", async () => {
  const search = leadGenTools.find((t) => t.definition.name === "search_prospects");
  const out = await search.handler({ client: "Verify", titles: ["X"] }, { agent: "verify" });
  assert(out.simulated === true, "external tool should be simulated under SAFE_MODE");
});
await check_async("local tool executes for real", async () => {
  const out = await saveDeliverable.handler(
    { client: "_verify", filename: "ping.md", content: "ok" }, { agent: "verify" });
  assert(out.saved === true, "save_deliverable should write");
});

async function check_async(name, fn) {
  try { await fn(); ok(name); } catch (e) { failures++; console.log(`  ✗ ${name} — ${e.message}`); }
}

console.log(`\n${failures === 0 ? "✓ ALL CHECKS PASSED" : `✗ ${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
