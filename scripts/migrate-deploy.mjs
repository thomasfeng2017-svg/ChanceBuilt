/**
 * Apply migrations using a DIRECT database connection.
 *
 * `prisma migrate deploy` takes a session-level advisory lock
 * (pg_advisory_lock) to stop two deploys migrating at once. Neon's pooled
 * connection is a TRANSACTION pooler: it hands out a different backend per
 * statement, so a session-scoped lock can never be held. The result is
 *
 *   Error: P1002 — Timed out trying to acquire a postgres advisory lock
 *
 * and a failed build, every time, on a schema that is already correct.
 *
 * The app itself must keep using the pooled URL — serverless opens a
 * connection per invocation and would exhaust the direct limit immediately.
 * So only this step is switched over.
 *
 * Order of preference:
 *   DIRECT_URL             set it yourself to be explicit
 *   DATABASE_URL_UNPOOLED  what the Vercel/Neon integration provides
 *   DATABASE_URL           local development, where there is no pooler
 *
 * As a last resort the pooled host name is de-poolered, since Neon's direct
 * host is the same name without the "-pooler" suffix. That keeps this working
 * if the integration ever stops providing the unpooled variable.
 */
import { spawnSync } from "node:child_process";

const pooled = process.env.DATABASE_URL ?? "";

function directUrl() {
  if (process.env.DIRECT_URL) return { url: process.env.DIRECT_URL, from: "DIRECT_URL" };
  if (process.env.DATABASE_URL_UNPOOLED) {
    return { url: process.env.DATABASE_URL_UNPOOLED, from: "DATABASE_URL_UNPOOLED" };
  }
  if (pooled.includes("-pooler")) {
    return { url: pooled.replace("-pooler", ""), from: "DATABASE_URL (pooler suffix removed)" };
  }
  return { url: pooled, from: "DATABASE_URL" };
}

const { url, from } = directUrl();

if (!url) {
  console.error("No database URL available. Set DATABASE_URL.");
  process.exit(1);
}

// Log which variable was chosen, never the value: it contains the password.
console.log(`migrate deploy — using ${from}`);

const result = spawnSync("prisma", ["migrate", "deploy"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DATABASE_URL: url },
});

process.exit(result.status ?? 1);
