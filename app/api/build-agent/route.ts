import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  type AnalysisSnapshot,
  type OnboardingAnswers,
  type OnboardingContact,
  type OnboardingQuestion,
  buildAgentDisplayName,
  buildAgentIntent,
  normalizeQuestionShape,
} from "@/lib/onboarding";
import {
  buildNet2PhoneAgent,
  hasNet2PhoneBuildConfig,
  Net2PhoneBuildError,
} from "@/lib/net2phone-build";

export const maxDuration = 120;

const client = new Anthropic();
const JQ_DATE_PREFIX =
  'The current date and time in Eastern Time (New York) is \\(now - 5*3600 | strftime("%A %Y-%m-%dT%H:%M:%S")). ';

function extractText(content: { type: string; text?: string }[]): string {
  for (const block of content) {
    if (block.type === "text" && block.text) return block.text;
  }
  return "";
}

function escapeForJq(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ")
    .replace(/\r/g, "")
    .replace(/\t/g, " ");
}

function wrapAsJqPrompt(text: string): string {
  return `"${JQ_DATE_PREFIX}${escapeForJq(text)}"`;
}

function buildPromptGenerationRequest(params: {
  selectedAgent: string;
  contact: OnboardingContact;
  analysis: AnalysisSnapshot | null;
  questions: OnboardingQuestion[];
  answers: OnboardingAnswers;
  generatedIntent: string;
}): string {
  const answerLines = params.questions
    .map((question) => {
      const answer = params.answers[question.id]?.trim();
      return answer ? `- ${question.text}: ${answer}` : "";
    })
    .filter(Boolean)
    .join("\n");

  return `You write production-ready system prompts for net2phone AI phone agents.

Write a clean, deployment-ready prompt for a ${params.selectedAgent}.

Company:
- Name: ${params.contact.company}
- Website: ${params.contact.website?.trim() || "Not provided"}

Agent build brief:
${params.generatedIntent}

CDR analysis summary:
${params.analysis?.summary ?? "Not provided"}

Clarifying answers:
${answerLines || "- No additional answers provided"}

Requirements:
- Write in second person.
- Assume this is a phone-based AI agent for net2phone AI.
- Be specific about what the agent handles, how it should respond, what it should collect, and when it should hand off.
- Keep the tone confident, warm, and operationally clear.
- Mention escalation boundaries for complex or sensitive issues.
- Keep it between 180 and 450 words.
- Return plain text only. No markdown, no bullets, no headings, no quotes.`;
}

async function generateAgentPrompt(params: {
  selectedAgent: string;
  contact: OnboardingContact;
  analysis: AnalysisSnapshot | null;
  questions: OnboardingQuestion[];
  answers: OnboardingAnswers;
  generatedIntent: string;
}): Promise<{ promptBody: string; promptJq: string }> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1800,
    messages: [
      {
        role: "user",
        content: buildPromptGenerationRequest(params),
      },
    ],
  });

  const promptBody = extractText(response.content).trim();
  if (!promptBody) {
    throw new Error("Prompt generation returned empty content.");
  }

  return {
    promptBody,
    promptJq: wrapAsJqPrompt(promptBody),
  };
}

export async function POST(req: NextRequest) {
  let body: {
    selectedAgent?: string;
    analysis?: AnalysisSnapshot | null;
    questions?: unknown;
    answers?: OnboardingAnswers;
    contact?: OnboardingContact;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const selectedAgent = body.selectedAgent?.trim() ?? "";
  const contact = body.contact;

  if (!selectedAgent) {
    return NextResponse.json({ error: "selectedAgent is required." }, { status: 400 });
  }

  if (!contact?.firstName || !contact?.lastName || !contact?.email || !contact?.company || !contact?.phone) {
    return NextResponse.json(
      { error: "firstName, lastName, email, company, and phone are required." },
      { status: 400 }
    );
  }

  const questions = normalizeQuestionShape(body.questions, selectedAgent);
  const answers = body.answers ?? {};
  const generatedIntent = buildAgentIntent(selectedAgent, body.analysis ?? null, questions, answers);
  const displayName = buildAgentDisplayName(selectedAgent, contact.company);

  try {
    const { promptBody, promptJq } = await generateAgentPrompt({
      selectedAgent,
      contact,
      analysis: body.analysis ?? null,
      questions,
      answers,
      generatedIntent,
    });

    if (!hasNet2PhoneBuildConfig()) {
      return NextResponse.json({
        success: true,
        mode: "draft",
        displayName,
        generatedIntent,
        promptPreview: promptBody,
        statusMessage:
          "Your build brief is ready. Add net2phone build credentials to create the agent directly from this flow.",
      });
    }

    const agent = await buildNet2PhoneAgent({
      contact: {
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        companyName: contact.company,
        phoneNumber: contact.phone,
      },
      displayName,
      prompt: promptJq,
    });

    return NextResponse.json({
      success: true,
      mode: "live",
      displayName: agent.agentName,
      agentId: agent.agentId,
      companyPhoneNumber: agent.companyPhoneNumber,
      generatedIntent,
      promptPreview: promptBody,
      statusMessage: "Your agent has been created inside net2phone AI.",
    });
  } catch (error) {
    if (error instanceof Net2PhoneBuildError) {
      return NextResponse.json({ error: error.message }, { status: error.status ?? 502 });
    }

    const message = error instanceof Error ? error.message : "Agent build failed.";
    console.error("[build-agent]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
