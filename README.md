# ChanceBuilt Performance

Storefront + booking site for ChanceBuilt Performance LLC — BMW performance
specialists, Riverside CA.

Two things drive the whole site:

1. **Year / Make / Model fitment filtering.** Pick a car once and every page
   after that only shows parts confirmed to fit it.
2. **Online service booking.** Real availability from the shop's opening hours,
   with bay capacity respected.

## Stack

| | |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL 17 |
| ORM | Prisma 7 (via the `@prisma/adapter-pg` driver adapter) |

## Running it

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

The app is at http://localhost:3000.

`DATABASE_URL` lives in `.env`. Locally it points at the PostgreSQL 17 instance
installed on this machine; for production, swap it for a hosted Postgres
connection string (Neon, Supabase, RDS, Railway) — nothing else changes.

### Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Create + apply a migration |
| `npm run db:seed` | Wipe and reseed the catalog, vehicles and services |
| `npm run db:studio` | Prisma Studio — a GUI for the database |
| `npm run db:reset` | Drop, re-migrate, reseed |
| `npm run import:fitment -- file.csv` | Bulk-import fitment data |
| `npm run user:create` | Create or update an admin user (prompts for the password) |
| `npm run images:import` | Bring existing public/ photos under admin management |
| `npm run images:dimensions` | Record intrinsic width/height on image rows |
| `npm run images:focal` | Derive a starting focal point for each slot |

## How fitment works

This is the part worth understanding before changing anything.

A part's compatibility is stored as **year-range rows** (`Fitment`), not one row
per individual vehicle year:

```
Fitment: productId, makeId, modelId, yearStart, yearEnd, submodel?, engine?, notes?
```

So "fits 2015–2018 M3 (F80)" is a single row. This is how supplier feeds ship
data, it keeps the table small, and it answers the only question the storefront
asks: *does this part fit a given year/make/model?*

The query lives in `src/lib/catalog.ts` → `fitmentWhere()`:

```
show a product when
  it is flagged universal (oil, tools, cleaners - fits anything)
  OR it has a Fitment row for that exact model whose year range brackets the year
```

Vehicles are modelled by **chassis code**, because that is how BMW owners shop.
`Model` carries `chassis` ("F80") and `engineCodes` (`["S55"]`), and the model
slug includes the chassis so `M3 (F80)` and `M3 (G80)` coexist cleanly.

The selected vehicle ("the garage") is kept in a cookie so it is readable during
server rendering — that is what lets the catalog arrive already filtered instead
of flashing an unfiltered list.

### Brand assets

Generated from the supplied logo by:

```bash
npx tsx scripts/prepare-logo.ts E:/ChanceBuilt/Logo.jfif
```

The source is a 225x225 JPEG: white artwork on a solid black square, no alpha.
White-on-black is the one case where transparency can be recovered exactly,
because the file is already premultiplied against black, so `alpha = luminance`
and `colour = pixel / alpha`. A toe below 10% luminance forces near-black fully
transparent, which removes the JPEG haze around the letterforms instead of
leaving it as a grey halo. The script writes `logo.png`, `monogram.png`,
`icon.png`, `apple-icon.png` and a real multi-size `favicon.ico`.

**Two limits worth knowing:**

The usable artwork is only **145x86**. `Logo.tsx` therefore pairs the monogram
with *typeset* wordmark text rather than using the baked-in lockup, which is
unreadable at a 42px header. Drop a real `logo.svg` into `public/brand/` and the
component switches to using it alone, automatically.

The mark is **white outline artwork, so it disappears on light backgrounds.**
The header and footer are both dark, so this is currently fine, but the
`.section-paper` bands are not safe for it. A dark version has to come from
whoever drew the original.

### Parts and merch are separate shops

`Category.kind` is either `PART` or `MERCH`, and a product's side of the shop
follows from the category it is filed under. That is deliberately the only
place the distinction is stored, so the two can never disagree.

| | `/parts` | `/merch` |
| --- | --- | --- |
| Vehicle filtering | Yes | No |
| Fitment rows | Yes | Never |
| Fitment badges | Yes | No |
| Brand facets | Yes | No |
| Garage bar | Full, with fitment indicator | Hidden until a vehicle is set |

