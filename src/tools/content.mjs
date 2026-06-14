// Content & Social tools.
//
// Planning and drafting are local. Publishing/scheduling is outward-facing
// (social platforms via Notion/Airtable-managed calendars or direct) and gated.

import { localTool, externalTool } from "./gate.mjs";
import { commonTools } from "./common.mjs";

const buildContentCalendar = localTool(
  {
    name: "build_content_calendar",
    description:
      "Build a content calendar covering a date range across the given channels. Produce a table of date, channel, theme, format, and a one-line hook per slot. Save it with save_deliverable as Markdown.",
    input_schema: {
      type: "object",
      properties: {
        client: { type: "string" },
        channels: { type: "array", items: { type: "string" }, description: "e.g. LinkedIn, Instagram, Blog, Email." },
        weeks: { type: "integer", default: 4 },
        cadence_per_week: { type: "integer", default: 3 },
        themes: { type: "array", items: { type: "string" } },
      },
      required: ["client", "channels"],
    },
  },
  (input) => ({ instruction: "Lay out the calendar in your response, then save_deliverable.", spec: input })
);

const draftContentPiece = localTool(
  {
    name: "draft_content_piece",
    description:
      "Draft a single content piece (social post, thread, short blog, or ad copy) on-brand and ready for review. Copywriting only; nothing is published.",
    input_schema: {
      type: "object",
      properties: {
        client: { type: "string" },
        channel: { type: "string" },
        format: { type: "string", enum: ["social_post", "thread", "blog", "ad_copy", "newsletter"] },
        topic: { type: "string" },
        cta: { type: "string" },
      },
      required: ["client", "format", "topic"],
    },
  },
  (input) => ({ instruction: "Write the piece in your response, then save_deliverable.", spec: input })
);

const scheduleContent = externalTool(
  {
    name: "schedule_content",
    description:
      "Schedule approved content to publish. This is outward-facing and gated. Provide channel, publish time, and the deliverable path of the approved copy.",
    input_schema: {
      type: "object",
      properties: {
        client: { type: "string" },
        channel: { type: "string" },
        publish_at: { type: "string", description: "ISO timestamp." },
        copy_ref: { type: "string" },
      },
      required: ["client", "channel", "publish_at"],
    },
  },
  (input) => ({
    service: "Scheduler (Notion/Airtable-tracked)",
    summary: `Schedule ${input.channel} post for ${input.publish_at}`,
    payload: input,
  })
);

export const contentTools = [buildContentCalendar, draftContentPiece, scheduleContent, ...commonTools];
