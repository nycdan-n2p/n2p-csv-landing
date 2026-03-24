import { NextRequest, NextResponse } from "next/server";

export interface LeadPayload {
  contact: {
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
    phone?: string;
    website?: string;
    teamSize?: string;
    phoneSystem?: string;
  };
  selectedAgent?: string;
  analysis?: {
    summary?: string;
    recommendedAgents?: string[];
    missedRate?: number;
    shortCallsPct?: number;
    afterHoursPct?: number;
    agentsCount?: number;
  };
  onboarding?: {
    generatedIntent?: string;
    answers?: Record<string, string>;
    questions?: Array<{ id?: string; text?: string }>;
  };
}

export async function POST(req: NextRequest) {
  let body: LeadPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { contact = {}, selectedAgent = "", analysis = {}, onboarding = {} } = body;
  const pageUri = req.headers.get("referer") ?? req.headers.get("origin") ?? "";

  const webhookPayload = {
    source: "cdr-landing",
    timestamp: new Date().toISOString(),
    contact: {
      firstName: contact.firstName ?? "",
      lastName: contact.lastName ?? "",
      email: contact.email ?? "",
      company: contact.company ?? "",
      phone: contact.phone ?? "",
      website: contact.website ?? "",
      teamSize: contact.teamSize ?? "",
      phoneSystem: contact.phoneSystem ?? "",
    },
    selectedAgent: selectedAgent ?? "",
    analysis: {
      summary: analysis.summary ?? "",
      recommendedAgents: analysis.recommendedAgents ?? [],
      missedRate: analysis.missedRate,
      shortCallsPct: analysis.shortCallsPct,
      afterHoursPct: analysis.afterHoursPct,
      agentsCount: analysis.agentsCount,
    },
    onboarding: {
      generatedIntent: onboarding.generatedIntent ?? "",
      answers: onboarding.answers ?? {},
      questions: onboarding.questions ?? [],
    },
  };

  const results: { hubspot?: string; webhook?: string } = {};
  let hasError = false;

  // HubSpot
  const portalId = process.env.HUBSPOT_PORTAL_ID;
  const formGuid = process.env.HUBSPOT_FORM_GUID;
  if (portalId && formGuid) {
    try {
      const hubspotFields = [
        { name: "email", value: contact.email ?? "" },
        { name: "firstname", value: contact.firstName ?? "" },
        { name: "lastname", value: contact.lastName ?? "" },
        { name: "company", value: contact.company ?? "" },
        { name: "phone", value: contact.phone ?? "" },
        { name: "website", value: contact.website ?? "" },
        { name: "team_size", value: contact.teamSize ?? "" },
        { name: "phone_system", value: contact.phoneSystem ?? "" },
        { name: "selected_agent", value: selectedAgent ?? "" },
        { name: "cdr_analysis_summary", value: analysis.summary ?? "" },
        { name: "agents_recommended", value: (analysis.recommendedAgents ?? []).join(", ") },
        { name: "missed_rate", value: String(analysis.missedRate ?? "") },
        { name: "short_calls_pct", value: String(analysis.shortCallsPct ?? "") },
        { name: "agent_build_intent", value: onboarding.generatedIntent ?? "" },
        {
          name: "agent_clarifying_answers",
          value: Object.entries(onboarding.answers ?? {})
            .map(([key, value]) => `${key}: ${value}`)
            .join(" | "),
        },
      ].filter((f) => f.value);

      const res = await fetch(
        `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formGuid}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: hubspotFields,
            context: { pageUri },
          }),
        }
      );

      if (res.ok) {
        results.hubspot = "ok";
      } else {
        const err = await res.text();
        console.error("[submit-lead] HubSpot error:", res.status, err);
        results.hubspot = `error: ${res.status}`;
        hasError = true;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "HubSpot request failed";
      console.error("[submit-lead]", msg);
      results.hubspot = `error: ${msg}`;
      hasError = true;
    }
  }

  // Generic webhook
  const webhookUrl = process.env.CDR_LEAD_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      });

      if (res.ok) {
        results.webhook = "ok";
      } else {
        const err = await res.text();
        console.error("[submit-lead] Webhook error:", res.status, err);
        results.webhook = `error: ${res.status}`;
        hasError = true;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Webhook request failed";
      console.error("[submit-lead]", msg);
      results.webhook = `error: ${msg}`;
      hasError = true;
    }
  }

  // When no integration is configured, still return success for demo/DevX
  if (!portalId && !formGuid && !webhookUrl) {
    return NextResponse.json({
      success: true,
      results: { note: "No integration configured (set HUBSPOT_* or CDR_LEAD_WEBHOOK_URL)." },
    });
  }

  return NextResponse.json({
    success: !hasError,
    results,
  });
}
