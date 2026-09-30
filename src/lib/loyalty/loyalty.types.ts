// BarberHub Pro ERP - Loyalty & CRM Relationship Types
// Definições de Fidelidade, Níveis, Recompensas, Resgates, Indicações e Segmentação CRM

export type LoyaltyTransactionType =
  | "EARN"
  | "REDEEM"
  | "EXPIRE"
  | "BONUS"
  | "REVERSAL"
  | "ADJUST"
  | "REFERRAL"
  | "BIRTHDAY"
  | "CREDIT" // Compatibilidade com testes existentes
  | "DEBIT"; // Compatibilidade com testes existentes

export type LoyaltyTierName = "BRONZE" | "PRATA" | "OURO" | "BLACK";

export type CrmSegment =
  | "NOVO"
  | "RECORRENTE"
  | "VIP"
  | "EM_RISCO"
  | "INATIVO"
  | "ANIVERSARIANTE"
  | "ASSINANTE";

export type RewardType =
  | "SERVICE"
  | "PRODUCT"
  | "DISCOUNT_PERCENT"
  | "DISCOUNT_VALUE"
  | "BENEFIT";

export type RedemptionStatus =
  | "DISPONIVEL"
  | "UTILIZADO"
  | "EXPIRADO"
  | "CANCELADO";

export interface LoyaltySettings {
  pointsPerReal: number; // Ex: 1.0 (R$ 1 = 1 pt) ou 0.2 (R$ 5 = 1 pt)
  spendBaseUnit: number; // Ex: 10 (A cada R$ 10)
  pointsPerBaseUnit: number; // Ex: 2 (Gera 2 pontos)
  roundingStrategy: "DOWN" | "MATH";
  servicesEarnPoints: boolean;
  productsEarnPoints: boolean;
  planPurchaseEarnsPoints: boolean;
  planUsageEarnsPoints: boolean;
  packagePurchaseEarnsPoints: boolean;
  packageUsageEarnsPoints: boolean;
  pointsExpirationMonths: number; // 0 = Nunca expira
  // Aniversários
  birthdayBonusActive: boolean;
  birthdayBonusPoints: number;
  birthdayBonusDaysBefore: number;
  birthdayBonusDaysAfter: number;
  // Indicações
  referralActive: boolean;
  referralReferrerPoints: number;
  referralReferredPoints: number;
  // CRM
  crmInactiveDays: number;
  crmAtRiskDays: number;
  crmVipMinSpent: number;
  crmVipMinVisits: number;
  // Aliases de compatibilidade para componentes
  pointsPerRealAmount?: number | undefined;
  pointsAwarded?: number | undefined;
  earnFromServices?: boolean | undefined;
  earnFromProducts?: boolean | undefined;
  earnFromSubscriptions?: boolean | undefined;
  earnFromPackages?: boolean | undefined;
  birthdayBonusEnabled?: boolean | undefined;
  birthdayDaysBefore?: number | undefined;
  birthdayDaysAfter?: number | undefined;
  referralProgramEnabled?: boolean | undefined;
  referralBonusReferrer?: number | undefined;
  referralBonusReferee?: number | undefined;
  crmInactivityDays?: number | undefined;
}

export interface LoyaltyTierConfig {
  id: string;
  name: LoyaltyTierName;
  minLifetimePoints: number;
  multiplier: number; // 1.0, 1.15, 1.25, 1.5
  color: string;
  badgeBg: string;
  benefits: string[];
  order?: number | undefined;
}

export interface LoyaltyLedgerEntry {
  id: string;
  tenantId: string;
  customerId: string;
  customerName?: string | undefined;
  type: LoyaltyTransactionType;
  points: number; // Positivo para crédito, negativo para débito
  previousBalance: number;
  newBalance: number;
  sourceType:
    | "SALE"
    | "REDEMPTION"
    | "BIRTHDAY"
    | "REFERRAL"
    | "MANUAL_ADJUST"
    | "EXPIRATION"
    | "REVERSAL";
  sourceId: string; // Ex: ID da venda ou ID da recompensa
  reason: string;
  operatorName?: string | undefined;
  createdAt: string; // ISO String
  description?: string | undefined;
  balanceAfter?: number | undefined;
}

export interface LoyaltyRewardItem {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  type: RewardType;
  pointsRequired: number;
  serviceId?: string | undefined;
  productId?: string | undefined;
  discountValue?: number | undefined;
  maxPerCustomer?: number | undefined;
  maxTotalRedemptions?: number | undefined;
  currentRedemptionsCount: number;
  stockAvailable?: number | undefined; // Para produtos físicos
  isActive: boolean;
  pointsCost?: number | undefined;
  category?: string | undefined;
  rewardType?: string | undefined;
}

export interface LoyaltyRedemptionRecord {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  rewardId: string;
  rewardName: string;
  rewardType: RewardType;
  pointsBurned: number;
  status: RedemptionStatus;
  redeemedAt: string; // ISO String
  usedAt?: string | undefined;
  saleIdUsed?: string | undefined;
  expiresAt?: string | undefined;
  pointsSpent?: number | undefined;
}

export interface LoyaltyAccountState {
  id: string;
  tenantId: string;
  customerId: string;
  customerName?: string | undefined;
  currentPoints: number;
  lifetimePoints: number;
  totalRedeemedPoints?: number | undefined;
  lifetimeRedeemedPoints?: number | undefined;
  tier?: LoyaltyTierName | undefined;
}

export interface LoyaltyTransactionResult {
  type: "CREDIT" | "DEBIT" | LoyaltyTransactionType;
  points: number;
  previousPoints: number;
  newPoints: number;
  reason: string;
  saleId?: string | null | undefined;
  rewardId?: string | null | undefined;
}
