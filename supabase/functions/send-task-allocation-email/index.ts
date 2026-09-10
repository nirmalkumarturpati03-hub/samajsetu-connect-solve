import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-task-dispatch-secret",
};

type Assignment = {
  id: string;
  challenge_id: string;
  created_at: string;
  acceptance_deadline: string | null;
  organization_accounts: {
    name: string;
    organization_type: string;
    contact_email: string | null;
  } | null;
  challenges: {
    public_id: string;
    title: string;
    summary: string;
    domain: string;
    district: string;
    block: string | null;
    locality: string | null;
    public_latitude: number | null;
    public_longitude: number | null;
    priority_score: number;
    priority_level: string | null;
    created_at: string;
  } | null;
};

const escapeHtml = (value: unknown) => String(value ?? "Not provided")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const dateTime = (value: string | null | undefined) => value
  ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
  : "Not provided";

function emailHtml(assignment: Assignment, mediaLinks: { label: string; url: string }[]) {
  const partner = assignment.organization_accounts!;
  const challenge = assignment.challenges!;
  const priority = challenge.priority_level || `${challenge.priority_score}/100`;
  const location = [challenge.locality, challenge.block, challenge.district].filter(Boolean).join(", ");
  const coordinates = challenge.public_latitude == null || challenge.public_longitude == null
    ? "Not available"
    : `${challenge.public_latitude}, ${challenge.public_longitude}`;
  const details = [
    ["Problem ID", challenge.public_id],
    ["Category", challenge.domain],
    ["Problem location", location],
    ["District", challenge.district],
    ["Block / Mandal", challenge.block],
    ["Village / City", challenge.locality],
    ["Public latitude / longitude", coordinates],
    ["Date reported", dateTime(challenge.created_at)],
    ["Priority", priority],
    ["Response deadline", dateTime(assignment.acceptance_deadline)],
  ];
  const rows = details.map(([label, value]) => `<tr><td style="padding:8px 12px;color:#526079;font-weight:600">${escapeHtml(label)}</td><td style="padding:8px 12px;color:#10213b">${escapeHtml(value)}</td></tr>`).join("");
  const links = mediaLinks.length
    ? `<ul>${mediaLinks.map((item) => `<li style="margin:8px 0"><a href="${escapeHtml(item.url)}" style="color:#2850b8">${escapeHtml(item.label)}</a></li>`).join("")}</ul>`
    : "<p style=\"color:#526079\">No public photos or documents were attached to this task.</p>";
  return `<!doctype html><html><body style="margin:0;background:#f3f6fb;font-family:Arial,sans-serif;color:#10213b"><main style="max-width:680px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden"><header style="padding:28px 32px;background:#2850b8;color:#fff"><p style="margin:0;font-size:13px;font-weight:700;letter-spacing:.08em">SAMAJSETU · TASK ALLOCATION</p><h1 style="margin:12px 0 0;font-size:25px">New community problem assigned</h1></header><section style="padding:28px 32px"><p>Dear ${escapeHtml(partner.name)},</p><p><strong>You have been assigned this community problem through SamajSetu.</strong></p><h2 style="font-size:20px;margin:24px 0 8px">${escapeHtml(challenge.title)}</h2><p style="line-height:1.6;color:#33415c">${escapeHtml(challenge.summary)}</p><table style="width:100%;border-collapse:collapse;background:#f7f9fc;border-radius:8px">${rows}</table><h3 style="margin:26px 0 8px">Public supporting information</h3>${links}<h3 style="margin:26px 0 8px">Required action</h3><p style="line-height:1.6;color:#33415c">Open your SamajSetu dashboard to accept or reject this assignment before the response deadline. Your response helps us keep the community informed and arrange reassignment promptly when needed.</p><p style="line-height:1.6;color:#526079">This notice contains only task information needed for delivery. Reporter identity, private contact details, and private evidence are not included.</p><p style="margin-top:28px">SamajSetu Support<br><a href="mailto:${escapeHtml(Deno.env.get("SAMAJSETU_SUPPORT_EMAIL") ?? "support@samajsetu.org")}" style="color:#2850b8">${escapeHtml(Deno.env.get("SAMAJSETU_SUPPORT_EMAIL") ?? "support@samajsetu.org")}</a></p></section></main></body></html>`;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  const dispatchSecret = Deno.env.get("TASK_EMAIL_DISPATCH_SECRET");
  if (!dispatchSecret || request.headers.get("x-task-dispatch-secret") !== dispatchSecret) {
    return Response.json({ error: "Unauthorized dispatcher" }, { status: 401, headers: corsHeaders });
  }
  const zeptoMailKey = Deno.env.get("ZEPTO_MAIL_SEND_API_KEY");
  const fromAddress = Deno.env.get("ZEPTO_MAIL_FROM_EMAIL");
  const fromName = Deno.env.get("ZEPTO_MAIL_FROM_NAME") ?? "SamajSetu";
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!zeptoMailKey || !fromAddress || !url || !serviceKey) return Response.json({ error: "Email delivery is not configured" }, { status: 503, headers: corsHeaders });

  const admin = createClient(url, serviceKey);
  let outboxId: string | null = null;
  try {
    const body = await request.json() as { assignmentId?: string };
    if (!body.assignmentId || !/^[0-9a-f-]{36}$/i.test(body.assignmentId)) throw new Error("A valid assignment ID is required");
    const { data: outbox, error: outboxError } = await admin
      .from("task_allocation_email_outbox")
      .select("id,status,attempts")
      .eq("assignment_id", body.assignmentId)
      .maybeSingle();
    if (outboxError || !outbox) throw new Error("Allocation email queue record not found");
    if (outbox.status === "sent") return Response.json({ delivered: true, duplicate: true }, { headers: corsHeaders });
    outboxId = outbox.id;
    const { data: claimed, error: claimError } = await admin
      .from("task_allocation_email_outbox")
      .update({ status: "sending", attempts: outbox.attempts + 1, updated_at: new Date().toISOString(), last_error: null })
      .eq("id", outbox.id)
      .in("status", ["pending", "failed"])
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) return Response.json({ delivered: false, alreadyProcessing: true }, { headers: corsHeaders });
    const { data: assignment, error: assignmentError } = await admin
      .from("problem_assignments")
      .select("id,challenge_id,created_at,acceptance_deadline,organization_accounts(name,organization_type,contact_email),challenges(public_id,title,summary,domain,district,block,locality,public_latitude,public_longitude,priority_score,priority_level,created_at)")
      .eq("id", body.assignmentId)
      .single();
    if (assignmentError || !assignment) throw new Error("Assignment not found");
    const record = assignment as unknown as Assignment;
    if (!record.organization_accounts?.contact_email || !record.challenges) throw new Error("Assignment is missing partner email or challenge data");

    const { data: media } = await admin
      .from("challenge_media")
      .select("storage_path,mime_type")
      .eq("challenge_id", record.challenge_id)
      .limit(10);
    const links = await Promise.all((media ?? []).map(async (item: { storage_path: string; mime_type: string }, index: number) => {
      const { data } = await admin.storage.from("challenge-previews").createSignedUrl(item.storage_path, 60 * 60 * 24 * 7);
      return data?.signedUrl ? { label: `Supporting ${item.mime_type.startsWith("video/") ? "video" : "photo"} ${index + 1}`, url: data.signedUrl } : null;
    }));
    const response = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Zoho-enczapikey ${zeptoMailKey}`,
      },
      body: JSON.stringify({
        from: { address: fromAddress, name: fromName },
        to: [{ email_address: { address: record.organization_accounts.contact_email, name: record.organization_accounts.name } }],
        subject: "SamajSetu – New Community Problem Assigned",
        htmlbody: emailHtml(record, links.filter((link): link is { label: string; url: string } => link !== null)),
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(`ZeptoMail rejected delivery: ${payload?.error?.message ?? payload?.message ?? response.status}`);
    await admin.from("task_allocation_email_outbox").update({ status: "sent", provider_message_id: payload?.request_id ?? payload?.data?.[0]?.request_id ?? null, sent_at: new Date().toISOString(), updated_at: new Date().toISOString(), last_error: null }).eq("id", outbox.id);
    return Response.json({ delivered: true }, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Task allocation email failed";
    if (outboxId) {
      await admin.from("task_allocation_email_outbox").update({ status: "failed", last_error: message.slice(0, 1000), updated_at: new Date().toISOString() }).eq("id", outboxId);
    }
    return Response.json({ error: message }, { status: 400, headers: corsHeaders });
  }
});
