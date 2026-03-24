import { NextRequest, NextResponse } from "next/server";
import { parseEmail, EmailValidationError } from "@/lib/validation/email";
import {
  createRecaptchaErrorResponse,
  verifyRecaptchaRequest,
} from "@/lib/recaptcha";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import { sendEmailCode } from "@/lib/net2phone-verification";
import { RECAPTCHA_ACTIONS } from "@/lib/recaptcha-actions";

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientKey(request), "email-send", 10, 3600);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    await verifyRecaptchaRequest(request, RECAPTCHA_ACTIONS.emailSend);
  } catch (error) {
    return createRecaptchaErrorResponse(error);
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
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

  const { ok, status } = await sendEmailCode(email);
  if (ok) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { error: "Could not send verification code. Try again later or use a different email." },
    { status: status === 429 ? 429 : status >= 500 ? 502 : 400 }
  );
}
