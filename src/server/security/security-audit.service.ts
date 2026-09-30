export class SecurityException extends Error {
  constructor(public code: string, message: string) {
    super(`[${code}] ${message}`);
    this.name = "SecurityException";
  }
}

/**
 * Remove recursivamente campos sensíveis (senhas, hashes, tokens, chaves)
 * de qualquer payload antes que seja transmitido para a interface ou API.
 */
export function sanitizeApiResponse<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeApiResponse(item)) as unknown as T;
  }

  if (typeof data === "object" && !(data instanceof Date)) {
    const sanitized: Record<string, any> = {};
    const blacklistedKeys = new Set([
      "password",
      "passwordHash",
      "token",
      "tokenHash",
      "secret",
      "secretKey",
      "privateKey",
      "apiKey",
    ]);

    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (blacklistedKeys.has(key)) {
        continue; // Exclui completamente do payload
      }
      sanitized[key] = sanitizeApiResponse(value);
    }
    return sanitized as T;
  }

  return data;
}

/**
 * Validação rigorosa de isolamento Multi-Tenant (Anti-IDOR).
 * Garante matematicamente que nenhum usuário acesse registros de outra barbearia.
 */
export function enforceTenantIsolation(
  sessionTenantId: string | null | undefined,
  targetTenantId: string | null | undefined
): void {
  if (!sessionTenantId || !targetTenantId) {
    throw new SecurityException(
      "TENANT_ISOLATION_VIOLATION",
      "Acesso negado: Identificador de tenant ausente na requisição."
    );
  }

  if (sessionTenantId !== targetTenantId) {
    throw new SecurityException(
      "CROSS_TENANT_ACCESS_DENIED",
      "Acesso não autorizado: Tentativa de acesso a dados pertencentes a outra organização."
    );
  }
}

/**
 * Validação de acesso a Unidades (Multi-Unidade).
 * Proprietários e Administradores têm permissão global (todas as unidades).
 * Outros cargos são restritos estritamente à sua unidade de lotação.
 */
export function enforceUnitAccess(params: {
  userRole: string;
  userUnitId?: string | null;
  targetUnitId?: string | null;
}): void {
  const { userRole, userUnitId, targetUnitId } = params;

  // Cargos executivos têm acesso a todas as unidades do tenant
  const globalRoles = new Set(["PROPRIETARIO", "ADMINISTRADOR"]);
  if (globalRoles.has(userRole)) {
    return;
  }

  // Se o recurso estiver atrelado a uma unidade específica, o usuário deve pertencer a ela
  if (targetUnitId && userUnitId && targetUnitId !== userUnitId) {
    throw new SecurityException(
      "CROSS_UNIT_ACCESS_DENIED",
      "Acesso restrito: Você não tem permissão para operar nesta filial/unidade."
    );
  }
}

/**
 * Detector determinístico de injeção de código (SQL Injection e XSS).
 */
export function detectMaliciousPayload(input: string): {
  isMalicious: boolean;
  threatType?: "SQLI" | "XSS";
} {
  if (!input || typeof input !== "string") {
    return { isMalicious: false };
  }

  // Padrões de SQL Injection comuns
  const sqliPatterns = [
    /(\b(UNION(\s+ALL)?|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC)\b)/i,
    /('|\b)(OR|AND)\b\s+('?\w+'?|\d+)\s*=\s*('?\w+'?|\d+)/i,
    /(--|#|\/\*)/,
  ];

  for (const pattern of sqliPatterns) {
    if (pattern.test(input)) {
      return { isMalicious: true, threatType: "SQLI" };
    }
  }

  // Padrões de XSS comuns
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
    /javascript:/i,
    /\bon\w+\s*=/i, // onload=, onerror=, onclick=
    /<iframe|<object|<embed/i,
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(input)) {
      return { isMalicious: true, threatType: "XSS" };
    }
  }

  return { isMalicious: false };
}

/**
 * Validação rigorosa de política de segurança de senhas.
 */
export function validatePasswordSecurity(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push("A senha deve conter no mínimo 8 caracteres.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("A senha deve conter pelo menos uma letra maiúscula.");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("A senha deve conter pelo menos uma letra minúscula.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("A senha deve conter pelo menos um número.");
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push("A senha deve conter pelo menos um caractere especial.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
