"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
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

// Called once per resume. The browser posts the file to this server action,
// which (1) stores it in Vercel Blob, (2) reads the PDF with AI when possible
// (otherwise falls back to the file name), and (3) saves the candidate.
// Uploading server-side works with an OIDC-connected Blob store (no static
// BLOB_READ_WRITE_TOKEN required, unlike browser uploads).
export async function uploadResume(formData) {
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return { ok: false, error: "No file received." };
  }

  const filename = file.name || "resume";
  const contentType = file.type || "";

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Store the file.
    const { url } = await put(`resumes/${filename}`, buffer, {
      access: "public",
      addRandomSuffix: true,
      contentType: contentType || undefined,
    });

    // 2. Extract fields.
    let name = filenameToName(filename);
    let email = null;
    let role = null;
    let aiError = null;

    const isPdf = contentType === "application/pdf" || /\.pdf$/i.test(filename);
    if (!isPdf) {
      aiError = "not a PDF — used file name";
    } else if (!process.env.ANTHROPIC_API_KEY) {
      aiError = "ANTHROPIC_API_KEY not set on the server";
    } else {
      try {
        const data = await extractFromPdf(buffer.toString("base64"));
        if (data) {
          if (data.name && data.name.trim()) name = data.name.trim();
          if (data.email && data.email.trim()) email = data.email.trim();
          if (data.role && data.role.trim()) role = data.role.trim();
        }
      } catch (e) {
        aiError = e?.message || "AI read failed";
      }
    }

    // 3. Save the candidate.
    await addCandidateRow({
      name,
      role,
      stage: "Applied",
      notes: null,
      email,
      resumeUrl: url,
    });
    revalidatePath("/");
    return { ok: true, name, aiError };
  } catch (e) {
    return { ok: false, error: e?.message || "Upload failed." };
  }
}
