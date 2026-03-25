import { NextRequest, NextResponse } from "next/server";
import { encodeSession, N2P_SESSION_COOKIE, N2P_STATE_COOKIE, SESSION_MAX_AGE } from "@/lib/net2phone-session";

function getConfig() {
  return {
    authBase: (process.env.NET2PHONE_AUTH_URL || "https://auth.net2phone.com").replace(/\/$/, ""),
    clientId: process.env.NET2PHONE_OAUTH_CLIENT_ID?.trim() ?? "",
    clientSecret: process.env.NET2PHONE_OAUTH_CLIENT_SECRET?.trim() ?? "",
    baseUrl: (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, ""),
  };
}

interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

async function exchangeCode(code: string, codeVerifier: string): Promise<TokenResponse> {
  const { authBase, clientId, clientSecret, baseUrl } = getConfig();
  const redirectUri = `${baseUrl}/api/auth/net2phone/callback`;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
    ...(clientSecret ? { client_secret: clientSecret } : {}),
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    ...(clientSecret
      ? { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}` }
      : {}),
  };

  const res = await fetch(`${authBase}/connect/token`, {
    method: "POST",
    headers,
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Token exchange failed (${res.status}): ${msg.slice(0, 300)}`);
  }

  return res.json() as Promise<TokenResponse>;
}

async function resolveAccountId(accessToken: string): Promise<string> {
  const { authBase } = getConfig();

  // 1. Try the OIDC userinfo endpoint
  try {
    const res = await fetch(`${authBase}/connect/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const info = (await res.json()) as Record<string, unknown>;
      const id =
        info.companyId ??
        info.company_id ??
        info.accountId ??
        info.account_id ??
        info.tenantId ??
        info.tenant_id;
      if (id) return String(id);
    }
  } catch {
    // fall through
  }

  // 2. Decode the JWT payload directly
  try {
    const parts = accessToken.split(".");
    if (parts.length >= 2) {
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf-8")
      ) as Record<string, unknown>;
      const id =
        payload.companyId ??
        payload.company_id ??
        payload.accountId ??
        payload.account_id ??
        payload.tenantId ??
        payload.tenant_id;
      if (id) return String(id);
    }
  } catch {
    // ignore
  }

  throw new Error("Could not determine net2phone account ID from token claims");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const { baseUrl } = getConfig();
  const errRedirect = (reason: string) =>
    NextResponse.redirect(`${baseUrl}/?n2p_error=${encodeURIComponent(reason)}`);

  if (errorParam) return errRedirect(errorParam);

  const stateCookie = req.cookies.get(N2P_STATE_COOKIE)?.value ?? "";
  const pipeIdx = stateCookie.indexOf("|");
  const storedState = pipeIdx > 0 ? stateCookie.slice(0, pipeIdx) : "";
  const codeVerifier = pipeIdx > 0 ? stateCookie.slice(pipeIdx + 1) : "";

  if (!code || !state || state !== storedState || !codeVerifier) {
    return errRedirect("invalid_state");
  }

  try {
    const tokenResp = await exchangeCode(code, codeVerifier);
    const accountId = await resolveAccountId(tokenResp.access_token);
    const sessionValue = encodeSession({ accessToken: tokenResp.access_token, accountId });

    const res = NextResponse.redirect(`${baseUrl}/?n2p_connected=1`);
    res.cookies.delete(N2P_STATE_COOKIE);
    res.cookies.set(N2P_SESSION_COOKIE, sessionValue, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("[n2p-oauth/callback]", err);
    return errRedirect("auth_failed");
  }
}
