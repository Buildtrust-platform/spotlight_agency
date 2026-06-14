// Live adapter: Mailchimp Marketing API.
//
// This is the first fully-wired outward-facing integration — proof that the
// gated `live` path works end to end, not just the simulation. It is only ever
// invoked when AGENCY_SAFE_MODE=false (see src/tools/gate.mjs). Even then it is
// deliberately conservative: queue_outreach creates a *draft* campaign, never an
// immediate send, so a human still presses the final button in Mailchimp.
//
// Auth: Mailchimp keys end in "-<dc>" (e.g. "...-us20"); the datacenter is the
// API host. Basic auth with any username + the key as the password.

const API_KEY = process.env.MAILCHIMP_API_KEY;
const AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;

function client() {
  if (!API_KEY) throw new Error("MAILCHIMP_API_KEY is not set");
  const dc = API_KEY.split("-")[1];
  if (!dc) throw new Error("MAILCHIMP_API_KEY missing datacenter suffix (expected '...-us20')");
  const base = `https://${dc}.api.mailchimp.com/3.0`;
  const auth = "Basic " + Buffer.from(`anystring:${API_KEY}`).toString("base64");
  return async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(`Mailchimp ${res.status}: ${data.detail || text}`);
    return data;
  };
}

/** Add (or upsert) a subscriber to the audience. */
export async function addSubscriber({ email, firstName, lastName, audienceId }) {
  const call = client();
  const listId = audienceId || AUDIENCE_ID;
  if (!listId) throw new Error("No audience id (set MAILCHIMP_AUDIENCE_ID)");
  return call("POST", `/lists/${listId}/members`, {
    email_address: email,
    status: "subscribed",
    merge_fields: { FNAME: firstName || "", LNAME: lastName || "" },
  });
}

/**
 * Create a DRAFT regular campaign (subject + html) targeted at the audience.
 * Returns the campaign id + the Mailchimp web URL to review and send. Does NOT
 * send — that stays a human decision.
 */
export async function createDraftCampaign({ subject, fromName, replyTo, title, html, audienceId }) {
  const call = client();
  const listId = audienceId || AUDIENCE_ID;
  if (!listId) throw new Error("No audience id (set MAILCHIMP_AUDIENCE_ID)");
  const campaign = await call("POST", "/campaigns", {
    type: "regular",
    recipients: { list_id: listId },
    settings: {
      subject_line: subject,
      title: title || subject,
      from_name: fromName || "Agency",
      reply_to: replyTo || "no-reply@example.com",
    },
  });
  await call("PUT", `/campaigns/${campaign.id}/content`, { html });
  return { campaign_id: campaign.id, status: "draft", review_url: campaign.archive_url || null };
}
