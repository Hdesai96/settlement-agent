"use client";

import { useState } from "react";

type Match = {
  settlement_id: string;
  settlement_name: string;
  status: string;
  reasons: string[];
  missing_fields: string[];
};

export default function Home() {
  const [brands, setBrands] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function findSettlements() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/match`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brands_used: brands
              .split(",")
              .map((brand) => brand.trim())
              .filter(Boolean),
            answers: {},
          }),
        }
      );

      if (!response.ok) throw new Error("Could not check settlements.");
      const data = await response.json();
      setMatches(data.matches || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "72px 24px" }}>
      <p style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 18 }}>
        Settlement Agent
      </p>

      <h1 style={{ fontSize: 54, lineHeight: 1.05, margin: 0, maxWidth: 760 }}>
        Find money you may already be entitled to.
      </h1>

      <p style={{ fontSize: 20, lineHeight: 1.6, maxWidth: 650, marginTop: 24 }}>
        Enter companies you have used. We compare your answers with structured settlement eligibility rules.
      </p>

      <section style={{ background: "white", padding: 28, borderRadius: 18, marginTop: 42, boxShadow: "0 8px 30px rgba(0,0,0,0.06)" }}>
        <label htmlFor="brands" style={{ display: "block", fontWeight: 700, marginBottom: 10 }}>
          Companies or services you have used
        </label>
        <input
          id="brands"
          value={brands}
          onChange={(event) => setBrands(event.target.value)}
          placeholder="ExampleCo, Apple, Amazon"
          style={{ width: "100%", boxSizing: "border-box", padding: 14, borderRadius: 10, border: "1px solid #ccc", fontSize: 16 }}
        />
        <p style={{ fontSize: 13, color: "#666" }}>Separate multiple companies with commas.</p>

        <button
          onClick={findSettlements}
          disabled={loading || !brands.trim()}
          style={{ marginTop: 10, padding: "14px 22px", borderRadius: 10, border: 0, fontSize: 16, cursor: "pointer", background: "#111", color: "white", opacity: loading || !brands.trim() ? 0.5 : 1 }}
        >
          {loading ? "Checking..." : "Find my settlements"}
        </button>

        {error && <p style={{ color: "#a00", marginTop: 18 }}>{error}</p>}
      </section>

      {matches.length > 0 && (
        <section style={{ marginTop: 34 }}>
          <h2>Your results</h2>
          {matches.map((match) => (
            <article key={match.settlement_id} style={{ background: "white", padding: 24, borderRadius: 16, marginTop: 14 }}>
              <h3 style={{ marginTop: 0 }}>{match.settlement_name}</h3>
              <p><strong>Status:</strong> {match.status}</p>
              {match.reasons.length > 0 && <p>{match.reasons.join(". ")}</p>}
              {match.missing_fields.length > 0 && (
                <p>More information needed: {match.missing_fields.join(", ")}</p>
              )}
            </article>
          ))}
        </section>
      )}

      <p style={{ fontSize: 13, color: "#666", marginTop: 28 }}>
        Settlement Agent does not determine legal entitlement or sign certifications on your behalf.
      </p>
    </main>
  );
}
