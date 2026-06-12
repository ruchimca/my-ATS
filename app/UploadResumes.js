"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadResume } from "./actions";

const PINK = "#db2777";
const PINK_DARK = "#9d174d";

function isResume(file) {
  return /\.(pdf|doc|docx)$/i.test(file.name);
}

export default function UploadResumes({ jobId }) {
  const inputRef = useRef(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [imported, setImported] = useState(null); // count after a run finishes
  const [skipped, setSkipped] = useState(0);
  const [issues, setIssues] = useState([]); // [{ msg, error: bool }]
  const [topError, setTopError] = useState("");

  // Set the folder-picker attributes the JSX prop names don't cover.
  function setFolderInput(el) {
    inputRef.current = el;
    if (el) {
      el.setAttribute("webkitdirectory", "");
      el.setAttribute("directory", "");
    }
  }

  async function handleFiles(e) {
    setTopError("");
    setIssues([]);
    setImported(null);
    setSkipped(0);

    const all = Array.from(e.target.files || []);
    const resumes = all.filter(isResume);

    if (resumes.length === 0) {
      setTopError("No PDF or Word resumes found in that folder.");
      return;
    }

    // Pin this import to the job that's active right now, so switching the
    // dropdown mid-import doesn't reroute resumes to another job.
    const pinnedJobId = jobId;

    setBusy(true);
    setProgress({ done: 0, total: resumes.length });

    let ok = 0;
    let rejected = 0;
    const found = [];

    for (let i = 0; i < resumes.length; i++) {
      const file = resumes[i];
      try {
        const fd = new FormData();
        fd.append("file", file);
        if (pinnedJobId) fd.append("jobId", pinnedJobId);
        const result = await uploadResume(fd);
        if (result?.ok && result.skipped) {
          rejected += 1;
          found.push({
            msg: `Rejected: ${result.name || file.name} — ${result.reason || "missing keyword"}`,
            error: false,
          });
        } else if (result?.ok) {
          ok += 1;
          if (result.aiError) found.push({ msg: result.aiError, error: false });
        } else {
          found.push({ msg: result?.error || "Upload failed", error: true });
        }
      } catch (err) {
        found.push({ msg: err?.message || "Upload failed", error: true });
      }
      setProgress({ done: i + 1, total: resumes.length });
    }

    setImported(ok);
    setSkipped(rejected);
    setIssues(found);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  const pct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  // Group repeated messages so the box stays compact.
  const grouped = [];
  const seen = new Map();
  for (const it of issues) {
    if (seen.has(it.msg)) {
      grouped[seen.get(it.msg)].count += 1;
    } else {
      seen.set(it.msg, grouped.length);
      grouped.push({ msg: it.msg, error: it.error, count: 1 });
    }
  }
  const errorCount = issues.filter((i) => i.error).length;

  return (
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
      <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", color: PINK_DARK }}>
        Import a folder of resumes
      </h2>
      <p style={{ margin: "0 0 1rem", color: "#6b7280", fontSize: "0.9rem" }}>
        Pick a folder of resumes (PDF or Word .docx). Each one is saved and read
        by the AI to fill in the name, email, role, and fit score.
      </p>

      <input
        ref={setFolderInput}
        type="file"
        multiple
        accept=".pdf,.doc,.docx"
        onChange={handleFiles}
        disabled={busy}
        style={{ display: "none" }}
        id="resume-folder-input"
      />
      <label
        htmlFor="resume-folder-input"
        style={{
          display: "inline-block",
          background: busy ? "#f9a8d4" : PINK,
          color: "#fff",
          borderRadius: "8px",
          padding: "0.65rem 1.4rem",
          fontSize: "0.95rem",
          fontWeight: 600,
          cursor: busy ? "default" : "pointer",
        }}
      >
        {busy ? "Importing…" : "📁 Choose a folder of resumes"}
      </label>

      {/* Progress while importing */}
      {busy ? (
        <div style={{ marginTop: "1rem" }}>
          <div
            style={{
              fontSize: "0.9rem",
              color: PINK_DARK,
              fontWeight: 600,
              marginBottom: "0.4rem",
            }}
          >
            Importing {progress.done} of {progress.total}…
          </div>
          <div
            style={{
              height: "8px",
              background: "#fce7f3",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background: PINK,
                transition: "width 0.2s ease",
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Summary after a finished run */}
      {!busy && imported != null ? (
        <p
          style={{
            marginTop: "1rem",
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "#166534",
          }}
        >
          ✓ Imported {imported} of {progress.total} resume
          {progress.total === 1 ? "" : "s"}.
          {skipped > 0
            ? ` ${skipped} rejected (missing must-have keyword).`
            : ""}
        </p>
      ) : null}

      {/* No resumes found */}
      {topError ? (
        <p style={{ color: "#991b1b", marginTop: "0.75rem", fontSize: "0.9rem" }}>
          {topError}
        </p>
      ) : null}

      {/* Errors / warnings box */}
      {grouped.length > 0 ? (
        <div
          style={{
            marginTop: "1rem",
            border: `1px solid ${errorCount ? "#fca5a5" : "#fcd34d"}`,
            background: errorCount ? "#fef2f2" : "#fffbeb",
            borderRadius: "10px",
            padding: "0.85rem 1rem",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: "0.85rem",
              color: errorCount ? "#991b1b" : "#92400e",
              marginBottom: "0.4rem",
            }}
          >
            {errorCount
              ? `${errorCount} resume${errorCount === 1 ? "" : "s"} had a problem`
              : "Some resumes need attention"}
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: "1.1rem",
              fontSize: "0.82rem",
              color: "#374151",
            }}
          >
            {grouped.map((g, i) => (
              <li key={i} style={{ color: g.error ? "#991b1b" : "#92400e" }}>
                {g.msg}
                {g.count > 1 ? ` (×${g.count})` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
