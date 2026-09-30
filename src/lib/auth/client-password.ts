import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hashes a plaintext password using bcrypt.
 * Pure JS implementation safe for client-side invite token submission.
 */
export async function hashPasswordClient(plaintext: string): Promise<string> {
  if (!plaintext || plaintext.length < 8) {
    throw new Error("A senha deve possuir no mínimo 8 caracteres.");
  }
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(plaintext, salt);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 */
export async function verifyPasswordClient(plaintext: string, hash: string): Promise<boolean> {
  if (!plaintext || !hash) return false;
  try {
    return await bcrypt.compare(plaintext, hash);
  } catch {
    return false;
  }
}
