import {
  getCandidates,
  isDbConfigured,
  getActiveJobDescription,
  getJobs,
} from "../lib/db";
import { deleteCandidate } from "./actions";
import UploadResumes from "./UploadResumes";
import JobDescription from "./JobDescription";
import DeleteButton from "./DeleteButton";

// Always read fresh data from the database on each request.
export const dynamic = "force-dynamic";

const PINK = "#db2777";
const PINK_DARK = "#9d174d";

function fitStyle(score) {
  if (score >= 8) return { bg: "#dcfce7", fg: "#166534" };
  if (score >= 5) return { bg: "#fef3c7", fg: "#92400e" };
  return { bg: "#fee2e2", fg: "#991b1b" };
}

const th = {
  padding: "0.6rem 0.7rem",
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  color: PINK_DARK,
  whiteSpace: "nowrap",
  borderBottom: "1px solid #fbcfe8",
};

const td = {
  padding: "0.6rem 0.7rem",
  verticalAlign: "top",
  color: "#374151",
};

export default async function Home() {
  let candidates = [];
  let jobs = [];
  let job = null;
  let dbError = null;
  const configured = isDbConfigured();

  if (configured) {
    try {
      jobs = await getJobs();
      job = await getActiveJobDescription();
      candidates = await getCandidates(job?.id);
    } catch (e) {
      dbError = e?.message || "Could not reach the database.";
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#fff0f6",
        color: "#1f2937",
        padding: "2rem 1rem 4rem",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <header
          style={{
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ fontSize: "2rem", margin: 0, color: PINK_DARK }}>
              my-ATS 💗
            </h1>
            <p style={{ margin: "0.4rem 0 0", color: "#6b7280" }}>
              Pick a job, import resumes, see the best fits ranked.
            </p>
          </div>
          <a
            href="/report"
            style={{
              background: "#fff",
              color: PINK_DARK,
              border: "1px solid #f9a8d4",
              borderRadius: "8px",
              padding: "0.6rem 1.1rem",
              fontSize: "0.95rem",
              fontWeight: 600,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            📊 Executive report
          </a>
        </header>

        {!configured || dbError ? (
          <div
            style={{
              background: "#fff",
              border: "1px solid #f9a8d4",
              borderRadius: "12px",
              padding: "1.25rem 1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <strong style={{ color: PINK_DARK }}>
              Database not connected yet
            </strong>
            <p style={{ margin: "0.5rem 0 0", color: "#6b7280" }}>
              The tracker is ready, but it needs a database to save candidates.
            </p>
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          {/* Left: controls */}
          <div style={{ flex: "0 1 300px", minWidth: "280px" }}>
            <JobDescription jobs={jobs} current={job} />
            <UploadResumes />
          </div>

          {/* Right: candidates table */}
          <div style={{ flex: "1 1 640px", minWidth: 0 }}>
            <h2
              style={{
                margin: "0 0 1rem",
                fontSize: "1.1rem",
                color: PINK_DARK,
              }}
            >
              Candidates{" "}
              <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                ({candidates.length})
              </span>
            </h2>

            {candidates.length === 0 ? (
              <div
                style={{
                  background: "#fff",
                  border: "1px dashed #f9a8d4",
                  borderRadius: "12px",
                  padding: "2.5rem 1.5rem",
                  textAlign: "center",
                  color: "#9ca3af",
                }}
              >
                {job
                  ? "No candidates yet for this job. Import a folder of resumes. ✨"
                  : "Choose a job description, then import resumes. ✨"}
              </div>
            ) : (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #fbcfe8",
                  borderRadius: "12px",
                  overflowX: "auto",
                }}
              >
                <table
                  style={{
                    borderCollapse: "collapse",
                    width: "100%",
                    fontSize: "0.85rem",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#fdf2f8", textAlign: "left" }}>
                      <th style={th}>Fit</th>
                      <th style={th}>Name</th>
                      <th style={th}>Title</th>
                      <th style={th}>Why a great fit</th>
                      <th style={th}>Email</th>
                      <th style={th}>Phone</th>
                      <th style={th}>Location</th>
                      <th style={th}>Rate</th>
                      <th style={th}>Citizenship</th>
                      <th style={th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((c) => {
                      const hasFit = Number.isFinite(c.fit_score);
                      const fit = hasFit ? fitStyle(c.fit_score) : null;
                      return (
                        <tr
                          key={c.id}
                          style={{ borderTop: "1px solid #fce7f3" }}
                        >
                          <td style={td}>
                            {hasFit ? (
                              <span
                                style={{
                                  background: fit.bg,
                                  color: fit.fg,
                                  fontSize: "0.78rem",
                                  fontWeight: 700,
                                  padding: "0.25rem 0.45rem",
                                  borderRadius: "8px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {c.fit_score}/10
                              </span>
                            ) : (
                              <span style={{ color: "#d1d5db" }}>—</span>
                            )}
                          </td>
                          <td style={{ ...td, minWidth: "120px", fontWeight: 600 }}>
                            {c.name}
                          </td>
                          <td style={{ ...td, minWidth: "140px", maxWidth: "190px" }}>
                            {c.role || ""}
                          </td>
                          <td style={{ ...td, minWidth: "200px", maxWidth: "280px" }}>
                            {c.fit_reason || ""}
                          </td>
                          <td style={{ ...td, whiteSpace: "nowrap" }}>
                            {c.email || ""}
                          </td>
                          <td style={{ ...td, whiteSpace: "nowrap" }}>
                            {c.phone || ""}
                          </td>
                          <td style={td}>{c.location || ""}</td>
                          <td style={td}>{c.rate || ""}</td>
                          <td style={td}>{c.citizenship || ""}</td>
                          <td style={{ ...td, whiteSpace: "nowrap" }}>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.35rem",
                                alignItems: "flex-start",
                              }}
                            >
                              {c.resume_url ? (
                                <a
                                  href={c.resume_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: "0.8rem",
                                    color: PINK,
                                    fontWeight: 600,
                                    textDecoration: "none",
                                  }}
                                >
                                  Resume ↗
                                </a>
                              ) : null}
                              <form action={deleteCandidate}>
                                <input type="hidden" name="id" value={c.id} />
                                <DeleteButton />
                              </form>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
