import { NextRequest, NextResponse } from "next/server";
import type { ReCaptchaAction } from "@/lib/recaptcha-actions";

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const DEFAULT_RECAPTCHA_MIN_SCORE = parseFloat(
  process.env.RECAPTCHA_MIN_SCORE || "0.5"
);

type RecaptchaErrorCode =
  | "recaptcha_not_configured"
  | "recaptcha_token_required"
  | "recaptcha_verification_failed"
  | "recaptcha_score_too_low"
  | "recaptcha_action_mismatch"
  | "recaptcha_hostname_mismatch";

interface GoogleRecaptchaVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
}

export class RecaptchaError extends Error {
  constructor(
    public code: RecaptchaErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(code);
    this.name = "RecaptchaError";
  }
}

function normalizeHost(host: string | null | undefined): string | null {
  if (!host) return null;
  return host.split(",")[0].trim().split(":")[0].toLowerCase() || null;
}

function getAllowedHostnames(): string[] {
  const raw = process.env.RECAPTCHA_ALLOWED_HOSTNAMES?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => normalizeHost(value))
    .filter((value): value is string => Boolean(value));
}

function getRequestHost(request: NextRequest): string | null {
  return normalizeHost(
    request.headers.get("x-forwarded-host") || request.nextUrl.host
  );
}

function getRequestIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor) return null;
  return forwardedFor.split(",")[0]?.trim() || null;
}

function getRecaptchaSecret(): string {
  const secret = process.env.RECAPTCHA_SECRET?.trim();
  if (!secret) {
    throw new RecaptchaError("recaptcha_not_configured");
  }
  return secret;
}

export async function verifyRecaptchaRequest(
  request: NextRequest,
  expectedAction: ReCaptchaAction,
  minScore?: number
) {
  const secret = getRecaptchaSecret();
  const token = request.headers.get("x-recaptcha-token")?.trim();
  if (!token) {
    throw new RecaptchaError("recaptcha_token_required");
  }

  const params = new URLSearchParams({
    secret,
    response: token,
  });

  const remoteIp = getRequestIp(request);
  if (remoteIp) params.set("remoteip", remoteIp);

  const response = await fetch(RECAPTCHA_VERIFY_URL, {
    method: "POST",
    body: params,
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new RecaptchaError("recaptcha_verification_failed", {
      status: response.status,
    });
  }

  const data = (await response.json()) as GoogleRecaptchaVerifyResponse;
  if (!data.success) {
    throw new RecaptchaError("recaptcha_verification_failed", {
      errorCodes: data["error-codes"] || [],
    });
  }

  if (data.action !== expectedAction) {
    throw new RecaptchaError("recaptcha_action_mismatch", {
      expectedAction,
      actualAction: data.action || null,
    });
  }

  const actualHostname = normalizeHost(data.hostname);
  const allowedHostnames = getAllowedHostnames();
  if (allowedHostnames.length > 0 && (!actualHostname || !allowedHostnames.includes(actualHostname))) {
    throw new RecaptchaError("recaptcha_hostname_mismatch", {
      actualHostname,
      allowedHostnames,
    });
  }

  const requestHost = getRequestHost(request);
  if (allowedHostnames.length === 0 && requestHost && actualHostname !== requestHost) {
    throw new RecaptchaError("recaptcha_hostname_mismatch", {
      requestHost,
      actualHostname,
    });
  }

  const score = Number.isFinite(data.score)
    ? Number(data.score)
    : Number.parseFloat(String(data.score ?? "0"));
  const threshold = minScore ?? DEFAULT_RECAPTCHA_MIN_SCORE;
  if (!Number.isFinite(score) || score < threshold) {
    throw new RecaptchaError("recaptcha_score_too_low", {
      actualScore: Number.isFinite(score) ? score : null,
      threshold,
    });
  }
}

export function createRecaptchaErrorResponse(error: unknown) {
  if (error instanceof RecaptchaError) {
    const status = error.code === "recaptcha_not_configured" ? 503 : 403;
    return NextResponse.json(
      {
        error:
          error.code === "recaptcha_not_configured"
            ? "Security check is temporarily unavailable. Please try again later."
            : "Security check failed. Please refresh the page and try again.",
        code: error.code,
      },
      { status }
    );
  }

  return NextResponse.json(
    {
      error: "Security check failed. Please refresh the page and try again.",
      code: "recaptcha_verification_failed",
    },
    { status: 403 }
  );
}
