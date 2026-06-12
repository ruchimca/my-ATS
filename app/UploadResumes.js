"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadResume, screenResume } from "./actions";

const PINK = "#db2777";
const PINK_DARK = "#9d174d";

function isResume(file) {
  return /\.(pdf|doc|docx)$/i.test(file.name);
}

function ProgressBar({ done, total, label }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ marginTop: "1rem" }}>
      <div
        style={{
          fontSize: "0.9rem",
          color: PINK_DARK,
          fontWeight: 600,
          marginBottom: "0.4rem",
        }}
      >
        {label} {done} of {total}…
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
  );
}

export default function UploadResumes({ jobId, hasKeyword }) {
  const inputRef = useRef(null);
  const router = useRouter();

  const [phase, setPhase] = useState("idle"); // idle | pass1 | pass2 | done
  const [p1, setP1] = useState({ done: 0, total: 0 });
  const [p2, setP2] = useState({ done: 0, total: 0 });
  const [matched, setMatched] = useState(0);
  const [rejected, setRejected] = useState(0);
  const [imported, setImported] = useState(0);
  const [issues, setIssues] = useState([]);
  const [topError, setTopError] = useState("");

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
    setMatched(0);
    setRejected(0);
    setImported(0);

    const all = Array.from(e.target.files || []);
    const resumes = all.filter(isResume);
    if (resumes.length === 0) {
      setTopError("No PDF or Word resumes found in that folder.");
      return;
    }

    const pinnedJobId = jobId; // pin the import to the current job
    const found = [];
    let survivors = resumes;

    // ----- Pass 1: free keyword screen (only if a keyword is set) -----
    if (hasKeyword) {
      setPhase("pass1");
      setP1({ done: 0, total: resumes.length });
      survivors = [];
      let rej = 0;
      for (let i = 0; i < resumes.length; i++) {
        const file = resumes[i];
        try {
          const fd = new FormData();
          fd.append("file", file);
          if (pinnedJobId) fd.append("jobId", pinnedJobId);
          const r = await screenResume(fd);
          if (r?.pass) {
            survivors.push(file);
          } else {
            rej += 1;
            const miss =
              r?.missing && r.missing.length
                ? ` — missing: ${r.missing.join(", ")}`
                : r?.reason
                  ? ` — ${r.reason}`
                  : "";
            found.push({
              msg: `Rejected: ${r?.name || file.name}${miss}`,
              error: false,
            });
          }
        } catch (err) {
          found.push({
            msg: `${file.name} — keyword check failed`,
            error: true,
          });
        }
        setP1({ done: i + 1, total: resumes.length });
      }
      setMatched(survivors.length);
      setRejected(rej);
    }

    // ----- Pass 2: AI scoring on survivors only -----
    setPhase("pass2");
    setP2({ done: 0, total: survivors.length });
    let ok = 0;
    for (let j = 0; j < survivors.length; j++) {
      const file = survivors[j];
      try {
        const fd = new FormData();
        fd.append("file", file);
        if (pinnedJobId) fd.append("jobId", pinnedJobId);
        if (hasKeyword) fd.append("skipKeyword", "1");
        const r = await uploadResume(fd);
        if (r?.ok && r.skipped) {
          found.push({
            msg: `Rejected: ${r.name || file.name} — ${r.reason || "missing keyword"}`,
            error: false,
          });
        } else if (r?.ok) {
          ok += 1;
          if (r.aiError) found.push({ msg: r.aiError, error: false });
        } else {
          found.push({ msg: r?.error || "Upload failed", error: true });
        }
      } catch (err) {
        found.push({ msg: err?.message || "Upload failed", error: true });
      }
      setP2({ done: j + 1, total: survivors.length });
    }

    setImported(ok);
    setIssues(found);
    setPhase("done");
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  const busy = phase === "pass1" || phase === "pass2";

  // Group repeated messages.
  const grouped = [];
  const seen = new Map();
  for (const it of issues) {
    if (seen.has(it.msg)) grouped[seen.get(it.msg)].count += 1;
    else {
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
        Pick a folder of resumes (PDF or Word .docx).
        {hasKeyword
          ? " Pass 1 keeps only resumes with your must-have keywords (free); Pass 2 then AI-scores those."
          : " Each one is read by the AI to fill in name, email, role, and fit score."}
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
        {phase === "pass1"
          ? "Pass 1 — keyword screen…"
          : phase === "pass2"
            ? "Pass 2 — AI scoring…"
            : "📁 Choose a folder of resumes"}
      </label>

      {/* Live progress */}
      {phase === "pass1" ? (
        <ProgressBar
          done={p1.done}
          total={p1.total}
          label="Pass 1 — keyword screen:"
        />
      ) : null}
      {phase === "pass2" ? (
        <>
          {hasKeyword ? (
            <p
              style={{
                marginTop: "1rem",
                fontSize: "0.85rem",
                color: "#166534",
                fontWeight: 600,
              }}
            >
              Pass 1 done: {matched} matched, {rejected} rejected.
            </p>
          ) : null}
          <ProgressBar
            done={p2.done}
            total={p2.total}
            label="Pass 2 — AI scoring:"
          />
        </>
      ) : null}

      {/* Final summary */}
      {phase === "done" ? (
        <p
          style={{
            marginTop: "1rem",
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "#166534",
          }}
        >
          ✓ Imported {imported}
          {hasKeyword
            ? ` of ${matched} keyword matches (${rejected} rejected in Pass 1).`
            : "."}
        </p>
      ) : null}

      {topError ? (
        <p style={{ color: "#991b1b", marginTop: "0.75rem", fontSize: "0.9rem" }}>
          {topError}
        </p>
      ) : null}

      {grouped.length > 0 ? (
        <div
          style={{
            marginTop: "1rem",
            border: `1px solid ${errorCount ? "#fca5a5" : "#fcd34d"}`,
            background: errorCount ? "#fef2f2" : "#fffbeb",
            borderRadius: "10px",
            padding: "0.85rem 1rem",
            maxHeight: "220px",
            overflowY: "auto",
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
              ? `${errorCount} had a problem`
              : "Rejected / needs attention"}
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
