"use client";

import { useFormStatus } from "react-dom";

// Submit button for the delete form. Shows a clear "Deleting…" state and
// disables itself while the server action runs, so the button is obviously
// working and can't be clicked repeatedly.
export default function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title="Delete candidate"
      style={{
        background: pending ? "#fca5a5" : "#fee2e2",
        color: pending ? "#fff" : "#b91c1c",
        border: "1px solid #fca5a5",
        borderRadius: "8px",
        padding: "0.35rem 0.7rem",
        fontSize: "0.8rem",
        fontWeight: 600,
        cursor: pending ? "default" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
