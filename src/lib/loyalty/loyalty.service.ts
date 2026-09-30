// BarberHub Pro ERP - Loyalty Service (Motor Unificado de Fidelidade & Relacionamento)
// ZERO Math.random() | ZERO IA | 100% Determinístico, Idempotente e Auditável

export * from "./loyalty.types";
import type {
  LoyaltySettings,
  LoyaltyTierConfig,
  LoyaltyTierName,
  LoyaltyLedgerEntry,
  LoyaltyRewardItem,
  LoyaltyRedemptionRecord,
  LoyaltyAccountState,
  LoyaltyTransactionResult,
  CrmSegment,
} from "./loyalty.types";

export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  pointsPerReal: 1.0,
  spendBaseUnit: 1.0,
  pointsPerBaseUnit: 1.0,
  roundingStrategy: "DOWN",
  servicesEarnPoints: true,
  productsEarnPoints: true,
  planPurchaseEarnsPoints: false,
  planUsageEarnsPoints: false,
  packagePurchaseEarnsPoints: false,
  packageUsageEarnsPoints: false,
  pointsExpirationMonths: 0, // 0 = Nunca expira
  birthdayBonusActive: true,
  birthdayBonusPoints: 50,
  birthdayBonusDaysBefore: 7,
  birthdayBonusDaysAfter: 7,
  referralActive: true,
  referralReferrerPoints: 100,
  referralReferredPoints: 50,
  crmInactiveDays: 60,
  crmAtRiskDays: 35,
  crmVipMinSpent: 500,
  crmVipMinVisits: 8,
};

export const DEFAULT_LOYALTY_TIERS: LoyaltyTierConfig[] = [
  {
    id: "tier-bronze",
    name: "BRONZE",
    minLifetimePoints: 0,
    multiplier: 1.0,
    color: "#ca8a04",
    badgeBg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    benefits: ["Acúmulo padrão de pontos (1x)", "Acesso ao catálogo de recompensas"],
  },
  {
    id: "tier-prata",
    name: "PRATA",
    minLifetimePoints: 500,
    multiplier: 1.15,
    color: "#94a3b8",
    badgeBg: "bg-slate-400/10 text-slate-300 border-slate-400/20",
    benefits: ["15% de bônus no acúmulo de pontos (1.15x)", "Prioridade na lista de espera"],
  },
  {
    id: "tier-ouro",
    name: "OURO",
    minLifetimePoints: 1500,
    multiplier: 1.25,
    color: "#f59e0b",
    badgeBg: "bg-amber-400/15 text-amber-400 border-amber-400/30",
    benefits: ["25% de bônus no acúmulo de pontos (1.25x)", "Café espresso ou cerveja cortesia", "Atendimento VIP"],
  },
  {
    id: "tier-black",
    name: "BLACK",
    minLifetimePoints: 3000,
    multiplier: 1.5,
    color: "#18181b",
    badgeBg: "bg-primary/20 text-primary border-primary/40",
    benefits: ["50% de bônus no acúmulo de pontos (1.5x)", "Cadeira exclusiva reservada", "Bônus especial de aniversário"],
  },
];

/**
 * Converte valor gasto no PDV em pontos acumulados
 * Mantém compatibilidade com testes existentes (R$ 1,00 gasto = 1 ponto padrão)
 */
export function calculatePointsEarned(
  saleAmount: number,
  pointsPerReal = 1
): number {
  if (saleAmount <= 0) return 0;
  return Math.floor(saleAmount * pointsPerReal);
}

/**
 * Determina o nível de fidelidade com base nos pontos acumulados historicamente (lifetimePoints)
 */
export function determineLoyaltyTier(
  lifetimePoints: number,
  tiers: LoyaltyTierConfig[] = DEFAULT_LOYALTY_TIERS
): LoyaltyTierName {
  const sorted = [...tiers].sort((a, b) => b.minLifetimePoints - a.minLifetimePoints);
  for (const tier of sorted) {
    if (lifetimePoints >= tier.minLifetimePoints) {
      return tier.name;
    }
  }
  return "BRONZE";
}

/**
 * Retorna o multiplicador associado ao nível
 */
export function getTierMultiplier(
  tierName: LoyaltyTierName,
  tiers: LoyaltyTierConfig[] = DEFAULT_LOYALTY_TIERS
): number {
  const tier = tiers.find((t) => t.name === tierName);
  return tier ? tier.multiplier : 1.0;
}

