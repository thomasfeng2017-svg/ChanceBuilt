# Photos

Drop image files into these folders and they appear on the site. No code
changes, no database entries, no rebuild needed in development.

| Folder             | Where it shows up                                     |
| ------------------ | ----------------------------------------------------- |
| `public/brand/`    | Site logo — header and footer (SVG preferred)          |
| `public/hero/`     | Homepage hero background (uses the **first** file)     |
| `public/gallery/`  | `/gallery` page, in filename order                     |
| `public/products/` | Product photos — referenced from `Product.images`      |

## The logo

Put one file in `public/brand/` and it replaces the placeholder mark in the
header and footer automatically. If an `.svg` is present it wins; otherwise the
first file is used.

- **SVG is strongly preferred** — it stays sharp on every screen at every size,
  and the file is tiny.
- If you only have raster, use **PNG with a transparent background**, at least
  **600px wide**. The header renders it ~42px tall, so 600px covers high-DPI
  phones and laptops.
- The artwork should be **white/light on transparent**. The site is dark, so a
  logo with a baked-in black background will show as a visible box.

## Naming

Files are sorted by filename, and gallery captions are generated from the name,
so name them deliberately:

```
01-f80-m3-turbo-upgrade.jpg   ->  "F80 M3 Turbo Upgrade"
02-g80-m3-dyno.jpg            ->  "G80 M3 Dyno"
03-b58-downpipe-install.jpg   ->  "B58 Downpipe Install"
```

A leading number controls the order and is stripped from the caption.

## Format and size

- **Format:** `.jpg`, `.png`, `.webp` or `.avif`. Prefer `.webp` — same quality,
  roughly half the file size.
- **Hero:** landscape, at least 2000px wide.
- **Gallery:** at least 1200px on the long edge. They're displayed 4:3, so
  anything wildly different will be cropped from the centre.
- **Products:** square works best. At least 1000×1000.

Next.js resizes and re-encodes these automatically on request, so you don't need
to make multiple sizes yourself — but don't upload 12MB camera originals either.
Around 300–800KB each is the sweet spot.

## The black-and-white treatment

The site desaturates photos to match the shop's look, and eases the colour back
in on hover. That's a CSS filter, so **upload your photos in colour** — you get
both looks from one file. If you want a photo to stay colour, remove the
`photo-bw` class where it's rendered.

## Attaching photos to products

Product photos need to be linked to the product record. Put the file in
`public/products/`, then set the path on the product:

```
npm run db:studio
```

Open the `Product` table, find the row, and add the path to `images`, e.g.
`/products/csf-race-intercooler-s55.webp`. The first image is the main one; the
rest show as thumbnails on the product page.
