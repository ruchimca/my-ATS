"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      className="no-print"
      onClick={() => window.print()}
      style={{
        background: "#db2777",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        padding: "0.6rem 1.3rem",
        fontSize: "0.95rem",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      🖨 Save as PDF / Print
    </button>
  );
}
