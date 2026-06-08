import { getJobById, isDbConfigured } from "../../../lib/db";
import ApplyForm from "./ApplyForm";

export const dynamic = "force-dynamic";

const PINK_DARK = "#9d174d";

function roleName(filename) {
  if (!filename) return "this role";
  return filename.replace(/\.[^.]+$/, "");
}

export default async function ApplyPage({ params }) {
  const { jobId } = await params;
  const id = Number(jobId);

  let job = null;
  if (isDbConfigured() && Number.isInteger(id)) {
    try {
      job = await getJobById(id);
    } catch (e) {
      job = null;
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#fff0f6",
        color: "#1f2937",
        padding: "2.5rem 1rem 4rem",
      }}
    >
      <div
        style={{
          maxWidth: "640px",
          margin: "0 auto",
          background: "#fff",
          border: "1px solid #fbcfe8",
          borderRadius: "12px",
          padding: "2rem",
          boxShadow: "0 1px 3px rgba(219,39,119,0.08)",
        }}
      >
        {!job ? (
          <>
            <h1 style={{ color: PINK_DARK, marginTop: 0 }}>Application closed</h1>
            <p style={{ color: "#6b7280" }}>
              This job is no longer accepting applications, or the link is
              invalid.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ color: PINK_DARK, margin: "0 0 0.25rem" }}>
              Apply: {roleName(job.filename)}
            </h1>
            <p style={{ color: "#6b7280", margin: "0 0 1.5rem" }}>
              Upload your resume and tell us a few details. It only takes a
              minute.
            </p>
            <ApplyForm jobId={job.id} />
          </>
        )}
      </div>
    </main>
  );
}
