const SIGN_UP_TIMEOUT_MS = 30_000;
const TOKEN_EXCHANGE_TIMEOUT_MS = 15_000;

export interface Net2PhoneBuildContact {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phoneNumber: string;
}

export interface Net2PhoneBuildResult {
  agentId: string;
  agentName: string;
  companyPhoneNumber: string;
}

export class Net2PhoneBuildError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "Net2PhoneBuildError";
  }
}

export function hasNet2PhoneBuildConfig(): boolean {
  return Boolean(process.env.NET2PHONE_SIGN_UP_URL?.trim());
}

async function signUpCustomer(payload: Net2PhoneBuildContact): Promise<{ apiKey: string; phoneNumber: string }> {
  const url = process.env.NET2PHONE_SIGN_UP_URL?.trim();
  if (!url) {
    throw new Net2PhoneBuildError("NET2PHONE_SIGN_UP_URL is not configured.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SIGN_UP_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        TenantId: "2",
      },
      body: JSON.stringify({
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        companyName: payload.companyName,
        phoneNumber: payload.phoneNumber,
        freeTrialType: "AI Agent",
      }),
      signal: controller.signal,
    });

    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      json = {};
    }

    if (!res.ok) {
      throw new Net2PhoneBuildError(
        typeof json.message === "string" ? json.message : "Sign-up failed.",
        res.status
      );
    }

    const apiKey = typeof json.apiKey === "string" ? json.apiKey : "";
    const phoneNumber = typeof json.phoneNumber === "string" ? json.phoneNumber : "";

    if (!apiKey || !phoneNumber) {
      throw new Net2PhoneBuildError("Sign-up response did not include an API key and phone number.");
    }

    return { apiKey, phoneNumber };
  } catch (error) {
    if (error instanceof Net2PhoneBuildError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new Net2PhoneBuildError("Sign-up request timed out.");
    }
    throw new Net2PhoneBuildError(
      error instanceof Error ? error.message : "Sign-up request failed."
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

async function exchangeApiKeyForJwt(apiKey: string): Promise<string> {
  const authBaseUrl =
    process.env.NET2PHONE_AUTH_URL?.trim() || "https://auth-qa.net2phone.com";
  const tokenUrl = new URL("/connect/token", authBaseUrl).toString();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TOKEN_EXCHANGE_TIMEOUT_MS);

  try {
    const body = new URLSearchParams({
      grant_type: "api_key",
      clientid: "api.key",
      api_key: apiKey,
    });

    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic YXBpLmtleTo=",
      },
      body: body.toString(),
      signal: controller.signal,
    });

    const text = await res.text();
    const json = text ? (JSON.parse(text) as Record<string, unknown>) : {};

    if (!res.ok || typeof json.access_token !== "string") {
      throw new Net2PhoneBuildError("Failed to exchange API key for a net2phone token.", res.status);
    }

    return json.access_token;
  } catch (error) {
    if (error instanceof Net2PhoneBuildError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new Net2PhoneBuildError("Token exchange timed out.");
    }
    throw new Net2PhoneBuildError(
      error instanceof Error ? error.message : "Token exchange failed."
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function getVirtualAgentBaseUrl(): string {
  return (
    process.env.NET2PHONE_VA_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_VA_API_URL?.trim() ||
    "https://api-qa.n2p.io/v2/virtual-agent"
  );
}

async function createVirtualAgent(
  accessToken: string,
  displayName: string,
  prompt: string
): Promise<{ id: string; display_name: string }> {
  const baseUrl = getVirtualAgentBaseUrl();
  const res = await fetch(`${baseUrl}/virtual-agents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      display_name: displayName,
      llm_model_tier: "standard",
      prompt: {
        value: prompt,
        parser: "jq",
      },
    }),
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  const agentRecord =
    typeof json.virtual_agent === "object" && json.virtual_agent
      ? (json.virtual_agent as Record<string, unknown>)
      : json;

  if (!res.ok || typeof agentRecord.id !== "string") {
    throw new Net2PhoneBuildError("Virtual agent creation failed.", res.status);
  }

  return {
    id: agentRecord.id,
    display_name:
      typeof agentRecord.display_name === "string" ? agentRecord.display_name : displayName,
  };
}

export async function buildNet2PhoneAgent(params: {
  contact: Net2PhoneBuildContact;
  displayName: string;
  prompt: string;
}): Promise<Net2PhoneBuildResult> {
  const signup = await signUpCustomer(params.contact);
  const accessToken = await exchangeApiKeyForJwt(signup.apiKey);
  const agent = await createVirtualAgent(accessToken, params.displayName, params.prompt);

  return {
    agentId: agent.id,
    agentName: agent.display_name,
    companyPhoneNumber: signup.phoneNumber,
  };
}
