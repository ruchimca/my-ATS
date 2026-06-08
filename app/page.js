import { getCandidates, isDbConfigured } from "../lib/db";
import { addCandidate, deleteCandidate } from "./actions";
import { STAGES } from "../lib/stages";
import UploadResumes from "./UploadResumes";

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
  let dbError = null;
  const configured = isDbConfigured();

  if (configured) {
    try {
      candidates = await getCandidates();
    } catch (e) {
      dbError = e?.message || "Could not reach the database.";
    }
  }

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "0.6rem 0.7rem",
    border: "1px solid #f9a8d4",
    borderRadius: "8px",
    fontSize: "0.95rem",
    background: "#fff",
    color: "#1f2937",
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: PINK_DARK,
    marginBottom: "0.3rem",
  };

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
            Candidate Tracker — keep every applicant in one place.
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
              Your tracker is ready, but it needs a database to save candidates.
              Once the database is connected in Vercel, this page will start
              working automatically.
            </p>
          </div>
        ) : null}

        {/* Bulk import resumes from a folder */}
        <UploadResumes />

        {/* Add candidate form */}
        <section
          style={{
            background: "#fff",
            border: "1px solid #fbcfe8",
            borderRadius: "12px",
            padding: "1.5rem",
            marginBottom: "2rem",
            boxShadow: "0 1px 3px rgba(219,39,119,0.08)",
          }}
        >
          <h2
            style={{
              margin: "0 0 1rem",
              fontSize: "1.1rem",
              color: PINK_DARK,
            }}
          >
            Add a candidate
          </h2>
          <form action={addCandidate}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
              <div>
                <label style={labelStyle} htmlFor="name">
                  Name *
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  placeholder="Jane Doe"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle} htmlFor="role">
                  Role
                </label>
                <input
                  id="role"
                  name="role"
                  placeholder="Senior Engineer"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle} htmlFor="stage">
                  Stage
                </label>
                <select id="stage" name="stage" style={inputStyle} defaultValue="Applied">
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle} htmlFor="notes">
                  Notes
                </label>
                <input
                  id="notes"
                  name="notes"
                  placeholder="Referred by Sam"
                  style={inputStyle}
                />
              </div>
            </div>
            <button
              type="submit"
              style={{
                marginTop: "1.25rem",
                background: PINK,
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "0.65rem 1.4rem",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Add candidate
            </button>
          </form>
        </section>

        {/* Candidate list */}
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
              No candidates yet. Add your first one above. ✨
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
                        {c.notes ? ` · ${c.notes}` : ""}
                      </div>
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
                      <button
                        type="submit"
                        title="Delete candidate"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#d1d5db",
                          cursor: "pointer",
                          fontSize: "1.1rem",
                          lineHeight: 1,
                          padding: "0.2rem",
                        }}
                      >
                        ✕
                      </button>
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
