import crypto from "crypto";

export const SESSION_DURATION_DAYS = 7;

/**
 * Gera um token opaco criptograficamente seguro com 64 bytes (128 caracteres hex).
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

/**
 * Computa o hash SHA-256 do token para salvar no banco de dados.
 * O banco de dados NUNCA armazena o token de sessão em texto puro.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Calcula a data de expiração para uma nova sessão.
 */
export function calculateSessionExpiration(now = new Date()): Date {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);
  return expiresAt;
}

/**
 * Verifica se uma sessão já expirou.
 */
export function isSessionExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
