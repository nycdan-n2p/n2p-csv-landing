const TWILIO_VERIFY_BASE = "https://verify.twilio.com/v2";

function getTwilioCredentials() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!sid || !token || !serviceSid) {
    throw new Error("Twilio credentials not configured");
  }

  return { sid, token, serviceSid };
}

function getTwilioAuthHeader() {
  const { sid, token } = getTwilioCredentials();
  return `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;
}

export async function sendPhoneCode(phone: string) {
  const { serviceSid } = getTwilioCredentials();
  const body = new URLSearchParams({
    To: phone,
    Channel: "sms",
  });

  const response = await fetch(`${TWILIO_VERIFY_BASE}/Services/${serviceSid}/Verifications`, {
    method: "POST",
    headers: {
      Authorization: getTwilioAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    signal: AbortSignal.timeout(10_000),
  });

  return response;
}

export async function verifyPhoneCode(phone: string, code: string) {
  const { serviceSid } = getTwilioCredentials();
  const body = new URLSearchParams({
    To: phone,
    Code: code,
  });

  const response = await fetch(`${TWILIO_VERIFY_BASE}/Services/${serviceSid}/VerificationCheck`, {
    method: "POST",
    headers: {
      Authorization: getTwilioAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    signal: AbortSignal.timeout(10_000),
  });

  return response;
}
