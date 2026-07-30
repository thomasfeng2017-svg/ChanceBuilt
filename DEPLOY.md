# Deploying

Target: Vercel for the app, Neon for PostgreSQL, Cloudinary for uploads.

Everything on the code side is already done. What remains is creating accounts
and pasting connection strings, which only you can do.

The whole point of getting this live is that **Chance never needs a deploy to
run the shop**. Products, prices, stock, photos, orders, bookings, hours,
closures and users are all database-driven and take effect the moment he saves.
Only design and code changes need a push.

---

## 1. Push to GitHub

The repo is initialised and committed on `main`. Create an empty repo on GitHub
(no README, no .gitignore, or the first push will conflict), then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/chancebuilt.git
```

```bash
git push -u origin main
```

## 2. Database: Neon

Create a project at neon.tech. Copy the **pooled** connection string, the one
containing `-pooler`. Serverless functions open a connection per invocation and
a direct string will exhaust the connection limit under any real traffic.

It looks like:

```
postgresql://USER:PASSWORD@ep-xxx-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require
```

## 3. Uploads: Cloudinary

**Do this before Chance touches the site.** Create a free account, then copy
the cloud name, API key and API secret from the dashboard.

Without these the upload driver falls back to writing into `public/uploads/`.
On Vercel that filesystem is read-only and thrown away on every deploy, so
Chance would add product photos, see them work, and find them gone the next
time you pushed. There is no error message. It just silently loses his work.

## 4. Deploy on Vercel

Import the GitHub repo at vercel.com. Framework detection handles the rest;
the build command in `package.json` already runs
`prisma generate && prisma migrate deploy && next build`, so **migrations apply
automatically on every deploy**.

Add these environment variables in the Vercel dashboard before the first build:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | the Neon **pooled** string |
| `CLOUDINARY_CLOUD_NAME` | from Cloudinary |
| `CLOUDINARY_API_KEY` | from Cloudinary |
| `CLOUDINARY_API_SECRET` | from Cloudinary |
| `NEXT_PUBLIC_SITE_URL` | your Vercel URL, then the custom domain later |

Leave Stripe and Resend unset for now. Both degrade gracefully: checkout
records an unpaid order and says plainly that card payments are not enabled,
and emails are logged rather than sent. That is exactly what you want for a
client review.

## 5. Seed the production database

The first deploy runs migrations but the database is empty. From your machine,
pointed at Neon:

```bash
DATABASE_URL="<neon-pooled-string>" ALLOW_REMOTE_SEED=1 npm run db:seed
```

`ALLOW_REMOTE_SEED` is a deliberate safety catch: the seed **deletes the
catalog** before reseeding, and refuses to run against a non-localhost database
without it. Set it for this one run and never again.

Then bring the photography under management and record what the gallery needs
to lay images out:

```bash
DATABASE_URL="<neon-pooled-string>" npm run images:import
```

```bash
DATABASE_URL="<neon-pooled-string>" npm run images:dimensions
```

```bash
DATABASE_URL="<neon-pooled-string>" npm run images:focal
```

## 6. Create the admin accounts

```bash
DATABASE_URL="<neon-pooled-string>" npm run user:create -- --email you@example.com --role OWNER
```

It prompts for the password with the typing hidden, so it never lands in shell
history. Run it again for Chance, and let him type his own password so you
never hold it.

After that, **password resets happen in the admin** under Users, not here.

---

## Showing work in progress without deploying

For a live review call where you want to make changes as Chance watches:

```bash
cloudflared tunnel --url http://localhost:3000
```

That publishes your local dev server at a temporary URL. `next.config.ts`
already allows tunnel origins for both dev requests and Server Actions;
without that the cart, booking and admin would fail silently through a tunnel.

Two things to remember: it only works while your machine is running
`npm run dev`, and the URL exposes `/admin` as well. It is password protected,
but do not share the link publicly.

---

## Before real customers

- **Stripe.** Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, then add the
  endpoint at `https://yourdomain.com/api/webhooks/stripe` subscribed to
  `checkout.session.completed`, `checkout.session.async_payment_succeeded` and
  `checkout.session.expired`.
- **Resend.** `RESEND_API_KEY` and `EMAIL_FROM` on a verified domain.
- **Real photos.** 43 products still have none.
- **Confirm the address.** Instagram says Corona, Yelp says Riverside. It is in
  the footer, the booking confirmations and the schema.org markup that Google
  reads, so it is worth getting right before launch.
- **Tax is a flat 8.75%** and shipping is flat rate. Fine for Riverside, wrong
  for shipping out of state.
