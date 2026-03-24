"use client";

import type { OnboardingAnswers, OnboardingContact } from "@/lib/onboarding";

export type OnboardingAnswerMap = OnboardingAnswers;
export type OnboardingContactState = OnboardingContact;

export interface BuildAgentResponse {
  success: boolean;
  mode: "live" | "draft";
  displayName: string;
  statusMessage: string;
  agentId?: string;
  companyPhoneNumber?: string;
}
