import { NextRequest, NextResponse } from "next/server";
import { parsePhone, PhoneValidationError } from "@/lib/validation/phone";
import {
  createRecaptchaErrorResponse,
  verifyRecaptchaRequest,
} from "@/lib/recaptcha";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import { RECAPTCHA_ACTIONS } from "@/lib/recaptcha-actions";
import { sendPhoneCode } from "@/lib/twilio";

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientKey(request), "phone-send", 5, 3600);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    await verifyRecaptchaRequest(request, RECAPTCHA_ACTIONS.phoneSend);
  } catch (error) {
    return createRecaptchaErrorResponse(error);
  }

  let body: { phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Valid phone number is required" }, { status: 400 });
  }

  let phone: string;
  try {
    phone = parsePhone(body.phone);
  } catch (error) {
    if (error instanceof PhoneValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Valid phone number is required" }, { status: 400 });
  }

  try {
    const response = await sendPhoneCode(phone);
    if (!response.ok) {
      return NextResponse.json({ error: "Valid phone number is required" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Valid phone number is required" }, { status: 400 });
  }
}
