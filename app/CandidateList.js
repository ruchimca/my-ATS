"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { deleteCandidate, updateStage } from "./actions";
import { STAGES } from "../lib/stages";
import DeleteButton from "./DeleteButton";

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

function fitStyle(score) {
  if (score >= 8) return { bg: "#dcfce7", fg: "#166534" };
  if (score >= 5) return { bg: "#fef3c7", fg: "#92400e" };
  return { bg: "#fee2e2", fg: "#991b1b" };
}

// Master column list. "Why a great fit" is last by default.
const ALL_COLUMNS = [
  { key: "fit", label: "Fit" },
  { key: "status", label: "Status" },
  { key: "name", label: "Name" },
  { key: "title", label: "Title" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "location", label: "Location" },
  { key: "rate", label: "Rate" },
  { key: "citizenship", label: "Citizenship" },
  { key: "whyFit", label: "Why a great fit" },
];
const DEFAULT_CONFIG = ALL_COLUMNS.map((c) => ({ key: c.key, visible: true }));
const STORAGE_KEY = "ats_columns_v2";

function labelFor(key) {
  return ALL_COLUMNS.find((c) => c.key === key)?.label || key;
}

function loadConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) {
      const valid = saved.filter((s) =>
        ALL_COLUMNS.some((c) => c.key === s.key),
      );
      const known = new Set(valid.map((s) => s.key));
      const missing = ALL_COLUMNS.filter((c) => !known.has(c.key)).map((c) => ({
        key: c.key,
        visible: true,
      }));
      return [...valid, ...missing];
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_CONFIG;
}

const th = {
  padding: "0.6rem 0.7rem",
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  color: PINK_DARK,
  whiteSpace: "nowrap",
  borderBottom: "1px solid #fbcfe8",
  textAlign: "left",
};
const tdBase = { padding: "0.6rem 0.7rem", verticalAlign: "top", color: "#374151" };
function tdStyle(key) {
  if (key === "title") return { ...tdBase, minWidth: "140px", maxWidth: "190px" };
  if (key === "whyFit") return { ...tdBase, minWidth: "200px", maxWidth: "300px" };
  if (key === "name") return { ...tdBase, minWidth: "120px", fontWeight: 600 };
  if (["email", "phone"].includes(key)) return { ...tdBase, whiteSpace: "nowrap" };
  return tdBase;
}

