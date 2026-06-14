// The orchestrator. Wraps the Managing Director agent, whose single tool is
// `delegate` — handing a self-contained task to a specialist team and returning
// that team's final report back into the director's context.

import { runAgent } from "./runtime.mjs";
import { AGENTS, ORCHESTRATOR_SYSTEM } from "./agents.mjs";

export async function runBrief(brief, onEvent = () => {}) {
  const delegate = {
    definition: {
      name: "delegate",
      description:
        "Delegate a self-contained task to one specialist team and get their finished work back. Include the client name and all context the team needs (they share no memory with other teams or with you beyond what you write here).",
      input_schema: {
        type: "object",
        properties: {
          team: { type: "string", enum: Object.keys(AGENTS) },
          task: { type: "string", description: "The full task and context for this team." },
        },
        required: ["team", "task"],
      },
    },
    handler: async ({ team, task }) => {
      const agent = AGENTS[team];
      if (!agent) return `Error: unknown team '${team}'.`;
      onEvent({ type: "delegate", team: agent.name, task });
      const { text } = await runAgent(agent, task, onEvent);
      return `Report from ${agent.name} team:\n${text}`;
    },
  };

  const director = {
    name: "Managing Director",
    system: ORCHESTRATOR_SYSTEM,
    tools: [delegate],
  };

  const prompt = `New client brief:\n\n${brief}\n\nPlan the engagement, delegate to the relevant teams, and deliver an executive summary.`;
  return runAgent(director, prompt, onEvent);
}
