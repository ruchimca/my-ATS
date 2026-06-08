import { neon } from "@neondatabase/serverless";

// Vercel's Neon/Postgres integration provides one of these env vars.
function getConnectionString() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

export function isDbConfigured() {
  return Boolean(getConnectionString());
}

// Created lazily (inside functions) so importing this file never needs the
// database — that keeps `next build` working before the DB is connected.
function getSql() {
  const conn = getConnectionString();
  if (!conn) throw new Error("No database connection string is configured.");
  return neon(conn);
}

// Run the schema setup only once per warm server instance — re-running these
// statements on every query was making reads (and deletes) slow.
let schemaPromise = null;
function ensureSchema(sql) {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS candidates (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          role TEXT,
          stage TEXT NOT NULL DEFAULT 'Applied',
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`ALTER TABLE candidates ADD COLUMN IF NOT EXISTS email TEXT`;
      await sql`ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_url TEXT`;
      await sql`ALTER TABLE candidates ADD COLUMN IF NOT EXISTS fit_score INTEGER`;
      await sql`ALTER TABLE candidates ADD COLUMN IF NOT EXISTS fit_reason TEXT`;
      await sql`
        CREATE TABLE IF NOT EXISTS job_descriptions (
          id SERIAL PRIMARY KEY,
          filename TEXT,
          file_url TEXT,
          content TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
    })().catch((e) => {
      schemaPromise = null; // allow a retry on the next call if setup failed
      throw e;
    });
  }
  return schemaPromise;
}

export async function getCandidates() {
  const sql = getSql();
  await ensureSchema(sql);
  return sql`
    SELECT id, name, role, stage, notes, email, resume_url, fit_score, fit_reason, created_at
    FROM candidates
    ORDER BY fit_score DESC NULLS LAST, created_at DESC
  `;
}

export async function addCandidateRow({
  name,
  role,
  stage,
  notes,
  email = null,
  resumeUrl = null,
  fitScore = null,
  fitReason = null,
}) {
  const sql = getSql();
  await ensureSchema(sql);
  await sql`
    INSERT INTO candidates (name, role, stage, notes, email, resume_url, fit_score, fit_reason)
    VALUES (${name}, ${role || null}, ${stage}, ${notes || null}, ${email || null}, ${resumeUrl || null}, ${fitScore}, ${fitReason || null})
  `;
}

export async function deleteCandidateRow(id) {
  const sql = getSql();
  await sql`DELETE FROM candidates WHERE id = ${id}`;
}

// --- Job description (the role we're hiring for) ---

export async function getActiveJobDescription() {
  const sql = getSql();
  await ensureSchema(sql);
  const rows = await sql`
    SELECT id, filename, file_url, content, created_at
    FROM job_descriptions
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function saveJobDescription({ filename, fileUrl, content }) {
  const sql = getSql();
  await ensureSchema(sql);
  await sql`
    INSERT INTO job_descriptions (filename, file_url, content)
    VALUES (${filename || null}, ${fileUrl || null}, ${content || null})
  `;
}
