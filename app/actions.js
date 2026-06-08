"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import {
  addCandidateRow,
  deleteCandidateRow,
  updateCandidateStage,
  getActiveJobDescription,
  getJobById,
  saveJobDescription,
  setActiveJobById,
  deleteJobById,
} from "../lib/db";
import { STAGES } from "../lib/stages";

export async function deleteCandidate(formData) {
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    await deleteCandidateRow(id);
    revalidatePath("/");
  }
}

export async function updateStage(formData) {
  const id = Number(formData.get("id"));
  const stage = (formData.get("stage") || "").toString();
  if (Number.isInteger(id) && STAGES.includes(stage)) {
    await updateCandidateStage(id, stage);
    revalidatePath("/");
  }
}

// Switch which job description is active (the one new resumes are scored
// against and whose candidates are shown).
export async function setActiveJob(formData) {
  const id = Number(formData.get("jobId"));
  if (Number.isInteger(id)) {
    await setActiveJobById(id);
    revalidatePath("/");
  }
}

// Delete a job description and all of its candidates.
export async function deleteJob(formData) {
  const id = Number(formData.get("jobId"));
  if (Number.isInteger(id)) {
    await deleteJobById(id);
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

// Pull plain text out of a Word (.docx) file.
async function extractDocxText(buffer) {
  const { value } = await mammoth.extractRawText({ buffer });
  return (value || "").trim();
}

// Summarize job-description text (from a .docx) into a concise plain-text brief.
async function summarizeJdText(text) {
  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Summarize this job description as plain text: the job title, key responsibilities, and the most important required skills and qualifications. Be concise (under 250 words).\n\nJOB DESCRIPTION:\n\n${text.slice(0, 20000)}`,
          },
        ],
      },
    ],
  });
  const textBlock = message.content.find((b) => b.type === "text");
  return textBlock ? textBlock.text.trim() : "";
}

// Read a job-description PDF (vision) and return a concise plain-text summary.
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

// Build the tool + instruction for candidate extraction (and optional scoring).
function candidateToolAndInstruction(jdText) {
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
    phone: {
      type: "string",
      description:
        "The candidate's phone number, or an empty string if not found.",
    },
    location: {
      type: "string",
      description:
        "The candidate's location (city, state/country), or an empty string if not found.",
    },
    rate: {
      type: "string",
      description:
        "The candidate's desired pay or bill rate (salary or hourly) if stated, otherwise an empty string.",
    },
    citizenship: {
      type: "string",
      description:
        "The candidate's citizenship or work-authorization status (e.g. US Citizen, Green Card, H1B), or an empty string if not stated.",
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
    ? `Here is the JOB DESCRIPTION we are hiring for:\n\n${jdText}\n\nNow read the resume below. Extract the candidate's full name, email, current/most recent job title, phone number, location, desired pay/bill rate, and citizenship/work-authorization status (leave any of these blank if not present). Then rate from 1 to 10 how well this candidate fits the job description (10 = excellent fit) and give a one-sentence reason. Call save_candidate.`
    : "Read the resume below. Extract the candidate's full name, email address, current or most recent job title, phone number, location, desired pay/bill rate, and citizenship/work-authorization status (leave any of these blank if not present), then call save_candidate.";

  const tool = {
    name: "save_candidate",
    description: "Save the candidate details extracted from their resume.",
    input_schema: {
      type: "object",
      properties,
      required,
      additionalProperties: false,
    },
  };
  return { tool, instruction };
}

// Run the extraction given the resume content blocks (a PDF document, or text).
async function runCandidateExtraction(resumeBlocks, jdText) {
  const client = new Anthropic();
  const { tool, instruction } = candidateToolAndInstruction(jdText);
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    tools: [tool],
    tool_choice: { type: "tool", name: "save_candidate" },
    messages: [
      {
        role: "user",
        content: [...resumeBlocks, { type: "text", text: instruction }],
      },
    ],
  });
  const toolUse = message.content.find((b) => b.type === "tool_use");
  return toolUse ? toolUse.input : null;
}

// Read a resume PDF (vision) → structured fields + optional fit score.
async function extractFromPdf(base64, jdText) {
  return runCandidateExtraction([pdfDocumentBlock(base64)], jdText);
}

