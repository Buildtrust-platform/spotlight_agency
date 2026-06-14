// Ops & Project Management tools.
//
// Writing into Notion / Airtable is outward-facing and gated. Report drafting
// is local.

import { localTool, externalTool } from "./gate.mjs";
import { commonTools } from "./common.mjs";

const createProjectPlan = localTool(
  {
    name: "create_project_plan",
    description:
      "Turn a client engagement into a structured project plan: workstreams, milestones, owners, and a task breakdown with rough estimates. Save it with save_deliverable.",
    input_schema: {
      type: "object",
      properties: {
        client: { type: "string" },
        engagement: { type: "string", description: "What the agency is delivering." },
        deadline: { type: "string" },
      },
      required: ["client", "engagement"],
    },
  },
  (input) => ({ instruction: "Write the plan in your response, then save_deliverable.", spec: input })
);

const syncToWorkspace = externalTool(
  {
    name: "sync_to_workspace",
    description:
      "Push a project plan or task list into the team workspace (Notion database or Airtable base). Outward-facing and gated. Provide the deliverable path to sync.",
    input_schema: {
      type: "object",
      properties: {
        client: { type: "string" },
        destination: { type: "string", enum: ["notion", "airtable"] },
        plan_ref: { type: "string", description: "artifacts path of the plan/tasks to sync." },
      },
      required: ["client", "destination"],
    },
  },
  (input) => ({
    service: input.destination === "notion" ? "Notion" : "Airtable",
    summary: `Create/update ${input.destination} records from ${input.plan_ref || "plan"}`,
    payload: input,
  })
);

const generateStatusReport = localTool(
  {
    name: "generate_status_report",
    description:
      "Generate a client-facing status report summarizing what was produced this cycle, what needs approval, and next steps. Pulls from what the other agents delivered. Save with save_deliverable.",
    input_schema: {
      type: "object",
      properties: {
        client: { type: "string" },
        period: { type: "string", description: "e.g. Week of Jun 9." },
      },
      required: ["client"],
    },
  },
  (input) => ({ instruction: "Write the report in your response, then save_deliverable.", spec: input })
);

export const opsTools = [createProjectPlan, syncToWorkspace, generateStatusReport, ...commonTools];
