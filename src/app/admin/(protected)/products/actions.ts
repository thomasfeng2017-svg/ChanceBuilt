"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireWriter } from "@/lib/auth";
import { parsePhotoSettings, type PhotoSettings } from "@/lib/product-images";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Dollars (as typed by a human) to integer cents. */
function toCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export type ProductFormState = { ok: boolean; error?: string; id?: string } | null;

/**
 * Create or update a product.
 *
 * The SKU is the stable identifier used by the fitment importer, so it's
 * required and must be unique. The slug is derived once on create and then left
 * alone — changing it later would break any link a customer has saved.
 */
export async function saveProductAction(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireWriter("STAFF");

  const id = String(formData.get("id") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim().toUpperCase();
  const partNumber = String(formData.get("partNumber") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const brandId = String(formData.get("brandId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const isUniversal = formData.get("isUniversal") === "on";
  const archived = formData.get("archived") === "on";

  // Photo framing. Clamped, since zoom is applied as a CSS transform and a
  // wild value would blow one pixel up across the whole card.
  const imageFit = formData.get("imageFit") === "COVER" ? ("COVER" as const) : ("CONTAIN" as const);
  const imageZoom = Math.max(100, Math.min(300, Number(formData.get("imageZoom")) || 100));

  const priceCents = toCents(String(formData.get("price") ?? ""));
  const compareRaw = String(formData.get("compareAt") ?? "").trim();
  const compareAtCents = compareRaw ? toCents(compareRaw) : null;
  const stock = Number(String(formData.get("stock") ?? "0"));

  const images = String(formData.get("images") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  /*
    Per-photo crop, keyed by URL.

    Re-parsed here rather than trusted: this arrives as a JSON string in a
    hidden field, so it is as forgeable as any other form value, and it lands in
    a style attribute. parsePhotoSettings clamps every number and drops anything
    it does not recognise.

    Entries for photos that are no longer attached are dropped too. The uploader
    already does this on remove, but a stale row from before this field existed
    would otherwise keep its orphans forever.
  */
  let imageSettings: PhotoSettings = {};
  try {
    imageSettings = parsePhotoSettings(JSON.parse(String(formData.get("imageSettings") ?? "{}")));
  } catch {
    imageSettings = {};
  }
  for (const url of Object.keys(imageSettings)) {
    if (!images.includes(url)) delete imageSettings[url];
  }

  if (name.length < 3) return { ok: false, error: "Give the product a name." };
  if (!sku) return { ok: false, error: "SKU is required — it's how fitment imports match." };
  if (!brandId) return { ok: false, error: "Pick a brand." };
  if (!categoryId) return { ok: false, error: "Pick a category." };
  if (priceCents === null) return { ok: false, error: "Enter a valid price." };
  if (compareRaw && compareAtCents === null) {
    return { ok: false, error: "Enter a valid compare-at price, or leave it blank." };
  }
  if (compareAtCents !== null && compareAtCents <= priceCents) {
    return {
      ok: false,
      error: "Compare-at price should be higher than the price, or blank.",
    };
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return { ok: false, error: "Stock must be a whole number." };
  }

  // SKU uniqueness, excluding the row being edited.
  const clash = await prisma.product.findFirst({
    where: { sku, ...(id ? { NOT: { id } } : {}) },
    select: { id: true },
  });
  if (clash) return { ok: false, error: `SKU ${sku} is already used by another product.` };

  const data = {
    name,
    sku,
    partNumber: partNumber || null,
    description,
    priceCents,
    compareAtCents,
    stock,
    images,
    isUniversal,
    archived,
    imageFit,
    imageZoom,
    imageSettings,
    brandId,
    categoryId,
  };

  if (id) {
    await prisma.product.update({ where: { id }, data });
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    return { ok: true, id };
  }

  // Slug must be unique; suffix with the SKU, which already is.
  const created = await prisma.product.create({
    data: { ...data, slug: `${slugify(name)}-${sku.toLowerCase()}` },
  });

  revalidatePath("/admin/products");
  redirect(`/admin/products/${created.id}?created=1`);
}

export async function setArchivedAction(productId: string, archived: boolean) {
  await requireWriter("STAFF");
  await prisma.product.update({ where: { id: productId }, data: { archived } });
  revalidatePath("/admin/products");
  return { ok: true as const };
}

export async function setStockAction(productId: string, stock: number) {
  await requireWriter("STAFF");
  if (!Number.isInteger(stock) || stock < 0) {
    return { ok: false as const, error: "Stock must be a whole number." };
  }
  await prisma.product.update({ where: { id: productId }, data: { stock } });
  revalidatePath("/admin/products");
  return { ok: true as const };
}

// ----------------------------------------------------------------- fitment --

export async function addFitmentAction(input: {
  productId: string;
  modelId: string;
  yearStart: number;
  yearEnd: number;
  submodel?: string;
  engine?: string;
  notes?: string;
}) {
  await requireWriter("STAFF");

  const model = await prisma.model.findUnique({ where: { id: input.modelId } });
  if (!model) return { ok: false as const, error: "Unknown vehicle." };

  if (input.yearStart > input.yearEnd) {
    return { ok: false as const, error: "Start year is after the end year." };
  }

  // Don't create a duplicate of a range that's already covered.
  const existing = await prisma.fitment.findFirst({
    where: {
      productId: input.productId,
      modelId: input.modelId,
      yearStart: { lte: input.yearStart },
      yearEnd: { gte: input.yearEnd },
    },
  });
  if (existing) {
    return { ok: false as const, error: "That range is already covered for this vehicle." };
  }

  await prisma.fitment.create({
    data: {
      productId: input.productId,
      makeId: model.makeId,
      modelId: model.id,
      yearStart: input.yearStart,
      yearEnd: input.yearEnd,
      submodel: input.submodel?.trim() || null,
      engine: input.engine?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });

  revalidatePath(`/admin/products/${input.productId}`);
  return { ok: true as const };
}

/**
 * The time-saver: add fitment for every chassis that runs a given engine.
 *
 * Because Model.engineCodes is real data, "all S55 cars" stays correct as the
 * vehicle list grows — nobody has to maintain a hardcoded list of chassis.
 */
export async function addFitmentByEngineAction(productId: string, engineCode: string) {
  await requireWriter("STAFF");

  const models = await prisma.model.findMany({
    where: { engineCodes: { has: engineCode } },
  });
  if (models.length === 0) {
    return { ok: false as const, error: `No vehicles are listed with a ${engineCode}.` };
  }

  const existing = await prisma.fitment.findMany({
    where: { productId },
    select: { modelId: true },
  });
  const alreadyCovered = new Set(existing.map((f) => f.modelId));

  const toCreate = models.filter((m) => !alreadyCovered.has(m.id));
  if (toCreate.length === 0) {
    return { ok: false as const, error: `Every ${engineCode} chassis is already listed.` };
  }

  await prisma.fitment.createMany({
    data: toCreate.map((m) => ({
      productId,
      makeId: m.makeId,
      modelId: m.id,
      yearStart: m.yearStart,
      yearEnd: m.yearEnd,
      engine: engineCode,
    })),
  });

  revalidatePath(`/admin/products/${productId}`);
  return { ok: true as const, added: toCreate.length };
}

/**
 * Undo for the engine presets.
 *
 * "All B58" adds a dozen or more chassis in one click, and clicking the wrong
 * code is easy when the buttons sit next to each other. Without this, undoing it
 * means fourteen individual Remove clicks.
 *
 * Matched on the engine recorded ON THE FITMENT, not on the chassis's engine
 * list. Plenty of BMW chassis were sold with more than one engine, so going by
 * the chassis would sweep away rows that were added deliberately for a different
 * engine and merely share a car.
 */
export async function removeFitmentByEngineAction(productId: string, engineCode: string) {
  await requireWriter("STAFF");

  const code = engineCode.trim();
  if (!code) return { ok: false as const, error: "No engine given." };

  const { count } = await prisma.fitment.deleteMany({
    // Case-insensitive: the presets write "B58" but a typed-in row could be
    // "b58", and the shop would rightly expect one button to clear both.
    where: { productId, engine: { equals: code, mode: "insensitive" } },
  });

  if (count === 0) {
    return { ok: false as const, error: `No ${code} fitment to remove.` };
  }

  revalidatePath(`/admin/products/${productId}`);
  return { ok: true as const, removed: count };
}

export async function removeFitmentAction(fitmentId: string, productId: string) {
  await requireWriter("STAFF");
  await prisma.fitment.delete({ where: { id: fitmentId } });
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true as const };
}
