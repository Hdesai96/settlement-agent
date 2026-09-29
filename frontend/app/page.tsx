"use client";

import { useState } from "react";

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

  const relevantMatches = matches.filter((m) => m.status !== "unlikely");

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "72px 24px" }}>
      <p style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1.5 }}>Settlement Agent</p>
      <h1 style={{ fontSize: 52, lineHeight: 1.05, marginBottom: 18 }}>Find money you may already be entitled to.</h1>
      <p style={{ fontSize: 19, lineHeight: 1.6, maxWidth: 680 }}>
        Enter companies or organizations you have used. We check structured eligibility rules from official settlement sources.
      </p>

      <section style={{ background: "white", padding: 28, borderRadius: 18, marginTop: 36, boxShadow: "0 8px 30px rgba(0,0,0,0.06)" }}>
        <label htmlFor="brands" style={{ display: "block", fontWeight: 700, marginBottom: 10 }}>Companies or organizations</label>
        <input id="brands" value={brands} onChange={(e) => setBrands(e.target.value)}
          placeholder="Try Americold, On Q Financial, or Roseland Community Hospital"
          style={{ width: "100%", boxSizing: "border-box", padding: 14, borderRadius: 10, border: "1px solid #ccc", fontSize: 16 }} />
        <p style={{ fontSize: 13, color: "#666" }}>Separate multiple names with commas.</p>
        <button onClick={findSettlements} disabled={loading || !brands.trim()}
          style={{ padding: "14px 22px", borderRadius: 10, border: 0, fontSize: 16, cursor: "pointer", background: "#111", color: "white", opacity: loading || !brands.trim() ? 0.5 : 1 }}>
          {loading ? "Checking..." : "Find my settlements"}
        </button>
        {error && <p style={{ color: "#a00" }}>{error}</p>}
      </section>

      {matches.length > 0 && relevantMatches.length === 0 && (
        <section style={{ marginTop: 28, background: "white", padding: 24, borderRadius: 16 }}>
          <h2 style={{ marginTop: 0 }}>No matches in our current database</h2>
          <p>We only have a small verified set right now. This does not mean you are not eligible for other settlements.</p>
        </section>
      )}

      {relevantMatches.map((match) => {
        const settlement = details[match.settlement_id];
        if (!settlement) return null;
        const missingRules = settlement.eligibility_rules.filter((r) => match.missing_fields.includes(r.field));
        return (
          <article key={match.settlement_id} style={{ background: "white", padding: 26, borderRadius: 16, marginTop: 24 }}>
            <p style={{ textTransform: "uppercase", fontSize: 12, letterSpacing: 1.2, color: "#666" }}>
              {match.status === "likely" ? "Likely match based on your answers" : "Possible match"}
            </p>
            <h2>{settlement.name}</h2>
            <p style={{ lineHeight: 1.6 }}>{settlement.summary}</p>
            <p><strong>Claim deadline:</strong> {new Date(settlement.claim_deadline + "T12:00:00").toLocaleDateString()}</p>
            {(settlement.payout_min || settlement.payout_max) && (
              <p><strong>Potential benefit:</strong> {settlement.payout_min ? "$" + settlement.payout_min : ""}{settlement.payout_max ? " to $" + settlement.payout_max : ""}</p>
            )}

            {missingRules.map((rule) => (
              <div key={rule.field} style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid #eee" }}>
                <p style={{ fontWeight: 700 }}>{rule.question || "Please confirm this eligibility requirement."}</p>
                <button onClick={() => answer(rule.field, true)} style={{ padding: "10px 18px", marginRight: 10 }}>Yes</button>
                <button onClick={() => answer(rule.field, false)} style={{ padding: "10px 18px" }}>No</button>
              </div>
            ))}

            {match.status === "likely" && (
              <div style={{ marginTop: 22 }}>
                <a href={settlement.official_claim_url} target="_blank" rel="noreferrer"
                  style={{ display: "inline-block", padding: "12px 18px", background: "#111", color: "white", borderRadius: 9, textDecoration: "none", marginRight: 12 }}>
                  Go to official claim form
                </a>
                <a href={settlement.official_source_url} target="_blank" rel="noreferrer">Verify official settlement details</a>
              </div>
            )}
          </article>
        );
      })}

      <p style={{ fontSize: 13, color: "#666", marginTop: 30, lineHeight: 1.5 }}>
        Settlement Agent provides matching assistance, not legal advice. A match is not a determination of legal entitlement. Review the official settlement materials before submitting a claim.
      </p>
    </main>
  );
}