Both sides share one cart, one checkout and one order.

Before this split, apparel lived in the parts catalog and carried
`isUniversal` purely so it would survive the fitment filter. That meant anyone
filtering for their F80 got hoodies mixed in with turbos, and a sticker had to
claim it "fits any vehicle" to be visible at all. `isUniversal` now means only
what it says: a real part that genuinely fits anything, like oil or a tool.

Adding a merch department is a row in `Category` with `kind = 'MERCH'`. Nothing
else needs changing; the admin category dropdown groups by side automatically
and hides the fitment controls when a merch category is selected.

Product URLs differ per side (`/parts/<slug>` and `/merch/<slug>`), resolved by
`productHref()`. Hitting the wrong one redirects rather than 404ing, so an old
or hand-typed link still lands on the page that can sell the thing.

### Colour

Dark canvas, BMW M motorsport accents. Three rules, all enforceable by reading
`src/app/globals.css`:

**1. Red is never used alone.** The M tricolour appears only as all three bars
together, as one mark (`.m-rule`, `.m-edge`). A lone red element means exactly
one thing on this site: *this part does not fit your car*. Green means fits.
That signal is the point of a year/make/model store and it stops working the
moment something decorative borrows either colour.

**2. Blue as text is a different token from blue as a fill.** `--color-accent`
(#0066b1) is a button background: the label sits on top of it and clears
5.94:1. As type on the near-black canvas the same blue is 3.43:1 and fails AA.
Use `text-accent-text` for type, `bg-accent` for fills.

**3. Light sections re-point the theme, they don't restyle children.**
`.section-paper` reassigns `--color-text`, `--color-muted`, `--color-line`,
`--color-surface` and `--color-accent-text` inside its own scope. Tailwind v4
utilities compile to `var()` references, so every `text-muted` and `border-line`
inside a paper section re-tones automatically. Nothing needs a light variant.

The page alternates dark and paper bands deliberately. An all-dark page has no
emphasis because it has nothing to push against, which is exactly what this site
looked like before: every surface between `#000` and `#1a1a1a`, six sections
deep, with photography that was force-desaturated to grey on top of it.

Photos are graded, not desaturated (`.photo-bw`). This was `grayscale(1)`, which
threw away the only real colour the site had: the cars.

## Importing real fitment data

The seed data is representative placeholder inventory. To load real data:

```bash
npm run import:fitment -- fitment.csv
```

Add `--replace` to clear a product's existing fitment first (what you want for a
full refresh).

