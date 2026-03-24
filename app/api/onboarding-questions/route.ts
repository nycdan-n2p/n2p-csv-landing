import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  type AnalysisSnapshot,
  getFallbackQuestions,
  normalizeQuestionShape,
} from "@/lib/onboarding";

export const maxDuration = 120;

const client = new Anthropic();

function extractText(content: { type: string; text?: string }[]): string {
  for (const block of content) {
    if (block.type === "text" && block.text) return block.text;
  }
  return "";
}

function buildQuestionsPrompt(selectedAgent: string, analysis?: AnalysisSnapshot | null): string {
  return `You are helping configure a net2phone AI agent after a customer uploaded call data.

Selected agent:
${selectedAgent}

CDR analysis summary:
${analysis?.summary ?? "No CDR summary provided."}

Recommended agents:
${analysis?.recommendedAgents?.join(", ") || "None"}

Key insights:
${(analysis?.insights ?? []).join(" | ") || "None"}

Generate exactly 3 short follow-up questions that will help configure this agent.

Rules:
- Ask only configuration or workflow questions.
- Do not ask for personal contact information.
- Keep each question under 110 characters.
- Each question must have 3 to 5 answer options.
- Keep the options concise and business-friendly.
- Tailor the questions to the selected agent and the CDR findings.

Return only valid JSON in this format:
{
  "questions": [
    {
      "id": "short-kebab-id",
      "text": "Question text",
      "options": ["Option 1", "Option 2", "Option 3"]
    }
  ]
}`;
}

export async function POST(req: NextRequest) {
  let body: { selectedAgent?: string; analysis?: AnalysisSnapshot | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const selectedAgent = body.selectedAgent?.trim();
  if (!selectedAgent) {
    return NextResponse.json({ error: "selectedAgent is required." }, { status: 400 });
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [{ role: "user", content: buildQuestionsPrompt(selectedAgent, body.analysis) }],
    });

    const raw = extractText(response.content);
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(jsonStr) as { questions?: unknown };

    return NextResponse.json({
      questions: normalizeQuestionShape(parsed.questions, selectedAgent),
    });
  } catch (error) {
    console.error("[onboarding-questions]", error);
    return NextResponse.json({
      questions: getFallbackQuestions(selectedAgent),
      fallback: true,
    });
  }
}
