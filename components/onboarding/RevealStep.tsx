"use client";

import type { BuildAgentResponse } from "./types";

interface RevealStepProps {
  selectedAgent: string;
  result: BuildAgentResponse;
  onClose: () => void;
}

export function RevealStep({ selectedAgent, result, onClose }: RevealStepProps) {
  return (
    <div className="onboarding-step">
      <div className="onboarding-step-header">
        <span className="onboarding-kicker">
          {result.mode === "live" ? "Agent created" : "Build brief ready"}
        </span>
        <h2>{result.displayName}</h2>
        <p>{result.statusMessage}</p>
      </div>

      <div className="reveal-grid">
        <div className="reveal-card reveal-card-primary">
          <h3>{selectedAgent}</h3>
          <p>
            {result.mode === "live"
              ? "Your agent configuration has been created and is ready for the next operational steps inside net2phone AI."
              : "Your agent brief has been prepared. Once the build credentials are configured, this same flow can create the agent directly."}
          </p>
        </div>
        <div className="reveal-card">
          <h4>Deployment status</h4>
          <p>{result.mode === "live" ? "Created in net2phone AI" : "Ready for final activation"}</p>
          {result.companyPhoneNumber && (
            <span className="reveal-meta">Assigned number: {result.companyPhoneNumber}</span>
          )}
        </div>
      </div>

      <div className="onboarding-actions">
        <button type="button" className="onboarding-primary-btn" onClick={onClose}>
          Return to the report
        </button>
      </div>
    </div>
  );
}
