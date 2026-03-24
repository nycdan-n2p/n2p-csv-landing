import { NextRequest, NextResponse } from "next/server";
import { parseEmail, EmailValidationError } from "@/lib/validation/email";
import {
  createRecaptchaErrorResponse,
  verifyRecaptchaRequest,
} from "@/lib/recaptcha";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import { verifyEmailCode } from "@/lib/net2phone-verification";
import { RECAPTCHA_ACTIONS } from "@/lib/recaptcha-actions";

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientKey(request), "email-verify", 10, 3600);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    await verifyRecaptchaRequest(request, RECAPTCHA_ACTIONS.emailVerify);
  } catch (error) {
    return createRecaptchaErrorResponse(error);
  }

  let body: { email?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let email: string;
  try {
    email = parseEmail(body.email);
  } catch (error) {
    if (error instanceof EmailValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code || code.length !== 6) {
    return NextResponse.json({ error: "Code must be 6 characters" }, { status: 400 });
  }

  const result = await verifyEmailCode(email, code);
  if (result.ok) {
    return NextResponse.json({ success: true });
  }

  if (result.status === 409 || result.code === "email_already_in_use") {
    return NextResponse.json({ success: false, error: "Email already in use" }, { status: 409 });
  }
  if (result.status === 410 || result.code === "code_expired") {
    return NextResponse.json({ success: false, error: "Code expired" }, { status: 410 });
  }
  if (result.status === 404 || result.code === "email_not_found") {
    return NextResponse.json({ success: false, error: "Email not found" }, { status: 404 });
  }
  if (result.status >= 500) {
    return NextResponse.json(
      { success: false, error: "Verification service unavailable" },
      { status: 502 }
    );
  }

  return NextResponse.json(
    { success: false, error: "Invalid or expired code" },
    { status: 400 }
  );
}
