"use client";

import { useEffect, useMemo, useState } from "react";
import { AccountStep } from "./AccountStep";
import { QuestionStep } from "./QuestionStep";
import { RevealStep } from "./RevealStep";
import type { BuildAgentResponse, OnboardingContactState } from "./types";
import {
  type AnalysisSnapshot,
  type OnboardingAnswers,
  type OnboardingQuestion,
  buildAgentIntent,
  getFallbackQuestions,
} from "@/lib/onboarding";

interface OnboardingFlowProps {
  selectedAgent: string;
  analysis: AnalysisSnapshot | null;
  onClose: () => void;
}

const BUILDING_MESSAGES = [
  "Summarizing your CDR opportunities...",
  "Writing the agent prompt...",
  "Submitting the build to net2phone AI...",
];

export function OnboardingFlow({
  selectedAgent,
  analysis,
  onClose,
}: OnboardingFlowProps) {
  const [step, setStep] = useState<"questions" | "details" | "building" | "reveal">("questions");
  const [questions, setQuestions] = useState<OnboardingQuestion[]>([]);
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [questionError, setQuestionError] = useState("");
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [buildStage, setBuildStage] = useState(0);
  const [buildResult, setBuildResult] = useState<BuildAgentResponse | null>(null);
  const [questionRequestKey, setQuestionRequestKey] = useState(0);
  const [contact, setContact] = useState<OnboardingContactState>({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    phone: "",
    website: "",
    teamSize: "",
    phoneSystem: "",
  });

  const findings = useMemo(() => {
    return (analysis?.insights ?? []).filter(Boolean).slice(0, 3);
  }, [analysis]);

  useEffect(() => {
    let cancelled = false;

    async function loadQuestions() {
      setQuestionsLoading(true);
      setQuestionError("");

      try {
        const res = await fetch("/api/onboarding-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedAgent, analysis }),
        });
        const json = (await res.json()) as { questions?: OnboardingQuestion[]; error?: string };

        if (!res.ok) {
          throw new Error(json.error ?? "Could not load onboarding questions.");
        }

        if (!cancelled) {
          setQuestions(json.questions?.length ? json.questions : getFallbackQuestions(selectedAgent));
        }
      } catch (error) {
        if (!cancelled) {
          setQuestions(getFallbackQuestions(selectedAgent));
          setQuestionError(
            error instanceof Error
              ? `${error.message} Using a strong default setup instead.`
              : "Using a strong default setup instead."
          );
        }
      } finally {
        if (!cancelled) {
          setQuestionsLoading(false);
        }
      }
    }

    loadQuestions();
    return () => {
      cancelled = true;
    };
  }, [analysis, selectedAgent, questionRequestKey]);

  useEffect(() => {
    if (step !== "building") return;

    const interval = window.setInterval(() => {
      setBuildStage((current) => (current + 1) % BUILDING_MESSAGES.length);
    }, 1400);

    return () => window.clearInterval(interval);
  }, [step]);

  const handleAnswerChange = (id: string, value: string) => {
    setAnswers((current) => ({ ...current, [id]: value }));
  };

  const handleContactChange = (field: keyof OnboardingContactState, value: string) => {
    setContact((current) => ({ ...current, [field]: value }));
  };

  const handleQuestionsNext = () => {
    const missing = questions.some((question) => !(answers[question.id] ?? "").trim());
    if (missing) {
      setQuestionError("Answer each question so the agent can be configured properly.");
      return;
    }

    setQuestionError("");
    setStep("details");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    setStep("building");
    setBuildStage(0);

    const generatedIntent = buildAgentIntent(selectedAgent, analysis, questions, answers);

    try {
      const leadRes = await fetch("/api/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact,
          selectedAgent,
          analysis:
            analysis ?? undefined,
          onboarding: {
            generatedIntent,
            answers,
            questions: questions.map((question) => ({
              id: question.id,
              text: question.text,
            })),
          },
        }),
      });

      const leadJson = (await leadRes.json()) as { error?: string };
      if (!leadRes.ok) {
        throw new Error(leadJson.error ?? "Lead submission failed.");
      }

      const buildRes = await fetch("/api/build-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedAgent,
          analysis,
          questions,
          answers,
          contact,
        }),
      });

      const buildJson = (await buildRes.json()) as BuildAgentResponse & { error?: string };
      if (!buildRes.ok || !buildJson.success) {
        throw new Error(buildJson.error ?? "Agent build failed.");
      }

      setBuildResult(buildJson);
      setStep("reveal");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Agent build failed.");
      setStep("details");
    }
  };

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="agentFlowTitle">
      <div className="onboarding-backdrop" onClick={onClose} />
      <div className="onboarding-shell">
        <aside className="onboarding-sidebar">
          <div className="onboarding-sidebar-top">
            <span className="onboarding-sidebar-label">net2phone AI build flow</span>
            <h2 id="agentFlowTitle">{selectedAgent}</h2>
            <p>
              Start from the CDR findings, clarify the workflow, then build the agent without
              leaving this landing experience.
            </p>
          </div>

          <div className="onboarding-step-rail">
            <div className={`onboarding-step-pill ${step === "questions" ? "active" : ""}`}>1. Clarify</div>
            <div
              className={`onboarding-step-pill ${
                step === "details" || step === "building" || step === "reveal" ? "active" : ""
              }`}
            >
              2. Company details
            </div>
            <div
              className={`onboarding-step-pill ${
                step === "building" || step === "reveal" ? "active" : ""
              }`}
            >
              3. Build
            </div>
          </div>

          <div className="onboarding-summary-card">
            <span>What your CDR already told us</span>
            <div className="onboarding-summary-metrics">
              <div>
                <strong>{analysis?.missedRate ?? 0}%</strong>
                <small>missed calls</small>
              </div>
              <div>
                <strong>{analysis?.shortCallsPct ?? 0}%</strong>
                <small>short calls</small>
              </div>
              <div>
                <strong>{analysis?.afterHoursPct ?? 0}%</strong>
                <small>after-hours</small>
              </div>
            </div>
            {findings.length > 0 && (
              <ul>
                {findings.map((finding) => (
                  <li key={finding}>{finding}</li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <main className="onboarding-main">
          <button type="button" className="onboarding-close" onClick={onClose} aria-label="Close">
            ✕
          </button>

          {step === "questions" && (
            <QuestionStep
              selectedAgent={selectedAgent}
              questions={questions}
              answers={answers}
              isLoading={questionsLoading}
              error={questionError}
              onRetry={() => setQuestionRequestKey((current) => current + 1)}
              onAnswerChange={handleAnswerChange}
              onBack={onClose}
              onNext={handleQuestionsNext}
            />
          )}

          {step === "details" && (
            <AccountStep
              contact={contact}
              error={submitError}
              isSubmitting={false}
              onChange={handleContactChange}
              onBack={() => setStep("questions")}
              onSubmit={handleSubmit}
            />
          )}

          {step === "building" && (
            <div className="onboarding-step onboarding-build-card">
              <div className="onboarding-step-header">
                <span className="onboarding-kicker">Step 3</span>
                <h2>Building your agent inside net2phone AI</h2>
                <p>
                  We&apos;re packaging your selected agent, CDR context, and workflow answers into a
                  deployment-ready configuration.
                </p>
              </div>
              <div className="onboarding-loading-card onboarding-loading-card-large">
                <div className="onboarding-spinner" />
                <div>
                  <strong>{BUILDING_MESSAGES[buildStage]}</strong>
                  <p>This usually takes a few moments.</p>
                </div>
              </div>
            </div>
          )}

          {step === "reveal" && buildResult && (
            <RevealStep selectedAgent={selectedAgent} result={buildResult} onClose={onClose} />
          )}
        </main>
      </div>
    </div>
  );
}
