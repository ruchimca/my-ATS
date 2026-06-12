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

  // idle | screening | screened | scoring | done
  const [phase, setPhase] = useState("idle");
  const [p1, setP1] = useState({ done: 0, total: 0 });
  const [p2, setP2] = useState({ done: 0, total: 0 });
  const [survivors, setSurvivors] = useState([]);
  const [pinned, setPinned] = useState(null);
  const [matched, setMatched] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
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

  // ----- Pass 1: pick the folder and screen by keyword (free) -----
  async function handlePickFolder(e) {
    setTopError("");
    setIssues([]);
    setImported(0);
    setMatched(0);
    setRejectedCount(0);
    setSurvivors([]);

    const resumes = Array.from(e.target.files || []).filter(isResume);
    if (inputRef.current) inputRef.current.value = "";
    if (resumes.length === 0) {
      setTopError("No PDF or Word resumes found in that folder.");
      setPhase("idle");
      return;
    }

    const pinnedJobId = jobId;
    setPinned(pinnedJobId);

    if (!hasKeyword) {
      // No keyword set → nothing to screen; everything advances to Pass 2.
      setSurvivors(resumes);
      setMatched(resumes.length);
      setRejectedCount(0);
      setPhase("screened");
      return;
    }

    setPhase("screening");
    setP1({ done: 0, total: resumes.length });
    const survs = [];
    const found = [];
    let rej = 0;
    for (let i = 0; i < resumes.length; i++) {
      const file = resumes[i];
      try {
        const fd = new FormData();
        fd.append("file", file);
        if (pinnedJobId) fd.append("jobId", pinnedJobId);
        const r = await screenResume(fd);
        if (r?.pass) {
          survs.push(file);
        } else {
          rej += 1;
          const miss =
            r?.missing && r.missing.length
              ? ` — missing: ${r.missing.join(", ")}`
              : r?.reason
                ? ` — ${r.reason}`
                : "";
          found.push({ msg: `Rejected: ${r?.name || file.name}${miss}`, error: false });
        }
      } catch (err) {
        found.push({ msg: `${file.name} — keyword check failed`, error: true });
      }
      setP1({ done: i + 1, total: resumes.length });
    }
    setSurvivors(survs);
    setMatched(survs.length);
    setRejectedCount(rej);
    setIssues(found);
    setPhase("screened");
  }

  // ----- Pass 2: AI-score the survivors -----
  async function runPass2() {
    if (survivors.length === 0) return;
    setPhase("scoring");
    setP2({ done: 0, total: survivors.length });
    const newIssues = [];
    let ok = 0;
    for (let j = 0; j < survivors.length; j++) {
      const file = survivors[j];
      try {
        const fd = new FormData();
        fd.append("file", file);
        if (pinned) fd.append("jobId", pinned);
        if (hasKeyword) fd.append("skipKeyword", "1");
        const r = await uploadResume(fd);
        if (r?.ok && r.skipped) {
          newIssues.push({
            msg: `Rejected: ${r.name || file.name} — ${r.reason || "missing keyword"}`,
            error: false,
          });
        } else if (r?.ok) {
          ok += 1;
          if (r.aiError) newIssues.push({ msg: r.aiError, error: false });
        } else {
          newIssues.push({ msg: r?.error || "Upload failed", error: true });
        }
      } catch (err) {
        newIssues.push({ msg: err?.message || "Upload failed", error: true });
      }
      setP2({ done: j + 1, total: survivors.length });
    }
    setImported(ok);
    setIssues((prev) => [...prev, ...newIssues]);
    setPhase("done");
    router.refresh();
  }

  const pass1Busy = phase === "screening";
  const pass2Busy = phase === "scoring";
  const canPass2 = phase === "screened" && survivors.length > 0;

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

  const btn = (bg, color, disabled) => ({
    display: "inline-block",
    background: bg,
    color,
    border: "none",
    borderRadius: "8px",
    padding: "0.65rem 1.2rem",
    fontSize: "0.92rem",
    fontWeight: 600,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.7 : 1,
  });

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
        <strong>Pass 1</strong> picks a folder and keeps only resumes with your
        must-have keywords (free).{" "}
        <strong>Pass 2</strong> then AI-scores just those matches.
        {hasKeyword ? "" : " (No keyword saved — Pass 1 will pass everything.)"}
      </p>

      <input
        ref={setFolderInput}
        type="file"
        multiple
        accept=".pdf,.doc,.docx"
        onChange={handlePickFolder}
        disabled={pass1Busy || pass2Busy}
        style={{ display: "none" }}
        id="resume-folder-input"
      />

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        <label
          htmlFor="resume-folder-input"
          style={btn(
            pass1Busy ? "#f9a8d4" : PINK,
            "#fff",
            pass1Busy || pass2Busy,
          )}
        >
          {pass1Busy ? "Pass 1 — screening…" : "📁 Pass 1: choose folder"}
        </label>
        <button
          type="button"
          onClick={runPass2}
          disabled={!canPass2 || pass2Busy}
          style={btn(
            canPass2 && !pass2Busy ? PINK : "#f3c6dd",
            "#fff",
            !canPass2 || pass2Busy,
          )}
        >
          {pass2Busy
            ? "Pass 2 — scoring…"
            : `Pass 2: AI-score ${survivors.length || ""} match${survivors.length === 1 ? "" : "es"}`}
        </button>
      </div>

      {/* Pass 1 progress */}
      {phase === "screening" ? (
        <ProgressBar done={p1.done} total={p1.total} label="Pass 1 — keyword screen:" />
      ) : null}

      {/* Pass 1 result (ready for Pass 2) */}
      {phase === "screened" ? (
        <p style={{ marginTop: "1rem", fontSize: "0.92rem", color: "#166534", fontWeight: 600 }}>
          ✓ Pass 1 done: {matched} matched
          {hasKeyword ? `, ${rejectedCount} rejected` : ""}. Now click{" "}
          <strong>Pass 2</strong> to AI-score the {matched}.
        </p>
      ) : null}

      {/* Pass 2 progress */}
      {phase === "scoring" ? (
        <ProgressBar done={p2.done} total={p2.total} label="Pass 2 — AI scoring:" />
      ) : null}

      {/* Final summary */}
      {phase === "done" ? (
        <p style={{ marginTop: "1rem", fontSize: "0.95rem", fontWeight: 600, color: "#166534" }}>
          ✓ Imported {imported} of {matched} match{matched === 1 ? "" : "es"}
          {hasKeyword ? ` (${rejectedCount} rejected in Pass 1).` : "."}
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
            {errorCount ? `${errorCount} had a problem` : "Rejected / needs attention"}
          </div>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.82rem", color: "#374151" }}>
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
