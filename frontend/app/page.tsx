"use client";

import { useState } from "react";

type DiscoveryCandidate = {
  id: string;
  title: string;
  source_url: string;
  official_source_url?: string | null;
  proposed_deadline?: string | null;
  review_status: string;
  reviewer_notes: string;
};

type Match = {
  settlement_id: string;
  settlement_name: string;
  status: string;
  reasons: string[];
  missing_fields: string[];
};

type Rule = {
  field: string;
  operator: string;
  value: string | number | boolean | string[];
  question?: string;
};

type Settlement = {
  id: string;
  name: string;
  company: string;
  summary: string;
  claim_deadline: string;
  payout_min?: number;
  payout_max?: number;
  benefit_summary?: string;
  proof_required: boolean;
  official_source_url: string;
  official_claim_url?: string;
  eligibility_rules: Rule[];
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [brands, setBrands] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [details, setDetails] = useState<Record<string, Settlement>>({});
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [catalog, setCatalog] = useState<Settlement[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [candidates, setCandidates] = useState<DiscoveryCandidate[] | null>(null);
  const [reviewError, setReviewError] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [deadlineFilter, setDeadlineFilter] = useState("all");

  async function runMatch(extraAnswers: Record<string, boolean> = answers) {
    const response = await fetch(API + "/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brands_used: brands.split(",").map((b) => b.trim()).filter(Boolean),
        answers: extraAnswers,
      }),
    });
    if (!response.ok) throw new Error("Could not check settlements.");
    const data = await response.json();
    setMatches(data.matches || []);

    const relevant = (data.matches || []).filter((m: Match) => m.status !== "unlikely");
    const loaded: Record<string, Settlement> = {};
    await Promise.all(
      relevant.map(async (m: Match) => {
        const res = await fetch(API + "/settlements/" + m.settlement_id);
        if (res.ok) loaded[m.settlement_id] = await res.json();
      })
    );
    setDetails(loaded);
  }

  async function findSettlements() {
    setLoading(true);
    setError("");
    setAnswers({});
    try {
      await runMatch({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function answer(field: string, value: boolean) {
    const next = { ...answers, [field]: value };
    setAnswers(next);
    setLoading(true);
    try {
      await runMatch(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function browseSettlements() {
    setCatalogLoading(true);
    setError("");
    try {
      const response = await fetch(API + "/settlements");
      if (!response.ok) throw new Error("Could not load settlements.");
      setCatalog(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCatalogLoading(false);
    }
  }

  const visibleCatalog = catalog.filter((s) => {
    const term = catalogSearch.trim().toLowerCase();
    const matchesText = !term || [s.name, s.company, s.summary].some((value) => value.toLowerCase().includes(term));
    const deadline = new Date(s.claim_deadline + "T23:59:59");
    const now = new Date();
    const daysLeft = (deadline.getTime() - now.getTime()) / 86400000;
    const matchesDeadline = deadlineFilter === "all" ||
      (deadlineFilter === "open" && daysLeft >= 0) ||
      (deadlineFilter === "30" && daysLeft >= 0 && daysLeft <= 30);
    return matchesText && matchesDeadline;
  }).sort((a, b) => a.claim_deadline.localeCompare(b.claim_deadline));

  async function loadReviewQueue() {
    setReviewLoading(true);
    setReviewError("");
    try {
      const response = await fetch(API + "/discovery/candidates");
      if (!response.ok) throw new Error("Could not load the review queue.");
      setCandidates(await response.json());
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Could not load candidates.");
    } finally {
      setReviewLoading(false);
    }
  }

  const relevantMatches = matches.filter((m) => m.status !== "unlikely");
  const today = new Date().toLocaleDateString("en-CA");

  const displayDate = (value: string) => new Date(value + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const isExpired = (value: string) => value < new Date().toLocaleDateString("sv-SE");

  return (
    <main className="site-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">S</span> Settlement Agent</div>
        <div className="topbar-right"><span className="status-dot" /> Independent settlement discovery</div>
      </header>

      <section className="hero">
        <div>
          <div className="eyebrow">Your settlement discovery assistant</div>
          <h1>Find claims you <span>might qualify for.</span></h1>
          <p>Search verified settlement records, answer eligibility questions, and review official claim instructions. Stay in control of every step.</p>
        </div>
        <div className="hero-visual" aria-label="How Settlement Agent works">
          <small>A clearer way to claim</small>
          <strong>Discover. Check. Claim.</strong>
          <p>Explore potential settlements with a guided, permission-first experience.</p>
          <div className="visual-steps"><span>01 Discover</span><span>02 Verify</span><span>03 Review</span></div>
        </div>
      </section>

      <section className="search-panel" aria-labelledby="search-heading">
        <h2 className="section-title" id="search-heading">Check your potential matches</h2>
        <p className="section-subtitle">Enter companies or organizations you have interacted with.</p>
        <label className="field-label" htmlFor="brands">Companies or organizations</label>
        <input id="brands" value={brands} onChange={(e) => setBrands(e.target.value)} placeholder="e.g. Americold, On Q Financial" style={{ width:"100%",padding:15,border:"1px solid #cfdce9",borderRadius:11 }} />
        <div className="search-actions">
          <button className="primary-btn" onClick={findSettlements} disabled={loading || !brands.trim()}>{loading ? "Checking..." : "Find my settlements →"}</button>
          <span className="hint">Separate multiple company names with commas.</span>
        </div>
        {error && <p role="alert" style={{color:"#aa3030"}}>{error}</p>}
      </section>

      <section className="catalog-section">
        <div className="section-header">
          <div><div className="eyebrow">Verified records</div><h2 className="section-title">Explore settlements</h2><p className="section-subtitle">A curated catalog based on reviewed settlement records.</p></div>
          <button className="secondary-btn" onClick={browseSettlements} disabled={catalogLoading}>{catalogLoading ? "Loading..." : catalog.length ? "Refresh catalog" : "Browse settlements →"}</button>
        </div>
        {catalog.length > 0 && <>
          <div className="catalog-controls">
            <input aria-label="Search settlements" placeholder="Search settlements or companies" value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} />
            <select aria-label="Filter by deadline" value={deadlineFilter} onChange={(e) => setDeadlineFilter(e.target.value)}>
              <option value="all">All deadlines</option><option value="open">Still open</option><option value="30">Due within 30 days</option>
            </select>
          </div>
          <p className="hint" aria-live="polite">{visibleCatalog.length} settlement{visibleCatalog.length === 1 ? "" : "s"} found</p>
          <div className="catalog-grid">
            {visibleCatalog.map(s => <article className="catalog-card" key={s.id}>
              <span className={"deadline-pill" + (isExpired(s.claim_deadline) ? " expired" : "")}>{isExpired(s.claim_deadline) ? "Deadline passed" : "Claim deadline: " + displayDate(s.claim_deadline)}</span>
              <h3>{s.name}</h3><p>{s.summary}</p>
              {s.benefit_summary && <p><strong>Potential benefit:</strong> {s.benefit_summary}</p>}
              <a className="card-link" href={s.official_source_url} target="_blank" rel="noopener noreferrer">View settlement details ↗</a>
            </article>)}
          </div>
          {visibleCatalog.length === 0 && <p>No settlements match your filters.</p>}
        </>}
      </section>

      {matches.length > 0 && <section className="results-section">
        <div className="eyebrow">Your results</div><h2 className="section-title">Potential matches</h2>
        {relevantMatches.length === 0 && <div className="match-card"><h3>No matches in this catalog</h3><p>Based on the information entered, no current records matched. This does not determine eligibility for other settlements.</p></div>}
        {relevantMatches.map(match => {
          const s = details[match.settlement_id]; if (!s) return null;
          const missing = s.eligibility_rules.filter(rule => match.missing_fields.includes(rule.field));
          return <article className="match-card" key={match.settlement_id}>
            <span className="deadline-pill">{match.status === "likely" ? "Likely match based on answers" : "More information needed"}</span>
            <h3>{s.name}</h3><p>{s.summary}</p><p><strong>Deadline:</strong> {displayDate(s.claim_deadline)}</p>
            {s.benefit_summary && <p><strong>Potential benefit:</strong> {s.benefit_summary}</p>}
            {missing.map(rule => <div className="question" key={rule.field}><p><strong>{rule.question || "Please confirm this eligibility requirement."}</strong></p><button onClick={() => answer(rule.field,true)}>Yes</button><button onClick={() => answer(rule.field,false)}>No</button></div>)}
            {match.status === "likely" && !isExpired(s.claim_deadline) && s.official_claim_url && <div className="search-actions"><a className="primary-btn" style={{textDecoration:"none"}} href={s.official_claim_url} target="_blank" rel="noopener noreferrer">Open official claim form ↗</a><a href={s.official_source_url} target="_blank" rel="noopener noreferrer">Review official details</a></div>}
            {isExpired(s.claim_deadline) && <p role="status">The listed deadline has passed. Check the official source for updates.</p>}
          </article>;
        })}
      </section>}

      <section className="claim-panel" aria-labelledby="assistant-heading">
        <div className="eyebrow">Coming next · Claim assistant</div>
        <h2 id="assistant-heading">Your claim. Your permission.</h2>
        <p>We're building a guided filing assistant that can prepare information for your review. Automated submission is not available yet. You will always review the specific claim and authorize any submission before it happens.</p>
        <div className="claim-steps"><div className="claim-step"><strong>01 · Prepare</strong>Collect eligibility answers and required documents.</div><div className="claim-step"><strong>02 · Review</strong>Confirm every detail and declaration.</div><div className="claim-step"><strong>03 · Authorize</strong>Approve a specific submission and receive a receipt.</div></div>
        <p className="hint">No claims are filed automatically by this version of the app.</p>
      </section>

      {process.env.NODE_ENV === "development" && <section className="review-panel">
        <div className="eyebrow">Developer tools · Local only</div><h2 className="section-title">Discovery review queue</h2>
        <p className="section-subtitle">Unverified leads remain separate from the published catalog. This screen does not approve or publish them.</p>
        <button className="secondary-btn" onClick={loadReviewQueue} disabled={reviewLoading}>{reviewLoading ? "Loading..." : "Load review queue"}</button>
        {reviewError && <p role="alert" style={{color:"#aa3030"}}>{reviewError}</p>}
        {candidates !== null && <div className="review-list"><p className="hint">{candidates.length} discovery candidates</p>{candidates.map(candidate => <article className="review-item" key={candidate.id}>
          <h3>{candidate.title}</h3><p>Status: {candidate.review_status} · Proposed deadline: {candidate.proposed_deadline || "Not checked"}</p>
          <p><a href="https://www.classaction.org/settlements" target="_blank" rel="noopener noreferrer">Discovery directory ↗</a>{candidate.official_source_url && <> · <a href={candidate.official_source_url} target="_blank" rel="noopener noreferrer">Candidate website ↗</a></>}</p>
          {candidate.reviewer_notes && <p>Notes: {candidate.reviewer_notes}</p>}
        </article>)}</div>}
      </section>}

      <footer className="site-footer">Settlement Agent provides informational matching assistance, not legal advice. A potential match is not a determination of legal entitlement. Verify all requirements and deadlines with the settlement administrator before filing.</footer>
    </main>
  );
}
