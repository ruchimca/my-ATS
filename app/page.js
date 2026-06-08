import {
  getCandidates,
  isDbConfigured,
  getActiveJobDescription,
  getJobs,
  mergeDuplicateJobs,
} from "../lib/db";
import UploadResumes from "./UploadResumes";
import JobDescription from "./JobDescription";
import CandidateList from "./CandidateList";

// Always read fresh data from the database on each request.
export const dynamic = "force-dynamic";

const PINK = "#db2777";
const PINK_DARK = "#9d174d";

export default async function Home() {
  let candidates = [];
  let jobs = [];
  let job = null;
  let dbError = null;
  const configured = isDbConfigured();

  if (configured) {
    try {
      await mergeDuplicateJobs(); // collapse any same-named duplicate jobs
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
        color: "#1f2937",
        padding: "2rem 1rem 4rem",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <header
          style={{
            marginBottom: "1.75rem",
            paddingBottom: "1.25rem",
            borderBottom: "1px solid #ececf0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.7rem",
                margin: 0,
                color: PINK_DARK,
                letterSpacing: "-0.01em",
              }}
            >
              my-ATS
            </h1>
            <p style={{ margin: "0.3rem 0 0", color: "#6b7280", fontSize: "0.95rem" }}>
              Pick a job, import resumes, see the best fits ranked.
            </p>
          </div>
          <a
            href="/report"
            style={{
              background: PINK,
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "0.6rem 1.15rem",
              fontSize: "0.92rem",
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

          {/* Right: candidates */}
          <div style={{ flex: "1 1 640px", minWidth: 0 }}>
            <CandidateList candidates={candidates} hasJob={!!job} />
          </div>
        </div>
      </div>
    </main>
  );
}
