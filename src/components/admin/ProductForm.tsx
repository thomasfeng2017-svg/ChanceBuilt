"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { saveProductAction, type ProductFormState } from "@/app/admin/(protected)/products/actions";
import { ImageUploader } from "./ImageUploader";
import type { PhotoSettings } from "@/lib/product-images";

type Option = { id: string; name: string; group?: string | null };
type CategoryOption = Option & { kind: "PART" | "MERCH" };

export type ProductFormValues = {
  id?: string;
  name: string;
  sku: string;
  partNumber: string;
  description: string;
  price: string;
  compareAt: string;
  stock: string;
  brandId: string;
  categoryId: string;
  isUniversal: boolean;
  archived: boolean;
  images: string[];
  imageFit: "COVER" | "CONTAIN";
  imageZoom: number;
  /** Per-photo crop and zoom, keyed by image URL. */
  imageSettings: PhotoSettings;
};

function SubmitButton({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-ring rounded bg-accent px-7 py-3 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi disabled:opacity-50"
    >
      {pending ? "Saving…" : isNew ? "Create product" : "Save changes"}
    </button>
  );
}

export function ProductForm({
  initial,
  brands,
  categories,
  readOnly = false,
}: {
  initial: ProductFormValues;
  brands: Option[];
  categories: CategoryOption[];
  readOnly?: boolean;
}) {
  const [state, formAction] = useActionState<ProductFormState, FormData>(
    saveProductAction,
    null,
  );
  const [images, setImages] = useState<string[]>(initial.images);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [imageFit, setImageFit] = useState<"COVER" | "CONTAIN">(initial.imageFit);
  const [imageZoom, setImageZoom] = useState(initial.imageZoom);
  const [imageSettings, setImageSettings] = useState<PhotoSettings>(initial.imageSettings);
  const isNew = !initial.id;

  // Category decides which shop the product appears in. Merch has no fitment,
  // so the universal-fitment control is hidden rather than left there implying
  // a hoodie could be vehicle-specific.
  const isMerch = categories.find((c) => c.id === categoryId)?.kind === "MERCH";

  const input =
    "focus-ring w-full rounded border border-line bg-surface-2 px-3.5 py-2.5 text-sm transition-colors placeholder:text-muted/50 hover:border-line-hi disabled:opacity-60";
  const label = "mb-1.5 block text-sm font-semibold";

  return (
    <form action={formAction} className="space-y-8">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="images" value={images.join(",")} />
      <input type="hidden" name="imageSettings" value={JSON.stringify(imageSettings)} />

      {/* --- basics --- */}
      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="display mb-4 text-base">Details</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={label}>Product name</span>
            <input
              name="name"
              required
              disabled={readOnly}
              defaultValue={initial.name}
              className={input}
              placeholder="Pure Turbos Stage 2 Upgrade - S55"
            />
          </label>

          <label className="block">
            <span className={label}>SKU</span>
            <input
              name="sku"
              required
              disabled={readOnly}
              defaultValue={initial.sku}
              className={`${input} font-mono`}
              placeholder="CB-1234"
            />
            <span className="mt-1 block text-xs text-muted">
              Unique. Fitment imports match on this.
            </span>
          </label>

          <label className="block">
            <span className={label}>
              Manufacturer part number <span className="font-normal text-muted">(optional)</span>
            </span>
            <input
              name="partNumber"
              disabled={readOnly}
              defaultValue={initial.partNumber}
              className={`${input} font-mono`}
            />
          </label>

          <label className="block">
            <span className={label}>Brand</span>
            <select
              name="brandId"
              required
              disabled={readOnly}
              defaultValue={initial.brandId}
              className={`select-field ${input}`}
            >
              <option value="">Choose a brand…</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={label}>Category</span>
            <select
              name="categoryId"
              required
              disabled={readOnly}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={`select-field ${input}`}
            >
              <option value="">Choose a category…</option>
              {(["PART", "MERCH"] as const).map((kind) => {
                const inKind = categories.filter((c) => c.kind === kind);
                if (!inKind.length) return null;
                return (
                  <optgroup key={kind} label={kind === "PART" ? "Parts" : "Merch"}>
                    {inKind.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.group ? `${c.group} → ${c.name}` : c.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            <span className="mt-1.5 block text-xs text-muted">
              {isMerch
                ? "Shows in Merch. No vehicle filtering."
                : "Shows in the Parts catalog, filtered by fitment."}
            </span>
          </label>

          <label className="block sm:col-span-2">
            <span className={label}>Description</span>
            <textarea
              name="description"
              rows={5}
              disabled={readOnly}
              defaultValue={initial.description}
              className={input}
              placeholder="What it is, what it needs to work, and anything the customer should know before buying."
            />
          </label>
        </div>
      </section>

      {/* --- pricing --- */}
      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="display mb-4 text-base">Price &amp; stock</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className={label}>Price</span>
            <input
              name="price"
              required
              disabled={readOnly}
              defaultValue={initial.price}
              className={input}
              inputMode="decimal"
              placeholder="3499.00"
            />
          </label>
          <label className="block">
            <span className={label}>
              Compare at <span className="font-normal text-muted">(optional)</span>
            </span>
            <input
              name="compareAt"
              disabled={readOnly}
              defaultValue={initial.compareAt}
              className={input}
              inputMode="decimal"
              placeholder="3899.00"
            />
            <span className="mt-1 block text-xs text-muted">
              Shows as a struck-through was-price.
            </span>
          </label>
          <label className="block">
            <span className={label}>Stock</span>
            <input
              name="stock"
              required
              disabled={readOnly}
              defaultValue={initial.stock}
              className={input}
              inputMode="numeric"
              placeholder="0"
            />
          </label>
        </div>
      </section>

      {/* --- photos --- */}
      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="display mb-1 text-base">Photos</h2>
        <p className="mb-4 text-sm text-muted">
          First photo is the one shown in the catalog.
        </p>
        {readOnly ? (
          <p className="text-sm text-muted">{images.length} photo(s)</p>
        ) : (
          <ImageUploader
            value={images}
            onChange={setImages}
            folder="products"
            settings={imageSettings}
            onSettingsChange={setImageSettings}
            productDefault={{ fit: imageFit, zoom: imageZoom }}
          />
        )}

        {/*
          Framing, per product rather than per photo.

          "Whole photo" is the default and the right one for a parts catalog:
          these are shot on a bench at whatever angle was convenient, and a
          card that crops half the turbo off is worse than one with a little
          space around it. It also makes the photo's shape irrelevant, which
          matters when one product has a vertical shot and another a
          horizontal one.
        */}
        {!readOnly && images.length > 0 && (
          <div className="mt-5 space-y-3 border-t border-line pt-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-sm font-semibold">Default framing</span>
              {(
                [
                  ["CONTAIN", "Show whole photo"],
                  ["COVER", "Fill the box"],
                ] as const
              ).map(([val, text]) => (
                <label key={val} className="cursor-pointer">
                  <input
                    type="radio"
                    name="imageFit"
                    value={val}
                    checked={imageFit === val}
                    onChange={() => setImageFit(val)}
                    className="peer sr-only"
                  />
                  <span className="focus-ring block rounded border border-line px-2.5 py-1 text-[0.7rem] font-semibold text-muted transition-colors peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-fg hover:border-line-hi">
                    {text}
                  </span>
                </label>
              ))}
            </div>

            {imageFit === "COVER" && (
              <label className="block max-w-sm">
                <span className="mb-1 flex items-center justify-between text-xs text-muted">
                  <span>Zoom</span>
                  <span className="font-mono">{imageZoom}%</span>
                </span>
                <input
                  type="range"
                  name="imageZoom"
                  min={100}
                  max={250}
                  step={5}
                  value={imageZoom}
                  onChange={(e) => setImageZoom(Number(e.target.value))}
                  className="focus-ring w-full accent-[var(--color-accent)]"
                />
              </label>
            )}

            {/* Kept in the form even when the slider is hidden, so switching to
                "Whole photo" does not silently discard the zoom on save. */}
            {imageFit !== "COVER" && (
              <input type="hidden" name="imageZoom" value={imageZoom} />
            )}

            <p className="text-xs text-muted">
              Applies to every photo that has not been cropped on its own. Use
              Crop on a photo to override it there.
            </p>
          </div>
        )}
      </section>

      {/* --- flags --- */}
      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="display mb-4 text-base">Visibility</h2>
        <div className="space-y-3">
          {!isMerch && (
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="isUniversal"
                disabled={readOnly}
                defaultChecked={initial.isUniversal}
                className="mt-1 h-4 w-4 accent-white"
              />
              <span>
                <span className="block text-sm font-semibold">Fits any vehicle</span>
                <span className="block text-xs text-muted">
                  For oil, tools and cleaners. Skips fitment entirely and shows for every
                  customer.
                </span>
              </span>
            </label>
          )}

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="archived"
              disabled={readOnly}
              defaultChecked={initial.archived}
              className="mt-1 h-4 w-4 accent-white"
            />
            <span>
              <span className="block text-sm font-semibold">Archived</span>
              <span className="block text-xs text-muted">
                Hidden from the shop but kept on past orders. Use instead of deleting.
              </span>
            </span>
          </label>
        </div>
      </section>

      {state && !state.ok && (
        <p
          role="alert"
          className="rounded border border-bad/30 bg-bad/10 px-4 py-3 text-sm font-medium text-bad"
        >
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded border border-good/30 bg-good/10 px-4 py-3 text-sm font-medium text-good">
          Saved.
        </p>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton isNew={isNew} />
          <Link
            href="/admin/products"
            className="focus-ring rounded px-4 py-3 text-sm text-muted hover:text-text"
          >
            Cancel
          </Link>
        </div>
      )}
    </form>
  );
}
