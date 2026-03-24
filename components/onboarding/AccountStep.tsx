"use client";

import type { FormEvent } from "react";
import type { OnboardingContactState } from "./types";

interface AccountStepProps {
  contact: OnboardingContactState;
  error: string;
  isSubmitting: boolean;
  onChange: (field: keyof OnboardingContactState, value: string) => void;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function AccountStep({
  contact,
  error,
  isSubmitting,
  onChange,
  onBack,
  onSubmit,
}: AccountStepProps) {
  return (
    <form className="onboarding-step" onSubmit={onSubmit}>
      <div className="onboarding-step-header">
        <span className="onboarding-kicker">Step 2</span>
        <h2>Tell us who this agent is being built for</h2>
        <p>
          This is the same handoff structure as Flex: once the behavior is clear, we capture the
          company and contact details needed to build the agent.
        </p>
      </div>

      <div className="onboarding-form-grid">
        <label className="onboarding-field">
          <span>First name</span>
          <input
            required
            value={contact.firstName}
            onChange={(event) => onChange("firstName", event.target.value)}
            placeholder="Alex"
          />
        </label>
        <label className="onboarding-field">
          <span>Last name</span>
          <input
            required
            value={contact.lastName}
            onChange={(event) => onChange("lastName", event.target.value)}
            placeholder="Chen"
          />
        </label>
        <label className="onboarding-field onboarding-field-wide">
          <span>Work email</span>
          <input
            required
            type="email"
            value={contact.email}
            onChange={(event) => onChange("email", event.target.value)}
            placeholder="alex@company.com"
          />
        </label>
        <label className="onboarding-field onboarding-field-wide">
          <span>Company</span>
          <input
            required
            value={contact.company}
            onChange={(event) => onChange("company", event.target.value)}
            placeholder="Your company name"
          />
        </label>
        <label className="onboarding-field">
          <span>Phone</span>
          <input
            required
            type="tel"
            value={contact.phone}
            onChange={(event) => onChange("phone", event.target.value)}
            placeholder="+1 (555) 000-0000"
          />
        </label>
        <label className="onboarding-field">
          <span>Website</span>
          <input
            value={contact.website ?? ""}
            onChange={(event) => onChange("website", event.target.value)}
            placeholder="https://company.com"
          />
        </label>
        <label className="onboarding-field">
          <span>Team size</span>
          <select
            value={contact.teamSize ?? ""}
            onChange={(event) => onChange("teamSize", event.target.value)}
          >
            <option value="">Select...</option>
            <option value="1-10">1–10 employees</option>
            <option value="11-50">11–50 employees</option>
            <option value="51-200">51–200 employees</option>
            <option value="200+">200+ employees</option>
          </select>
        </label>
        <label className="onboarding-field">
          <span>Current phone system</span>
          <select
            value={contact.phoneSystem ?? ""}
            onChange={(event) => onChange("phoneSystem", event.target.value)}
          >
            <option value="">Select...</option>
            <option value="net2phone">net2phone (current customer)</option>
            <option value="RingCentral">RingCentral</option>
            <option value="8x8">8x8</option>
            <option value="Zoom Phone">Zoom Phone</option>
            <option value="Microsoft Teams">Microsoft Teams Phone</option>
            <option value="Other">Other / Not sure</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="onboarding-inline-alert onboarding-inline-alert-error" role="alert">
          <span>{error}</span>
        </div>
      )}

      <div className="onboarding-actions">
        <button type="button" className="onboarding-ghost-btn" onClick={onBack}>
          Back to questions
        </button>
        <button type="submit" className="onboarding-primary-btn" disabled={isSubmitting}>
          {isSubmitting ? "Building your agent..." : "Build my agent"}
        </button>
      </div>
    </form>
  );
}
