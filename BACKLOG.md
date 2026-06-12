# my-ATS — Feature backlog

Deferred features to pick up later.

## ⏳ Background / parallel resume imports with a status dashboard
**Requested, deferred.** Today, importing a folder of résumés runs **in the
browser tab** (one import at a time, sequential). It keeps running if you switch
jobs in the dropdown (imports are pinned to the job they started on), but it
**stops if the tab is closed**, and there's **no way to run multiple imports in
parallel or see their status**.

**What we want:**
- Run résumé imports **server-side in the background** so they survive closing
  the tab / navigating away.
- Allow **multiple imports running at once** (e.g., importing for BA and for
  Data Engineer at the same time).
- A **status view** that shows how many import jobs are running, their
  progress (e.g., "37 of 100"), and their state (queued / running / done /
  failed).

**Rough implementation notes (for whoever builds it):**
- Add an `import_jobs` table: `id, job_id, total, processed, succeeded,
  rejected, status, created_at, updated_at`.
- Kick off processing server-side (Vercel's serverless time limits make long
  loops tricky) — options: a queue + worker (e.g. Vercel Queues / cron that
  drains a pending-files table), or an external worker. Files would be uploaded
  to Blob first, then processed by the worker.
- A status panel on the main page (and/or a `/imports` page) that polls the
  `import_jobs` table and shows live progress per job.

This is a meaningful, standalone project — not a quick tweak.