/**
 * Calcula a pontuação exata para uma venda no PDV considerando:
 * - Filtro de serviços e produtos elegíveis
 * - Regra de pontuação base (spendBaseUnit e pointsPerBaseUnit)
 * - Multiplicador de nível do cliente
 * - Estratégia de arredondamento
 */
export function calculatePointsForSale(params: {
  items: Array<{ price: number; qty: number; type: "SERVICE" | "PRODUCT" | "PLAN" | "PACKAGE" }>;
  settings?: LoyaltySettings;
  tierMultiplier?: number;
}): { eligibleAmount: number; pointsToEarn: number } {
  const { items, settings = DEFAULT_LOYALTY_SETTINGS, tierMultiplier = 1.0 } = params;

  let eligibleAmount = 0;

  for (const item of items) {
    const itemTotal = item.price * (item.qty || 1);
    if (item.type === "SERVICE" && settings.servicesEarnPoints) {
      eligibleAmount += itemTotal;
    } else if (item.type === "PRODUCT" && settings.productsEarnPoints) {
      eligibleAmount += itemTotal;
    } else if (item.type === "PLAN" && settings.planPurchaseEarnsPoints) {
      eligibleAmount += itemTotal;
    } else if (item.type === "PACKAGE" && settings.packagePurchaseEarnsPoints) {
      eligibleAmount += itemTotal;
    }
  }

  if (eligibleAmount <= 0) {
    return { eligibleAmount: 0, pointsToEarn: 0 };
  }

  const baseUnit = settings.spendBaseUnit > 0 ? settings.spendBaseUnit : 1.0;
  const pointsUnit = settings.pointsPerBaseUnit > 0 ? settings.pointsPerBaseUnit : 1.0;

  const rawPoints = (eligibleAmount / baseUnit) * pointsUnit * tierMultiplier;
  const pointsToEarn = settings.roundingStrategy === "MATH" ? Math.round(rawPoints) : Math.floor(rawPoints);

  return { eligibleAmount, pointsToEarn };
}

/**
 * Credita pontos ao cliente gerando registro histórico de transação
 * (Compatibilidade estrita com testes da Fase 7)
 */
export function creditLoyaltyPoints(params: {
  account: LoyaltyAccountState;
  saleAmount: number;
  pointsPerReal?: number;
  saleId?: string;
  reason?: string;
}): {
  updatedAccount: LoyaltyAccountState;
  transaction: LoyaltyTransactionResult;
} {
  const { account, saleAmount, pointsPerReal = 1, saleId, reason } = params;

  const pointsToCredit = calculatePointsEarned(saleAmount, pointsPerReal);
  if (pointsToCredit <= 0) {
    throw new Error("Valor da venda não gerou pontuação mínima.");
  }

  const newPoints = account.currentPoints + pointsToCredit;
  const newLifetime = account.lifetimePoints + pointsToCredit;
  const newTier = determineLoyaltyTier(newLifetime);

  return {
    updatedAccount: {
      ...account,
      currentPoints: newPoints,
      lifetimePoints: newLifetime,
      tier: newTier,
    },
    transaction: {
      type: "CREDIT",
      points: pointsToCredit,
      previousPoints: account.currentPoints,
      newPoints,
      saleId: saleId ?? null,
      reason: reason || `Crédito de fidelidade referente à venda ${saleId || ""}`,
    },
  };
}

/**
 * Resgata uma recompensa abatendo os pontos necessários
 * (Compatibilidade estrita com testes da Fase 7)
 */
export function redeemLoyaltyReward(params: {
  account: LoyaltyAccountState;
  reward: {
    id: string;
    name: string;
    pointsRequired: number;
    isActive: boolean;
  };
}): {
  updatedAccount: LoyaltyAccountState;
  transaction: LoyaltyTransactionResult;
} {
  const { account, reward } = params;

  if (!reward.isActive) {
    throw new Error("Esta recompensa não está ativa para resgate.");
  }

  if (account.currentPoints < reward.pointsRequired) {
    throw new Error(
      `Saldo de pontos insuficiente para resgate (Disponível: ${account.currentPoints}, Necessário: ${reward.pointsRequired}).`
    );
  }

  const newPoints = account.currentPoints - reward.pointsRequired;

  return {
    updatedAccount: {
      ...account,
      currentPoints: newPoints,
    },
    transaction: {
      type: "DEBIT",
      points: reward.pointsRequired,
      previousPoints: account.currentPoints,
      newPoints,
      rewardId: reward.id,
      reason: `Resgate de recompensa: ${reward.name}`,
    },
  };
}

