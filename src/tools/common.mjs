// Tools shared by every specialist.

import { localTool } from "./gate.mjs";
import { saveArtifact, slug } from "./store.mjs";

export const saveDeliverable = localTool(
  {
    name: "save_deliverable",
    description:
      "Persist a finished deliverable (strategy doc, copy, calendar, brief, report) as a file under the client's artifacts folder. Use Markdown for documents. Call this for anything the client should be able to open and read.",
    input_schema: {
      type: "object",
      properties: {
        client: { type: "string", description: "Client or brand name (used as the folder)." },
        filename: { type: "string", description: "File name including extension, e.g. brand-strategy.md" },
        content: { type: "string", description: "Full file contents." },
      },
      required: ["client", "filename", "content"],
    },
  },
  (input) => {
    const rel = saveArtifact(`${slug(input.client)}/${input.filename}`, input.content);
    return { saved: true, path: rel, bytes: Buffer.byteLength(input.content) };
  }
);

export const commonTools = [saveDeliverable];
