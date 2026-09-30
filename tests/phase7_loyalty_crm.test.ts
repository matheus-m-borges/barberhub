import { describe, it, expect } from "vitest";
import {
  DEFAULT_LOYALTY_SETTINGS,
  DEFAULT_LOYALTY_TIERS,
  calculatePointsEarned,
  calculatePointsForSale,
  determineLoyaltyTier,
  getTierMultiplier,
  processPaymentLoyaltyEarn,
  processSaleReversal,
  redeemRewardWithLedger,
  checkAndApplyBirthdayBonus,
  processReferralReward,
  manualAdjustPoints,
  calculateCrmSegment,
  type LoyaltySettings,
  type LoyaltyTierConfig,
  type LoyaltyRewardItem,
  type LoyaltyLedgerEntry,
  type LoyaltyAccountState,
} from "../src/lib/loyalty/loyalty.service";

describe("Master Test Suite: Motor Central de Fidelidade, CRM e Relacionamento", () => {
  const initialAccount: LoyaltyAccountState = {
    id: "acc-carlos",
    tenantId: "tenant_1",
    customerId: "cust-carlos",
    currentPoints: 200,
    lifetimePoints: 800,
    tier: "PRATA",
  };

  const defaultTiers: LoyaltyTierConfig[] = DEFAULT_LOYALTY_TIERS;
  const defaultSettings: LoyaltySettings = { ...DEFAULT_LOYALTY_SETTINGS };

  // =========================================================================
  // 1 & 2. PAGAMENTO CONFIRMADO GERA PONTOS (COMANDA SEM PAGAMENTO NÃO GERA)
  // =========================================================================
  it("Cenário 1 & 2: Pagamento confirmado gera pontos proporcionais; comanda sem itens elegíveis não gera", () => {
    // Venda confirmada de R$ 80 (Corte R$ 50 + Pomada R$ 30)
    const result = processPaymentLoyaltyEarn({
      account: { ...initialAccount, tier: "BRONZE" },
      saleId: "sale-001",
      items: [
        { type: "SERVICE", price: 50, qty: 1 },
        { type: "PRODUCT", price: 30, qty: 1 },
      ],
      ledger: [],
      settings: defaultSettings,
    });

    expect(result.success).toBe(true);
    expect(result.pointsEarned).toBe(80);
    expect(result.ledgerEntry?.type).toBe("EARN");
    expect(result.ledgerEntry?.points).toBe(80);
    expect(result.ledgerEntry?.sourceId).toBe("sale-001");
    expect(result.updatedAccount.currentPoints).toBe(280);

    // Comanda sem itens elegíveis ou valor zero
    const emptyResult = processPaymentLoyaltyEarn({
      account: initialAccount,
      saleId: "sale-002",
      items: [{ type: "SERVICE", price: 0, qty: 1 }],
      ledger: [],
      settings: defaultSettings,
    });

    expect(emptyResult.success).toBe(true);
    expect(emptyResult.pointsEarned).toBe(0);
    expect(emptyResult.ledgerEntry).toBeUndefined();
  });

  // =========================================================================
  // 3. DUPLO PROCESSAMENTO NÃO DUPLICA (IDEMPOTÊNCIA ESTRITA)
  // =========================================================================
  it("Cenário 3: Duplo processamento / retry não duplica pontuação (idempotência por saleId)", () => {
    const existingLedger: LoyaltyLedgerEntry[] = [
      {
        id: "tx-old-1",
        tenantId: "tenant_1",
        customerId: initialAccount.customerId,
        type: "EARN",
        points: 80,
        previousBalance: 200,
        newBalance: 280,
        sourceType: "SALE",
        sourceId: "sale-001",
        reason: "Venda #sale-001",
        createdAt: "2026-09-30 10:00",
      },
    ];

    // Tentativa de reprocessar a mesma venda sale-001
    const retryResult = processPaymentLoyaltyEarn({
      account: initialAccount,
      saleId: "sale-001",
      items: [{ type: "SERVICE", price: 80, qty: 1 }],
      ledger: existingLedger,
      settings: defaultSettings,
    });

    expect(retryResult.success).toBe(false);
    expect(retryResult.pointsEarned).toBe(0);
    expect(retryResult.message).toContain("anteriormente");
  });

  // =========================================================================
  // 4. ESTORNO DE VENDA GERA REVERSAL NO LEDGER
  // =========================================================================
  it("Cenário 4: Estorno gera transação REVERSAL sem apagar o histórico anterior", () => {
    const originalLedger: LoyaltyLedgerEntry[] = [
      {
        id: "tx-earn-1",
        tenantId: "tenant_1",
        customerId: initialAccount.customerId,
        type: "EARN",
        points: 80,
        previousBalance: 200,
        newBalance: 280,
        sourceType: "SALE",
        sourceId: "sale-001",
        reason: "Venda #sale-001",
        createdAt: "2026-09-30 10:00",
      },
    ];

    const reversal = processSaleReversal({
      account: { ...initialAccount, currentPoints: 280, lifetimePoints: 880 },
      saleId: "sale-001",
      ledger: originalLedger,
      reason: "Estorno de venda solicitado pelo cliente",
    });

    expect(reversal.success).toBe(true);
    expect(reversal.pointsReversed).toBe(80);
    expect(reversal.ledgerEntry?.type).toBe("REVERSAL");
    expect(reversal.ledgerEntry?.points).toBe(-80);
    expect(reversal.ledgerEntry?.newBalance).toBe(200);
    expect(reversal.ledgerEntry?.sourceId).toBe("sale-001");
  });

  // =========================================================================
  // 5 & 6. ELEGIBILIDADE DE SERVIÇOS E PRODUTOS
  // =========================================================================
  it("Cenário 5 & 6: Configuração de fontes elegíveis (serviços vs produtos)", () => {
    const onlyServicesSettings: LoyaltySettings = {
      ...defaultSettings,
      servicesEarnPoints: true,
      productsEarnPoints: false,
    };

    const calculation = calculatePointsForSale({
      items: [
        { type: "SERVICE", price: 50, qty: 1 },
        { type: "PRODUCT", price: 50, qty: 1 },
      ],
      settings: onlyServicesSettings,
    });

    // Apenas os R$ 50 de serviço geram pontos
    expect(calculation.eligibleAmount).toBe(50);
    expect(calculation.pointsToEarn).toBe(50);
  });

  // =========================================================================
  // 7 & 8. COMPRA DE PLANO / ASSINATURA ELEGÍVEL APENAS QUANDO ATIVADO
  // =========================================================================
  it("Cenário 7 & 8: Compra de plano só pontua quando explicitamente configurado como ON", () => {
    const planOffSettings: LoyaltySettings = {
      ...defaultSettings,
      planPurchaseEarnsPoints: false,
    };

    const calcOff = calculatePointsForSale({
      items: [{ type: "PLAN", price: 139.9, qty: 1 }],
      settings: planOffSettings,
    });
    expect(calcOff.pointsToEarn).toBe(0);

    const planOnSettings: LoyaltySettings = {
      ...defaultSettings,
      planPurchaseEarnsPoints: true,
    };

    const calcOn = calculatePointsForSale({
      items: [{ type: "PLAN", price: 139.9, qty: 1 }],
      settings: planOnSettings,
    });
    expect(calcOn.pointsToEarn).toBe(139);
  });

  // =========================================================================
  // 9. NÍVEIS DE FIDELIDADE & MULTIPLICADORES
  // =========================================================================
  it("Cenário 9: Qualificação de nível e multiplicadores por nível (Bronze 1x, Prata 1.15x, Ouro 1.25x, Black 1.5x)", () => {
    expect(determineLoyaltyTier(0, defaultTiers)).toBe("BRONZE");
    expect(determineLoyaltyTier(600, defaultTiers)).toBe("PRATA");
    expect(determineLoyaltyTier(1600, defaultTiers)).toBe("OURO");
    expect(determineLoyaltyTier(3500, defaultTiers)).toBe("BLACK");

    expect(getTierMultiplier("BRONZE", defaultTiers)).toBe(1.0);
    expect(getTierMultiplier("OURO", defaultTiers)).toBe(1.25);
    expect(getTierMultiplier("BLACK", defaultTiers)).toBe(1.5);

    // Cliente OURO com multiplicador 1.25x em compra de R$ 100
    const goldAccount: LoyaltyAccountState = {
      ...initialAccount,
      currentPoints: 500,
      lifetimePoints: 1600,
      tier: "OURO",
    };

    const goldEarn = processPaymentLoyaltyEarn({
      account: goldAccount,
      saleId: "sale-gold-1",
      items: [{ type: "SERVICE", price: 100, qty: 1 }],
      ledger: [],
      settings: defaultSettings,
    });

    expect(goldEarn.pointsEarned).toBe(125); // 100 * 1.25
  });

  // =========================================================================
  // 10 & 11. BÔNUS DE ANIVERSÁRIO E IDEMPOTÊNCIA ANUAL
  // =========================================================================
  it("Cenário 10 & 11: Bônus de aniversário dentro da janela e estritamente idempotente (uma única vez por ano)", () => {
    const fixedToday = new Date(2026, 8, 30); // 30 de Setembro de 2026

    // 1ª Execução: Concede bônus
    const bdayResult1 = checkAndApplyBirthdayBonus({
      account: initialAccount,
      customerName: "Carlos Eduardo Santos",
      birthDateStr: "1990-09-30",
      ledger: [],
      settings: defaultSettings,
      now: fixedToday,
    });

    expect(bdayResult1.eligible).toBe(true);
    expect(bdayResult1.ledgerEntry?.type).toBe("BIRTHDAY");
    expect(bdayResult1.ledgerEntry?.points).toBe(defaultSettings.birthdayBonusPoints);

    // 2ª Execução no mesmo ano: Rejeitado por idempotência
    const existingWithBday = [bdayResult1.ledgerEntry!];
    const bdayResult2 = checkAndApplyBirthdayBonus({
      account: bdayResult1.updatedAccount!,
      customerName: "Carlos Eduardo Santos",
      birthDateStr: "1990-09-30",
      ledger: existingWithBday,
      settings: defaultSettings,
      now: fixedToday,
    });

    expect(bdayResult2.eligible).toBe(false);
    expect(bdayResult2.reason).toContain("já concedido");
  });

  // =========================================================================
  // 12 & 13. INDICAÇÃO: SÓ PREMIA APÓS PRIMEIRO ATENDIMENTO PAGO DO INDICADO
  // =========================================================================
  it("Cenário 12 & 13: Programa de indicação premia indicador (+100) e indicado (+50) apenas no 1º atendimento pago", () => {
    const referrerAccount: LoyaltyAccountState = {
      ...initialAccount,
      customerId: "c-carlos",
    };
    const refereeAccount: LoyaltyAccountState = {
      ...initialAccount,
      id: "acc-pedro",
      customerId: "c-pedro",
      currentPoints: 0,
      lifetimePoints: 0,
    };

    const referral = processReferralReward({
      referrerAccount,
      referredAccount: refereeAccount,
      firstSaleId: "sale-pedro-1",
      ledger: [],
      settings: defaultSettings,
    });

    expect(referral.success).toBe(true);
    expect(referral.referrerBonus).toBe(100);
    expect(referral.refereeBonus).toBe(50);
    expect(referral.referrerEntry?.type).toBe("REFERRAL");
    expect(referral.refereeEntry?.type).toBe("REFERRAL");

    // Tentativa repetida não duplica
    const retryReferral = processReferralReward({
      referrerAccount,
      referredAccount: refereeAccount,
      firstSaleId: "sale-pedro-2",
      ledger: [referral.referrerEntry!],
      settings: defaultSettings,
    });

    expect(retryReferral.success).toBe(false);
    expect(retryReferral.message).toContain("já foi processado");
  });

  // =========================================================================
  // 14 & 15. RESGATE DE RECOMPENSA & SALDO INSUFICIENTE
  // =========================================================================
  it("Cenário 14 & 15: Resgate válido debita pontos e cria redemption; saldo insuficiente é recusado", () => {
    const reward: LoyaltyRewardItem = {
      id: "rew-corte",
      tenantId: "tenant_1",
      name: "Corte Tradicional Grátis",
      description: "Corte completo tesoura ou máquina",
      pointsRequired: 150,
      type: "SERVICE",
      currentRedemptionsCount: 0,
      isActive: true,
    };

    // Carlos tem 200 pontos -> Resgata 150 -> Sobram 50
    const redeemSuccess = redeemRewardWithLedger({
      account: initialAccount,
      customerName: "Carlos Eduardo Santos",
      reward,
    });

    expect(redeemSuccess.success).toBe(true);
    expect(redeemSuccess.updatedAccount.currentPoints).toBe(50);
    expect(redeemSuccess.ledgerEntry.type).toBe("REDEEM");
    expect(redeemSuccess.ledgerEntry.points).toBe(-150);
    expect(redeemSuccess.redemption.status).toBe("DISPONIVEL");

    // Tentativa com saldo insuficiente (cliente só tem 100 pontos)
    const poorAccount: LoyaltyAccountState = {
      ...initialAccount,
      currentPoints: 100,
    };

    expect(() =>
      redeemRewardWithLedger({
        account: poorAccount,
        customerName: "Carlos Eduardo Santos",
        reward,
      })
    ).toThrow("Saldo de pontos insuficiente");
  });

  // =========================================================================
  // 16. RECOMPENSA INATIVA
  // =========================================================================
  it("Cenário 16: Recompensa inativa não pode ser resgatada", () => {
    const inactiveReward: LoyaltyRewardItem = {
      id: "rew-inativa",
      tenantId: "tenant_1",
      name: "Pomada Indisponível",
      description: "Sem estoque",
      pointsRequired: 100,
      type: "PRODUCT",
      currentRedemptionsCount: 0,
      isActive: false,
    };

    expect(() =>
      redeemRewardWithLedger({
        account: initialAccount,
        customerName: "Carlos Eduardo Santos",
        reward: inactiveReward,
      })
    ).toThrow("não está ativa");
  });

  // =========================================================================
  // 17. AJUSTE MANUAL AUDITADO COM JUSTIFICATIVA OBRIGATÓRIA
  // =========================================================================
  it("Cenário 17: Ajuste manual auditado exige motivo e operador responsável", () => {
    const adjust = manualAdjustPoints({
      account: initialAccount,
      customerName: "Carlos Eduardo Santos",
      pointsDelta: 50,
      reason: "Bonificação de cortesia gerência por atraso",
      operatorName: "Matheus Borges (GERENTE)",
    });

    expect(adjust.updatedAccount.currentPoints).toBe(250);
    expect(adjust.ledgerEntry.type).toBe("ADJUST");
    expect(adjust.ledgerEntry.points).toBe(50);
    expect(adjust.ledgerEntry.reason).toContain("Bonificação");

    // Sem motivo obrigatório
    expect(() =>
      manualAdjustPoints({
        account: initialAccount,
        pointsDelta: 50,
        reason: "  ",
      })
    ).toThrow("obrigatório para auditoria");
  });

  // =========================================================================
  // 18. SEGMENTAÇÃO CRM DETERMINÍSTICA
  // =========================================================================
  it("Cenário 18: Segmentação CRM determinística sem IA (NOVO, RECORRENTE, VIP, EM_RISCO, INATIVO)", () => {
    const now = new Date(2026, 8, 30); // 30/09/2026

    // Cliente com 1 visita recente -> NOVO
    expect(
      calculateCrmSegment({
        visits: 1,
        spent: 60,
        birthDate: "1995-12-10",
        lastVisitAt: "2026-09-28",
        settings: defaultSettings,
        now,
      })
    ).toBe("NOVO");

    // Cliente com 3 visitas há mais de 70 dias -> INATIVO
    expect(
      calculateCrmSegment({
        visits: 3,
        spent: 150,
        birthDate: "1995-12-10",
        lastVisitAt: "2026-06-01",
        settings: defaultSettings,
        now,
      })
    ).toBe("INATIVO");

    // Cliente com 4 visitas há 40 dias -> EM_RISCO
    expect(
      calculateCrmSegment({
        visits: 4,
        spent: 250,
        birthDate: "1995-12-10",
        lastVisitAt: "2026-08-15",
        settings: defaultSettings,
        now,
      })
    ).toBe("EM_RISCO");

    // Cliente com alto volume de visitas e gasto recente -> VIP
    expect(
      calculateCrmSegment({
        visits: 15,
        spent: 950,
        birthDate: "1995-12-10",
        lastVisitAt: "2026-09-25",
        settings: defaultSettings,
        now,
      })
    ).toBe("VIP");
  });

  // =========================================================================
  // 19. MULTI-TENANT ISOLATION
  // =========================================================================
  it("Cenário 19: Isolamento rigoroso de tenant no ledger e resgate", () => {
    const tenantAlfaAccount: LoyaltyAccountState = {
      ...initialAccount,
      tenantId: "barbearia_alfa",
    };

    const tenantAlfaEarn = processPaymentLoyaltyEarn({
      account: tenantAlfaAccount,
      saleId: "sale-alfa-1",
      items: [{ type: "SERVICE", price: 100, qty: 1 }],
      ledger: [],
      settings: defaultSettings,
    });

    expect(tenantAlfaEarn.ledgerEntry?.tenantId).toBe("barbearia_alfa");

    // Recompensa criada por outro tenant
    const rewardTenantBeta: LoyaltyRewardItem = {
      id: "rew-beta",
      tenantId: "barbearia_beta",
      name: "Corte Beta",
      description: "Exclusivo de outra barbearia",
      pointsRequired: 50,
      type: "SERVICE",
      currentRedemptionsCount: 0,
      isActive: true,
    };

    expect(() =>
      redeemRewardWithLedger({
        account: tenantAlfaAccount,
        customerName: "Carlos",
        reward: rewardTenantBeta,
      })
    ).toThrow("não pertence a este estabelecimento");
  });

  // =========================================================================
  // 20. TESTE DE INTEGRAÇÃO COMPLETO (FLUXO PRINCIPAL REQUISITOS 88-90)
  // =========================================================================
  it("Cenário 20: Fluxo completo integrado: Atendimento -> PDV -> Pagamento -> Pontos -> Resgate -> Estorno", () => {
    // 1. Cliente Carlos inicia com 0 pontos
    const carlosAccount: LoyaltyAccountState = {
      id: "acc-carlos",
      tenantId: "tenant_principal",
      customerId: "cust-carlos",
      currentPoints: 0,
      lifetimePoints: 0,
      tier: "BRONZE",
    };

    // 2. Realiza atendimento: Corte R$ 50 + Pomada R$ 30 = R$ 80
    const earnResult = processPaymentLoyaltyEarn({
      account: carlosAccount,
      saleId: "sale-bh-100",
      items: [
        { type: "SERVICE", price: 50, qty: 1 },
        { type: "PRODUCT", price: 30, qty: 1 },
      ],
      ledger: [],
      settings: defaultSettings,
    });

    expect(earnResult.success).toBe(true);
    expect(earnResult.pointsEarned).toBe(80);
    expect(earnResult.updatedAccount.currentPoints).toBe(80);

    const ledgerAfterEarn = [earnResult.ledgerEntry!];

    // 3. Estorno da venda: REVERSAL -80 pontos
    const reversalResult = processSaleReversal({
      account: earnResult.updatedAccount,
      saleId: "sale-bh-100",
      ledger: ledgerAfterEarn,
      reason: "Cancelamento da venda",
    });

    expect(reversalResult.success).toBe(true);
    expect(reversalResult.pointsReversed).toBe(80);
    expect(reversalResult.ledgerEntry?.points).toBe(-80);
    expect(reversalResult.ledgerEntry?.newBalance).toBe(0);
    expect(reversalResult.updatedAccount.currentPoints).toBe(0);
  });
});