export default function CandidateList({ candidates, hasJob }) {
  const router = useRouter();
  const [filter, setFilter] = useState("All");
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [showCols, setShowCols] = useState(false);

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  function saveConfig(next) {
    setConfig(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      // ignore
    }
  }
  function toggleCol(key) {
    saveConfig(config.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)));
  }
  function move(key, dir) {
    const i = config.findIndex((c) => c.key === key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= config.length) return;
    const next = [...config];
    [next[i], next[j]] = [next[j], next[i]];
    saveConfig(next);
  }

  const total = candidates.length;
  const strong = candidates.filter(
    (c) => Number.isFinite(c.fit_score) && c.fit_score >= 7,
  ).length;
  const shown =
    filter === "All"
      ? candidates
      : candidates.filter((c) => (c.stage || "Applied") === filter);
  const visibleCols = config.filter((c) => c.visible);

  async function changeStage(id, stage) {
    const fd = new FormData();
    fd.append("id", id);
    fd.append("stage", stage);
    await updateStage(fd);
    router.refresh();
  }

  function renderCell(key, c) {
    switch (key) {
      case "fit": {
        if (!Number.isFinite(c.fit_score))
          return <span style={{ color: "#d1d5db" }}>—</span>;
        const f = fitStyle(c.fit_score);
        return (
          <span
            style={{
              background: f.bg,
              color: f.fg,
              fontSize: "0.78rem",
              fontWeight: 700,
              padding: "0.25rem 0.45rem",
              borderRadius: "8px",
              whiteSpace: "nowrap",
            }}
          >
            {c.fit_score}/10
          </span>
        );
      }
      case "status": {
        const s = stageStyles[c.stage] || stageStyles.Applied;
        return (
          <select
            value={c.stage || "Applied"}
            onChange={(e) => changeStage(c.id, e.target.value)}
            style={{
              background: s.bg,
              color: s.fg,
              border: "none",
              borderRadius: "999px",
              padding: "0.25rem 0.5rem",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {STAGES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        );
      }
      case "name":
        return c.name;
      case "title":
        return c.role || "";
      case "email":
        return c.email || "";
      case "phone":
        return c.phone || "";
      case "location":
        return c.location || "";
      case "rate":
        return c.rate || "";
      case "citizenship":
        return c.citizenship || "";
      case "whyFit":
        return c.fit_reason || "";
      default:
        return "";
    }
  }

  const statBox = {
    background: "#fff",
    border: "1px solid #fbcfe8",
    borderRadius: "10px",
    padding: "0.5rem 0.9rem",
    textAlign: "center",
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.1rem", color: PINK_DARK }}>
        Candidates{" "}
        <span style={{ color: "#9ca3af", fontWeight: 400 }}>({total})</span>
      </h2>

      {/* Stats + controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <div style={statBox}>
            <div style={{ fontWeight: 800, color: PINK_DARK }}>{total}</div>
            <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>
              Total applications
            </div>
          </div>
          <div style={statBox}>
            <div style={{ fontWeight: 800, color: PINK_DARK }}>{strong}</div>
            <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>
              Strong (7+)
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: "0.45rem 0.6rem",
              border: "1px solid #f9a8d4",
              borderRadius: "8px",
              fontSize: "0.85rem",
              background: "#fff",
              color: "#1f2937",
            }}
          >
            <option value="All">All statuses</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowCols((v) => !v)}
            style={{
              padding: "0.45rem 0.7rem",
              border: "1px solid #f9a8d4",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 600,
              background: showCols ? "#fce7f3" : "#fff",
              color: PINK_DARK,
              cursor: "pointer",
            }}
          >
            ⚙ Columns
          </button>
        </div>
      </div>

      {/* Column customizer */}
      {showCols ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #fbcfe8",
            borderRadius: "10px",
            padding: "0.85rem 1rem",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              fontSize: "0.8rem",
              fontWeight: 700,
              color: PINK_DARK,
              marginBottom: "0.5rem",
            }}
          >
            Show & reorder columns
          </div>
          {config.map((c, i) => (
            <div
              key={c.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.25rem 0",
                fontSize: "0.88rem",
              }}
            >
              <input
                type="checkbox"
                checked={c.visible}
                onChange={() => toggleCol(c.key)}
              />
              <span style={{ flex: 1 }}>{labelFor(c.key)}</span>
              <button
                type="button"
                onClick={() => move(c.key, -1)}
                disabled={i === 0}
                style={arrowBtn(i === 0)}
                title="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(c.key, 1)}
                disabled={i === config.length - 1}
                style={arrowBtn(i === config.length - 1)}
                title="Move down"
              >
                ↓
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Table or empty state */}
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
          {hasJob
            ? "No candidates yet for this job. Import a folder of resumes. ✨"
            : "Choose a job description, then import resumes. ✨"}
        </div>
      ) : (
        <div
          style={{
            background: "#fff",
            border: "1px solid #fbcfe8",
            borderRadius: "12px",
            overflowX: "auto",
          }}
        >
          <table
            style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.85rem" }}
          >
            <thead>
              <tr style={{ background: "#fdf2f8" }}>
                {visibleCols.map((vc) => (
                  <th key={vc.key} style={th}>
                    {labelFor(vc.key)}
                  </th>
                ))}
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid #fce7f3" }}>
                  {visibleCols.map((vc) => (
                    <td key={vc.key} style={tdStyle(vc.key)}>
                      {renderCell(vc.key, c)}
                    </td>
                  ))}
                  <td style={{ ...tdBase, whiteSpace: "nowrap" }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.35rem",
                        alignItems: "flex-start",
                      }}
                    >
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
                          }}
                        >
                          Resume ↗
                        </a>
                      ) : null}
                      <form action={deleteCandidate}>
                        <input type="hidden" name="id" value={c.id} />
                        <DeleteButton />
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 ? (
            <div
              style={{
                padding: "1.5rem",
                textAlign: "center",
                color: "#9ca3af",
                fontSize: "0.9rem",
              }}
            >
              No candidates with status “{filter}”.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function arrowBtn(disabled) {
  return {
    border: "1px solid #f9a8d4",
    background: "#fff",
    borderRadius: "6px",
    width: "26px",
    height: "26px",
    cursor: disabled ? "default" : "pointer",
    color: disabled ? "#e5e7eb" : PINK_DARK,
    fontSize: "0.8rem",
    lineHeight: 1,
  };
}
