// The agent runtime: a manual tool-use loop over the Anthropic Messages API.
//
// Manual (rather than the SDK tool runner) is deliberate — it's the loop that
// lets us gate outward-facing tools, log every step, and cap turns. Same model
// throughout, so thinking blocks are pushed back unchanged.

import Anthropic from "@anthropic-ai/sdk";
import { MODEL, EFFORT, MAX_TOKENS, MAX_TURNS } from "./config.mjs";

const client = new Anthropic();

function textOf(content) {
  return content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
}

/**
 * Run one agent to completion.
 * @param agent  { name, system, tools }  tools: [{ definition, handler }]
 * @param prompt the task for this agent
 * @param onEvent observer for streaming progress to the console
 * @returns { text, turns }
 */
export async function runAgent(agent, prompt, onEvent = () => {}) {
  const toolDefs = agent.tools.map((t) => t.definition);
  const byName = Object.fromEntries(agent.tools.map((t) => [t.definition.name, t]));
  const messages = [{ role: "user", content: prompt }];
  let finalText = "";

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: "adaptive" },
      output_config: { effort: EFFORT },
      system: agent.system,
      tools: toolDefs,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    const text = textOf(response.content);
    if (text) {
      finalText = text;
      onEvent({ type: "message", agent: agent.name, text });
    }

    if (response.stop_reason !== "tool_use") break;

    const toolUses = response.content.filter((b) => b.type === "tool_use");
    const results = [];
    for (const tu of toolUses) {
      const tool = byName[tu.name];
      onEvent({ type: "tool", agent: agent.name, name: tu.name, input: tu.input });
      let content;
      try {
        if (!tool) throw new Error(`unknown tool ${tu.name}`);
        const out = await tool.handler(tu.input, { agent: agent.name });
        content = typeof out === "string" ? out : JSON.stringify(out);
      } catch (err) {
        content = `Error: ${err.message}`;
        onEvent({ type: "error", agent: agent.name, name: tu.name, message: err.message });
      }
      results.push({ type: "tool_result", tool_use_id: tu.id, content });
    }
    messages.push({ role: "user", content: results });
  }

  return { text: finalText, turns: messages.length };
}
