import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { buildLandingCdrPrompt } from "@/lib/analyze-cdr-prompt";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";

export const maxDuration = 120;

const client = new Anthropic();

function truncateCsv(csv: string, maxChars = 40_000): string {
  if (csv.length <= maxChars) return csv;
  const truncated = csv.slice(0, maxChars);
  const lastNewline = truncated.lastIndexOf("\n");
  return truncated.slice(0, lastNewline) + "\n[... truncated for analysis ...]";
}

function extractText(content: { type: string; text?: string }[]): string {
  for (const block of content) {
    if (block.type === "text" && block.text) return block.text;
  }
  return "";
}

export async function POST(req: NextRequest) {
  // Rate limit: 5 analyses per IP per hour (public landing page)
  const rl = checkRateLimit(getClientKey(req), "analyze-cdr", 5, 3600);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many analyses. Please try again in an hour." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > 5_000_000) {
    return NextResponse.json({ error: "Request body too large (max 5 MB)." }, { status: 413 });
  }

  let csvText: string;
  try {
    const body = await req.json();
    csvText = body.csvText ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!csvText?.trim()) {
    return NextResponse.json({ error: "csvText is required." }, { status: 400 });
  }

  const safecsv = truncateCsv(csvText);
  const prompt = buildLandingCdrPrompt(safecsv);

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3072,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = extractText(response.content);
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(jsonStr);
    } catch {
      console.error("[analyze-cdr] Non-JSON response:", raw.slice(0, 500));
      return NextResponse.json(
        { error: "Analysis returned invalid response.", raw },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Anthropic API error";
    console.error("[analyze-cdr]", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