// Read resume text (from a .docx) → structured fields + optional fit score.
async function extractFromText(text, jdText) {
  return runCandidateExtraction(
    [{ type: "text", text: `RESUME:\n\n${text.slice(0, 30000)}` }],
    jdText,
  );
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
    const isDocx =
      contentType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      /\.docx$/i.test(filename);

    if (!process.env.ANTHROPIC_API_KEY) {
      warning = "Saved, but ANTHROPIC_API_KEY is not set, so AI can't read it.";
    } else if (isPdf) {
      try {
        content = await extractJdText(buffer.toString("base64"));
      } catch (e) {
        warning = e?.message || "Saved, but reading the text failed.";
      }
    } else if (isDocx) {
      try {
        const raw = await extractDocxText(buffer);
        content = raw ? await summarizeJdText(raw) : "";
        if (!content) {
          warning = "Saved, but no readable text was found in the Word file.";
        }
      } catch (e) {
        warning = e?.message || "Saved, but reading the Word file failed.";
      }
    } else {
      warning =
        "Saved, but only PDF or Word (.docx) job descriptions can be read for AI scoring.";
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
    const job = await getActiveJobDescription();
    if (!job) {
      return { ok: false, error: "Choose a job description first." };
    }

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
    let phone = null;
    let location = null;
    let rate = null;
    let citizenship = null;
    let aiError = null;

    const pick = (v) => (v && v.trim() ? v.trim() : null);

    const isPdf = contentType === "application/pdf" || /\.pdf$/i.test(filename);
    const isDocx =
      contentType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      /\.docx$/i.test(filename);

    if (!isPdf && !isDocx) {
      aiError = "unsupported file type — used file name (use PDF or .docx)";
    } else if (!process.env.ANTHROPIC_API_KEY) {
      aiError = "ANTHROPIC_API_KEY not set on the server";
    } else {
      try {
        const jdText = job.content || null;
        let data;
        if (isPdf) {
          data = await extractFromPdf(buffer.toString("base64"), jdText);
        } else {
          const text = await extractDocxText(buffer);
          if (!text) throw new Error("no readable text in the Word file");
          data = await extractFromText(text, jdText);
        }
        if (data) {
          if (data.name && data.name.trim()) name = data.name.trim();
          email = pick(data.email);
          role = pick(data.role) || role;
          phone = pick(data.phone);
          location = pick(data.location);
          rate = pick(data.rate);
          citizenship = pick(data.citizenship);
          if (Number.isFinite(data.fit_score)) fitScore = data.fit_score;
          fitReason = pick(data.fit_reason);
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
      phone,
      location,
      rate,
      citizenship,
      jobId: job.id,
    });
    revalidatePath("/");
    return { ok: true, name, aiError };
  } catch (e) {
    return { ok: false, error: e?.message || "Upload failed." };
  }
}

// Public job application: an applicant uploads a resume and fills a short form.
// Creates a candidate for the job and scores the resume against it.
export async function submitApplication(formData) {
  const DOCX_MIME =
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const jobId = Number(formData.get("jobId"));
  const name = (formData.get("name") || "").toString().trim();
  const email = (formData.get("email") || "").toString().trim();
  const phone = (formData.get("phone") || "").toString().trim();
  const location = (formData.get("location") || "").toString().trim();
  const rate = (formData.get("rate") || "").toString().trim();
  const citizenship = (formData.get("citizenship") || "").toString().trim();
  const file = formData.get("resume");

  if (!Number.isInteger(jobId)) return { ok: false, error: "Invalid job link." };
  if (!name) return { ok: false, error: "Please enter your name." };
  if (!email) return { ok: false, error: "Please enter your email." };
  if (!file || typeof file === "string")
    return { ok: false, error: "Please attach your resume." };

  const job = await getJobById(jobId);
  if (!job)
    return { ok: false, error: "This job is no longer accepting applications." };

  try {
    const filename = file.name || "resume";
    const contentType = file.type || "";
    const buffer = Buffer.from(await file.arrayBuffer());

    const { url } = await put(`resumes/${filename}`, buffer, {
      access: "public",
      addRandomSuffix: true,
      contentType: contentType || undefined,
    });

    // AI reads the resume for role + fit against the job description.
    let role = null;
    let fitScore = null;
    let fitReason = null;
    const isPdf = contentType === "application/pdf" || /\.pdf$/i.test(filename);
    const isDocx = contentType === DOCX_MIME || /\.docx$/i.test(filename);
    if ((isPdf || isDocx) && process.env.ANTHROPIC_API_KEY) {
      try {
        const jdText = job.content || null;
        let data;
        if (isPdf) {
          data = await extractFromPdf(buffer.toString("base64"), jdText);
        } else {
          const text = await extractDocxText(buffer);
          if (text) data = await extractFromText(text, jdText);
        }
        if (data) {
          if (data.role && data.role.trim()) role = data.role.trim();
          if (Number.isFinite(data.fit_score)) fitScore = data.fit_score;
          if (data.fit_reason && data.fit_reason.trim())
            fitReason = data.fit_reason.trim();
        }
      } catch (e) {
        // keep the application even if AI reading fails
      }
    }

    await addCandidateRow({
      name,
      role,
      stage: "Applied",
      notes: null,
      email,
      resumeUrl: url,
      fitScore,
      fitReason,
      phone,
      location,
      rate,
      citizenship,
      jobId,
    });
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e?.message || "Something went wrong submitting your application.",
    };
  }
}
