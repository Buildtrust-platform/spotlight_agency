// Lead Gen & Outreach tools.
//
// Prospecting (Apollo) and sending (Gmail / Mailchimp) are outward-facing and
// gated. Drafting sequences is local. The existing Mailchimp signup app in this
// repo is the eventual sink for subscribers captured by these campaigns.

import { localTool, externalTool } from "./gate.mjs";
import { commonTools } from "./common.mjs";

const searchProspects = externalTool(
  {
    name: "search_prospects",
    description:
      "Search for prospects matching an ideal-customer-profile via Apollo.io. Specify titles, industries, company size, and geography. Returns a list of matching people/companies to build a target list from.",
    input_schema: {
      type: "object",
      properties: {
        client: { type: "string" },
        titles: { type: "array", items: { type: "string" } },
        industries: { type: "array", items: { type: "string" } },
        company_size: { type: "string", description: "e.g. 11-50, 51-200" },
        geography: { type: "string" },
        limit: { type: "integer", default: 25 },
      },
      required: ["client", "titles"],
    },
  },
  (input) => ({
    service: "Apollo.io",
    summary: `Search up to ${input.limit || 25} prospects: ${(input.titles || []).join(", ")}`,
    payload: input,
  })
  // live: (input) => apollo.mixed_people_api_search(input)
);

const draftEmailSequence = localTool(
  {
    name: "draft_email_sequence",
    description:
      "Draft a multi-step cold/nurture email sequence (subject + body per step). This is copywriting only — it does not send anything. Save the result with save_deliverable.",
    input_schema: {
      type: "object",
      properties: {
        client: { type: "string" },
        goal: { type: "string", description: "e.g. book a demo, drive newsletter signups." },
        steps: { type: "integer", default: 3 },
        audience: { type: "string" },
      },
      required: ["client", "goal"],
    },
  },
  (input) => ({ drafted: true, instruction: "Write the sequence in your response, then call save_deliverable.", spec: input })
);

const queueOutreach = externalTool(
  {
    name: "queue_outreach",
    description:
      "Queue an approved email sequence to a prospect list via Mailchimp (broadcast) or Gmail (1:1). This SENDS email — it is gated and requires going live. Provide the campaign name, audience, and the deliverable path of the approved copy.",
    input_schema: {
      type: "object",
      properties: {
        client: { type: "string" },
        channel: { type: "string", enum: ["mailchimp", "gmail"] },
        campaign_name: { type: "string" },
        audience_ref: { type: "string", description: "Prospect list or Mailchimp audience id." },
        copy_ref: { type: "string", description: "artifacts path of the approved sequence." },
      },
      required: ["client", "channel", "campaign_name"],
    },
  },
  (input) => ({
    service: input.channel === "mailchimp" ? "Mailchimp" : "Gmail",
    summary: `Queue campaign '${input.campaign_name}' to ${input.audience_ref || "TBD audience"}`,
    payload: input,
  }),
  // Live path (runs only when AGENCY_SAFE_MODE=false). Mailchimp is fully wired
  // and creates a DRAFT campaign — a human still sends it from Mailchimp.
  async (input) => {
    if (input.channel !== "mailchimp") {
      throw new Error(`No live adapter for '${input.channel}' yet — Mailchimp is the wired channel.`);
    }
    const { createDraftCampaign } = await import("./adapters/mailchimp.mjs");
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { ARTIFACTS_DIR } = await import("../config.mjs");
    let body = `Campaign: ${input.campaign_name}`;
    if (input.copy_ref) {
      const full = path.join(ARTIFACTS_DIR, input.copy_ref);
      if (fs.existsSync(full)) body = fs.readFileSync(full, "utf8");
    }
    const html = `<div style="font-family:sans-serif;white-space:pre-wrap">${body
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;
    return createDraftCampaign({
      subject: input.campaign_name,
      title: `${input.client} — ${input.campaign_name}`,
      html,
      audienceId: input.audience_ref,
    });
  }
);

export const leadGenTools = [searchProspects, draftEmailSequence, queueOutreach, ...commonTools];
