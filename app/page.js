import { getCandidates, isDbConfigured, getActiveJobDescription } from "../lib/db";
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

export default async function Home() {
  let candidates = [];
  let job = null;
  let dbError = null;
  const configured = isDbConfigured();

  if (configured) {
    try {
      candidates = await getCandidates();
      job = await getActiveJobDescription();
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
      <div style={{ maxWidth: "880px", margin: "0 auto" }}>
        <header style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ fontSize: "2rem", margin: 0, color: PINK_DARK }}>
            my-ATS 💗
          </h1>
          <p style={{ margin: "0.4rem 0 0", color: "#6b7280" }}>
            Candidate Tracker — set the role, import resumes, see the best fits.
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

        {/* 1. Job description */}
        <JobDescription current={job} />

        {/* 2. Import resumes from a folder */}
        <UploadResumes />

        {/* 3. Candidates */}
        <section>
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
              No candidates yet. Import a folder of resumes above. ✨
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
                return (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      padding: "0.9rem 1.25rem",
                      borderTop: i === 0 ? "none" : "1px solid #fce7f3",
                    }}
                  >
                    {hasFit ? (
                      <span
                        title={c.fit_reason || ""}
                        style={{
                          background: fit.bg,
                          color: fit.fg,
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          padding: "0.3rem 0.5rem",
                          borderRadius: "8px",
                          whiteSpace: "nowrap",
                          minWidth: "44px",
                          textAlign: "center",
                        }}
                      >
                        {c.fit_score}/10
                      </span>
                    ) : null}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "#6b7280",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {c.role || "—"}
                        {c.email ? ` · ${c.email}` : ""}
                      </div>
                      {c.fit_reason ? (
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "#9ca3af",
                            marginTop: "0.15rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {c.fit_reason}
                        </div>
                      ) : null}
                    </div>
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
                          whiteSpace: "nowrap",
                        }}
                      >
                        Resume ↗
                      </a>
                    ) : null}
                    <span
                      style={{
                        background: badge.bg,
                        color: badge.fg,
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        padding: "0.25rem 0.6rem",
                        borderRadius: "999px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.stage}
                    </span>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "#9ca3af",
                        whiteSpace: "nowrap",
                        width: "92px",
                        textAlign: "right",
                      }}
                    >
                      {formatDate(c.created_at)}
                    </span>
                    <form action={deleteCandidate}>
                      <input type="hidden" name="id" value={c.id} />
                      <DeleteButton />
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
