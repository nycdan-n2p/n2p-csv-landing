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
          <p>{result.generatedIntent}</p>
        </div>
        <div className="reveal-card">
          <h4>Deployment status</h4>
          <p>{result.mode === "live" ? "Created in net2phone AI" : "Ready for final activation"}</p>
          {result.agentId && <span className="reveal-meta">Agent ID: {result.agentId}</span>}
          {result.companyPhoneNumber && (
            <span className="reveal-meta">Assigned number: {result.companyPhoneNumber}</span>
          )}
        </div>
      </div>

      <div className="prompt-preview-card">
        <div className="prompt-preview-header">
          <span>Prompt preview</span>
          <span>{result.mode === "live" ? "Live build" : "Draft build"}</span>
        </div>
        <p>{result.promptPreview}</p>
      </div>

      <div className="onboarding-actions">
        <button type="button" className="onboarding-primary-btn" onClick={onClose}>
          Return to the report
        </button>
      </div>
    </div>
  );
}