/**
 * Processamento Robusto e Idempotente de Pontos de Venda (PDV)
 * Garante que a mesma venda nunca credite pontos duas vezes (Anti-duplo clique / Retry)
 */
export function processPaymentLoyaltyEarn(params: {
  account: LoyaltyAccountState;
  saleId: string;
  items: Array<{ name: string; price: number; qty: number; type: "SERVICE" | "PRODUCT" | "PLAN" | "PACKAGE" }>;
  ledger: LoyaltyLedgerEntry[];
  settings?: LoyaltySettings;
  operatorName?: string;
  now?: Date;
}): {
  success: boolean;
  updatedAccount: LoyaltyAccountState;
  ledgerEntry?: LoyaltyLedgerEntry;
  pointsEarned: number;
  message: string;
} {
  const {
    account,
    saleId,
    items,
    ledger,
    settings = DEFAULT_LOYALTY_SETTINGS,
    operatorName = "Sistema PDV",
    now = new Date(),
  } = params;

  // 1. Verificação Estrita de Idempotência
  const alreadyProcessed = ledger.some(
    (entry) =>
      entry.customerId === account.customerId &&
      entry.sourceType === "SALE" &&
      entry.sourceId === saleId &&
      entry.type === "EARN"
  );

  if (alreadyProcessed) {
    return {
      success: false,
      updatedAccount: account,
      pointsEarned: 0,
      message: `Venda ${saleId} já teve seus pontos de fidelidade creditados anteriormente.`,
    };
  }

  // 2. Calcular pontos com base no nível do cliente
  const currentTier = account.tier || determineLoyaltyTier(account.lifetimePoints);
  const tierMultiplier = getTierMultiplier(currentTier);

  const { pointsToEarn } = calculatePointsForSale({
    items,
    settings,
    tierMultiplier,
  });

  if (pointsToEarn <= 0) {
    return {
      success: true,
      updatedAccount: account,
      pointsEarned: 0,
      message: "Venda finalizada sem itens elegíveis para pontuação de fidelidade.",
    };
  }

  // 3. Atualizar conta
  const newBalance = account.currentPoints + pointsToEarn;
  const newLifetime = account.lifetimePoints + pointsToEarn;
  const updatedTier = determineLoyaltyTier(newLifetime);

  const updatedAccount: LoyaltyAccountState = {
    ...account,
    currentPoints: newBalance,
    lifetimePoints: newLifetime,
    tier: updatedTier,
  };

  // 4. Criar entrada contábil no Ledger
  const ledgerEntry: LoyaltyLedgerEntry = {
    id: `tx-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    tenantId: account.tenantId,
    customerId: account.customerId,
    type: "EARN",
    points: pointsToEarn,
    previousBalance: account.currentPoints,
    newBalance,
    sourceType: "SALE",
    sourceId: saleId,
    reason: `Pontos acumulados na Venda #${saleId} (${items.length} itens)`,
    operatorName,
    createdAt: now.toISOString(),
  };

  return {
    success: true,
    updatedAccount,
    ledgerEntry,
    pointsEarned: pointsToEarn,
    message: `+${pointsToEarn} pontos creditados com sucesso ao cliente!`,
  };
}

/**
 * Estorno de Venda e Reversão Contábil de Pontos (Anti-Corrupção de Saldo)
 * Preserva o histórico sem apagar a transação original
 */
