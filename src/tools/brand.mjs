// Brand & Creative tools.
//
// Visual generation is outward-facing (Canva / Figma / Higgsfield), so it's
// gated. The brief/spec work is local — the agent reasons and writes specs.

import { localTool, externalTool } from "./gate.mjs";
import { commonTools } from "./common.mjs";

const recordBrandFoundations = localTool(
  {
    name: "record_brand_foundations",
    description:
      "Record the agreed brand foundations (positioning, audience, personality, tone, color/typography direction) as structured data so downstream agents (content, design) stay on-brand. Call once the foundations are decided.",
    input_schema: {
      type: "object",
      properties: {
        client: { type: "string" },
        positioning: { type: "string", description: "One-sentence positioning statement." },
        audience: { type: "string" },
        personality: { type: "array", items: { type: "string" }, description: "3-5 brand personality traits." },
        tone: { type: "string", description: "Voice & tone guidance." },
        visual_direction: { type: "string", description: "Color, type, and imagery direction." },
      },
      required: ["client", "positioning"],
    },
  },
  (input) => ({ recorded: true, foundations: input })
);

const generateVisualAsset = externalTool(
  {
    name: "generate_visual_asset",
    description:
      "Generate a visual asset (logo concept, social graphic, ad creative, key visual, short video) from a design brief. Routes to Canva / Figma / Higgsfield. Provide a complete brief: format, dimensions, copy, brand colors, and mood.",
    input_schema: {
      type: "object",
      properties: {
        client: { type: "string" },
        asset_type: {
          type: "string",
          enum: ["logo", "social_graphic", "ad_creative", "key_visual", "short_video", "audio"],
        },
        brief: { type: "string", description: "Full creative brief for the asset." },
        format: { type: "string", description: "e.g. 1080x1080, 1920x1080, 15s vertical video." },
      },
      required: ["client", "asset_type", "brief"],
    },
  },
  (input) => ({
    // Canva: generate-design; Higgsfield: generate_image/generate_video; Figma: create_new_file
    service: input.asset_type === "short_video" || input.asset_type === "audio" ? "Higgsfield" : "Canva",
    summary: `Generate ${input.asset_type} (${input.format || "default size"}) for ${input.client}`,
    payload: input,
  })
  // live: (input) => callCanvaOrHiggsfield(input)  // <-- wire MCP adapter here when approved
);

export const brandTools = [recordBrandFoundations, generateVisualAsset, ...commonTools];
