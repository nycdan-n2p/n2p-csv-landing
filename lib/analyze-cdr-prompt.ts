/**
 * Landing-page-specific CDR analysis prompt.
 * Returns AI agent recommendations (which of the 6 agents to deploy).
 */

const LANDING_AGENTS = [
  "After-Hours Agent",
  "AI Routing Agent",
  "Queue Assistant",
  "Re-engagement Agent",
  "Outbound Agent",
  "Netty Virtual Agent",
] as const;

export function buildLandingCdrPrompt(csv: string): string {
  return `You are a call center data analyst for net2phone AI. Analyze the following CDR (Call Detail Record) CSV and recommend which AI agents would have the highest impact for this business.

The CSV columns are typically: Call_ID, Timestamp, Direction, Caller_Number, Dialed_Number, Agent_Name, Ext, Talk_Time_Sec, Hold_Time_Sec, Status, Queue_Name, Reason

Available AI agents to recommend:
1. After-Hours Agent — for after-hours missed calls
2. AI Routing Agent — for misrouting, transfers, wrong department
3. Queue Assistant — for queue overflow, abandon rates, peak load
4. Re-engagement Agent — for repeat callers without resolution
5. Outbound Agent — for outbound volume needs
6. Netty Virtual Agent — for complex inbound volume, tier-1 support

Return ONLY a valid JSON object — no explanation, no markdown fences, no extra text.

Required output fields:
- missedRate: number — percentage of calls that were missed/not answered (0–100)
- shortCallsPct: number — percentage of calls under 30 seconds (0–100)
- afterHoursPct: number — percentage of calls outside typical business hours 9–17 (0–100)
- agentsRecommended: number — how many of the 6 agents to recommend (1–6)
- recommendedAgents: array of strings — exact names from the list above. Match patterns:
  * After-hours missed calls → "After-Hours Agent"
  * Misrouting/transfers → "AI Routing Agent"
  * Queue overflow/abandon → "Queue Assistant"
  * Repeat callers → "Re-engagement Agent"
  * Outbound volume → "Outbound Agent"
  * Complex inbound volume → "Netty Virtual Agent"
- insights: array of strings — up to 5 key observations (complete sentences)
- summary: string — 3–5 sentences explaining what the data shows and why these agents would help. Be specific and tie recommendations to the numbers.

CDR data:
${csv}`;
}
