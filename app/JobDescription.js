"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  uploadJobDescription,
  setActiveJob,
  deleteJob,
  setKeyword,
} from "./actions";

const PINK = "#db2777";
const PINK_DARK = "#9d174d";

function jobLabel(j) {
  return j.filename || `Job #${j.id}`;
}

export default function JobDescription({ jobs = [], current }) {
  const inputRef = useRef(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [copied, setCopied] = useState(false);
  const [applyUrl, setApplyUrl] = useState("");
  const [keywordValue, setKeywordValue] = useState("");
  const [savedKw, setSavedKw] = useState(false);

  useEffect(() => {
    setKeywordValue(current?.keyword || "");
  }, [current?.id]);

  async function saveKeyword() {
    if (!current) return;
    const fd = new FormData();
    fd.append("jobId", current.id);
    fd.append("keyword", keywordValue);
    try {
      await setKeyword(fd);
      setSavedKw(true);
      setTimeout(() => setSavedKw(false), 1500);
    } catch (e) {
      // ignore
    }
    router.refresh();
  }

  useEffect(() => {
    if (current) {
      setApplyUrl(`${window.location.origin}/apply/${current.id}`);
    } else {
      setApplyUrl("");
    }
  }, [current?.id]);

  async function copyApplyLink() {
    if (!applyUrl) return;
    try {
      await navigator.clipboard.writeText(applyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      window.prompt("Copy this application link:", applyUrl);
    }
  }

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
      // ignore — refresh shows current state
    }
    setSwitching(false);
    router.refresh();
  }

  async function handleDeleteJob() {
    if (!current) return;
    const ok = window.confirm(
      `Delete the job "${current.filename || "this job"}" and all of its candidates? This cannot be undone.`,
    );
    if (!ok) return;
    setSwitching(true);
    try {
      const fd = new FormData();
      fd.append("jobId", current.id);
      await deleteJob(fd);
    } catch (err) {
      // ignore
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

      {jobs.length >= 2 ? (
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
              fontSize: "0.9rem",
              background: "#fff",
              color: "#1f2937",
            }}
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {jobLabel(j)}
              </option>
            ))}
          </select>
          <div style={{ fontSize: "0.78rem", color: "#9ca3af", marginTop: "0.3rem" }}>
            Switch between jobs here, or add a new one below.
          </div>
        </div>
      ) : jobs.length === 1 ? (
        <div style={{ marginBottom: "0.85rem" }}>
          <div
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: PINK_DARK,
              marginBottom: "0.2rem",
            }}
          >
            Current job
          </div>
          <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1f2937" }}>
            {current?.filename || jobs[0].filename || "job description"}
          </div>
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

      {current ? (
        <div style={{ margin: "0 0 0.95rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: PINK_DARK,
              marginBottom: "0.3rem",
            }}
          >
            Must-have keywords (optional)
          </label>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <input
              value={keywordValue}
              onChange={(e) => setKeywordValue(e.target.value)}
              placeholder="e.g. M365, Azure, SharePoint"
              style={{
                flex: 1,
                minWidth: 0,
                padding: "0.5rem 0.6rem",
                border: "1px solid #f9a8d4",
                borderRadius: "8px",
                fontSize: "0.85rem",
                color: "#1f2937",
                background: "#fff",
              }}
            />
            <button
              type="button"
              onClick={saveKeyword}
              style={{
                background: savedKw ? "#dcfce7" : PINK,
                color: savedKw ? "#166534" : "#fff",
                border: savedKw ? "1px solid #86efac" : "none",
                borderRadius: "8px",
                padding: "0.5rem 0.8rem",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {savedKw ? "✓ Saved" : "Save"}
            </button>
          </div>
          <div style={{ fontSize: "0.74rem", color: "#9ca3af", marginTop: "0.3rem" }}>
            Comma-separated. Imported resumes missing any of these are
            auto-rejected. Leave blank for no filter.
          </div>
        </div>
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
      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
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
          {busy ? "Reading…" : "➕ Add a job description"}
        </label>
        {current ? (
          <button
            type="button"
            onClick={handleDeleteJob}
            disabled={switching || busy}
            style={{
              background: "#fee2e2",
              color: "#b91c1c",
              border: "1px solid #fca5a5",
              borderRadius: "8px",
              padding: "0.55rem 0.9rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: switching || busy ? "default" : "pointer",
            }}
          >
            🗑 Delete this job
          </button>
        ) : null}
      </div>

      {/* Public application link to share with applicants */}
      {current ? (
        <div style={{ marginTop: "1rem" }}>
          <div
            style={{ fontSize: "0.78rem", color: "#6b7280", marginBottom: "0.3rem" }}
          >
            🔗 Application link — share with applicants:
          </div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <input
              readOnly
              value={applyUrl}
              onFocus={(e) => e.target.select()}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "0.5rem 0.6rem",
                border: "1px solid #f9a8d4",
                borderRadius: "8px",
                fontSize: "0.8rem",
                color: "#374151",
                background: "#fdf2f8",
              }}
            />
            <button
              type="button"
              onClick={copyApplyLink}
              style={{
                background: copied ? "#dcfce7" : PINK,
                color: copied ? "#166534" : "#fff",
                border: copied ? "1px solid #86efac" : "none",
                borderRadius: "8px",
                padding: "0.5rem 0.8rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <div style={{ fontSize: "0.74rem", color: "#9ca3af", marginTop: "0.3rem" }}>
            Anyone with this link can submit a resume for this job.
          </div>
        </div>
      ) : null}

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
