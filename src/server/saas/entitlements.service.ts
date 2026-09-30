export type SaasFeature =
  | "ONLINE_BOOKING"
  | "LOYALTY_PROGRAM"
  | "SUBSCRIPTION_CLUBS"
  | "ADVANCED_REPORTS"
  | "MULTI_UNIT"
  | "COMMISSION_CUSTOM_RATES"
  | "AUDIT_LOG_FULL";

export interface SaasPlanLimits {
  maxEmployees: number; // -1 para ilimitado
  maxUnits: number;
  maxMonthlyAppointments: number;
}

export interface TenantSaaSSubscription {
  subscriptionId: string;
  planId: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  tenantId: string;
  status: "ACTIVE" | "PAST_DUE" | "CANCELED";
  features: SaasFeature[];
  limits: SaasPlanLimits;
}

export interface TenantContext {
  tenantId: string;
  unitId?: string | null;
  userId?: string | null;
  subscriptionId?: string | null;
  planId?: string | null;
}

export const SAAS_DEFAULT_PLANS: Record<"STARTER" | "PROFESSIONAL" | "ENTERPRISE", {
  features: SaasFeature[];
  limits: SaasPlanLimits;
}> = {
  STARTER: {
    features: ["ONLINE_BOOKING"],
    limits: {
      maxEmployees: 2,
      maxUnits: 1,
      maxMonthlyAppointments: 200,
    },
  },
  PROFESSIONAL: {
    features: [
      "ONLINE_BOOKING",
      "LOYALTY_PROGRAM",
      "ADVANCED_REPORTS",
      "COMMISSION_CUSTOM_RATES",
    ],
    limits: {
      maxEmployees: 10,
      maxUnits: 3,
      maxMonthlyAppointments: 1500,
    },
  },
  ENTERPRISE: {
    features: [
      "ONLINE_BOOKING",
      "LOYALTY_PROGRAM",
      "SUBSCRIPTION_CLUBS",
      "ADVANCED_REPORTS",
      "MULTI_UNIT",
      "COMMISSION_CUSTOM_RATES",
      "AUDIT_LOG_FULL",
    ],
    limits: {
      maxEmployees: -1, // Ilimitado
      maxUnits: -1,
      maxMonthlyAppointments: -1,
    },
  },
};

/**
 * Cria ou inicializa um contexto padrão de SaaS para o tenant autônomo.
 */
export function buildAutonomousTenantContext(params: {
  tenantId: string;
  unitId?: string | null;
  userId?: string | null;
  planId?: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
}): { context: TenantContext; subscription: TenantSaaSSubscription } {
  const planId = params.planId || "ENTERPRISE"; // No modo standalone corporativo, padrão completo
  const planConfig = SAAS_DEFAULT_PLANS[planId];
  const subscriptionId = `sub_${params.tenantId}`;

  const context: TenantContext = {
    tenantId: params.tenantId,
    unitId: params.unitId || null,
    userId: params.userId || null,
    subscriptionId,
    planId,
  };

  const subscription: TenantSaaSSubscription = {
    subscriptionId,
    planId,
    tenantId: params.tenantId,
    status: "ACTIVE",
    features: planConfig.features,
    limits: planConfig.limits,
  };

  return { context, subscription };
}

/**
 * Validador determinístico de liberação de funcionalidades por plano.
 */
export function hasFeatureEntitlement(
  subscription: TenantSaaSSubscription,
  feature: SaasFeature
): boolean {
  if (subscription.status !== "ACTIVE") {
    return false;
  }
  return subscription.features.includes(feature);
}

/**
 * Validador de limite de funcionários permitidos no plano contratado.
 */
export function canAddEmployee(
  subscription: TenantSaaSSubscription,
  currentEmployeesCount: number
): { allowed: boolean; reason?: string } {
  if (subscription.status !== "ACTIVE") {
    return { allowed: false, reason: "Assinatura do tenant não está ativa." };
  }

  const limit = subscription.limits.maxEmployees;
  if (limit === -1) {
    return { allowed: true };
  }

  if (currentEmployeesCount >= limit) {
    return {
      allowed: false,
      reason: `Limite de funcionários atingido (${currentEmployeesCount}/${limit}) para o plano ${subscription.planId}.`,
    };
  }

  return { allowed: true };
}

/**
 * Validador de limite de unidades/filiais permitidas no plano contratado.
 */
export function canAddUnit(
  subscription: TenantSaaSSubscription,
  currentUnitsCount: number
): { allowed: boolean; reason?: string } {
  if (subscription.status !== "ACTIVE") {
    return { allowed: false, reason: "Assinatura do tenant não está ativa." };
  }

  const limit = subscription.limits.maxUnits;
  if (limit === -1) {
    return { allowed: true };
  }

  if (currentUnitsCount >= limit) {
    return {
      allowed: false,
      reason: `Limite de unidades atingido (${currentUnitsCount}/${limit}) para o plano ${subscription.planId}.`,
    };
  }

  return { allowed: true };
}
