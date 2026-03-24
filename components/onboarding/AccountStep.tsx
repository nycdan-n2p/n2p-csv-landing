"use client";

import { useEffect, useState } from "react";
import type { OnboardingContactState } from "./types";
import { RECAPTCHA_ACTIONS } from "@/lib/recaptcha-actions";
import { useRecaptcha } from "@/lib/use-recaptcha";

interface AccountStepProps {
  contact: OnboardingContactState;
  error: string;
  isSubmitting: boolean;
  onChange: (field: keyof OnboardingContactState, value: string) => void;
  onBack: () => void;
  onSubmit: () => Promise<void>;
}

function isValidCompanyWebsite(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(normalized);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.hostname.includes(".")
    );
  } catch {
    return false;
  }
}

function isTwoWordName(value: string): boolean {
  return value.trim().split(/\s+/).filter(Boolean).length >= 2;
}

export function AccountStep({
  contact,
  error,
  isSubmitting,
  onChange,
  onBack,
  onSubmit,
}: AccountStepProps) {
  const { siteKey, isReady, runRecaptcha } = useRecaptcha();
  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sent" | "verifying" | "verified">("idle");
  const [phoneStatus, setPhoneStatus] = useState<"idle" | "sent" | "verifying" | "verified">("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [emailFeedback, setEmailFeedback] = useState("");
  const [phoneFeedback, setPhoneFeedback] = useState("");

  useEffect(() => {
    setEmailStatus("idle");
    setEmailCode("");
    setEmailFeedback("");
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.email;
      delete next.emailVerify;
      return next;
    });
  }, [contact.email]);

  useEffect(() => {
    setPhoneStatus("idle");
    setPhoneCode("");
    setPhoneFeedback("");
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.phone;
      delete next.phoneVerify;
      return next;
    });
  }, [contact.phone]);

  const ensureFormIsValid = () => {
    const nextErrors: Record<string, string> = {};

    if (!isTwoWordName(contact.fullName)) {
      nextErrors.fullName = "Please enter your full name.";
    }
    if (!/\S+@\S+\.\S+/.test(contact.email)) {
      nextErrors.email = "Enter a valid work email.";
    }
    if (contact.phone.trim().length < 8) {
      nextErrors.phone = "Enter a valid phone number.";
    }
    if (!contact.companyName.trim()) {
      nextErrors.companyName = "Company name is required.";
    }
    if (!isValidCompanyWebsite(contact.companyWebsite)) {
      nextErrors.companyWebsite = "Enter a valid company website.";
    }

    setFieldErrors((current) => ({ ...current, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const withRecaptcha = async (action: keyof typeof RECAPTCHA_ACTIONS) => {
    if (!siteKey || !isReady) {
      throw new Error("Security check is not ready yet. Please wait a moment and try again.");
    }
    return runRecaptcha(RECAPTCHA_ACTIONS[action]);
  };

  const handleSendEmailCode = async () => {
    if (!ensureFormIsValid()) return;
    try {
      const token = await withRecaptcha("emailSend");
      const res = await fetch("/api/verification/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Recaptcha-Token": token,
        },
        body: JSON.stringify({ email: contact.email }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Could not send email code.");
      }
      setEmailStatus("sent");
      setEmailFeedback("Verification code sent to your email.");
    } catch (err) {
      setFieldErrors((current) => ({
        ...current,
        emailVerify: err instanceof Error ? err.message : "Could not send email code.",
      }));
    }
  };

  const handleSendPhoneCode = async () => {
    if (!ensureFormIsValid()) return;
    try {
      const token = await withRecaptcha("phoneSend");
      const res = await fetch("/api/verification/phone/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Recaptcha-Token": token,
        },
        body: JSON.stringify({ phone: contact.phone }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Could not send phone code.");
      }
      setPhoneStatus("sent");
      setPhoneFeedback("Verification code sent by SMS.");
    } catch (err) {
      setFieldErrors((current) => ({
        ...current,
        phoneVerify: err instanceof Error ? err.message : "Could not send phone code.",
      }));
    }
  };

  const handleVerifyEmailCode = async () => {
    try {
      const token = await withRecaptcha("emailVerify");
      const res = await fetch("/api/verification/email/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Recaptcha-Token": token,
        },
        body: JSON.stringify({ email: contact.email, code: emailCode }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Could not verify email.");
      }
      setEmailStatus("verified");
      setEmailFeedback("Email verified.");
      setFieldErrors((current) => {
        const next = { ...current };
        delete next.emailVerify;
        return next;
      });
    } catch (err) {
      setFieldErrors((current) => ({
        ...current,
        emailVerify: err instanceof Error ? err.message : "Could not verify email.",
      }));
    }
  };

  const handleVerifyPhoneCode = async () => {
    try {
      const token = await withRecaptcha("phoneVerify");
      const res = await fetch("/api/verification/phone/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Recaptcha-Token": token,
        },
        body: JSON.stringify({ phone: contact.phone, code: phoneCode }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Could not verify phone.");
      }
      setPhoneStatus("verified");
      setPhoneFeedback("Phone verified.");
      setFieldErrors((current) => {
        const next = { ...current };
        delete next.phoneVerify;
        return next;
      });
    } catch (err) {
      setFieldErrors((current) => ({
        ...current,
        phoneVerify: err instanceof Error ? err.message : "Could not verify phone.",
      }));
    }
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ensureFormIsValid()) return;

    if (emailStatus !== "verified") {
      setFieldErrors((current) => ({
        ...current,
        emailVerify: "Please verify your email before continuing.",
      }));
      return;
    }

    if (phoneStatus !== "verified") {
      setFieldErrors((current) => ({
        ...current,
        phoneVerify: "Please verify your phone before continuing.",
      }));
      return;
    }

    await onSubmit();
  };

  return (
    <form className="onboarding-step" onSubmit={handleFormSubmit}>
      <div className="onboarding-step-header">
        <span className="onboarding-kicker">Step 2</span>
        <h2>Tell us who this agent is being built for</h2>
        <p>
          This matches the Flex flow: company details first, then email and phone confirmation
          before the build can start.
        </p>
      </div>

      <div className="onboarding-form-grid">
        <label className="onboarding-field onboarding-field-wide">
          <span>Full name</span>
          <input
            required
            value={contact.fullName}
            onChange={(event) => onChange("fullName", event.target.value)}
            placeholder="Alex Chen"
          />
          {fieldErrors.fullName && <small className="onboarding-field-error">{fieldErrors.fullName}</small>}
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
          {fieldErrors.email && <small className="onboarding-field-error">{fieldErrors.email}</small>}
        </label>
        <label className="onboarding-field onboarding-field-wide">
          <span>Phone</span>
          <input
            required
            type="tel"
            value={contact.phone}
            onChange={(event) => onChange("phone", event.target.value)}
            placeholder="+1 (555) 000-0000"
          />
          {fieldErrors.phone && <small className="onboarding-field-error">{fieldErrors.phone}</small>}
        </label>
        <label className="onboarding-field onboarding-field-wide">
          <span>Company</span>
          <input
            required
            value={contact.companyName}
            onChange={(event) => onChange("companyName", event.target.value)}
            placeholder="Your company name"
          />
          {fieldErrors.companyName && <small className="onboarding-field-error">{fieldErrors.companyName}</small>}
        </label>
        <label className="onboarding-field onboarding-field-wide">
          <span>Company website</span>
          <input
            required
            value={contact.companyWebsite}
            onChange={(event) => onChange("companyWebsite", event.target.value)}
            placeholder="https://company.com"
          />
          {fieldErrors.companyWebsite && (
            <small className="onboarding-field-error">{fieldErrors.companyWebsite}</small>
          )}
        </label>
      </div>

      <div className="verification-grid">
        <div className="verification-card">
          <div className="verification-top">
            <div>
              <strong>Email confirmation</strong>
              <p>Send a 6-digit code to your work email.</p>
            </div>
            <span className={`verification-badge ${emailStatus === "verified" ? "verified" : ""}`}>
              {emailStatus === "verified" ? "Verified" : "Required"}
            </span>
          </div>
          <div className="verification-actions">
            <button type="button" className="verification-btn" onClick={handleSendEmailCode}>
              {emailStatus === "sent" || emailStatus === "verified" ? "Resend code" : "Send code"}
            </button>
            {emailStatus !== "idle" && (
              <>
                <input
                  className="verification-input"
                  inputMode="numeric"
                  maxLength={6}
                  value={emailCode}
                  onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                />
                <button type="button" className="verification-btn verification-btn-secondary" onClick={handleVerifyEmailCode}>
                  Verify
                </button>
              </>
            )}
          </div>
          {emailFeedback && <small className="verification-help">{emailFeedback}</small>}
          {fieldErrors.emailVerify && <small className="onboarding-field-error">{fieldErrors.emailVerify}</small>}
        </div>

        <div className="verification-card">
          <div className="verification-top">
            <div>
              <strong>Phone confirmation</strong>
              <p>Send a 6-digit code by SMS.</p>
            </div>
            <span className={`verification-badge ${phoneStatus === "verified" ? "verified" : ""}`}>
              {phoneStatus === "verified" ? "Verified" : "Required"}
            </span>
          </div>
          <div className="verification-actions">
            <button type="button" className="verification-btn" onClick={handleSendPhoneCode}>
              {phoneStatus === "sent" || phoneStatus === "verified" ? "Resend code" : "Send code"}
            </button>
            {phoneStatus !== "idle" && (
              <>
                <input
                  className="verification-input"
                  inputMode="numeric"
                  maxLength={6}
                  value={phoneCode}
                  onChange={(event) => setPhoneCode(event.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                />
                <button type="button" className="verification-btn verification-btn-secondary" onClick={handleVerifyPhoneCode}>
                  Verify
                </button>
              </>
            )}
          </div>
          {phoneFeedback && <small className="verification-help">{phoneFeedback}</small>}
          {fieldErrors.phoneVerify && <small className="onboarding-field-error">{fieldErrors.phoneVerify}</small>}
        </div>
      </div>

      {!siteKey && (
        <div className="onboarding-inline-alert onboarding-inline-alert-error" role="alert">
          <span>reCAPTCHA is not configured. Email and phone verification cannot run yet.</span>
        </div>
      )}

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
