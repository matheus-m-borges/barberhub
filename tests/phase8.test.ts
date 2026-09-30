import { describe, it, expect } from "vitest";
import {
  computeDashboardTodayMetrics,
  computeDashboardAlerts,
  DashboardSale,
  DashboardAppointment,
} from "../src/server/dashboard/dashboard.service";
import {
  generateSalesReport,
  generateCustomersReport,
  generateEmployeesReport,
  generateScheduleReport,
  generateFinancialDRE,
  generateStockReport,
  RawSale,
  RawCustomerData,
  RawEmployeePerformance,
  RawScheduleAppointment,
  RawStockProduct,
  RawStockMovementData,
} from "../src/server/reports/report.service";
import {
  queryAuditLogs,
  humanizeAuditEntry,
  StoredAuditLog,
} from "../src/server/audit/audit-query.service";

describe("FASE 8: Dashboard Executivo, Relatórios & Auditoria Visual", () => {
  // ------------------------------------------------------------------
  // TESTE 1: Métricas de Hoje do Dashboard
  // ------------------------------------------------------------------
  it("deve calcular faturamento, atendimentos, ticket médio e taxa de ocupação de hoje no Dashboard", () => {
    const sales: DashboardSale[] = [
      { id: "s1", code: "VD-001", customerId: "c1", status: "COMPLETED", totalAmount: 70.0, createdAt: "2026-09-29T10:00:00Z" },
      { id: "s2", code: "VD-002", customerId: "c2", status: "COMPLETED", totalAmount: 50.0, createdAt: "2026-09-29T11:00:00Z" },
      { id: "s3", code: "VD-003", customerId: "c3", status: "CANCELED", totalAmount: 80.0, createdAt: "2026-09-29T12:00:00Z" },
    ];

    const appointments: DashboardAppointment[] = [
      {
        id: "a1",
        code: "BH-100",
        customerId: "c1",
        customerName: "Carlos Antigo",
        employeeId: "e1",
        employeeName: "Mestre Navalha",
        serviceId: "srv1",
        serviceName: "Corte Tradicional",
        serviceDuration: 30,
        price: 45.0,
        startTime: "09:00",
        endTime: "09:30",
        status: "CONCLUIDO",
      },
      {
        id: "a2",
        code: "BH-101",
        customerId: "c2",
        customerName: "João Novo",
        employeeId: "e1",
        employeeName: "Mestre Navalha",
        serviceId: "srv2",
        serviceName: "Barboterapia",
        serviceDuration: 30,
        price: 35.0,
        startTime: "09:30",
        endTime: "10:00",
        status: "CONCLUIDO",
      },
      {
        id: "a3",
        code: "BH-102",
        customerId: "c4",
        customerName: "Lucas Desistente",
        employeeId: "e1",
        employeeName: "Mestre Navalha",
        serviceId: "srv1",
        serviceName: "Corte Tradicional",
        serviceDuration: 30,
        price: 45.0,
        startTime: "10:30",
        endTime: "11:00",
        status: "CANCELADO",
      },
      {
        id: "a4",
        code: "BH-103",
        customerId: "c5",
        customerName: "Pedro Faltoso",
        employeeId: "e1",
        employeeName: "Mestre Navalha",
        serviceId: "srv1",
        serviceName: "Corte Tradicional",
        serviceDuration: 30,
        price: 45.0,
        startTime: "11:30",
        endTime: "12:00",
        status: "NAO_COMPARECEU",
      },
    ];

    const historicalCusts = new Set<string>(["c1"]); // c1 é recorrente, c2 é novo

    const metrics = computeDashboardTodayMetrics({
      sales,
      appointments,
      businessHours: {
        openTime: "09:00",
        closeTime: "19:00", // 10 horas = 600 minutos / 30 = 20 slots por barbeiro
        slotIntervalMinutes: 30,
        activeBarbersCount: 1, // Total de 20 slots disponíveis
      },
      historicalCustomerIdsWithPriorVisits: historicalCusts,
    });

    expect(metrics.faturamentoHoje).toBe(120.0); // 70 + 50 (ignora cancelada)
    expect(metrics.totalAgendamentos).toBe(4);
    expect(metrics.cancelamentos).toBe(1);
    expect(metrics.faltas).toBe(1);
    expect(metrics.totalAtendimentos).toBe(2);
    expect(metrics.ticketMedio).toBe(60.0); // 120 / 2
    expect(metrics.clientesRecorrentes).toBe(1); // c1
    expect(metrics.clientesNovos).toBe(1); // c2
    // Ocupação: 2 slots concluídos de 20 = 10%
    expect(metrics.taxaOcupacao).toBe(10.0);
  });

  // ------------------------------------------------------------------
  // TESTE 2: Alertas Determinísticos do Dashboard
  // ------------------------------------------------------------------
  it("deve disparar alertas para caixa fechado, estoque crítico, contas vencidas e clientes inativos", () => {
    const alerts = computeDashboardAlerts({
      isCashOpenToday: false,
      lowStockProducts: [
        { id: "p1", name: "Pomada Modeladora", currentStock: 2, minStock: 5 },
      ],
      waitingAppointments: [
        { id: "a1", customerName: "Rafael", serviceName: "Corte", scheduledTime: "14:00" },
      ],
      overduePayables: [
        { id: "ap1", description: "Boleto Água", amount: 180.5, dueDate: "2026-09-25" },
      ],
      inactiveCustomers: [
        { id: "c9", name: "Marcos", lastVisitDate: "2026-07-10", daysInactive: 80 },
      ],
      vacantSlotsCount: 5,
    });

    expect(alerts.length).toBe(6);
    expect(alerts.some((a) => a.type === "CAIXA_FECHADO" && a.severity === "CRITICAL")).toBe(true);
    expect(alerts.some((a) => a.type === "ESTOQUE_BAIXO" && a.count === 1)).toBe(true);
    expect(alerts.some((a) => a.type === "CLIENTES_AGUARDANDO")).toBe(true);
    expect(alerts.some((a) => a.type === "CONTAS_VENCIDAS" && a.severity === "CRITICAL")).toBe(true);
    expect(alerts.some((a) => a.type === "CLIENTES_INATIVOS")).toBe(true);
    expect(alerts.some((a) => a.type === "HORARIOS_OCIOSOS")).toBe(true);
  });

  // ------------------------------------------------------------------
  // TESTE 3: Relatório de Vendas Determinístico
  // ------------------------------------------------------------------
  it("deve gerar o Relatório de Vendas agregando serviços, produtos e formas de pagamento", () => {
    const sales: RawSale[] = [
      {
        id: "s1",
        tenantId: "t1",
        code: "VD-1",
        status: "COMPLETED",
        subtotal: 100.0,
        discount: 10.0,
        totalAmount: 90.0,
        paymentMethod: "PIX",
        createdAt: "2026-09-15T14:00:00Z",
        items: [
          { id: "i1", saleId: "s1", type: "SERVICE", itemId: "srv1", name: "Corte", quantity: 1, unitPrice: 50.0, totalPrice: 50.0 },
          { id: "i2", saleId: "s1", type: "PRODUCT", itemId: "prod1", name: "Pomada Matte", quantity: 1, unitPrice: 50.0, totalPrice: 50.0 },
        ],
      },
      {
        id: "s2",
        tenantId: "t1",
        code: "VD-2",
        status: "COMPLETED",
        subtotal: 60.0,
        discount: 0.0,
        totalAmount: 60.0,
        paymentMethod: "CARTAO_CREDITO",
        createdAt: "2026-09-16T15:00:00Z",
        items: [
          { id: "i3", saleId: "s2", type: "SERVICE", itemId: "srv1", name: "Corte", quantity: 1, unitPrice: 60.0, totalPrice: 60.0 },
        ],
      },
      {
        id: "s3",
        tenantId: "t1",
        code: "VD-3",
        status: "CANCELED",
        subtotal: 120.0,
        discount: 0.0,
        totalAmount: 120.0,
        paymentMethod: "DINHEIRO",
        createdAt: "2026-09-16T16:00:00Z",
        items: [],
      },
    ];

    const report = generateSalesReport(sales, {
      startDate: "2026-09-01",
      endDate: "2026-09-30",
    });

    expect(report.totalRevenue).toBe(150.0); // 90 + 60
    expect(report.serviceRevenue).toBe(110.0); // 50 + 60
    expect(report.productRevenue).toBe(50.0);
    expect(report.totalDiscounts).toBe(10.0);
    expect(report.completedSalesCount).toBe(2);
    expect(report.canceledSalesCount).toBe(1);
    expect(report.averageTicket).toBe(75.0); // 150 / 2
    expect(report.topServices[0].name).toBe("Corte");
    expect(report.topServices[0].quantity).toBe(2);
    expect(report.paymentMethodsDistribution["PIX"].totalAmount).toBe(90.0);
    expect(report.paymentMethodsDistribution["CARTAO_CREDITO"].totalAmount).toBe(60.0);
  });

  // ------------------------------------------------------------------
  // TESTE 4: Relatório de Clientes (Novos, Recorrentes, Inativos e LTV)
  // ------------------------------------------------------------------
  it("deve gerar o Relatório de Clientes calculando LTV, inatividade e retenção", () => {
    const customers: RawCustomerData[] = [
      {
        id: "c1",
        name: "Cliente Fiel",
        phone: "11988887777",
        createdAt: "2026-01-10T10:00:00Z",
        appointments: [
          { id: "a1", status: "CONCLUIDO", date: "2026-08-01T10:00:00Z", totalAmount: 80.0 },
          { id: "a2", status: "CONCLUIDO", date: "2026-08-15T10:00:00Z", totalAmount: 70.0 },
          { id: "a3", status: "CONCLUIDO", date: "2026-09-01T10:00:00Z", totalAmount: 90.0 },
        ],
      },
      {
        id: "c2",
        name: "Cliente Inativo",
        phone: "11977776666",
        createdAt: "2026-02-01T10:00:00Z",
        appointments: [
          { id: "a4", status: "CONCLUIDO", date: "2026-05-01T10:00:00Z", totalAmount: 50.0 },
        ],
      },
      {
        id: "c3",
        name: "Cliente Novato",
        phone: "11966665555",
        createdAt: "2026-09-10T10:00:00Z",
        appointments: [
          { id: "a5", status: "CONCLUIDO", date: "2026-09-12T10:00:00Z", totalAmount: 60.0 },
        ],
      },
    ];

    const report = generateCustomersReport(
      customers,
      { startDate: "2026-09-01", endDate: "2026-09-30" },
      45 // Inativo se > 45 dias
    );

    expect(report.totalCustomersCount).toBe(3);
    expect(report.newCustomersCount).toBe(1); // c3 criado em setembro
    expect(report.recurrentCustomersCount).toBe(1); // c1 tem 3 visitas
    expect(report.inactiveCustomersCount).toBe(1); // c2 última visita em maio (> 100 dias)
    expect(report.topCustomersByLTV[0].name).toBe("Cliente Fiel");
    expect(report.topCustomersByLTV[0].totalSpent).toBe(240.0); // 80 + 70 + 90
    expect(report.averageFrequencyDays).toBeGreaterThan(0);
  });

  // ------------------------------------------------------------------
  // TESTE 5: Relatório de Funcionários / Barbeiros
  // ------------------------------------------------------------------
  it("deve gerar o Relatório de Desempenho dos Barbeiros com faturamento, comissões e cancelamentos", () => {
    const employees: RawEmployeePerformance[] = [
      {
        employeeId: "emp1",
        employeeName: "Barbeiro Alfa",
        appointments: [
          { status: "CONCLUIDO", totalAmount: 60.0, createdAt: "2026-09-10T10:00:00Z" },
          { status: "CONCLUIDO", totalAmount: 80.0, createdAt: "2026-09-11T10:00:00Z" },
          { status: "CANCELADO", totalAmount: 50.0, createdAt: "2026-09-12T10:00:00Z" },
        ],
        commissions: [
          { amount: 30.0, status: "PAID", createdAt: "2026-09-10T12:00:00Z" },
          { amount: 40.0, status: "PENDING", createdAt: "2026-09-11T12:00:00Z" },
        ],
      },
    ];

    const report = generateEmployeesReport(employees, {
      startDate: "2026-09-01",
      endDate: "2026-09-30",
    });

    expect(report.length).toBe(1);
    const alfa = report[0];
    expect(alfa.totalAppointments).toBe(3);
    expect(alfa.completedAppointments).toBe(2);
    expect(alfa.canceledAppointments).toBe(1);
    expect(alfa.totalRevenueGenerated).toBe(140.0); // 60 + 80
    expect(alfa.totalCommissionsEarned).toBe(70.0); // 30 + 40
    expect(alfa.averageTicket).toBe(70.0); // 140 / 2
    expect(alfa.cancellationRate).toBe(33.3); // 1 / 3
  });

  // ------------------------------------------------------------------
  // TESTE 6: Relatório de Ocupação da Agenda e Horários de Pico
  // ------------------------------------------------------------------
  it("deve calcular distribuição de horários de pico e ocupação global no Relatório de Agenda", () => {
    const appointments: RawScheduleAppointment[] = [
      { id: "a1", status: "CONCLUIDO", startTime: "2026-09-10T09:00:00Z", endTime: "2026-09-10T09:30:00Z", durationMinutes: 30 },
      { id: "a2", status: "CONCLUIDO", startTime: "2026-09-10T09:30:00Z", endTime: "2026-09-10T10:00:00Z", durationMinutes: 30 },
      { id: "a3", status: "CONCLUIDO", startTime: "2026-09-10T14:00:00Z", endTime: "2026-09-10T15:00:00Z", durationMinutes: 60 },
      { id: "a4", status: "CANCELADO", startTime: "2026-09-10T16:00:00Z", endTime: "2026-09-10T16:30:00Z", durationMinutes: 30 },
    ];

    const report = generateScheduleReport(
      appointments,
      { startDate: "2026-09-01", endDate: "2026-09-30" },
      10 // 10 horas disponíveis no período = 600 minutos
    );

    expect(report.totalAppointments).toBe(4);
    expect(report.completedCount).toBe(3);
    expect(report.canceledCount).toBe(1);
    // Minutos ocupados = 30 + 30 + 60 = 120 min de 600 min = 20%
    expect(report.occupancyRatePercentage).toBe(20.0);
    expect(report.peakHoursDistribution["09:00"]).toBe(2);
    expect(report.peakHoursDistribution["14:00"]).toBe(1);
  });

  // ------------------------------------------------------------------
  // TESTE 7: Relatório Financeiro (DRE Operacional Determinístico)
  // ------------------------------------------------------------------
  it("deve calcular o DRE determinístico com Lucro Bruto, Custos Diretos, Despesas e Resultado Líquido", () => {
    const dre = generateFinancialDRE({
      period: { startDate: "2026-09-01", endDate: "2026-09-30" },
      salesRevenue: 10000.0,
      subscriptionRevenue: 2000.0,
      totalDiscounts: 500.0,
      commissionsPaid: 4500.0,
      costOfGoodsSoldCMV: 1500.0,
      operatingExpenses: 2500.0, // Aluguel, energia, internet
      accountsPayable: [
        { amount: 500.0, status: "PENDING" },
        { amount: 2000.0, status: "PAID" },
        { amount: 300.0, status: "OVERDUE" },
      ],
      accountsReceivable: [
        { amount: 400.0, status: "PENDING" },
        { amount: 1600.0, status: "RECEIVED" },
      ],
    });

    expect(dre.receitaBruta).toBe(12000.0); // 10000 + 2000
    expect(dre.descontos).toBe(500.0);
    expect(dre.receitaLiquida).toBe(11500.0); // 12000 - 500
    expect(dre.custosDiretos.totalCustos).toBe(6000.0); // 4500 comissões + 1500 CMV
    expect(dre.lucroBruto).toBe(5500.0); // 11500 - 6000
    expect(dre.despesasOperacionais).toBe(2500.0);
    expect(dre.resultadoLiquido).toBe(3000.0); // 5500 - 2500 (Lucro Líquido exato)

    expect(dre.contasAPagar.totalPago).toBe(2000.0);
    expect(dre.contasAPagar.totalVencido).toBe(300.0);
    expect(dre.contasAReceber.totalRecebido).toBe(1600.0);
  });

  // ------------------------------------------------------------------
  // TESTE 8: Relatório de Estoque e Valorização
  // ------------------------------------------------------------------
  it("deve calcular valorização do estoque a custo e varejo, e sumário de movimentações", () => {
    const products: RawStockProduct[] = [
      { id: "p1", name: "Óleo de Barba", costPrice: 20.0, salePrice: 50.0, currentStock: 10, minStock: 3 },
      { id: "p2", name: "Shampoo Cabelo", costPrice: 15.0, salePrice: 40.0, currentStock: 2, minStock: 5 }, // Baixo estoque
    ];

    const movements: RawStockMovementData[] = [
      { type: "INBOUND", quantity: 20, productId: "p1", createdAt: "2026-09-01T10:00:00Z" },
      { type: "SALE", quantity: 8, productId: "p1", createdAt: "2026-09-05T10:00:00Z" },
      { type: "CONSUMPTION", quantity: 2, productId: "p1", createdAt: "2026-09-06T10:00:00Z" },
      { type: "LOSS", quantity: 1, productId: "p2", createdAt: "2026-09-07T10:00:00Z" },
    ];

    const report = generateStockReport(products, movements);

    expect(report.totalProductsCount).toBe(2);
    expect(report.totalInventoryUnits).toBe(12); // 10 + 2
    expect(report.totalInventoryValueAtCost).toBe(230.0); // (10*20) + (2*15) = 200 + 30
    expect(report.totalInventoryValueAtRetail).toBe(580.0); // (10*50) + (2*40) = 500 + 80
    expect(report.projectedProfit).toBe(350.0); // 580 - 230
    expect(report.lowStockItems.length).toBe(1);
    expect(report.lowStockItems[0].name).toBe("Shampoo Cabelo");
    expect(report.movementsSummary.INBOUND).toBe(20);
    expect(report.movementsSummary.SALE).toBe(8);
    expect(report.movementsSummary.CONSUMPTION).toBe(2);
    expect(report.movementsSummary.LOSS).toBe(1);
  });

  // ------------------------------------------------------------------
  // TESTE 9: Consulta e Filtragem de Logs de Auditoria com Isolamento
  // ------------------------------------------------------------------
  it("deve filtrar logs de auditoria por tenant, ação e busca textual com paginação", () => {
    const logs: StoredAuditLog[] = [
      {
        id: "l1",
        tenantId: "tenant_matriz",
        action: "CASH_OPEN",
        entity: "CashRegister",
        entityId: "cx_01",
        oldValues: null,
        newValues: JSON.stringify({ initialCash: 150.0 }),
        createdAt: new Date("2026-09-29T08:00:00Z"),
        user: { name: "Operador 1", email: "op1@barberhub.com" },
      },
      {
        id: "l2",
        tenantId: "tenant_matriz",
        action: "PRICE_CHANGE",
        entity: "Service",
        entityId: "srv_corte",
        oldValues: JSON.stringify({ price: 40.0 }),
        newValues: JSON.stringify({ price: 50.0 }),
        createdAt: new Date("2026-09-29T09:00:00Z"),
        user: { name: "Admin", email: "admin@barberhub.com" },
      },
      {
        id: "l3",
        tenantId: "tenant_concorrente", // Outro tenant
        action: "CASH_OPEN",
        entity: "CashRegister",
        entityId: "cx_99",
        createdAt: new Date("2026-09-29T08:30:00Z"),
        user: { name: "Outro Dono", email: "dono@outro.com" },
      },
    ];

    // Isolamento de tenant: deve ignorar tenant_concorrente
    const queryResult = queryAuditLogs(logs, {
      tenantId: "tenant_matriz",
      action: "PRICE_CHANGE",
    });

    expect(queryResult.totalCount).toBe(1);
    expect(queryResult.items[0].action).toBe("PRICE_CHANGE");
    expect(queryResult.items[0].entityId).toBe("srv_corte");
    expect(queryResult.items[0].userName).toBe("Admin");

    // Rejeição ao tentar consultar sem tenantId
    expect(() => queryAuditLogs(logs, { tenantId: "" })).toThrow(/tenantId/);
  });

  // ------------------------------------------------------------------
  // TESTE 10: Humanização Amigável para Painel de Auditoria Visual
  // ------------------------------------------------------------------
  it("deve humanizar registros de auditoria em textos claros e descritivos para o painel", () => {
    const logPrice: StoredAuditLog = {
      id: "log_p",
      tenantId: "t1",
      action: "PRICE_CHANGE",
      entity: "Service",
      entityId: "srv_1",
      oldValues: JSON.stringify({ price: 45.0 }),
      newValues: JSON.stringify({ price: 55.0 }),
      createdAt: new Date(),
      user: { name: "Gerente Rodrigo", email: "rodrigo@bh.com" },
    };

    const descPrice = humanizeAuditEntry(logPrice);
    expect(descPrice).toContain("Gerente Rodrigo");
    expect(descPrice).toContain("R$ 45.00");
    expect(descPrice).toContain("R$ 55.00");

    const logCash: StoredAuditLog = {
      id: "log_c",
      tenantId: "t1",
      action: "CASH_OPEN",
      entity: "CashRegister",
      entityId: "cx_1",
      newValues: JSON.stringify({ initialCash: 120.0 }),
      createdAt: new Date(),
      user: { name: "Caixa Bianca", email: "bianca@bh.com" },
    };

    const descCash = humanizeAuditEntry(logCash);
    expect(descCash).toContain("Caixa Bianca");
    expect(descCash).toContain("abriu o caixa");
    expect(descCash).toContain("120.00");
  });
});
