"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import Anthropic from "@anthropic-ai/sdk";
import {
  addCandidateRow,
  deleteCandidateRow,
  getActiveJobDescription,
  saveJobDescription,
} from "../lib/db";

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

function pdfDocumentBlock(base64) {
  return {
    type: "document",
    source: { type: "base64", media_type: "application/pdf", data: base64 },
  };
}

// Read a job-description PDF and return a concise plain-text summary of the
// role and its key requirements, for later use when scoring resumes.
async function extractJdText(base64) {
  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: [
          pdfDocumentBlock(base64),
          {
            type: "text",
            text: "Summarize this job description as plain text: the job title, key responsibilities, and the most important required skills and qualifications. Be concise (under 250 words).",
          },
        ],
      },
    ],
  });
  const textBlock = message.content.find((b) => b.type === "text");
  return textBlock ? textBlock.text.trim() : "";
}

// Read a resume PDF and extract structured fields. When a job description is
// provided, also score how well the candidate fits the role.
async function extractFromPdf(base64, jdText) {
  const client = new Anthropic();

  const properties = {
    name: { type: "string", description: "The candidate's full name." },
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
  };
  const required = ["name"];

  if (jdText) {
    properties.fit_score = {
      type: "integer",
      description:
        "How well this candidate fits the job description, from 1 (poor fit) to 10 (excellent fit).",
    };
    properties.fit_reason = {
      type: "string",
      description: "One short sentence explaining the fit score.",
    };
    required.push("fit_score", "fit_reason");
  }

  const instruction = jdText
    ? `Here is the JOB DESCRIPTION we are hiring for:\n\n${jdText}\n\nNow read the attached resume. Extract the candidate's full name, email, and current/most recent job title. Then rate from 1 to 10 how well this candidate fits the job description (10 = excellent fit) and give a one-sentence reason. Call save_candidate.`
    : "Extract the candidate's full name, email address, and current or most recent job title from this resume, then call save_candidate.";

  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    tools: [
      {
        name: "save_candidate",
        description: "Save the candidate details extracted from their resume.",
        input_schema: {
          type: "object",
          properties,
          required,
          additionalProperties: false,
        },
      },
    ],
    tool_choice: { type: "tool", name: "save_candidate" },
    messages: [
      {
        role: "user",
        content: [pdfDocumentBlock(base64), { type: "text", text: instruction }],
      },
    ],
  });

  const toolUse = message.content.find((b) => b.type === "tool_use");
  return toolUse ? toolUse.input : null;
}

// Upload the job description file, store it, and (for PDFs) read its text so we
// can score resumes against it.
export async function uploadJobDescription(formData) {
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return { ok: false, error: "No file received." };
  }

  const filename = file.name || "job-description";
  const contentType = file.type || "";

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    const { url } = await put(`job-descriptions/${filename}`, buffer, {
      access: "public",
      addRandomSuffix: true,
      contentType: contentType || undefined,
    });

    let content = "";
    let warning = null;
    const isPdf = contentType === "application/pdf" || /\.pdf$/i.test(filename);
    if (!isPdf) {
      warning =
        "Saved, but only PDF job descriptions can be read for AI scoring. Please upload a PDF for scoring.";
    } else if (!process.env.ANTHROPIC_API_KEY) {
      warning = "Saved, but ANTHROPIC_API_KEY is not set, so AI can't read it.";
    } else {
      try {
        content = await extractJdText(buffer.toString("base64"));
      } catch (e) {
        warning = e?.message || "Saved, but reading the text failed.";
      }
    }

    await saveJobDescription({ filename, fileUrl: url, content });
    revalidatePath("/");
    return { ok: true, filename, warning };
  } catch (e) {
    return { ok: false, error: e?.message || "Upload failed." };
  }
}

// Called once per resume. Stores the file, reads it with AI (scoring against
// the active job description when one is set), and saves the candidate.
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

    // 2. Extract fields (and score against the job description, if set).
    let name = filenameToName(filename);
    let email = null;
    let role = null;
    let fitScore = null;
    let fitReason = null;
    let aiError = null;

    const isPdf = contentType === "application/pdf" || /\.pdf$/i.test(filename);
    if (!isPdf) {
      aiError = "not a PDF — used file name";
    } else if (!process.env.ANTHROPIC_API_KEY) {
      aiError = "ANTHROPIC_API_KEY not set on the server";
    } else {
      try {
        const job = await getActiveJobDescription();
        const jdText = job && job.content ? job.content : null;
        const data = await extractFromPdf(buffer.toString("base64"), jdText);
        if (data) {
          if (data.name && data.name.trim()) name = data.name.trim();
          if (data.email && data.email.trim()) email = data.email.trim();
          if (data.role && data.role.trim()) role = data.role.trim();
          if (Number.isFinite(data.fit_score)) fitScore = data.fit_score;
          if (data.fit_reason && data.fit_reason.trim())
            fitReason = data.fit_reason.trim();
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
      fitScore,
      fitReason,
    });
    revalidatePath("/");
    return { ok: true, name, aiError };
  } catch (e) {
    return { ok: false, error: e?.message || "Upload failed." };
  }
}
