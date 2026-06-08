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

const stageStyles = {
  Applied: { bg: "#fce7f3", fg: "#9d174d" },
  Screening: { bg: "#ede9fe", fg: "#6d28d9" },
  Interview: { bg: "#fef3c7", fg: "#92400e" },
  Offer: { bg: "#dbeafe", fg: "#1e40af" },
  Hired: { bg: "#dcfce7", fg: "#166534" },
  Rejected: { bg: "#fee2e2", fg: "#991b1b" },
};

function fitStyle(score) {
  if (score >= 8) return { bg: "#dcfce7", fg: "#166534" };
  if (score >= 5) return { bg: "#fef3c7", fg: "#92400e" };
  return { bg: "#fee2e2", fg: "#991b1b" };
}

function formatDate(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: "0.4rem", lineHeight: 1.5 }}>
      <span style={{ color: "#9ca3af", minWidth: "78px" }}>{label}</span>
      <span style={{ color: "#374151" }}>{value}</span>
    </div>
  );
}

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
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <header style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "2rem", margin: 0, color: PINK_DARK }}>
            my-ATS 💗
          </h1>
          <p style={{ margin: "0.4rem 0 0", color: "#6b7280" }}>
            Pick a job, import resumes, see the best fits ranked.
          </p>
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
          <div style={{ flex: "1 1 320px", minWidth: 0 }}>
            <JobDescription jobs={jobs} current={job} />
            <UploadResumes />
          </div>

          {/* Right: candidates */}
          <div style={{ flex: "1.4 1 440px", minWidth: 0 }}>
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
                  overflow: "hidden",
                }}
              >
                {candidates.map((c, i) => {
                  const badge = stageStyles[c.stage] || stageStyles.Applied;
                  const hasFit = Number.isFinite(c.fit_score);
                  const fit = hasFit ? fitStyle(c.fit_score) : null;
                  const showDetails = hasFit && c.fit_score >= 7;
                  return (
                    <div
                      key={c.id}
                      style={{
                        padding: "1rem 1.25rem",
                        borderTop: i === 0 ? "none" : "1px solid #fce7f3",
                      }}
                    >
                      {/* Top: score + name + stage */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                        }}
                      >
                        {hasFit ? (
                          <span
                            style={{
                              background: fit.bg,
                              color: fit.fg,
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              padding: "0.3rem 0.5rem",
                              borderRadius: "8px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {c.fit_score}/10
                          </span>
                        ) : null}
                        <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
                          {c.name}
                        </span>
                        <span
                          style={{
                            background: badge.bg,
                            color: badge.fg,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            padding: "0.2rem 0.55rem",
                            borderRadius: "999px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.stage}
                        </span>
                      </div>

                      {/* Role */}
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "#6b7280",
                          marginTop: "0.25rem",
                        }}
                      >
                        {c.role || "—"}
                        {!showDetails && c.email ? ` · ${c.email}` : ""}
                      </div>

                      {/* Fit reason */}
                      {c.fit_reason ? (
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "#9ca3af",
                            fontStyle: "italic",
                            marginTop: "0.25rem",
                          }}
                        >
                          {c.fit_reason}
                        </div>
                      ) : null}

                      {/* Details for strong matches (>= 7) */}
                      {showDetails ? (
                        <div
                          style={{
                            marginTop: "0.6rem",
                            background: "#fdf2f8",
                            borderRadius: "8px",
                            padding: "0.6rem 0.8rem",
                            fontSize: "0.82rem",
                          }}
                        >
                          <DetailRow label="Email" value={c.email} />
                          <DetailRow label="Phone" value={c.phone} />
                          <DetailRow label="Location" value={c.location} />
                          <DetailRow label="Rate" value={c.rate} />
                          <DetailRow label="Citizenship" value={c.citizenship} />
                        </div>
                      ) : null}

                      {/* Bottom: resume + date + delete */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "0.75rem",
                          marginTop: "0.7rem",
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
                        ) : (
                          <span />
                        )}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                          }}
                        >
                          <span
                            style={{ fontSize: "0.78rem", color: "#9ca3af" }}
                          >
                            {formatDate(c.created_at)}
                          </span>
                          <form action={deleteCandidate}>
                            <input type="hidden" name="id" value={c.id} />
                            <DeleteButton />
                          </form>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
