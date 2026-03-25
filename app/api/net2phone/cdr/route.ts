import { NextRequest, NextResponse } from "next/server";
import { decodeSession, N2P_SESSION_COOKIE } from "@/lib/net2phone-session";

function getAppApiBase(): string {
  return (process.env.NET2PHONE_APP_API_URL || "https://app.net2phone.com").replace(/\/$/, "");
}

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get(N2P_SESSION_COOKIE)?.value;

  if (!sessionCookie) {
    return NextResponse.json(
      { error: "No net2phone session found. Please connect your account again." },
      { status: 401 }
    );
  }

  const session = decodeSession(sessionCookie);
  if (!session) {
    return NextResponse.json(
      { error: "Session expired or invalid. Please reconnect your net2phone account." },
      { status: 401 }
    );
  }

  const { accessToken, accountId } = session;

  // Fetch the last 90 days of all calls for the account
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 90);

  const requestBody = {
    timeZone: "US/Eastern",
    filter: {
      userId: null,
      from: from.toISOString().split("T")[0],
      to: now.toISOString().split("T")[0],
      direction: null,
      resultTypes: [],
      userIds: null,
      departments: [],
      callQueueIds: [],
      onlyVoiceMails: false,
      onlyRecordings: false,
      callFeatures: [],
      phoneNumber: "",
    },
    languageCode: "en",
  };

  const url = `${getAppApiBase()}/api/account/${accountId}/callhistorysummaryv2/csv`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "x-application-name": "Unite",
        "x-ACCEPT-VERSION": "v1.1",
        Accept: "text/csv, application/json",
        "Accept-Language": "en-US",
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      console.error(`[n2p-cdr] API error ${res.status}:`, msg.slice(0, 400));
      return NextResponse.json(
        {
          error:
            res.status === 401 || res.status === 403
              ? "Your net2phone session doesn't have permission to access call history. Please reconnect."
              : `Could not retrieve call history (${res.status}). Please try again.`,
        },
        { status: 502 }
      );
    }

    const csv = await res.text();

    // Clear the short-lived session cookie once the data is consumed
    const resp = new NextResponse(csv, {
      status: 200,
      headers: { "Content-Type": "text/csv" },
    });
    resp.cookies.delete(N2P_SESSION_COOKIE);
    return resp;
  } catch (err) {
    console.error("[n2p-cdr]", err);
    return NextResponse.json(
      { error: "Failed to retrieve call history. Please try again." },
      { status: 500 }
    );
  }
}
