export default function Home() {
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "72px 24px" }}>
      <p style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 18 }}>
        Settlement Agent
      </p>
      <h1 style={{ fontSize: 54, lineHeight: 1.05, margin: 0, maxWidth: 760 }}>
        Find money you may already be entitled to.
      </h1>
      <p style={{ fontSize: 20, lineHeight: 1.6, maxWidth: 650, marginTop: 24 }}>
        We match your information against verified class-action settlements and explain why you may qualify.
      </p>
      <section style={{ background: "white", padding: 28, borderRadius: 18, marginTop: 42, boxShadow: "0 8px 30px rgba(0,0,0,0.06)" }}>
        <h2 style={{ marginTop: 0 }}>Start with the companies you have used</h2>
        <p style={{ lineHeight: 1.6 }}>
          Answer a few simple questions. We will compare your answers with settlement eligibility rules and show possible matches.
        </p>
        <button style={{ marginTop: 10, padding: "14px 22px", borderRadius: 10, border: 0, fontSize: 16, cursor: "pointer", background: "#111", color: "white" }}>
          Find my settlements
        </button>
      </section>
      <p style={{ fontSize: 13, color: "#666", marginTop: 28 }}>
        Settlement Agent does not sign legal certifications on your behalf.
      </p>
    </main>
  );
}
