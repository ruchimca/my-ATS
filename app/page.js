export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "2rem",
        background: "#0f172a",
        color: "#f8fafc",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", margin: 0 }}>my-ATS</h1>
      <p style={{ fontSize: "1.1rem", color: "#94a3b8", marginTop: "0.75rem" }}>
        Your personal Applicant Tracking System — coming soon.
      </p>
      <p style={{ fontSize: "0.9rem", color: "#64748b", marginTop: "2rem" }}>
        Step 1 of 5 — it&apos;s alive!
      </p>
    </main>
  );
}
