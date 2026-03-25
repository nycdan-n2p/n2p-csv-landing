import { NextResponse } from "next/server";
import crypto from "crypto";
import { N2P_STATE_COOKIE } from "@/lib/net2phone-session";

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function getConfig() {
  return {
    authBase: (process.env.NET2PHONE_AUTH_URL || "https://auth.net2phone.com").replace(/\/$/, ""),
    clientId: process.env.NET2PHONE_OAUTH_CLIENT_ID?.trim() ?? "",
    baseUrl: (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, ""),
  };
}

export async function GET() {
  const { authBase, clientId, baseUrl } = getConfig();

  if (!clientId) {
    return NextResponse.redirect(`${baseUrl}/?n2p_error=not_configured`);
  }

  // PKCE — code_verifier is 32 random bytes, code_challenge is SHA-256 of that
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(crypto.createHash("sha256").update(codeVerifier).digest());
  const state = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: `${baseUrl}/api/auth/net2phone/callback`,
    scope: "openid profile",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const res = NextResponse.redirect(`${authBase}/connect/authorize?${params}`);

  // Store state + verifier together; split on first dot in callback
  res.cookies.set(N2P_STATE_COOKIE, `${state}|${codeVerifier}`, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600, // 10 min to complete the auth flow
    path: "/",
  });

  return res;
}
