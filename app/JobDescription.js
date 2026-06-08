"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadJobDescription, setActiveJob } from "./actions";

const PINK = "#db2777";
const PINK_DARK = "#9d174d";

export default function JobDescription({ jobs = [], current }) {
  const inputRef = useRef(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  async function handleFile(e) {
    setError("");
    setWarning("");
    const file = (e.target.files || [])[0];
    if (!file) return;

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadJobDescription(fd);
      if (!result?.ok) {
        setError(result?.error || "Upload failed.");
      } else if (result.warning) {
        setWarning(result.warning);
      }
    } catch (err) {
      setError(err?.message || "Upload failed.");
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function handleSelect(e) {
    const id = e.target.value;
    if (!id) return;
    setSwitching(true);
    try {
      const fd = new FormData();
      fd.append("jobId", id);
      await setActiveJob(fd);
    } catch (err) {
      // ignore — refresh will show current state
    }
    setSwitching(false);
    router.refresh();
  }

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #fbcfe8",
        borderRadius: "12px",
        padding: "1.5rem",
        marginBottom: "1.5rem",
        boxShadow: "0 1px 3px rgba(219,39,119,0.08)",
      }}
    >
      <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.1rem", color: PINK_DARK }}>
        Job description
      </h2>

      {jobs.length > 0 ? (
        <div style={{ marginBottom: "0.85rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: PINK_DARK,
              marginBottom: "0.3rem",
            }}
          >
            Working on
          </label>
          <select
            value={current?.id || ""}
            onChange={handleSelect}
            disabled={switching || busy}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "0.55rem 0.7rem",
              border: "1px solid #f9a8d4",
              borderRadius: "8px",
              fontSize: "0.95rem",
              background: "#fff",
              color: "#1f2937",
            }}
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.filename || `Job #${j.id}`}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p style={{ margin: "0 0 0.85rem", color: "#6b7280", fontSize: "0.9rem" }}>
          Upload a job description to start. Resumes you import are scored against
          the selected job.
        </p>
      )}

      {current ? (
        <p
          style={{
            margin: "0 0 0.85rem",
            fontSize: "0.82rem",
            color: current.content ? "#166534" : "#92400e",
          }}
        >
          {current.content
            ? "✓ Read and ready — resumes are scored against this role."
            : "⚠ No readable text yet — upload a PDF or Word (.docx) file."}
          {current.file_url ? (
            <>
              {" "}
              <a
                href={current.file_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: PINK, fontWeight: 600, textDecoration: "none" }}
              >
                view ↗
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleFile}
        disabled={busy}
        style={{ display: "none" }}
        id="jd-input"
      />
      <label
        htmlFor="jd-input"
        style={{
          display: "inline-block",
          background: busy ? "#f9a8d4" : PINK,
          color: "#fff",
          borderRadius: "8px",
          padding: "0.6rem 1.3rem",
          fontSize: "0.95rem",
          fontWeight: 600,
          cursor: busy ? "default" : "pointer",
        }}
      >
        {busy ? "Reading…" : "📄 Choose job description"}
      </label>

      {error ? (
        <p style={{ color: "#991b1b", marginTop: "0.75rem", fontSize: "0.9rem" }}>
          {error}
        </p>
      ) : null}
      {warning ? (
        <p style={{ color: "#92400e", marginTop: "0.75rem", fontSize: "0.9rem" }}>
          {warning}
        </p>
      ) : null}
    </section>
  );
}
