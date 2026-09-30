// BarberHub Pro ERP - Customer Subscriptions (Planos & Clubes de Assinatura)
// Regras determinísticas de cotas, vigência e consumo de créditos de serviços

export interface PlanItemQuota {
  serviceId: string;
  quantityAllowed: number;
}

export interface SubscriptionState {
  id: string;
  tenantId: string;
  customerId: string;
  planId: string;
  startDate: Date;
  endDate: Date;
  status: "ACTIVE" | "SUSPENDED" | "CANCELED";
}

export interface UsageRecord {
  subscriptionId: string;
  serviceId: string;
  usedAt: Date;
}

/**
 * Avalia se o cliente pode usufruir de um serviço pelo plano contratado
 */
export function checkSubscriptionServiceQuota(params: {
  subscription: SubscriptionState;
  planItems: PlanItemQuota[];
  usages: UsageRecord[];
  requestedServiceId: string;
  now?: Date;
}): {
  canUse: boolean;
  quantityAllowed: number;
  quantityUsed: number;
  remainingCredits: number;
  reason?: string;
} {
  const { subscription, planItems, usages, requestedServiceId, now = new Date() } = params;

  // 1. Status ativo
  if (subscription.status !== "ACTIVE") {
    return {
      canUse: false,
      quantityAllowed: 0,
      quantityUsed: 0,
      remainingCredits: 0,
      reason: `Assinatura não está ativa (Status: ${subscription.status}).`,
    };
  }

  // 2. Vigência do ciclo atual
  if (now.getTime() < subscription.startDate.getTime() || now.getTime() > subscription.endDate.getTime()) {
    return {
      canUse: false,
      quantityAllowed: 0,
      quantityUsed: 0,
      remainingCredits: 0,
      reason: "Ciclo da assinatura expirado ou ainda não iniciado.",
    };
  }

  // 3. O serviço solicitado está incluso no plano?
  const planItem = planItems.find((item) => item.serviceId === requestedServiceId);
  if (!planItem) {
    return {
      canUse: false,
      quantityAllowed: 0,
      quantityUsed: 0,
      remainingCredits: 0,
      reason: "Este serviço não está incluso no plano contratado.",
    };
  }

  // 4. Quantidade utilizada no ciclo
  const usedCount = usages.filter(
    (u) =>
      u.subscriptionId === subscription.id &&
      u.serviceId === requestedServiceId &&
      u.usedAt.getTime() >= subscription.startDate.getTime() &&
      u.usedAt.getTime() <= subscription.endDate.getTime()
  ).length;

  const remaining = Math.max(0, planItem.quantityAllowed - usedCount);

  if (remaining <= 0) {
    return {
      canUse: false,
      quantityAllowed: planItem.quantityAllowed,
      quantityUsed: usedCount,
      remainingCredits: 0,
      reason: `Limite de utilizações deste serviço no ciclo foi atingido (${usedCount}/${planItem.quantityAllowed}).`,
    };
  }

  return {
    canUse: true,
    quantityAllowed: planItem.quantityAllowed,
    quantityUsed: usedCount,
    remainingCredits: remaining,
  };
}
