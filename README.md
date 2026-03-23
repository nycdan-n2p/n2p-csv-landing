# CDR Landing Page — net2phone AI

A landing page where visitors can upload their Call Detail Records (CDR) for free AI analysis. The AI recommends which of the 6 net2phone AI agents would have the highest impact, and the summary can be sent to HubSpot or a configurable webhook.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and add your keys:

   ```bash
   cp .env.example .env.local
   ```

   Required for CDR analysis:
   - `ANTHROPIC_API_KEY` — Claude API key for AI analysis

   Optional for lead capture:
   - `HUBSPOT_PORTAL_ID` — HubSpot portal ID
   - `HUBSPOT_FORM_GUID` — HubSpot form GUID
   - `CDR_LEAD_WEBHOOK_URL` — Generic webhook URL for MCP/integrations

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Features

- **CDR analysis**: Upload a CSV export from net2phone, RingCentral, 8x8, Zoom Phone, or any UCaaS. The AI analyzes patterns and recommends which agents (After-Hours, AI Routing, Queue Assistant, Re-engagement, Outbound, Netty) would help most.
- **Lead submission**: When visitors request a consultation, the AI summary (not raw data) plus contact info is sent to HubSpot and/or your webhook.
- **Rate limiting**: 5 analyses per IP per hour for the public endpoint.

## API Routes

- `POST /api/analyze-cdr` — Accepts `{ csvText: string }`, returns agent recommendations and metrics.
- `POST /api/submit-lead` — Accepts `{ contact: {...}, analysis?: {...} }`, forwards to HubSpot and/or `CDR_LEAD_WEBHOOK_URL`.
