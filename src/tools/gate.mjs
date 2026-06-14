// The safe-mode boundary.
//
// `local` tools run for real (drafting copy, saving deliverables — nothing
// leaves the machine). `external` tools reach a third party (Apollo, Gmail,
// Mailchimp, Canva, Notion, ...). In scaffold mode an external tool never
// fires: it records the intended action to the ledger and returns a simulated
// result so the agent can keep planning. Flip AGENCY_SAFE_MODE=false to run the
// `live` path through the MCP/SDK adapter.

import { SAFE_MODE } from "../config.mjs";
import { recordAction } from "./store.mjs";

/** Define a purely local tool. handler(input, ctx) => string | object. */
export function localTool(definition, handler) {
  return { definition, handler, external: false };
}

/**
 * Define an outward-facing tool.
 *
 * @param definition  Anthropic tool definition ({ name, description, input_schema }).
 * @param plan        (input) => { service, summary, payload } describing the action.
 * @param live        (input, ctx) => result — the real adapter call. Left as a
 *                    documented seam until the user approves going live.
 */
export function externalTool(definition, plan, live) {
  const handler = async (input, ctx) => {
    const intent = plan(input) || {};
    const action = { tool: definition.name, agent: ctx?.agent, ...intent };

    if (SAFE_MODE || typeof live !== "function") {
      recordAction({ ...action, status: "simulated" });
      return {
        simulated: true,
        note: `[scaffold] '${definition.name}' was NOT executed. Intended ${intent.service || "external"} action logged to the approval ledger for review.`,
        intent,
      };
    }

    recordAction({ ...action, status: "executing" });
    const result = await live(input, ctx);
    recordAction({ ...action, status: "executed" });
    return result;
  };
  return { definition, handler, external: true };
}
