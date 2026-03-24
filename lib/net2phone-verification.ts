const BASE_URL = process.env.NET2PHONE_AUTH_URL || "https://auth.net2phone.com";

export async function sendEmailCode(email: string): Promise<{ ok: boolean; status: number }> {
  const endpoint = `${BASE_URL}/api/verification/send-code`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    signal: AbortSignal.timeout(10_000),
  });

  if (res.status === 204) {
    return { ok: true, status: res.status };
  }

  return { ok: res.ok, status: res.status };
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; status: number; code?: string };

export async function verifyEmailCode(
  email: string,
  code: string
): Promise<VerifyResult> {
  const endpoint = `${BASE_URL}/api/verification/verify-code`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
    signal: AbortSignal.timeout(10_000),
  });

  if (res.status === 204) {
    return { ok: true };
  }

  let body: { code?: string } = {};
  try {
    if (res.headers.get("content-type")?.includes("application/json")) {
      body = await res.json();
    }
  } catch {
    body = {};
  }

  return { ok: false, status: res.status, code: body.code };
}
