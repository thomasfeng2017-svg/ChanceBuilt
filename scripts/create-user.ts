/**
 * Create or update an admin user.
 *
 *   npm run user:create -- --email chance@chancebuilt.com --name "Chance" --role OWNER
 *
 * Prompts for the password rather than taking it as an argument, so it never
 * lands in shell history. Pass --password only for non-interactive setup.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createInterface } from "node:readline";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ROLES = ["OWNER", "STAFF", "VIEWER"] as const;
type Role = (typeof ROLES)[number];

const CTRL_C = "";
const BACKSPACE = "";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Read a line without echoing it, so the password never appears on screen or
 * in a scrollback buffer. Falls back to a normal prompt when stdin isn't a TTY
 * (piped input, CI), where raw mode isn't available.
 */
function askHidden(question: string): Promise<string> {
  const stdin = process.stdin;
  if (!stdin.isTTY) return ask(question);

  process.stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  return new Promise((resolve, reject) => {
    let value = "";

    const finish = (fn: () => void) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      process.stdout.write("\n");
      fn();
    };

    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") return finish(() => resolve(value));
        if (ch === CTRL_C) return finish(() => reject(new Error("Cancelled.")));
        if (ch === BACKSPACE || ch === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += ch;
      }
    };

    stdin.on("data", onData);
  });
}

async function main() {
  const email = (arg("email") ?? (await ask("Email: "))).trim().toLowerCase();
  if (!email.includes("@")) throw new Error("That doesn't look like an email address.");

  const existing = await prisma.user.findUnique({ where: { email } });

  const name = arg("name") ?? existing?.name ?? (await ask("Name: ")).trim();
  const roleInput = (arg("role") ?? existing?.role ?? "STAFF").toUpperCase();
  if (!ROLES.includes(roleInput as Role)) {
    throw new Error(`Role must be one of: ${ROLES.join(", ")}`);
  }
  const role = roleInput as Role;

  const password = arg("password") ?? (await askHidden("Password (min 10 chars): "));
  if (password.length < 10) throw new Error("Password must be at least 10 characters.");

  const passwordHash = await bcrypt.hash(password, 12);

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { name, role, passwordHash, active: true },
    });
    // Force a fresh sign-in everywhere after a password change.
    await prisma.session.deleteMany({ where: { userId: existing.id } });
    console.log(`\nUpdated ${email} (${role}). Existing sessions were revoked.`);
  } else {
    await prisma.user.create({ data: { email, name, role, passwordHash } });
    console.log(`\nCreated ${email} (${role}).`);
  }

  console.log("Sign in at /admin/login");
}

main()
  .catch((e) => {
    console.error(`\n${e instanceof Error ? e.message : e}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
