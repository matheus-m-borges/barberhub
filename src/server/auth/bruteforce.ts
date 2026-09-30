export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;

export interface BruteForceState {
  failedAttempts: number;
  lockedUntil: Date | null;
}

/**
 * Avalia se uma conta está atualmente bloqueada por tentativas excessivas.
 */
export function isAccountLocked(state: BruteForceState, now = new Date()): boolean {
  if (!state.lockedUntil) return false;
  return state.lockedUntil.getTime() > now.getTime();
}

/**
 * Calcula o novo estado após uma tentativa de login falha.
 * Se atingir o limite máximo, bloqueia a conta por 15 minutos.
 */
export function registerFailedAttempt(
  currentState: BruteForceState,
  now = new Date()
): {
  newAttempts: number;
  newLockedUntil: Date | null;
  isNowLocked: boolean;
} {
  const newAttempts = currentState.failedAttempts + 1;
  let newLockedUntil: Date | null = null;
  let isNowLocked = false;

  if (newAttempts >= MAX_FAILED_ATTEMPTS) {
    newLockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    isNowLocked = true;
  }

  return {
    newAttempts,
    newLockedUntil,
    isNowLocked,
  };
}

/**
 * Reseta o contador de tentativas após um login bem-sucedido.
 */
export function resetAttemptsOnSuccess(): {
  failedAttempts: number;
  lockedUntil: null;
} {
  return {
    failedAttempts: 0,
    lockedUntil: null,
  };
}
