"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadResume } from "./actions";

const PINK = "#db2777";
const PINK_DARK = "#9d174d";

function isResume(file) {
  return /\.(pdf|doc|docx)$/i.test(file.name);
}

export default function UploadResumes() {
  const inputRef = useRef(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [log, setLog] = useState([]);
  const [error, setError] = useState("");

  // Set the folder-picker attributes the JSX prop names don't cover.
  function setFolderInput(el) {
    inputRef.current = el;
    if (el) {
      el.setAttribute("webkitdirectory", "");
      el.setAttribute("directory", "");
    }
  }

  async function handleFiles(e) {
    setError("");
    const all = Array.from(e.target.files || []);
    const resumes = all.filter(isResume);

    if (resumes.length === 0) {
      setError("No PDF or Word resumes found in that folder.");
      return;
    }

    setBusy(true);
    setProgress({ done: 0, total: resumes.length });
    setLog([]);

    for (let i = 0; i < resumes.length; i++) {
      const file = resumes[i];
      try {
        const fd = new FormData();
        fd.append("file", file);
        const result = await uploadResume(fd);
        if (result?.ok) {
          setLog((l) => [
            ...l,
            { name: result.name || file.name, ok: true, msg: result.aiError },
          ]);
        } else {
          setLog((l) => [
            ...l,
            { name: file.name, ok: false, msg: result?.error || "failed" },
          ]);
        }
      } catch (err) {
        setLog((l) => [
          ...l,
          { name: file.name, ok: false, msg: err?.message || "failed" },
        ]);
      }
      setProgress({ done: i + 1, total: resumes.length });
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
        Import a folder of resumes
      </h2>
      <p style={{ margin: "0 0 1rem", color: "#6b7280", fontSize: "0.9rem" }}>
        Pick a folder of resumes (PDF or Word). Each one is saved, and the AI
        reads PDFs to fill in the name, email, and role automatically.
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
        {busy
          ? `Importing ${progress.done}/${progress.total}…`
          : "📁 Choose a folder of resumes"}
      </label>

      {error ? (
        <p style={{ color: "#991b1b", marginTop: "0.75rem", fontSize: "0.9rem" }}>
          {error}
        </p>
      ) : null}

      {log.length > 0 ? (
        <ul
          style={{
            marginTop: "1rem",
            paddingLeft: "1.1rem",
            fontSize: "0.85rem",
            color: "#374151",
            maxHeight: "180px",
            overflowY: "auto",
          }}
        >
          {log.map((item, i) => (
            <li
              key={i}
              style={{
                color: !item.ok ? "#991b1b" : item.msg ? "#92400e" : "#166534",
              }}
            >
              {item.ok ? "✓" : "✕"} {item.name}
              {item.msg ? ` — ${item.msg}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
