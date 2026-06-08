"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadJobDescription } from "./actions";

const PINK = "#db2777";
const PINK_DARK = "#9d174d";

export default function JobDescription({ current }) {
  const inputRef = useRef(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
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
        Job description
      </h2>

      {current ? (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.9rem", color: "#374151" }}>
            Current role on file:{" "}
            <strong>{current.filename || "job description"}</strong>
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
          </div>
          {current.content ? (
            <p
              style={{
                margin: "0.5rem 0 0",
                fontSize: "0.85rem",
                color: "#6b7280",
                whiteSpace: "pre-wrap",
                maxHeight: "120px",
                overflowY: "auto",
                background: "#fdf2f8",
                borderRadius: "8px",
                padding: "0.6rem 0.8rem",
              }}
            >
              {current.content}
            </p>
          ) : (
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "#92400e" }}>
              No readable text yet — upload a PDF or Word (.docx) file so the AI
              can score resumes against it.
            </p>
          )}
        </div>
      ) : (
        <p style={{ margin: "0 0 1rem", color: "#6b7280", fontSize: "0.9rem" }}>
          Upload the job description (PDF or Word .docx). The AI uses it to
          score how well each imported resume fits the role.
        </p>
      )}

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
        {busy
          ? "Reading…"
          : current
            ? "📄 Replace job description"
            : "📄 Upload job description"}
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
