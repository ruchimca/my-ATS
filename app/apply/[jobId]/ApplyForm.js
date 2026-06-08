"use client";

import { useState } from "react";
import { submitApplication } from "../../actions";

const PINK = "#db2777";
const PINK_DARK = "#9d174d";

const CITIZENSHIP_OPTIONS = [
  "US Citizen",
  "Green Card",
  "H-1B",
  "OPT/CPT",
  "Other / Needs sponsorship",
];

const labelStyle = {
  display: "block",
  fontSize: "0.82rem",
  fontWeight: 600,
  color: PINK_DARK,
  margin: "0 0 0.3rem",
};
const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "0.6rem 0.7rem",
  border: "1px solid #f9a8d4",
  borderRadius: "8px",
  fontSize: "0.95rem",
  background: "#fff",
  color: "#1f2937",
};

export default function ApplyForm({ jobId }) {
  const [status, setStatus] = useState("idle"); // idle | submitting | done
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setStatus("submitting");
    const fd = new FormData(e.currentTarget);
    fd.set("jobId", String(jobId));
    try {
      const res = await submitApplication(fd);
      if (res?.ok) {
        setStatus("done");
      } else {
        setError(res?.error || "Something went wrong. Please try again.");
        setStatus("idle");
      }
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <div
        style={{
          background: "#dcfce7",
          border: "1px solid #86efac",
          borderRadius: "10px",
          padding: "1.5rem",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "1.5rem" }}>✅</div>
        <h2 style={{ color: "#166534", margin: "0.5rem 0 0.25rem" }}>
          Application received!
        </h2>
        <p style={{ color: "#166534", margin: 0 }}>
          Thanks for applying. The hiring team will review your resume.
        </p>
      </div>
    );
  }

  const busy = status === "submitting";

  return (
    <form onSubmit={onSubmit}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
        }}
      >
        <div>
          <label style={labelStyle} htmlFor="name">
            Full name *
          </label>
          <input id="name" name="name" required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="email">
            Email *
          </label>
          <input id="email" name="email" type="email" required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="phone">
            Phone
          </label>
          <input id="phone" name="phone" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="location">
            Location
          </label>
          <input
            id="location"
            name="location"
            placeholder="City, State"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="rate">
            Desired rate
          </label>
          <input
            id="rate"
            name="rate"
            placeholder="e.g. $150k or $75/hr"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="citizenship">
            Work authorization
          </label>
          <select id="citizenship" name="citizenship" style={inputStyle} defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            {CITIZENSHIP_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <label style={labelStyle} htmlFor="resume">
          Resume (PDF or Word .docx) *
        </label>
        <input
          id="resume"
          name="resume"
          type="file"
          accept=".pdf,.doc,.docx"
          required
          style={{ fontSize: "0.9rem" }}
        />
      </div>

      {error ? (
        <p style={{ color: "#991b1b", marginTop: "0.85rem", fontSize: "0.9rem" }}>
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        style={{
          marginTop: "1.25rem",
          background: busy ? "#f9a8d4" : PINK,
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          padding: "0.7rem 1.5rem",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: busy ? "default" : "pointer",
        }}
      >
        {busy ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
