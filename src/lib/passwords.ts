import bcrypt from "bcryptjs";

/**
 * Password hashing, shared by the staff login and customer accounts.
 *
 * Its own module so neither auth layer has to import the other, and so this can
 * be loaded without pulling in Next's routing. Both `auth.ts` and
 * `customer-auth.ts` re-export or import from here; there is deliberately only
 * one place that decides the cost factor.
 */

const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
