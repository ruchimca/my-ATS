"use server";

import { revalidatePath } from "next/cache";
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
