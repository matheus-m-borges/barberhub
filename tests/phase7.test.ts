import { describe, it, expect } from "vitest";
import {
  calculatePointsEarned,
  creditLoyaltyPoints,
  redeemLoyaltyReward,
  type LoyaltyAccountState,
} from "../src/server/loyalty/loyalty.service";
import {
  checkSubscriptionServiceQuota,
  type SubscriptionState,
  type PlanItemQuota,
  type UsageRecord,
} from "../src/server/subscriptions/subscription.service";
import {
  validateAndApplyCoupon,
  type CouponState,
} from "../src/server/coupons/coupon.service";

describe("Fase 7: Sistema de Fidelidade & Pontos", () => {
  const initialAccount: LoyaltyAccountState = {
    id: "loyalty-acc-1",
    tenantId: "tenant_1",
    customerId: "cust-1",
    currentPoints: 50,
    lifetimePoints: 120,
  };

  it("deve calcular e creditar pontos proporcionais ao consumo com histórico", () => {
    // Venda de R$ 75.00 deve gerar 75 pontos
    expect(calculatePointsEarned(75.5)).toBe(75);

    const creditResult = creditLoyaltyPoints({
      account: initialAccount,
      saleAmount: 80.0,
      saleId: "sale-101",
    });

    expect(creditResult.updatedAccount.currentPoints).toBe(130); // 50 + 80
    expect(creditResult.updatedAccount.lifetimePoints).toBe(200); // 120 + 80
    expect(creditResult.transaction.type).toBe("CREDIT");
    expect(creditResult.transaction.points).toBe(80);
    expect(creditResult.transaction.previousPoints).toBe(50);
  });

  it("deve resgatar recompensa abatendo os pontos necessários", () => {
    const accountWithPoints: LoyaltyAccountState = {
      ...initialAccount,
      currentPoints: 100,
    };

    const reward = {
      id: "rew-corte",
      name: "Corte Grátis de Fidelidade",
      pointsRequired: 80,
      isActive: true,
    };

    const redeemResult = redeemLoyaltyReward({
      account: accountWithPoints,
      reward,
    });

    expect(redeemResult.updatedAccount.currentPoints).toBe(20); // 100 - 80
    expect(redeemResult.transaction.type).toBe("DEBIT");
    expect(redeemResult.transaction.points).toBe(80);
  });

  it("deve rejeitar resgate se o saldo de pontos for insuficiente", () => {
    const poorAccount: LoyaltyAccountState = {
      ...initialAccount,
      currentPoints: 30, // Insuficiente para 80
    };

    const reward = {
      id: "rew-corte",
      name: "Corte Grátis",
      pointsRequired: 80,
      isActive: true,
    };

    expect(() =>
      redeemLoyaltyReward({ account: poorAccount, reward })
    ).toThrow("Saldo de pontos insuficiente para resgate");
  });
});

describe("Fase 7: Planos & Clubes de Assinatura", () => {
  // Exemplo do prompt: Barber Black com 2 cortes e 2 barbas por mês
  const now = new Date("2026-10-15T12:00:00Z");

  const subscription: SubscriptionState = {
    id: "sub-1",
    tenantId: "t1",
    customerId: "cust-1",
    planId: "plan-black",
    startDate: new Date("2026-10-01T00:00:00Z"),
    endDate: new Date("2026-10-31T23:59:59Z"),
    status: "ACTIVE",
  };

  const planItems: PlanItemQuota[] = [
    { serviceId: "srv-corte", quantityAllowed: 2 },
    { serviceId: "srv-barba", quantityAllowed: 2 },
  ];

  it("cliente com 0 utilizações deve ter saldo de 2 cortes disponíveis", () => {
    const quota = checkSubscriptionServiceQuota({
      subscription,
      planItems,
      usages: [],
      requestedServiceId: "srv-corte",
      now,
    });

    expect(quota.canUse).toBe(true);
    expect(quota.quantityAllowed).toBe(2);
    expect(quota.quantityUsed).toBe(0);
    expect(quota.remainingCredits).toBe(2);
  });

  it("ao atingir o limite contratado, o sistema deve bloquear nova utilização gratuita", () => {
    const usages: UsageRecord[] = [
      { subscriptionId: "sub-1", serviceId: "srv-corte", usedAt: new Date("2026-10-05T10:00:00Z") },
      { subscriptionId: "sub-1", serviceId: "srv-corte", usedAt: new Date("2026-10-12T10:00:00Z") },
    ];

    const quota = checkSubscriptionServiceQuota({
      subscription,
      planItems,
      usages,
      requestedServiceId: "srv-corte", // 3ª tentativa
      now,
    });

    expect(quota.canUse).toBe(false);
    expect(quota.remainingCredits).toBe(0);
    expect(quota.reason).toContain("Limite de utilizações deste serviço no ciclo foi atingido");
  });

  it("deve rejeitar serviços não contemplados pelo plano", () => {
    const quota = checkSubscriptionServiceQuota({
      subscription,
      planItems,
      usages: [],
      requestedServiceId: "srv-pigmentacao", // Não faz parte do plano
      now,
    });

    expect(quota.canUse).toBe(false);
    expect(quota.reason).toContain("Este serviço não está incluso no plano contratado");
  });
});

describe("Fase 7: Cupons & Promoções com Validação Server-Side", () => {
  const now = new Date("2026-10-15T12:00:00Z");

  it("deve aplicar cupom percentual válido com cálculo exato", () => {
    const coupon: CouponState = {
      code: "PROMO10",
      discountType: "PERCENTAGE",
      discountValue: 10.0, // 10%
      minOrderAmount: 50.0,
      maxUses: 100,
      currentUses: 5,
      startsAt: new Date("2026-10-01T00:00:00Z"),
      expiresAt: new Date("2026-10-31T23:59:59Z"),
      isActive: true,
    };

    const result = validateAndApplyCoupon({
      coupon,
      orderSubtotal: 80.0,
      now,
    });

    expect(result.valid).toBe(true);
    expect(result.discountAmount).toBe(8.0); // 10% de 80
    expect(result.finalTotal).toBe(72.0);
  });

  it("deve rejeitar cupom expirado", () => {
    const expiredCoupon: CouponState = {
      code: "ANTIGO",
      discountType: "FIXED",
      discountValue: 15.0,
      expiresAt: new Date("2026-10-10T00:00:00Z"), // Expirou dia 10
      currentUses: 0,
      isActive: true,
    };

    const result = validateAndApplyCoupon({
      coupon: expiredCoupon,
      orderSubtotal: 50.0,
      now, // dia 15
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Este cupom já expirou");
  });

  it("deve rejeitar cupom com limite de utilizações esgotado", () => {
    const exhaustedCoupon: CouponState = {
      code: "PRIMEIROS50",
      discountType: "FIXED",
      discountValue: 20.0,
      maxUses: 50,
      currentUses: 50, // Esgotado
      isActive: true,
    };

    const result = validateAndApplyCoupon({
      coupon: exhaustedCoupon,
      orderSubtotal: 100.0,
      now,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain("O limite de utilizações deste cupom foi esgotado");
  });

  it("deve rejeitar pedido que não atinge o valor mínimo do cupom", () => {
    const coupon: CouponState = {
      code: "VIP100",
      discountType: "FIXED",
      discountValue: 20.0,
      minOrderAmount: 100.0, // Mínimo 100
      currentUses: 0,
      isActive: true,
    };

    const result = validateAndApplyCoupon({
      coupon,
      orderSubtotal: 60.0, // Apenas 60
      now,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Valor mínimo do pedido");
  });
});