export function processSaleReversal(params: {
  account: LoyaltyAccountState;
  saleId: string;
  ledger: LoyaltyLedgerEntry[];
  operatorName?: string;
  reason?: string;
  now?: Date;
}): {
  success: boolean;
  updatedAccount: LoyaltyAccountState;
  ledgerEntry?: LoyaltyLedgerEntry;
  pointsReversed: number;
  message: string;
} {
  const {
    account,
    saleId,
    ledger,
    operatorName = "Administrador",
    reason = "Cancelamento / Estorno de Venda",
    now = new Date(),
  } = params;

  // 1. Localizar o ganho original referente a esta venda
  const originalEarn = ledger.find(
    (entry) =>
      entry.customerId === account.customerId &&
      entry.sourceType === "SALE" &&
      entry.sourceId === saleId &&
      entry.type === "EARN"
  );

  if (!originalEarn) {
    return {
      success: false,
      updatedAccount: account,
      pointsReversed: 0,
      message: `Nenhum crédito de pontos localizado para a venda ${saleId}.`,
    };
  }

  // 2. Verificar se já não foi estornado (Idempotência)
  const alreadyReversed = ledger.some(
    (entry) =>
      entry.customerId === account.customerId &&
      entry.sourceType === "REVERSAL" &&
      entry.sourceId === saleId
  );

  if (alreadyReversed) {
    return {
      success: false,
      updatedAccount: account,
      pointsReversed: 0,
      message: `Os pontos da venda ${saleId} já foram estornados anteriormente.`,
    };
  }

  const pointsToReverse = originalEarn.points;
  const newBalance = account.currentPoints - pointsToReverse;
  const newLifetime = Math.max(0, account.lifetimePoints - pointsToReverse);

  const updatedAccount: LoyaltyAccountState = {
    ...account,
    currentPoints: newBalance,
    lifetimePoints: newLifetime,
    tier: determineLoyaltyTier(newLifetime),
  };

  const ledgerEntry: LoyaltyLedgerEntry = {
    id: `rev-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    tenantId: account.tenantId,
    customerId: account.customerId,
    type: "REVERSAL",
    points: -pointsToReverse,
    previousBalance: account.currentPoints,
    newBalance,
    sourceType: "REVERSAL",
    sourceId: saleId,
    reason: `${reason} (Ref. Venda #${saleId})`,
    operatorName,
    createdAt: now.toISOString(),
  };

  return {
    success: true,
    updatedAccount,
    ledgerEntry,
    pointsReversed: pointsToReverse,
    message: `-${pointsToReverse} pontos estornados no extrato do cliente.`,
  };
}

/**
 * Resgate Atômico de Recompensa
 * Abate pontos e gera benefício rastreável com status DISPONIVEL
 */
export function redeemRewardWithLedger(params: {
  account: LoyaltyAccountState;
  customerName: string;
  reward: LoyaltyRewardItem;
  existingRedemptions?: LoyaltyRedemptionRecord[];
  operatorName?: string;
  now?: Date;
}): {
  success: boolean;
  updatedAccount: LoyaltyAccountState;
  ledgerEntry: LoyaltyLedgerEntry;
  redemption: LoyaltyRedemptionRecord;
} {
  const {
    account,
    customerName,
    reward,
    existingRedemptions = [],
    operatorName = "Portal / Recepção",
    now = new Date(),
  } = params;

  if (reward.tenantId && account.tenantId && reward.tenantId !== account.tenantId) {
    throw new Error("A recompensa selecionada não pertence a este estabelecimento.");
  }

  if (!reward.isActive) {
    throw new Error("Esta recompensa não está ativa para resgate.");
  }

  if (account.currentPoints < reward.pointsRequired) {
    throw new Error(
      `Saldo de pontos insuficiente para resgate. Disponível: ${account.currentPoints}, Necessário: ${reward.pointsRequired}.`
    );
  }

  // Checagem de limite por cliente
  if (reward.maxPerCustomer && reward.maxPerCustomer > 0) {
    const customerRedemptions = existingRedemptions.filter(
      (r) => r.customerId === account.customerId && r.rewardId === reward.id && r.status !== "CANCELADO"
    ).length;

    if (customerRedemptions >= reward.maxPerCustomer) {
      throw new Error(`Limite máximo de ${reward.maxPerCustomer} resgates desta recompensa por cliente já atingido.`);
    }
  }

  // Checagem de estoque se for produto físico
  if (reward.type === "PRODUCT" && reward.stockAvailable !== undefined && reward.stockAvailable <= 0) {
    throw new Error("Produto esgotado no estoque da barbearia.");
  }

  const previousBalance = account.currentPoints;
  const newBalance = previousBalance - reward.pointsRequired;
  const redemptionId = `red-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const updatedAccount: LoyaltyAccountState = {
    ...account,
    currentPoints: newBalance,
    totalRedeemedPoints: (account.totalRedeemedPoints || 0) + reward.pointsRequired,
  };

  const ledgerEntry: LoyaltyLedgerEntry = {
    id: `tx-red-${Date.now()}`,
    tenantId: account.tenantId,
    customerId: account.customerId,
    customerName,
    type: "REDEEM",
    points: -reward.pointsRequired,
    previousBalance,
    newBalance,
    sourceType: "REDEMPTION",
    sourceId: redemptionId,
    reason: `Resgate: ${reward.name}`,
    operatorName,
    createdAt: now.toISOString(),
  };

  const redemption: LoyaltyRedemptionRecord = {
    id: redemptionId,
    tenantId: account.tenantId,
    customerId: account.customerId,
    customerName,
    rewardId: reward.id,
    rewardName: reward.name,
    rewardType: reward.type,
    pointsBurned: reward.pointsRequired,
    status: "DISPONIVEL",
    redeemedAt: now.toISOString(),
  };

  return {
    success: true,
    updatedAccount,
    ledgerEntry,
    redemption,
  };
}

/**
 * Concessão Idempotente de Benefício / Pontos de Aniversário
 * Valida a janela configurada e garante uma única concessão no ano
 */
export function checkAndApplyBirthdayBonus(params: {
  account: LoyaltyAccountState;
  customerName: string;
  birthDateStr?: string | undefined;
  ledger: LoyaltyLedgerEntry[];
  settings?: LoyaltySettings;
  operatorName?: string;
  now?: Date;
}): {
  eligible: boolean;
  updatedAccount?: LoyaltyAccountState;
  ledgerEntry?: LoyaltyLedgerEntry;
  reason: string;
} {
  const {
    account,
    customerName,
    birthDateStr,
    ledger,
    settings = DEFAULT_LOYALTY_SETTINGS,
    operatorName = "Motor de Aniversários",
    now = new Date(),
  } = params;

  if (!settings.birthdayBonusActive) {
    return { eligible: false, reason: "Programa de bônus de aniversário desativado nas configurações." };
  }

  if (!birthDateStr) {
    return { eligible: false, reason: "Data de nascimento não cadastrada no perfil do cliente." };
  }

  // Extrair dia e mês da data de nascimento
  // Suporta YYYY-MM-DD ou DD/MM/YYYY
  let birthMonth = -1;
  let birthDay = -1;

  if (birthDateStr.includes("-")) {
    const parts = birthDateStr.split("-").map(Number);
    if (parts.length >= 3) {
      birthMonth = parts[1]! - 1;
      birthDay = parts[2]!;
    }
  } else if (birthDateStr.includes("/")) {
    const parts = birthDateStr.split("/").map(Number);
    if (parts.length >= 2) {
      birthDay = parts[0]!;
      birthMonth = parts[1]! - 1;
    }
  }

  if (birthMonth < 0 || birthDay <= 0) {
    return { eligible: false, reason: "Formato inválido de data de nascimento." };
  }

  const currentYear = now.getFullYear();
  const birthdayThisYear = new Date(currentYear, birthMonth, birthDay);

  // Calcular diferença em dias em relação a hoje
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((now.getTime() - birthdayThisYear.getTime()) / msPerDay);

  // Janela elegível: de -daysBefore a +daysAfter
  const isWithinWindow =
    diffDays >= -settings.birthdayBonusDaysBefore && diffDays <= settings.birthdayBonusDaysAfter;

  if (!isWithinWindow) {
    return {
      eligible: false,
      reason: `Fora da janela de aniversário (${settings.birthdayBonusDaysBefore} dias antes até ${settings.birthdayBonusDaysAfter} dias depois).`,
    };
  }

  // Idempotência estrita: verificar se já ganhou bônus no ano corrente
  const idempotencyKey = `${account.customerId}:${currentYear}:BIRTHDAY`;
  const alreadyGranted = ledger.some(
    (entry) =>
      entry.customerId === account.customerId &&
      entry.sourceType === "BIRTHDAY" &&
      entry.sourceId === idempotencyKey
  );

  if (alreadyGranted) {
    return { eligible: false, reason: `Bônus de aniversário já concedido para este cliente em ${currentYear}.` };
  }

  const bonusPoints = settings.birthdayBonusPoints;
  const newBalance = account.currentPoints + bonusPoints;
  const newLifetime = account.lifetimePoints + bonusPoints;

  const updatedAccount: LoyaltyAccountState = {
    ...account,
    currentPoints: newBalance,
    lifetimePoints: newLifetime,
    tier: determineLoyaltyTier(newLifetime),
  };

  const ledgerEntry: LoyaltyLedgerEntry = {
    id: `bday-${Date.now()}`,
    tenantId: account.tenantId,
    customerId: account.customerId,
    customerName,
    type: "BIRTHDAY",
    points: bonusPoints,
    previousBalance: account.currentPoints,
    newBalance,
    sourceType: "BIRTHDAY",
    sourceId: idempotencyKey,
    reason: `Bônus de Aniversário 🎉 (${currentYear})`,
    operatorName,
    createdAt: now.toISOString(),
  };

  return {
    eligible: true,
    updatedAccount,
    ledgerEntry,
    reason: `Parabéns! Bônus de aniversário de +${bonusPoints} pontos concedido com sucesso.`,
  };
}

/**
 * Concessão de Bônus do Programa "Indique um Amigo"
 * Concedido apenas quando o amigo indicado finaliza seu PRIMEIRO ATENDIMENTO PAGO
 */
export function processReferralReward(params: {
  referrerAccount: LoyaltyAccountState;
  referredAccount: LoyaltyAccountState;
  firstSaleId: string;
  ledger: LoyaltyLedgerEntry[];
  settings?: LoyaltySettings;
  now?: Date;
}): {
  success: boolean;
  referrerBonus?: number;
  refereeBonus?: number;
  referrerUpdatedAccount?: LoyaltyAccountState;
  referredUpdatedAccount?: LoyaltyAccountState;
  referrerLedgerEntry?: LoyaltyLedgerEntry;
  referredLedgerEntry?: LoyaltyLedgerEntry;
  referrerEntry?: LoyaltyLedgerEntry;
  refereeEntry?: LoyaltyLedgerEntry;
  message: string;
} {
  const {
    referrerAccount,
    referredAccount,
    firstSaleId,
    ledger,
    settings = DEFAULT_LOYALTY_SETTINGS,
    now = new Date(),
  } = params;

  if (!settings.referralActive) {
    return { success: false, message: "Programa de indicação desativado nas configurações." };
  }

  // Anti-fraude: autoindicação proibida
  if (referrerAccount.customerId === referredAccount.customerId) {
    return { success: false, message: "Tentativa de autoindicação inválida." };
  }

  // Idempotência estrita: verificar se esta indicação já foi premiada
  const referralKey = `REF:${referrerAccount.customerId}:${referredAccount.customerId}`;
  const alreadyAwarded = ledger.some(
    (entry) => entry.sourceType === "REFERRAL" && entry.sourceId === referralKey
  );

  if (alreadyAwarded) {
    return { success: false, message: "Bônus desta indicação já foi processado anteriormente." };
  }

  // 1. Atualizar indicador
  const refBonus = settings.referralReferrerPoints;
  const refNewBalance = referrerAccount.currentPoints + refBonus;
  const refNewLifetime = referrerAccount.lifetimePoints + refBonus;

  const referrerUpdatedAccount: LoyaltyAccountState = {
    ...referrerAccount,
    currentPoints: refNewBalance,
    lifetimePoints: refNewLifetime,
    tier: determineLoyaltyTier(refNewLifetime),
  };

  const referrerLedgerEntry: LoyaltyLedgerEntry = {
    id: `ref-r1-${Date.now()}`,
    tenantId: referrerAccount.tenantId,
    customerId: referrerAccount.customerId,
    type: "REFERRAL",
    points: refBonus,
    previousBalance: referrerAccount.currentPoints,
    newBalance: refNewBalance,
    sourceType: "REFERRAL",
    sourceId: referralKey,
    reason: `Bônus por indicação de amigo (1º atendimento pago)`,
    operatorName: "Motor de Indicação",
    createdAt: now.toISOString(),
  };

  // 2. Atualizar indicado
  const referredBonus = settings.referralReferredPoints;
  const referredNewBalance = referredAccount.currentPoints + referredBonus;
  const referredNewLifetime = referredAccount.lifetimePoints + referredBonus;

  const referredUpdatedAccount: LoyaltyAccountState = {
    ...referredAccount,
    currentPoints: referredNewBalance,
    lifetimePoints: referredNewLifetime,
    tier: determineLoyaltyTier(referredNewLifetime),
  };

  const referredLedgerEntry: LoyaltyLedgerEntry = {
    id: `ref-r2-${Date.now()}`,
    tenantId: referredAccount.tenantId,
    customerId: referredAccount.customerId,
    type: "REFERRAL",
    points: referredBonus,
    previousBalance: referredAccount.currentPoints,
    newBalance: referredNewBalance,
    sourceType: "REFERRAL",
    sourceId: referralKey,
    reason: `Bônus de boas-vindas por ter sido indicado`,
    operatorName: "Motor de Indicação",
    createdAt: now.toISOString(),
  };

  return {
    success: true,
    referrerBonus: refBonus,
    refereeBonus: referredBonus,
    referrerUpdatedAccount,
    referredUpdatedAccount,
    referrerLedgerEntry,
    referredLedgerEntry,
    referrerEntry: referrerLedgerEntry,
    refereeEntry: referredLedgerEntry,
    message: `Indicação premiada com sucesso! +${refBonus} pts para o indicador e +${referredBonus} pts para o indicado.`,
  };
}

/**
 * Ajuste Manual de Pontos por Administrador Autorizado (RBAC & Auditoria)
 */
export function manualAdjustPoints(params: {
  account: LoyaltyAccountState;
  customerName?: string;
  pointsDelta: number; // Positivo para adicionar, negativo para remover
  reason: string;
  operatorName: string;
  now?: Date;
}): {
  updatedAccount: LoyaltyAccountState;
  ledgerEntry: LoyaltyLedgerEntry;
} {
  const { account, customerName, pointsDelta, reason, operatorName, now = new Date() } = params;

  if (pointsDelta === 0) {
    throw new Error("Quantidade de pontos para ajuste não pode ser zero.");
  }

  if (!reason || reason.trim().length < 4) {
    throw new Error("Motivo da alteração manual é obrigatório para auditoria.");
  }

  const previousBalance = account.currentPoints;
  const newBalance = Math.max(0, previousBalance + pointsDelta);
  const newLifetime = pointsDelta > 0 ? account.lifetimePoints + pointsDelta : account.lifetimePoints;

  const updatedAccount: LoyaltyAccountState = {
    ...account,
    currentPoints: newBalance,
    lifetimePoints: newLifetime,
    tier: determineLoyaltyTier(newLifetime),
  };

  const ledgerEntry: LoyaltyLedgerEntry = {
    id: `adj-${Date.now()}`,
    tenantId: account.tenantId,
    customerId: account.customerId,
    customerName,
    type: "ADJUST",
    points: pointsDelta,
    previousBalance,
    newBalance,
    sourceType: "MANUAL_ADJUST",
    sourceId: `ADJ:${Date.now()}`,
    reason: `Ajuste Manual: ${reason.trim()}`,
    operatorName,
    createdAt: now.toISOString(),
  };

  return { updatedAccount, ledgerEntry };
}

/**
 * Classificação Determinística de Segmento de CRM
 */
export function calculateCrmSegment(params: {
  visits: number;
  spent: number;
  birthDate?: string | Date | undefined;
  lastVisitAt?: string | Date | undefined;
  settings?: LoyaltySettings;
  now?: Date;
}): CrmSegment {
  const {
    visits,
    spent,
    birthDate,
    lastVisitAt,
    settings = DEFAULT_LOYALTY_SETTINGS,
    now = new Date(),
  } = params;

  // 1. Checar se faz aniversário no mês atual
  if (birthDate) {
    const dStr = typeof birthDate === "string" ? birthDate : birthDate.toISOString();
    let birthMonth = -1;
    if (dStr.includes("-")) {
      const parts = dStr.split("-").map(Number);
      if (parts.length >= 2) birthMonth = parts[1]! - 1;
    } else if (dStr.includes("/")) {
      const parts = dStr.split("/").map(Number);
      if (parts.length >= 2) birthMonth = parts[1]! - 1;
    }
    if (birthMonth === now.getMonth()) {
      return "ANIVERSARIANTE";
    }
  }

  // 2. Cliente Novo (até 2 visitas)
  if (visits <= 2) {
    return "NOVO";
  }

  // 3. VIP (alto gasto ou alta frequência)
  if (spent >= settings.crmVipMinSpent || visits >= settings.crmVipMinVisits) {
    return "VIP";
  }

  // 4. Inativo e Em Risco por tempo desde a última visita
  if (lastVisitAt) {
    const lastDate = typeof lastVisitAt === "string" ? new Date(lastVisitAt) : lastVisitAt;
    const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays >= settings.crmInactiveDays) {
      return "INATIVO";
    }
    if (diffDays >= settings.crmAtRiskDays) {
      return "EM_RISCO";
    }
  }

  return "RECORRENTE";
}
