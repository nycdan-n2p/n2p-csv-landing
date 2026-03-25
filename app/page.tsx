"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { type AnalysisSnapshot, ALL_AGENTS } from "@/lib/onboarding";

type AnalysisResult = AnalysisSnapshot;

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [n2pLoading, setN2pLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [starterAgent, setStarterAgent] = useState("");
  const [starterError, setStarterError] = useState("");
  const [onboardingAgent, setOnboardingAgent] = useState("");

  const runAnalysis = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setAnalysisError("Please upload a CSV file.");
      return;
    }

    setAnalysisError("");
    setLoading(true);
    setLoadingStep(0);

    const stepIds = ["ls1", "ls2", "ls3", "ls4", "ls5"];
    const iv = setInterval(() => {
      setLoadingStep((s) => {
        const next = s + 1;
        if (next >= stepIds.length) {
          clearInterval(iv);
          return s;
        }
        return next;
      });
    }, 650);

    try {
      const text = await file.text();
      const res = await fetch("/api/analyze-cdr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText: text }),
      });

      clearInterval(iv);
      setLoadingStep(4);

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Analysis failed");
      }

      setAnalysisResult({
        missedRate: json.missedRate ?? 0,
        shortCallsPct: json.shortCallsPct ?? 0,
        afterHoursPct: json.afterHoursPct ?? 0,
        agentsRecommended: json.agentsRecommended ?? 0,
        recommendedAgents: json.recommendedAgents ?? [],
        summary: json.summary ?? "",
        insights: json.insights,
      });
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  }, []);

  const fetchAndAnalyzeN2PCDR = useCallback(async () => {
    setAnalysisError("");
    setN2pLoading(true);
    setLoading(true);
    setLoadingStep(0);

    const stepIds = ["ls1", "ls2", "ls3", "ls4", "ls5"];
    const iv = setInterval(() => {
      setLoadingStep((s) => {
        const next = s + 1;
        if (next >= stepIds.length) { clearInterval(iv); return s; }
        return next;
      });
    }, 650);

    try {
      // Retrieve the CSV from the session the OAuth callback created
      const cdrRes = await fetch("/api/net2phone/cdr");
      if (!cdrRes.ok) {
        const json = await cdrRes.json() as { error?: string };
        throw new Error(json.error ?? "Could not retrieve your call history");
      }
      const csvText = await cdrRes.text();

      // Run the same AI analysis as the file-upload path
      const analyzeRes = await fetch("/api/analyze-cdr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });

      clearInterval(iv);
      setLoadingStep(4);

      const json = await analyzeRes.json() as {
        error?: string;
        missedRate?: number;
        shortCallsPct?: number;
        afterHoursPct?: number;
        agentsRecommended?: number;
        recommendedAgents?: string[];
        summary?: string;
        insights?: unknown;
      };
      if (!analyzeRes.ok) throw new Error(json.error ?? "Analysis failed");

      setAnalysisResult({
        missedRate: json.missedRate ?? 0,
        shortCallsPct: json.shortCallsPct ?? 0,
        afterHoursPct: json.afterHoursPct ?? 0,
        agentsRecommended: json.agentsRecommended ?? 0,
        recommendedAgents: json.recommendedAgents ?? [],
        summary: json.summary ?? "",
        insights: json.insights,
      });
    } catch (e) {
      clearInterval(iv);
      setAnalysisError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setN2pLoading(false);
      setTimeout(() => setLoading(false), 500);
    }
  }, []);

  // Detect ?n2p_connected=1 or ?n2p_error=... after OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("n2p_connected");
    const error = params.get("n2p_error");

    if (connected === "1") {
      window.history.replaceState({}, "", window.location.pathname);
      void fetchAndAnalyzeN2PCDR();
    } else if (error) {
      window.history.replaceState({}, "", window.location.pathname);
      const messages: Record<string, string> = {
        not_configured: "net2phone connection is not yet enabled. Please upload a file instead.",
        invalid_state: "The login session expired. Please try connecting again.",
        auth_failed: "Could not sign in to net2phone. Please try again.",
      };
      setAnalysisError(messages[error] ?? "net2phone connection failed. Please try again.");
      document.getElementById("analyzer")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [fetchAndAnalyzeN2PCDR]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAnalysisError("");
      runAnalysis(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const zone = document.getElementById("uploadZone");
    zone?.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setAnalysisError("");
      runAnalysis(file);
    }
  };

  const handleAnalyzeClick = () => {
    if (selectedFile) {
      runAnalysis(selectedFile);
    } else {
      fileInputRef.current?.click();
    }
  };

  const animateVal = (id: string, to: number, suffix: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const start = Date.now();
    const dur = 1000;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = (to * e).toFixed(1) + suffix;
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = to + suffix;
    };
    tick();
  };

  const showResults = useCallback((result: AnalysisResult) => {
    animateVal("missedRate", result.missedRate, "%");
    animateVal("shortCalls", result.shortCallsPct, "%");
    animateVal("afterHours", result.afterHoursPct, "%");
    const agentsEl = document.getElementById("agentsRec");
    if (agentsEl) agentsEl.textContent = String(result.agentsRecommended);
    const preview = document.getElementById("resultsPreview");
    preview?.classList.add("visible");
    preview?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  useEffect(() => {
    if (analysisResult && !loading) {
      const t = setTimeout(() => showResults(analysisResult), 50);
      return () => clearTimeout(t);
    }
  }, [analysisResult, loading, showResults]);

  const handleModalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const selectedAgent = (form.querySelector("#selectedAgent") as HTMLSelectElement)?.value ?? "";
    if (!selectedAgent) {
      setStarterError("Please select an agent.");
      return;
    }
    setStarterError("");
    setStarterAgent(selectedAgent);
    setOnboardingAgent(selectedAgent);
    setModalOpen(false);
  };

  const openModal = () => {
    setModalOpen(true);
    setStarterAgent(
      analysisResult?.recommendedAgents?.[0] || starterAgent || ALL_AGENTS[0]
    );
  };
  const closeModal = () => {
    setModalOpen(false);
    setStarterError("");
  };
  const closeOutside = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeModal();
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = modalOpen || Boolean(onboardingAgent) ? "hidden" : "";
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    };
  }, [modalOpen, onboardingAgent]);

  return (
    <>
      <nav>
        <a href="#" className="nav-logo">
          <div className="nav-logo-mark">2</div>
          net2phone AI
        </a>
        <div className="nav-links">
          <a href="#analyzer">Free Analysis</a>
          <a href="#agents">AI Agents</a>
          <a href="#proof">Results</a>
          <button type="button" className="nav-cta" onClick={openModal}>
            Create your agent now
          </button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-eyebrow">
          <div className="eyebrow-dot" />
          Now available for all net2phone accounts
        </div>
        <h1>
          Your calls are trying to tell you <em>something.</em>
        </h1>
        <p className="hero-sub">
          Upload your call history and get a free AI readiness report in seconds. See exactly where
          AI agents can recover missed revenue — with numbers from your actual data.
        </p>
        <div className="hero-actions">
          <a href="#analyzer" className="btn-primary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2v8M5 7l3 3 3-3"
                stroke="#fff"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 11v1a2 2 0 002 2h8a2 2 0 002-2v-1"
                stroke="#fff"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Get my free AI report
          </a>
          <a href="#agents" className="btn-secondary">
            See what&apos;s possible
          </a>
        </div>
        <div className="hero-proof">
          <div className="proof-stat">
            <div className="proof-stat-num">35%</div>
            <div className="proof-stat-label">avg. calls missed per account</div>
          </div>
          <div className="proof-divider" />
          <div className="proof-stat">
            <div className="proof-stat-num">2 min</div>
            <div className="proof-stat-label">to get your full report</div>
          </div>
          <div className="proof-divider" />
          <div className="proof-stat">
            <div className="proof-stat-num">AI</div>
            <div className="proof-stat-label">agents you can build</div>
          </div>
        </div>
      </section>

      <section className="analyzer-section" id="analyzer">
        <div className="analyzer-bg" />
        <div className="analyzer-inner">
          <div className="analyzer-copy">
            <div className="section-label">
              Free CDR analysis
            </div>
            <h2>
              Upload your call history. Get your <em>AI blueprint.</em>
            </h2>
            <p>
              Our AI analyzes your Call Detail Records and tells you exactly which agents would
              have the highest impact — with real numbers from your data, not industry averages.
            </p>
            <ul className="analyzer-steps">
              <li>
                <div className="step-badge">1</div>
                Connect your net2phone account with one click — or export your call history as a
                CSV from net2phone, RingCentral, 8x8, or Zoom Phone
              </li>
              <li>
                <div className="step-badge">2</div>
                Our AI scans every call: missed, short, after-hours, and repeat-caller patterns
              </li>
              <li>
                <div className="step-badge">3</div>
                Get a prioritized report with specific AI agent recommendations and the revenue
                impact you can expect
              </li>
            </ul>
            <p style={{ fontSize: 13 }}>
              Works with net2phone, RingCentral, 8x8, Zoom Phone, and any standard call-history
              export. No manual setup required.
            </p>
          </div>

          <div>
            {!analysisResult && (
              <div className="upload-paths">
                {/* Path A — upload a file */}
                <div className="upload-card">
                  <div className="upload-path-label">Don&apos;t have a file?</div>
                  <div
                    id="uploadZone"
                    className="upload-zone"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add("drag-over");
                    }}
                    onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="sr-only"
                      onChange={handleFileSelect}
                      aria-hidden
                    />
                    <div className="upload-icon">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M10 3v10M7 6l3-3 3 3"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M3 13v2a2 2 0 002 2h10a2 2 0 002-2v-2"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <h3>Drop your call history CSV here</h3>
                    <p>or click to browse</p>
                  </div>
                  <div className="format-tags">
                    <span className="format-tag">CSV</span>
                    <span className="format-tag">net2phone export</span>
                    <span className="format-tag">Any UCaaS format</span>
                  </div>
                  <button
                    type="button"
                    className="upload-btn"
                    onClick={handleAnalyzeClick}
                    disabled={loading || n2pLoading}
                  >
                    {loading && !n2pLoading ? "Analyzing…" : "Analyze my calls →"}
                  </button>
                  {analysisError && (
                    <div className="upload-error" role="alert">
                      {analysisError}
                    </div>
                  )}
                  <div className="upload-privacy">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M6 1L2 3v3c0 2.5 1.8 4.3 4 5 2.2-.7 4-2.5 4-5V3L6 1z"
                        stroke="currentColor"
                        strokeWidth="1"
                        fill="none"
                      />
                    </svg>
                    Your data is never stored or shared
                  </div>
                </div>

                {/* Path B — existing net2phone customer */}
                <div className="upload-card upload-card-n2p">
                  <div className="upload-path-label">Already a net2phone customer?</div>
                  <div className="n2p-connect-inner">
                    <div className="n2p-connect-logo">
                      <div className="nav-logo-mark" style={{ fontSize: 20, width: 36, height: 36 }}>2</div>
                    </div>
                    <h3 className="n2p-connect-heading">Pull your call data automatically</h3>
                    <p className="n2p-connect-body">
                      Sign in with your net2phone account and we&apos;ll fetch your recent call
                      history instantly — no export, no file hunting.
                    </p>
                    <a
                      href="/api/auth/net2phone/authorize"
                      className={`upload-btn n2p-connect-btn${n2pLoading ? " n2p-btn-loading" : ""}`}
                      aria-disabled={n2pLoading}
                      onClick={(e) => { if (n2pLoading) e.preventDefault(); }}
                    >
                      {n2pLoading ? (
                        <>
                          <span className="n2p-spinner" />
                          Fetching your call data…
                        </>
                      ) : (
                        "Connect my net2phone account →"
                      )}
                    </a>
                    <div className="upload-privacy" style={{ marginTop: 12 }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M6 1L2 3v3c0 2.5 1.8 4.3 4 5 2.2-.7 4-2.5 4-5V3L6 1z"
                          stroke="currentColor"
                          strokeWidth="1"
                          fill="none"
                        />
                      </svg>
                      Read-only access · session expires after 5 minutes
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="results-preview" id="resultsPreview">
              <div className="results-header">
                <div className="results-title">AI Readiness Report</div>
                <span className="results-badge">Analysis complete</span>
              </div>
              <div className="mini-kpis">
                <div className="mini-kpi">
                  <div className="mini-kpi-label">Missed call rate</div>
                  <div className="mini-kpi-val red" id="missedRate">
                    —
                  </div>
                </div>
                <div className="mini-kpi">
                  <div className="mini-kpi-label">Short calls (&lt;30s)</div>
                  <div className="mini-kpi-val amber" id="shortCalls">
                    —
                  </div>
                </div>
                <div className="mini-kpi">
                  <div className="mini-kpi-label">After-hours gap</div>
                  <div className="mini-kpi-val amber" id="afterHours">
                    —
                  </div>
                </div>
                <div className="mini-kpi">
                  <div className="mini-kpi-label">AI agents recommended</div>
                  <div className="mini-kpi-val green" id="agentsRec">
                    —
                  </div>
                </div>
              </div>
              {analysisResult && analysisResult.recommendedAgents?.length > 0 && (
                <div className="recommended-agents">
                  {analysisResult.recommendedAgents.map((agent, i) => (
                    <span key={i} className="recommended-agent-chip">
                      {agent}
                    </span>
                  ))}
                </div>
              )}
              {analysisResult && ((analysisResult.insights?.length ?? 0) > 0 || analysisResult.summary) && (
                <div className="results-findings">
                  {analysisResult.insights && analysisResult.insights.length > 0 && (
                    <div className="results-insights">
                      <div className="results-findings-label">Key findings from your data</div>
                      <ul className="results-insights-list">
                        {analysisResult.insights.slice(0, 2).map((insight, i) => (
                          <li key={i}>{insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysisResult.summary && (
                    <div className="results-summary-teaser">
                      <div className="results-findings-label">What this means</div>
                      <p>
                        {(() => {
                          const s = analysisResult.summary.trim();
                          const sentences = s.split(/(?<=[.!?])\s+/);
                          const teaser = sentences.slice(0, 2).join(" ");
                          return teaser || s.slice(0, 200) + (s.length > 200 ? "…" : "");
                        })()}
                      </p>
                    </div>
                  )}
                </div>
              )}
              <button type="button" className="results-btn" onClick={openModal}>
                Create your agent now
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M3 7h8M8 4l3 3-3 3"
                    stroke="#fff"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="section-label">How it works</div>
        <h2>AI that works the way your business does</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon" style={{ background: "linear-gradient(135deg, rgba(0,180,216,0.2), rgba(0,180,216,0.08))", color: "#00b4d8" }}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="4" y="7" width="7" height="10" rx="2" fill="currentColor" opacity="0.92" />
                <rect x="13" y="5" width="7" height="14" rx="2" fill="currentColor" opacity="0.24" />
                <path d="M8 12h8" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
            <h3>No rip-and-replace</h3>
            <p>
              AI agents layer on top of your existing net2phone setup. Your numbers, queues, and
              routing stay exactly as they are. AI handles what it can; your team handles the rest.
            </p>
            <div className="feature-accent" />
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ background: "linear-gradient(135deg, rgba(224,64,251,0.2), rgba(124,58,237,0.1))", color: "#b423d6" }}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M13.5 3.5L6.5 13h4l-1 7.5 8-11.5h-4z" fill="currentColor" />
              </svg>
            </div>
            <h3>Live in minutes, not months</h3>
            <p>
              Build and deploy your agent in minutes. And we&apos;re always here to help — custom build
              your agent with our team whenever you need it.
            </p>
            <div className="feature-accent" />
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(0,180,216,0.08))", color: "#6d38de" }}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3l7 3.2v5.3c0 4.2-2.6 7.9-7 9.5-4.4-1.6-7-5.3-7-9.5V6.2z" fill="currentColor" opacity="0.2" />
                <path d="M12 3l7 3.2v5.3c0 4.2-2.6 7.9-7 9.5-4.4-1.6-7-5.3-7-9.5V6.2z" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8.5 12.1l2.3 2.3 4.8-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3>Every call, accounted for</h3>
            <p>
              After-hours calls, queue overflow, outbound follow-ups, voicemail triage — AI agents
              cover every gap so nothing falls through the cracks.
            </p>
            <div className="feature-accent" />
          </div>
        </div>
      </section>

      <section className="agents-section" id="agents">
        <div className="agents-inner">
          <div className="section-label">AI agent library</div>
          <h2>Popular agents for calling. Or build any agent you need.</h2>
          <p>
            These six are common starting points for call-related gaps. Based on your CDR, we recommend
            which make sense — but you can create any AI agent on net2phone AI.
          </p>
          <div className="agents-grid">
            <div className="agent-card">
              <div className="agent-card-header">
                <span className="agent-badge" style={{ background: "rgba(0,180,216,0.15)", color: "#00b4d8" }}>
                  After-Hours Agent
                </span>
                <span className="agent-tag">Quick win</span>
              </div>
              <h3>Never miss a call at 5am or 7pm again</h3>
              <p>
                Handles inbound calls outside business hours — answers FAQs, captures intent,
                schedules callbacks, escalates emergencies. No live agents required.
              </p>
              <span className="agent-stat">
                Recovers <strong>50–70%</strong> of after-hours missed calls
              </span>
            </div>
            <div className="agent-card">
              <div className="agent-card-header">
                <span className="agent-badge" style={{ background: "rgba(224,64,251,0.15)", color: "#e040fb" }}>
                  AI Routing Agent
                </span>
                <span className="agent-tag">Quick win</span>
              </div>
              <h3>Route every caller to the right place, instantly</h3>
              <p>
                Detects caller intent before routing. Eliminates transfers, misroutes, and
                wrong-department confusion that wastes your team&apos;s time.
              </p>
              <span className="agent-stat">
                Reduces misrouted calls by <strong>60–80%</strong>
              </span>
            </div>
            <div className="agent-card">
              <div className="agent-card-header">
                <span className="agent-badge" style={{ background: "rgba(124,58,237,0.15)", color: "#7c3aed" }}>
                  Queue Assistant
                </span>
                <span className="agent-tag">Quick win</span>
              </div>
              <h3>Convert hold time into self-service time</h3>
              <p>
                During peak load, offers callers a callback, estimated wait, or self-service
                deflection. Keeps abandon rates low when your team is at capacity.
              </p>
              <span className="agent-stat">
                Deflects <strong>20–40%</strong> of peak overflow
              </span>
            </div>
            <div className="agent-card">
              <div className="agent-card-header">
                <span className="agent-badge" style={{ background: "rgba(0,180,216,0.15)", color: "#00b4d8" }}>
                  Re-engagement Agent
                </span>
                <span className="agent-tag">Strategic</span>
              </div>
              <h3>Reach repeat callers before they call again</h3>
              <p>
                Identifies customers who&apos;ve called multiple times without resolution and
                proactively reaches out. Closes loops before frustration becomes churn.
              </p>
              <span className="agent-stat">
                Eliminates <strong>30–50%</strong> of repeat contact volume
              </span>
            </div>
            <div className="agent-card">
              <div className="agent-card-header">
                <span className="agent-badge" style={{ background: "rgba(16,185,129,0.15)", color: "#059669" }}>
                  Outbound Agent
                </span>
                <span className="agent-tag">Strategic</span>
              </div>
              <h3>Scale outbound without scaling your team</h3>
              <p>
                Runs automated campaigns for reminders, surveys, follow-ups, and collections — at
                your current connect rate, 5–10x the volume.
              </p>
              <span className="agent-stat">
                Scale outbound by <strong>5–10x</strong> at same connect rate
              </span>
            </div>
            <div className="agent-card">
              <div className="agent-card-header">
                <span className="agent-badge" style={{ background: "rgba(124,58,237,0.15)", color: "#7c3aed" }}>
                  Virtual Agent
                </span>
                <span className="agent-tag">Strategic</span>
              </div>
              <h3>A fully autonomous front-line voice agent</h3>
              <p>
                net2phone AI handles complex multi-turn conversations — account lookups, scheduling,
                order status, tier-1 support — without a human in the loop.
              </p>
              <span className="agent-stat">
                Handles <strong>40–60%</strong> of inbound volume autonomously
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="proof-section" id="proof">
        <h2>Results that show up in the numbers</h2>
        <div className="testimonials">
          <div className="testimonial">
            <p className="testimonial-quote">
              &quot;We were missing 30% of our after-hours calls. Three days after deploying the
              After-Hours Agent, that number was zero. Our team didn&apos;t change a thing.&quot;
            </p>
            <div className="testimonial-author">
              <div className="author-avatar">
                MR
              </div>
              <div>
                <div className="author-name">Marcus R.</div>
                <div className="author-title">Operations Director, Logistics</div>
              </div>
            </div>
          </div>
          <div className="testimonial">
            <p className="testimonial-quote">
              &quot;The CDR analysis alone was worth it. I had no idea 40% of our answered calls
              were under 10 seconds. That&apos;s a routing problem we didn&apos;t know we had.&quot;
            </p>
            <div className="testimonial-author">
              <div className="author-avatar">
                SC
              </div>
              <div>
                <div className="author-name">Sandra C.</div>
                <div className="author-title">IT Manager, Healthcare group</div>
              </div>
            </div>
          </div>
          <div className="testimonial">
            <p className="testimonial-quote">
              &quot;We moved to the AI plan because of the outbound agent. We&apos;re running 3x the
              follow-up volume on the same team. ROI showed up in the first month.&quot;
            </p>
            <div className="testimonial-author">
              <div className="author-avatar">
                JT
              </div>
              <div>
                <div className="author-name">James T.</div>
                <div className="author-title">VP Sales, Insurance brokerage</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-bg" />
        <h2>
          Your next customer is calling <em>right now.</em>
        </h2>
        <p>
          Start with the free CDR analysis — or create your AI agent and deploy in days.
        </p>
        <div className="cta-actions">
          <a href="#analyzer" className="btn-white">
            Get my free AI report
          </a>
          <button type="button" className="btn-outline-white" onClick={openModal}>
            Create your agent now
          </button>
        </div>
      </section>

      <footer>
        <p>© 2026 net2phone. All rights reserved.</p>
        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Support</a>
          <a href="#">net2phone.com</a>
        </div>
      </footer>

      <div
        className={`loading-overlay ${loading ? "active" : ""}`}
        id="loadingOverlay"
        aria-live="polite"
        aria-busy={loading}
      >
        <div className="loading-spinner" />
        <div className="loading-steps">
          <div className={`loading-step ${loadingStep >= 0 ? "active" : ""}`} id="ls1">
            <div className="loading-step-dot" />
            Parsing call records...
          </div>
          <div className={`loading-step ${loadingStep >= 1 ? "active" : ""}`} id="ls2">
            <div className="loading-step-dot" />
            Detecting missed call patterns...
          </div>
          <div className={`loading-step ${loadingStep >= 2 ? "active" : ""}`} id="ls3">
            <div className="loading-step-dot" />
            Analyzing peak load windows...
          </div>
          <div className={`loading-step ${loadingStep >= 3 ? "active" : ""}`} id="ls4">
            <div className="loading-step-dot" />
            Mapping AI agent opportunities...
          </div>
          <div className={`loading-step ${loadingStep >= 4 ? "active" : ""}`} id="ls5">
            <div className="loading-step-dot" />
            Generating your report...
          </div>
        </div>
      </div>

      <div
        className={`modal-overlay ${modalOpen ? "active" : ""}`}
        id="modalOverlay"
        onClick={closeOutside}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
      >
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h2 id="modalTitle">Create your agent now</h2>
              <p className="modal-sub">
                Start with a CDR recommendation or pick any agent, then continue through the same
                guided build flow inside this experience.
              </p>
            </div>
            <button type="button" className="modal-close" onClick={closeModal} aria-label="Close">
              ✕
            </button>
          </div>
          <form className="form" onSubmit={handleModalSubmit}>
            <div className="form-group">
              <label htmlFor="selectedAgent">
                Which agent would you like to build? (or start with a recommendation)
              </label>
              <select
                id="selectedAgent"
                name="selectedAgent"
                required
                value={starterAgent}
                onChange={(e) => setStarterAgent(e.target.value)}
              >
                <option value="">Select an agent...</option>
                {(analysisResult?.recommendedAgents?.length
                  ? Array.from(new Set([...analysisResult.recommendedAgents, ...ALL_AGENTS]))
                  : [...ALL_AGENTS]
                ).map((agent) => (
                  <option key={agent} value={agent}>
                    {agent}
                  </option>
                ))}
              </select>
            </div>
            <div className="starter-callout">
              <strong>What happens next</strong>
              <p>
                We&apos;ll ask a few clarifying questions, gather the business details we need to
                personalize your agent, then complete the build right here in one guided experience.
              </p>
            </div>
            {starterError && (
              <div className="upload-error" role="alert">
                {starterError}
              </div>
            )}
            <button type="submit" className="form-submit">
              Continue to the guided build flow →
            </button>
            <p className="form-note">No redirect. You stay inside this experience.</p>
          </form>
        </div>
      </div>
      {onboardingAgent && (
        <OnboardingFlow
          selectedAgent={onboardingAgent}
          analysis={analysisResult}
          onClose={() => setOnboardingAgent("")}
        />
      )}
    </>
  );
}
