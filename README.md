# Agentic Agency

A standalone, multi-agent application that runs the workflow of a **marketing,
communications, and branding agency**. A client brief goes in; a director agent
plans the engagement and delegates to four specialist agents, each producing
real, client-ready deliverables.

Built on the Anthropic SDK (`claude-opus-4-8`, adaptive thinking) with a manual
tool-use loop so every outward-facing action can be gated.

> **Scaffold-first by design.** Out of the box, nothing leaves the machine. The
> agents draft strategy, copy, calendars, plans, and briefs and save them under
> `artifacts/`. Any action that would touch the outside world (send email, pull
> real prospects, publish a post, write to a workspace) is **simulated and
> logged for approval** instead of executed. You flip it to live deliberately.

## Architecture

```
                 ┌─────────────────────────┐
   client brief ─▶│   Managing Director     │  orchestrator (src/agency.mjs)
                 │   plans + delegates     │
                 └───────────┬─────────────┘
                             │ delegate(team, task)
          ┌──────────────┬───┴────────┬──────────────┐
          ▼              ▼            ▼              ▼
   Brand & Creative  Lead Gen &   Content &   Ops & Project
                     Outreach     Social      Management
   (src/agents.mjs — each: system prompt + focused tool set)
          │              │            │              │
          └──────────────┴─────┬──────┴──────────────┘
                               ▼
                   Tools (src/tools/*.mjs)
        local  → run for real (draft, save_deliverable)
        external → GATED in scaffold mode (Apollo, Gmail,
                   Mailchimp, Canva, Figma, Higgsfield,
                   Notion, Airtable)
```

| Team | Does | Outward-facing tools (gated) |
|------|------|------------------------------|
| **Brand & Creative** | positioning, identity, creative & video/audio assets | `generate_visual_asset` (Canva/Figma/Higgsfield) |
| **Lead Gen & Outreach** | ICP, prospecting, email sequences | `search_prospects` (Apollo), `queue_outreach` (Mailchimp/Gmail) |
| **Content & Social** | content calendars, posts, blogs, ad copy | `schedule_content` |
| **Ops & Project Mgmt** | project plans, tracking, status reports | `sync_to_workspace` (Notion/Airtable) |

## Run it

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...        # or use `ant auth login`

# Default sample brief (a DTC oat-milk launch):
npm run agency

# Your own brief:
node src/cli.mjs "Rebrand a 10-year-old accounting firm for a younger audience..."
node src/cli.mjs --file brief.txt
```

Output:
- **Deliverables** → `artifacts/<client>/…` (Markdown docs you can open)
- **Approval ledger** → `artifacts/_action-ledger.jsonl` (every gated action that
  *would* run, with its full payload, awaiting your review)
- **Executive summary** printed to the console

## Going live

Scaffold mode is the safety default. To actually execute outward-facing actions:

1. Implement the `live` adapter in each external tool (`src/tools/*.mjs`) — the
   seam is marked with a `// live:` comment next to each `externalTool`. Wire it
   to the corresponding service/MCP server (Apollo, Mailchimp, Canva, …).
2. Provide credentials (see `.env.example`).
3. Set `AGENCY_SAFE_MODE=false`.

Until then, the simulated path keeps the system fully usable for planning and
producing deliverables without any risk of an unintended send.

## Configuration

All knobs live in `src/config.mjs` (overridable via env — see `.env.example`):
`AGENCY_MODEL`, `AGENCY_EFFORT`, `AGENCY_MAX_TOKENS`, `AGENCY_MAX_TURNS`,
`AGENCY_SAFE_MODE`, `AGENCY_ARTIFACTS_DIR`.

## Relationship to the Mailchimp app

The existing Express app (`app.js`) is the **subscriber capture** endpoint:
the Lead Gen team's campaigns drive signups, which land in the brand's Mailchimp
audience via that form. The two halves are complementary — agents produce and
plan the campaigns; the app collects the audience.
