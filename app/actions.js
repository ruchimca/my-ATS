"use server";

import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { addCandidateRow, deleteCandidateRow } from "../lib/db";
import { STAGES } from "../lib/stages";

export async function addCandidate(formData) {
  const name = (formData.get("name") || "").toString().trim();
  if (!name) return; // name is required

  const role = (formData.get("role") || "").toString().trim();
  let stage = (formData.get("stage") || "Applied").toString();
  if (!STAGES.includes(stage)) stage = "Applied";
  const notes = (formData.get("notes") || "").toString().trim();

  await addCandidateRow({ name, role, stage, notes });
  revalidatePath("/");
}

export async function deleteCandidate(formData) {
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    await deleteCandidateRow(id);
    revalidatePath("/");
  }
}

// Turn a file name like "Jane_Doe_Resume.pdf" into "Jane Doe".
function filenameToName(filename) {
  let base = filename.replace(/\.[^.]+$/, ""); // drop extension
  base = base.replace(/[_\-.]+/g, " ");
  base = base.replace(/\b(resume|cv|final|updated|copy|v\d+)\b/gi, " ");
  base = base.replace(/\s+/g, " ").trim();
  return base || "Unnamed candidate";
}

// Ask Claude to read the PDF and pull out structured fields.
async function extractFromPdf(base64) {
  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    tools: [
      {
        name: "save_candidate",
        description:
          "Save the candidate details extracted from their resume.",
        input_schema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The candidate's full name.",
            },
            email: {
              type: "string",
              description:
                "The candidate's email address, or an empty string if none is found.",
            },
            role: {
              type: "string",
              description:
                "The candidate's current or most recent job title, or an empty string if unclear.",
            },
          },
          required: ["name"],
          additionalProperties: false,
        },
      },
    ],
    tool_choice: { type: "tool", name: "save_candidate" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text",
            text: "Extract the candidate's full name, email address, and current or most recent job title from this resume, then call save_candidate.",
          },
        ],
      },
    ],
  });

  const toolUse = message.content.find((b) => b.type === "tool_use");
  return toolUse ? toolUse.input : null;
}

// Called once per uploaded resume file (from the browser, after the file has
// been stored in Vercel Blob). Reads the PDF with AI when possible, otherwise
// falls back to the file name, then saves the candidate.
export async function processResume({ url, filename, contentType }) {
  let name = filenameToName(filename);
  let email = null;
  let role = null;

  const isPdf =
    contentType === "application/pdf" || /\.pdf$/i.test(filename || "");

  if (isPdf && process.env.ANTHROPIC_API_KEY) {
    try {
      const res = await fetch(url);
      const buf = Buffer.from(await res.arrayBuffer());
      const data = await extractFromPdf(buf.toString("base64"));
      if (data) {
        if (data.name && data.name.trim()) name = data.name.trim();
        if (data.email && data.email.trim()) email = data.email.trim();
        if (data.role && data.role.trim()) role = data.role.trim();
      }
    } catch (e) {
      // AI read failed (no key, bad PDF, etc.) — keep the file-name fallback.
    }
  }

  await addCandidateRow({
    name,
    role,
    stage: "Applied",
    notes: null,
    email,
    resumeUrl: url,
  });
  revalidatePath("/");
  return { name };
}
