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

async function ensureSchema(sql) {
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
  // Added in Step 3 — safe to run repeatedly on the existing table.
  await sql`ALTER TABLE candidates ADD COLUMN IF NOT EXISTS email TEXT`;
  await sql`ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_url TEXT`;
}

export async function getCandidates() {
  const sql = getSql();
  await ensureSchema(sql);
  return sql`
    SELECT id, name, role, stage, notes, email, resume_url, created_at
    FROM candidates
    ORDER BY created_at DESC
  `;
}

export async function addCandidateRow({
  name,
  role,
  stage,
  notes,
  email = null,
  resumeUrl = null,
}) {
  const sql = getSql();
  await ensureSchema(sql);
  await sql`
    INSERT INTO candidates (name, role, stage, notes, email, resume_url)
    VALUES (${name}, ${role || null}, ${stage}, ${notes || null}, ${email || null}, ${resumeUrl || null})
  `;
}

export async function deleteCandidateRow(id) {
  const sql = getSql();
  await sql`DELETE FROM candidates WHERE id = ${id}`;
}
