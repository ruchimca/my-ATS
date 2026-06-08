import { getJobs, getCandidates, isDbConfigured } from "../../lib/db";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

const PINK_DARK = "#9d174d";

function roleName(filename) {
  if (!filename) return "Untitled role";
  return filename.replace(/\.[^.]+$/, "");
}

function healthOf(strong) {
  if (strong >= 3) return { icon: "🟢", label: "Healthy" };
  if (strong >= 1) return { icon: "🟡", label: "Thin" };
  return { icon: "🔴", label: "None" };
}

function avg(nums) {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export default async function Report() {
  const configured = isDbConfigured();
  const roleStats = [];
  const allScores = [];
  let totalCandidates = 0;
  let totalStrong = 0;
  let dbError = null;

  if (configured) {
    try {
      const jobs = await getJobs();
      for (const job of jobs) {
        const cands = await getCandidates(job.id);
        const scores = cands
          .map((c) => c.fit_score)
          .filter((s) => Number.isFinite(s));
        const strong = cands.filter(
          (c) => Number.isFinite(c.fit_score) && c.fit_score >= 7,
        ).length;
        const top = cands.reduce(
          (best, c) =>
            Number.isFinite(c.fit_score) &&
            (!best || c.fit_score > best.fit_score)
              ? c
              : best,
          null,
        );
        totalCandidates += cands.length;
        totalStrong += strong;
        allScores.push(...scores);
        roleStats.push({
          name: roleName(job.filename),
          count: cands.length,
          strong,
          avg: avg(scores),
          top,
        });
      }
    } catch (e) {
      dbError = e?.message || "Could not reach the database.";
    }
  }

  const overallAvg = avg(allScores);
  const generated = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const kpiCard = {
    flex: "1 1 140px",
    background: "#fdf2f8",
    border: "1px solid #fbcfe8",
    borderRadius: "10px",
    padding: "1rem",
    textAlign: "center",
  };
  const kpiNum = { fontSize: "1.8rem", fontWeight: 800, color: PINK_DARK };
  const kpiLabel = { fontSize: "0.78rem", color: "#6b7280", marginTop: "0.2rem" };
  const th = {
    textAlign: "left",
    padding: "0.6rem 0.7rem",
    fontSize: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    color: PINK_DARK,
    borderBottom: "2px solid #fbcfe8",
  };
  const td = {
    padding: "0.6rem 0.7rem",
    borderBottom: "1px solid #f3e8ee",
    color: "#374151",
    fontSize: "0.9rem",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        color: "#1f2937",
        padding: "2rem 1rem 4rem",
      }}
    >
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff !important; } }`}</style>

      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "2.5rem",
        }}
      >
        {/* Toolbar (hidden when printing) */}
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <a
            href="/"
            style={{ color: PINK_DARK, fontWeight: 600, textDecoration: "none" }}
          >
            ← Back to tracker
          </a>
          <PrintButton />
        </div>

        {/* Report header */}
        <h1 style={{ fontSize: "1.8rem", margin: 0, color: PINK_DARK }}>
          Hiring Executive Summary
        </h1>
        <p style={{ margin: "0.3rem 0 1.75rem", color: "#6b7280", fontSize: "0.9rem" }}>
          my-ATS · Generated {generated} · Confidential
        </p>

        {dbError ? (
          <p style={{ color: "#991b1b" }}>Could not load data: {dbError}</p>
        ) : null}

        {/* KPIs */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            marginBottom: "2rem",
          }}
        >
          <div style={kpiCard}>
            <div style={kpiNum}>{roleStats.length}</div>
            <div style={kpiLabel}>Open roles</div>
          </div>
          <div style={kpiCard}>
            <div style={kpiNum}>{totalCandidates}</div>
            <div style={kpiLabel}>Candidates</div>
          </div>
          <div style={kpiCard}>
            <div style={kpiNum}>{totalStrong}</div>
            <div style={kpiLabel}>Strong matches (7+)</div>
          </div>
          <div style={kpiCard}>
            <div style={kpiNum}>
              {overallAvg != null ? `${overallAvg.toFixed(1)}` : "—"}
            </div>
            <div style={kpiLabel}>Avg fit / 10</div>
          </div>
        </div>

        {/* Roles overview */}
        <h2 style={{ fontSize: "1.1rem", color: PINK_DARK, margin: "0 0 0.75rem" }}>
          Roles overview
        </h2>
        {roleStats.length === 0 ? (
          <p style={{ color: "#6b7280" }}>
            No jobs yet. Add a job description and import resumes to populate this
            report.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Role</th>
                <th style={{ ...th, textAlign: "center" }}>Candidates</th>
                <th style={{ ...th, textAlign: "center" }}>Strong (7+)</th>
                <th style={{ ...th, textAlign: "center" }}>Avg fit</th>
                <th style={th}>Top candidate</th>
                <th style={{ ...th, textAlign: "center" }}>Health</th>
              </tr>
            </thead>
            <tbody>
              {roleStats.map((r, i) => {
                const h = healthOf(r.strong);
                return (
                  <tr key={i}>
                    <td style={{ ...td, fontWeight: 600 }}>{r.name}</td>
                    <td style={{ ...td, textAlign: "center" }}>{r.count}</td>
                    <td style={{ ...td, textAlign: "center" }}>{r.strong}</td>
                    <td style={{ ...td, textAlign: "center" }}>
                      {r.avg != null ? r.avg.toFixed(1) : "—"}
                    </td>
                    <td style={td}>
                      {r.top
                        ? `${r.top.name}${Number.isFinite(r.top.fit_score) ? ` — ${r.top.fit_score}/10` : ""}`
                        : "—"}
                    </td>
                    <td style={{ ...td, textAlign: "center", whiteSpace: "nowrap" }}>
                      {h.icon} {h.label}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <p
          style={{
            marginTop: "2.5rem",
            fontSize: "0.78rem",
            color: "#9ca3af",
            textAlign: "center",
          }}
        >
          Generated by my-ATS
        </p>
      </div>
    </main>
  );
}