CSV columns (header row required, order doesn't matter):

```
sku,make,model,year_start,year_end,submodel,engine,notes
```

Unknown makes and models are created automatically and their production-year
range widened to cover the feed, so importing real data also builds out the
vehicle dropdowns. Unknown SKUs abort the import rather than silently dropping
fitment.

This is the seam for a distributor feed (Turn 14, Keystone, WHI) or for
ACES/VCdb later — normalise to these columns and the rest of the app is unchanged.

## The admin

Lives at `/admin`. Sign in at `/admin/login`.

Create the first user from the command line:

```bash
npm run user:create -- --email you@example.com --name "Your Name" --role OWNER
```

It prompts for the password rather than taking it as an argument, so it never
lands in shell history. Run it again for the same email to reset a password —
that also revokes every live session for that account.

### Roles

| Role | Can do |
| --- | --- |
| `OWNER` | Everything, including adding and removing users |
| `STAFF` | Catalog, orders, appointments. No user management |
| `VIEWER` | Read-only |

Auth is session-cookie based (`src/lib/auth.ts`). The cookie holds a random
token; only its SHA-256 hash is stored, so a database dump can't be replayed as
a login. Sessions are rows, so revoking access is a delete rather than waiting
for a token to expire. Deactivating a user kills their sessions immediately.

The guard lives in `admin/(protected)/layout.tsx` rather than middleware,
because it needs a database lookup and middleware runs on the edge runtime.

### The fitment editor

The reason this is a custom admin rather than an off-the-shelf one. On a
product page you can add fitment one chassis at a time, but the useful control
is **quick add by engine**: one click on "All S55" adds every chassis running
that engine, each with its own production years, skipping any already covered.

Those presets are generated from `Model.engineCodes` — real data, not a
hardcoded list — so they stay correct as vehicles are added.

### Photos

`/admin/photos` manages every image on the public site except product shots,
which live on each product.

Images are rows in `SiteImage`, keyed by slot:

| Slot | Used for |
| --- | --- |
| `hero` | Homepage hero background |
| `engine:s55` … | The four Shop by engine tiles |
| `section:about-shop` … | Named photos on services, about, contact, booking |
| `gallery` | The gallery page, ordered, plus the homepage Recent work strip |

Add a slot by adding an entry to `src/lib/image-slots.ts`. That is the whole
job; the admin screen is generated from it.

**Focal points, not crops.** Each image stores a focal point as a percentage
pair, applied as CSS `object-position`. Click the important part of the photo in
the admin and it stays in frame whether that slot renders as a wide banner, a
square tile, or a tall crop on a phone.

**Nothing is cropped at build time.** `scripts/process-photos.ts` resizes to fit
inside a box and never crops, so every published file holds the whole frame.
This matters more here than on most sites: **49 of the shop's 53 photos are
vertical phone shots**. Baking them into 4:3 tiles and 1:1 squares discarded
between 25% and 65% of each frame, frequently including the car, and because the
crop lived in the `.webp` the focal picker had nothing left to work with.

Two commands maintain the metadata this depends on:

```bash
npm run images:dimensions   # record intrinsic width/height
npm run images:focal        # pick a sensible starting focal point per slot
```

`images:focal` runs sharp's `attention` analysis against the shape each slot
actually renders at and stores the result. That recovers the framing the old
build-time crop used to produce, while leaving it adjustable. Add `-- --all` to
either command to redo every row, which is what you want after replacing files
on disk. Both are safe to re-run.

**The gallery is masonry**, laid out from the recorded dimensions, so vertical
photos display whole rather than being cropped into a uniform grid.

### The manifest is keyed by filename, not position

`scripts/process-photos.ts` used to address photos by their index into a sorted
listing of the drop folder. Three files were later added to that folder, one of
which sorts fourth, and **every index from 4 onward silently shifted by one**.
Nothing errored; re-running would simply have republished the whole gallery
against the wrong photos.

Entries are now keyed by source filename. A missing source is a loud failure
instead of a quietly wrong site. Do not reintroduce positional addressing.

To review a photo drop before wiring it up:

```bash
npx tsx scripts/contact-sheet.ts <srcDir> <outDir>
```

Cells are portrait and letterboxed, not cropped, because a contact sheet that
crops hides exactly what you are looking at it to judge.

**Video.** Slots accept video as well as photos. A video is stored with a
poster frame and rendered muted, looped and `playsInline`, which is the only
combination browsers autoplay. The hero honours `prefers-reduced-motion` by
showing the poster instead; gallery videos play on hover rather than all at
once.

iPhone records HEVC in a `.mov` container, which Safari plays and Chrome and
Firefox do not. Cloudinary transcodes on upload. Without it the admin refuses
the file rather than letting the shop publish a video most visitors cannot see.
To convert a backlog up front:

```bash
powershell -File scripts/convert-videos.ps1 -Src <source-folder> -Dest public/video
```

**Filesystem fallback.** The `public/` folders still work. If a slot has no
database row, the matching file is used, so a fresh checkout looks right before
anyone runs `npm run images:import`. Once a photo is uploaded through the admin,
the row wins.

To bring existing files under management:

```bash
npm run images:import
```

Safe to re-run: a slot that already has rows is skipped, so it never overwrites
someone's edits.

### Uploads

Admin photo uploads go through `src/lib/uploads.ts`, which normalises every
image with sharp (EXIF-rotated, capped at 1600px, re-encoded as WebP) before
storing. A 12MB iPhone photo lands as roughly 200KB.

Two drivers, chosen automatically:

- **local** — writes to `public/uploads/`. Development only.
- **cloudinary** — used when the `CLOUDINARY_*` variables are set.

**Set the Cloudinary variables before deploying.** On Vercel and Netlify the
filesystem is read-only and ephemeral, so the local driver would appear to work
and then lose every photo on the next deploy.

## Payments

Checkout uses **Stripe Checkout** (hosted), so card details never touch this
app and PCI scope stays with Stripe.

Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to switch it on. Without
them the site still works: checkout records an unpaid order and the page says
plainly that card payments are not enabled, so it can be demonstrated before
the Stripe account exists.

The flow:

1. `placeOrderAction` builds the order from **server-side prices**, never from
   the cart cookie, which the customer controls.
2. Stock is re-checked before redirecting, so we don't take money for something
   already sold.
3. Stripe collects payment and the shipping address.
4. The **webhook** marks the order paid. Returning to the success page is not
   treated as proof of payment.

`markOrderPaid` in `src/lib/orders.ts` is **idempotent**, and this matters:
Stripe retries webhooks, and the same event can arrive twice. The guard is
`updateMany({ where: { paidAt: null } })` - a second delivery updates zero rows
and returns early, so stock is never decremented twice and the customer never
gets two receipts. The admin's manual "mark as paid" goes through the same
function, so doing both is safe too.

Stock comes down at payment, not at checkout, so an abandoned cart never holds
inventory.

### Local webhook testing

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

That prints a `whsec_...` to put in `.env`. In production, add the endpoint in
the Stripe dashboard at `https://yourdomain.com/api/webhooks/stripe` and
subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`
and `checkout.session.expired`.

## Email

Resend, via `src/lib/email.ts`. Set `RESEND_API_KEY` and `EMAIL_FROM` (on a
domain verified in Resend). `SHOP_NOTIFICATION_EMAIL` decides where shop alerts
go.

Without those, messages are logged to the server console instead of sent, so
the whole flow is testable locally.

Sends are best-effort and never throw into the caller. An order must not fail
because an email provider had a bad minute, and a webhook that throws gets
retried by Stripe, which would reprocess a payment.

| Trigger | Goes to |
| --- | --- |
| Order paid | Customer receipt, and an alert to the shop |
| Booking requested | Customer acknowledgement, and an alert to the shop |
| Booking confirmed in admin | Customer confirmation (only on the transition) |

## How booking works

`src/lib/booking.ts` owns availability.

- Opening hours come from `src/lib/site.ts`. Change them there and the calendar
  follows.
- All times are stored as UTC instants; opening-hours arithmetic is done in
  `America/Los_Angeles`, so a customer booking from another state sees the
  shop's real hours and daylight saving never shifts the calendar.
- `BAYS` (currently 2) is how many cars can be in for work at once. A slot is
  offered when the job fits inside opening hours *and* a bay is free for its
  whole duration.
- Booking re-checks availability inside a transaction, so two people clicking
  the same slot can't both win.
- Unavailable slots are shown struck through rather than hidden — a visibly busy
  day reads better than an afternoon that mysteriously vanished.

Appointments are created as `REQUESTED`. Nothing is charged; the shop confirms
by phone or email.

## Photos

Drop images into `public/hero/`, `public/gallery/` or `public/products/` and
they appear on the site with no code change. See [`public/README.md`](public/README.md)
for naming, sizes and how to attach photos to products.

## Business details

Everything the customer sees — header, footer, contact page, booking
confirmations, structured data for search engines — reads from
`src/lib/site.ts`. Phone number, address and hours are a one-line edit there.

## Not done yet

Deliberate gaps, in rough priority order:

- **Real inventory.** Products, prices and stock are placeholders using brands a
  turbo-BMW shop genuinely stocks. Replace them through the admin.
- **Stripe and Resend keys.** The code is wired; the accounts and environment
  variables are not. Both degrade gracefully until then.
- **Tax is a flat 8.75%** (`src/lib/cart.ts`). Fine for Riverside, wrong for
  shipping out of state. Stripe Tax would handle it properly.
- **Shipping is flat rate**, free over $99. Real carrier rates would need a
  shipping API and per-product weights.
- **No customer accounts.** Orders are found by their URL only. Fine to start;
  add auth if customers need order history.
