import crypto from "crypto";

export const N2P_SESSION_COOKIE = "n2p_session";
export const N2P_STATE_COOKIE = "n2p_pkce_state";
export const SESSION_MAX_AGE = 300; // 5 minutes — just long enough to fetch + analyze

export interface N2PSession {
  accessToken: string;
  accountId: string;
}

function getSecret(): string {
  const s = process.env.CDR_SESSION_SECRET?.trim();
  if (!s) throw new Error("CDR_SESSION_SECRET is not configured");
  return s;
}

export function encodeSession(session: N2PSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const sig = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function decodeSession(cookie: string): N2PSession | null {
  try {
    const dotIdx = cookie.lastIndexOf(".");
    if (dotIdx < 0) return null;
    const payload = cookie.slice(0, dotIdx);
    const sig = cookie.slice(dotIdx + 1);
    const expected = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
    if (
      sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))
    ) {
      return null;
    }
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as N2PSession;
  } catch {
    return null;
  }
}
