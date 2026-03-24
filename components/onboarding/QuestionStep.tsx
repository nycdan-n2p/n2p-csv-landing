"use client";

import type { OnboardingAnswerMap } from "./types";
import type { OnboardingQuestion } from "@/lib/onboarding";

interface QuestionStepProps {
  selectedAgent: string;
  questions: OnboardingQuestion[];
  answers: OnboardingAnswerMap;
  isLoading: boolean;
  error: string;
  onRetry: () => void;
  onAnswerChange: (id: string, value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function QuestionStep({
  selectedAgent,
  questions,
  answers,
  isLoading,
  error,
  onRetry,
  onAnswerChange,
  onBack,
  onNext,
}: QuestionStepProps) {
  const isComplete = questions.every((question) => (answers[question.id] ?? "").trim());

  return (
    <div className="onboarding-step">
      <div className="onboarding-step-header">
        <span className="onboarding-kicker">Step 1</span>
        <h2>Shape how your {selectedAgent.toLowerCase()} should work</h2>
        <p>
          We already know where the call data is leaking revenue. These questions tune the agent so
          it behaves the way your business actually runs.
        </p>
      </div>

      {isLoading ? (
        <div className="onboarding-loading-card">
          <div className="onboarding-spinner" />
          <div>
            <strong>Generating configuration questions</strong>
            <p>Using your CDR findings to tailor the setup flow.</p>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="onboarding-inline-alert" role="alert">
              <span>{error}</span>
              <button type="button" onClick={onRetry}>
                Retry
              </button>
            </div>
          )}

          <div className="question-stack">
            {questions.map((question, index) => (
              <div key={question.id} className="question-card">
                <div className="question-card-top">
                  <span className="question-number">{index + 1}</span>
                  <p>{question.text}</p>
                </div>
                <div className="question-options">
                  {question.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`question-chip ${
                        answers[question.id] === option ? "active" : ""
                      }`}
                      onClick={() => onAnswerChange(question.id, option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <input
                  className="question-input"
                  type="text"
                  value={answers[question.id] ?? ""}
                  onChange={(event) => onAnswerChange(question.id, event.target.value)}
                  placeholder="Or type a more specific answer"
                />
              </div>
            ))}
          </div>

          <div className="onboarding-actions">
            <button type="button" className="onboarding-ghost-btn" onClick={onBack}>
              Back to report
            </button>
            <button
              type="button"
              className="onboarding-primary-btn"
              onClick={onNext}
              disabled={!isComplete}
            >
              Continue to company details
            </button>
          </div>
        </>
      )}
    </div>
  );
}
