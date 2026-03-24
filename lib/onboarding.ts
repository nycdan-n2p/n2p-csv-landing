export interface AnalysisSnapshot {
  missedRate: number;
  shortCallsPct: number;
  afterHoursPct: number;
  agentsRecommended: number;
  recommendedAgents: string[];
  summary: string;
  insights?: string[];
}

export interface OnboardingQuestion {
  id: string;
  text: string;
  options: string[];
}

export interface OnboardingContact {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  phone: string;
  website?: string;
  teamSize?: string;
  phoneSystem?: string;
}

export type OnboardingAnswers = Record<string, string>;

export const ALL_AGENTS = [
  "After-Hours Agent",
  "AI Routing Agent",
  "Queue Assistant",
  "Re-engagement Agent",
  "Outbound Agent",
  "Virtual Agent",
] as const;

const QUESTION_FALLBACKS: Record<string, OnboardingQuestion[]> = {
  "After-Hours Agent": [
    {
      id: "after-hours-goal",
      text: "What should this agent handle after hours?",
      options: ["New inquiries", "Appointment requests", "Urgent support", "All inbound calls"],
    },
    {
      id: "after-hours-escalation",
      text: "Which calls should escalate to a human right away?",
      options: ["Only emergencies", "VIP customers", "Sales opportunities", "Nothing should escalate"],
    },
    {
      id: "after-hours-capture",
      text: "What information should the agent always collect?",
      options: ["Name and callback", "Issue summary", "Preferred appointment time", "Order or account details"],
    },
  ],
  "AI Routing Agent": [
    {
      id: "routing-intents",
      text: "Which caller intents matter most for routing?",
      options: ["Sales", "Billing", "Support", "Scheduling"],
    },
    {
      id: "routing-priority",
      text: "How should the agent prioritize high-value callers?",
      options: ["VIP queue", "Top sales reps", "Manager escalation", "Standard routing is fine"],
    },
    {
      id: "routing-resolution",
      text: "Should the agent solve simple requests before routing?",
      options: ["Yes, as much as possible", "Only FAQs", "Only appointment requests", "No, route immediately"],
    },
  ],
  "Queue Assistant": [
    {
      id: "queue-overflow",
      text: "What should happen when wait times spike?",
      options: ["Offer callback", "Offer self-service", "Take voicemail", "Route to overflow team"],
    },
    {
      id: "queue-peak-hours",
      text: "When do queues create the most friction today?",
      options: ["Morning rush", "Lunch hours", "Late afternoon", "After-hours overflow"],
    },
    {
      id: "queue-outcome",
      text: "What is the best outcome for a waiting caller?",
      options: ["Resolved in self-service", "Scheduled callback", "Transferred to live team", "Logged for follow-up"],
    },
  ],
  "Re-engagement Agent": [
    {
      id: "reengagement-trigger",
      text: "Which callers should trigger follow-up automatically?",
      options: ["Repeat callers", "Missed callbacks", "Dropped calls", "Unresolved support cases"],
    },
    {
      id: "reengagement-channel",
      text: "How should the agent re-engage them?",
      options: ["Phone call", "SMS", "Email", "Phone first, then SMS"],
    },
    {
      id: "reengagement-goal",
      text: "What should the follow-up achieve?",
      options: ["Book next step", "Resolve issue", "Recover missed sale", "Route to account owner"],
    },
  ],
  "Outbound Agent": [
    {
      id: "outbound-campaigns",
      text: "What should the outbound agent focus on first?",
      options: ["Reminders", "Lead follow-up", "Renewals", "Collections"],
    },
    {
      id: "outbound-tone",
      text: "What tone should the outreach use?",
      options: ["Friendly and consultative", "Direct and efficient", "High-touch white glove", "Brand-safe and formal"],
    },
    {
      id: "outbound-handoff",
      text: "When should the agent hand off to a person?",
      options: ["Hot lead detected", "Complex objection", "Requested callback", "Never"],
    },
  ],
  "Virtual Agent": [
    {
      id: "virtual-agent-scope",
      text: "What should this virtual agent own end to end?",
      options: ["FAQs and intake", "Scheduling", "Tier-1 support", "Sales qualification"],
    },
    {
      id: "virtual-agent-limit",
      text: "Where should it hand off to your team?",
      options: ["Complex issues", "Billing changes", "VIP callers", "Never hand off"],
    },
    {
      id: "virtual-agent-data",
      text: "What context should it capture every time?",
      options: ["Caller identity", "Problem summary", "Urgency level", "Best callback path"],
    },
  ],
};

export function getFallbackQuestions(selectedAgent: string): OnboardingQuestion[] {
  return QUESTION_FALLBACKS[selectedAgent] ?? QUESTION_FALLBACKS["Virtual Agent"];
}

export function buildAnalysisContext(analysis?: AnalysisSnapshot | null): string {
  if (!analysis) return "No CDR analysis was provided.";

  const insights = (analysis.insights ?? []).filter(Boolean).slice(0, 3);
  const metrics = [
    `${analysis.missedRate}% missed calls`,
    `${analysis.shortCallsPct}% short calls`,
    `${analysis.afterHoursPct}% after-hours volume`,
  ];

  const recommended =
    analysis.recommendedAgents?.length > 0
      ? `Recommended agents: ${analysis.recommendedAgents.join(", ")}.`
      : "";

  return [
    `CDR findings: ${metrics.join(", ")}.`,
    recommended,
    analysis.summary?.trim() ?? "",
    insights.length ? `Top observations: ${insights.join(" ")}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildAnswerSummary(
  questions: OnboardingQuestion[],
  answers: OnboardingAnswers
): string {
  return questions
    .map((question) => {
      const answer = answers[question.id]?.trim();
      return answer ? `${question.text} ${answer}.` : "";
    })
    .filter(Boolean)
    .join(" ");
}

export function buildAgentIntent(
  selectedAgent: string,
  analysis: AnalysisSnapshot | null,
  questions: OnboardingQuestion[],
  answers: OnboardingAnswers
): string {
  const answerSummary = buildAnswerSummary(questions, answers);
  const analysisContext = buildAnalysisContext(analysis);

  return [
    `Build a ${selectedAgent} for a net2phone AI customer.`,
    analysisContext,
    answerSummary ? `Configuration details: ${answerSummary}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildAgentDisplayName(
  selectedAgent: string,
  companyName: string
): string {
  const cleanCompany = companyName.trim();
  return cleanCompany ? `${cleanCompany} ${selectedAgent}` : selectedAgent;
}

export function normalizeQuestionShape(
  questions: unknown,
  selectedAgent: string
): OnboardingQuestion[] {
  if (!Array.isArray(questions)) {
    return getFallbackQuestions(selectedAgent);
  }

  const normalized = questions
    .map((question, index) => {
      if (!question || typeof question !== "object") return null;
      const raw = question as Record<string, unknown>;
      const text =
        typeof raw.text === "string"
          ? raw.text.trim()
          : typeof raw.question === "string"
            ? raw.question.trim()
            : "";
      const id =
        typeof raw.id === "string" && raw.id.trim()
          ? raw.id.trim()
          : `q-${index + 1}`;
      const options = Array.isArray(raw.options)
        ? raw.options.filter((option): option is string => typeof option === "string" && option.trim().length > 0)
        : [];

      if (!text) return null;

      return {
        id,
        text,
        options: options.slice(0, 5),
      };
    })
    .filter((question): question is OnboardingQuestion => Boolean(question));

  return normalized.length > 0 ? normalized : getFallbackQuestions(selectedAgent);
}
