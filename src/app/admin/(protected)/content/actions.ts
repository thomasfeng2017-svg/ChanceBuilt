"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireWriter } from "@/lib/auth";
import { ALL_CONTENT_BLOCKS, CONTENT_DEFAULTS } from "@/lib/content-blocks";

/**
 * Save edited copy.
 *
 * Only keys that exist in the registry are accepted, so a tampered form cannot
 * write arbitrary rows into the table.
 *
 * A value equal to the original, or emptied out, DELETES the row rather than
 * storing a duplicate of the default. That keeps "has this been customised?"
 * answerable by the presence of a row, and means improving the default wording
 * in code still reaches anyone who never edited it.
 */
export async function saveContentAction(_prev: unknown, formData: FormData) {
  await requireWriter("STAFF");

  const known = new Set(ALL_CONTENT_BLOCKS.map((b) => b.key));
  let changed = 0;
  let reset = 0;

  for (const [key, raw] of formData.entries()) {
    if (!known.has(key)) continue;

    const value = String(raw).replace(/\r\n/g, "\n").trim();
    const isDefault = value === CONTENT_DEFAULTS[key].trim();

    if (!value || isDefault) {
      const { count } = await prisma.contentBlock.deleteMany({ where: { key } });
      if (count) reset++;
      continue;
    }

    const existing = await prisma.contentBlock.findUnique({ where: { key } });
    if (existing?.value === value) continue;

    await prisma.contentBlock.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    changed++;
  }

  // Copy appears across the whole storefront, so refresh all of it.
  revalidatePath("/", "layout");

  return { ok: true as const, changed, reset };
}

/** Put one block back to the wording in the source. */
export async function resetContentAction(key: string) {
  await requireWriter("STAFF");
  await prisma.contentBlock.deleteMany({ where: { key } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/**
 * Save one block, for editing in place on the site itself.
 *
 * Same rules as the bulk form: only registered keys are accepted, and a value
 * matching the default deletes the row rather than storing a copy of it, so
 * "has this been customised?" stays answerable and improved defaults still
 * reach anyone who never touched that block.
 *
 * Returns the value that ended up in force, which is what the caller should
 * display. Clearing a block does not leave it blank, it reverts to the wording
 * in code, and the editor needs to show that rather than an empty box.
 */
export async function saveCopyBlockAction(
  key: string,
  raw: string,
): Promise<{ ok: true; value: string } | { ok: false; error: string }> {
  await requireWriter("STAFF");

  if (!ALL_CONTENT_BLOCKS.some((b) => b.key === key)) {
    return { ok: false, error: "Unknown content block." };
  }

  const value = raw.replace(/\r\n/g, "\n").trim();
  const fallback = CONTENT_DEFAULTS[key];

  if (!value || value === fallback.trim()) {
    await prisma.contentBlock.deleteMany({ where: { key } });
    revalidatePath("/", "layout");
    return { ok: true, value: fallback };
  }

  await prisma.contentBlock.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
  revalidatePath("/", "layout");
  return { ok: true, value };
}
