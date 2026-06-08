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
      await sql`ALTER TABLE candidates ADD COLUMN IF NOT EXISTS phone TEXT`;
      await sql`ALTER TABLE candidates ADD COLUMN IF NOT EXISTS location TEXT`;
      await sql`ALTER TABLE candidates ADD COLUMN IF NOT EXISTS rate TEXT`;
      await sql`ALTER TABLE candidates ADD COLUMN IF NOT EXISTS citizenship TEXT`;
      await sql`ALTER TABLE candidates ADD COLUMN IF NOT EXISTS job_id INTEGER`;
      await sql`
        CREATE TABLE IF NOT EXISTS job_descriptions (
          id SERIAL PRIMARY KEY,
          filename TEXT,
          file_url TEXT,
          content TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT false`;
    })().catch((e) => {
      schemaPromise = null; // allow a retry on the next call if setup failed
      throw e;
    });
  }
  return schemaPromise;
}

// --- Candidates (scoped to a job) ---

export async function getCandidates(jobId) {
  const sql = getSql();
  await ensureSchema(sql);
  if (!jobId) return [];
  return sql`
    SELECT id, name, role, stage, notes, email, resume_url, fit_score, fit_reason,
           phone, location, rate, citizenship, job_id, created_at
    FROM candidates
    WHERE job_id = ${jobId}
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
  phone = null,
  location = null,
  rate = null,
  citizenship = null,
  jobId = null,
}) {
  const sql = getSql();
  await ensureSchema(sql);
  await sql`
    INSERT INTO candidates
      (name, role, stage, notes, email, resume_url, fit_score, fit_reason, phone, location, rate, citizenship, job_id)
    VALUES
      (${name}, ${role || null}, ${stage}, ${notes || null}, ${email || null}, ${resumeUrl || null},
       ${fitScore}, ${fitReason || null}, ${phone || null}, ${location || null}, ${rate || null},
       ${citizenship || null}, ${jobId})
  `;
}

export async function deleteCandidateRow(id) {
  const sql = getSql();
  await sql`DELETE FROM candidates WHERE id = ${id}`;
}

// --- Job descriptions (you can have several; one is "active") ---

export async function getJobs() {
  const sql = getSql();
  await ensureSchema(sql);
  return sql`
    SELECT id, filename, active, created_at
    FROM job_descriptions
    ORDER BY created_at DESC
  `;
}

export async function getActiveJobDescription() {
  const sql = getSql();
  await ensureSchema(sql);
  const active = await sql`
    SELECT id, filename, file_url, content, active, created_at
    FROM job_descriptions
    WHERE active = true
    ORDER BY created_at DESC
    LIMIT 1
  `;
  if (active[0]) return active[0];
  const latest = await sql`
    SELECT id, filename, file_url, content, active, created_at
    FROM job_descriptions
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return latest[0] || null;
}

export async function setActiveJobById(id) {
  const sql = getSql();
  await ensureSchema(sql);
  await sql`UPDATE job_descriptions SET active = (id = ${id})`;
}

// Saves a new job description and makes it the active one. Returns its id.
export async function saveJobDescription({ filename, fileUrl, content }) {
  const sql = getSql();
  await ensureSchema(sql);
  await sql`UPDATE job_descriptions SET active = false WHERE active = true`;
  const rows = await sql`
    INSERT INTO job_descriptions (filename, file_url, content, active)
    VALUES (${filename || null}, ${fileUrl || null}, ${content || null}, true)
    RETURNING id
  `;
  return rows[0]?.id || null;
}

// Delete a job and its candidates. If it was the active job, activate the
// most recent remaining one so there's always a sensible selection.
export async function deleteJobById(id) {
  const sql = getSql();
  await ensureSchema(sql);
  await sql`DELETE FROM candidates WHERE job_id = ${id}`;
  await sql`DELETE FROM job_descriptions WHERE id = ${id}`;
  const active = await sql`SELECT id FROM job_descriptions WHERE active = true LIMIT 1`;
  if (!active[0]) {
    const latest = await sql`SELECT id FROM job_descriptions ORDER BY created_at DESC LIMIT 1`;
    if (latest[0]) {
      await sql`UPDATE job_descriptions SET active = true WHERE id = ${latest[0].id}`;
    }
  }
}
