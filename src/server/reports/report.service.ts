export interface ReportDateRange {
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
}

// --------------------------------------------------------------------
// 1. RELATÓRIO DE VENDAS
// --------------------------------------------------------------------

export interface RawSaleItem {
  id: string;
  saleId: string;
  type: "SERVICE" | "PRODUCT";
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface RawSale {
  id: string;
  tenantId: string;
  code: string;
  customerId?: string | null;
  status: "COMPLETED" | "CANCELED";
  subtotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string; // "PIX", "DINHEIRO", "CARTAO_CREDITO", "CARTAO_DEBITO", "MULTIPLO"
  createdAt: string; // ISO
  items: RawSaleItem[];
}

export interface SalesReportResult {
  period: ReportDateRange;
  totalRevenue: number;
  serviceRevenue: number;
  productRevenue: number;
  totalDiscounts: number;
  completedSalesCount: number;
  canceledSalesCount: number;
  averageTicket: number;
  topServices: Array<{ id: string; name: string; quantity: number; revenue: number }>;
  topProducts: Array<{ id: string; name: string; quantity: number; revenue: number }>;
  paymentMethodsDistribution: Record<string, { count: number; totalAmount: number }>;
}

export function generateSalesReport(
  sales: RawSale[],
  range: ReportDateRange
): SalesReportResult {
  const start = new Date(range.startDate + "T00:00:00Z").getTime();
  const end = new Date(range.endDate + "T23:59:59.999Z").getTime();

  const filtered = sales.filter((s) => {
    const t = new Date(s.createdAt).getTime();
    return t >= start && t <= end;
  });

  const completed = filtered.filter((s) => s.status === "COMPLETED");
  const canceled = filtered.filter((s) => s.status === "CANCELED");

  let totalRevenue = 0;
  let serviceRevenue = 0;
  let productRevenue = 0;
  let totalDiscounts = 0;

  const servicesMap = new Map<string, { id: string; name: string; quantity: number; revenue: number }>();
  const productsMap = new Map<string, { id: string; name: string; quantity: number; revenue: number }>();
  const paymentDist: Record<string, { count: number; totalAmount: number }> = {};

  for (const sale of completed) {
    totalRevenue += sale.totalAmount;
    totalDiscounts += sale.discount;

    // Métodos de pagamento
    const currentDist = paymentDist[sale.paymentMethod] || { count: 0, totalAmount: 0 };
    paymentDist[sale.paymentMethod] = {
      count: currentDist.count + 1,
      totalAmount: Number((currentDist.totalAmount + sale.totalAmount).toFixed(2)),
    };

    // Itens
    for (const item of sale.items) {
      if (item.type === "SERVICE") {
        serviceRevenue += item.totalPrice;
        const existing = servicesMap.get(item.itemId) || {
          id: item.itemId,
          name: item.name,
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue = Number((existing.revenue + item.totalPrice).toFixed(2));
        servicesMap.set(item.itemId, existing);
      } else {
        productRevenue += item.totalPrice;
        const existing = productsMap.get(item.itemId) || {
          id: item.itemId,
          name: item.name,
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue = Number((existing.revenue + item.totalPrice).toFixed(2));
        productsMap.set(item.itemId, existing);
      }
    }
  }

  const topServices = Array.from(servicesMap.values()).sort((a, b) => b.revenue - a.revenue);
  const topProducts = Array.from(productsMap.values()).sort((a, b) => b.revenue - a.revenue);

  const averageTicket = completed.length > 0 ? Number((totalRevenue / completed.length).toFixed(2)) : 0.0;

  return {
    period: range,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    serviceRevenue: Number(serviceRevenue.toFixed(2)),
    productRevenue: Number(productRevenue.toFixed(2)),
    totalDiscounts: Number(totalDiscounts.toFixed(2)),
    completedSalesCount: completed.length,
    canceledSalesCount: canceled.length,
    averageTicket,
    topServices,
    topProducts,
    paymentMethodsDistribution: paymentDist,
  };
}

// --------------------------------------------------------------------
// 2. RELATÓRIO DE CLIENTES
// --------------------------------------------------------------------

export interface RawCustomerData {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  appointments: Array<{
    id: string;
    status: string;
    date: string;
    totalAmount: number;
  }>;
}

export interface CustomersReportResult {
  period: ReportDateRange;
  totalCustomersCount: number;
  newCustomersCount: number;
  recurrentCustomersCount: number;
  inactiveCustomersCount: number;
  averageFrequencyDays: number;
  topCustomersByLTV: Array<{
    id: string;
    name: string;
    phone: string;
    totalVisits: number;
    totalSpent: number;
  }>;
}

export function generateCustomersReport(
  customers: RawCustomerData[],
  range: ReportDateRange,
  inactivityThresholdDays: number = 45
): CustomersReportResult {
  const start = new Date(range.startDate + "T00:00:00Z").getTime();
  const end = new Date(range.endDate + "T23:59:59.999Z").getTime();
  const now = end;

  let newCustomersCount = 0;
  let recurrentCustomersCount = 0;
  let inactiveCustomersCount = 0;
  const visitIntervalDaysList: number[] = [];

  const ltvList: Array<{
    id: string;
    name: string;
    phone: string;
    totalVisits: number;
    totalSpent: number;
  }> = [];

  for (const cust of customers) {
    const custCreated = new Date(cust.createdAt).getTime();
    if (custCreated >= start && custCreated <= end) {
      newCustomersCount++;
    }

    const completedVisits = cust.appointments
      .filter((a) => a.status === "CONCLUIDO")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalSpent = completedVisits.reduce((sum, v) => sum + v.totalAmount, 0);
    const totalVisits = completedVisits.length;

    ltvList.push({
      id: cust.id,
      name: cust.name,
      phone: cust.phone,
      totalVisits,
      totalSpent: Number(totalSpent.toFixed(2)),
    });

    if (totalVisits > 1) {
      recurrentCustomersCount++;
      // Calcula intervalo médio entre visitas deste cliente
      for (let i = 1; i < completedVisits.length; i++) {
        const prevVisit = completedVisits[i - 1];
        const currVisit = completedVisits[i];
        if (prevVisit && currVisit) {
          const diffMs = new Date(currVisit.date).getTime() - new Date(prevVisit.date).getTime();
          const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
          visitIntervalDaysList.push(diffDays);
        }
      }
    }

    // Checa inatividade
    const lastVisit = completedVisits[completedVisits.length - 1];
    if (lastVisit) {
      const lastVisitTime = new Date(lastVisit.date).getTime();
      const daysSinceLast = Math.round((now - lastVisitTime) / (1000 * 60 * 60 * 24));
      if (daysSinceLast > inactivityThresholdDays) {
        inactiveCustomersCount++;
      }
    }
  }

  // Média geral de dias entre visitas
  const averageFrequencyDays =
    visitIntervalDaysList.length > 0
      ? Math.round(visitIntervalDaysList.reduce((a, b) => a + b, 0) / visitIntervalDaysList.length)
      : 0;

  // Ordena LTV decrescente
  ltvList.sort((a, b) => b.totalSpent - a.totalSpent);

  return {
    period: range,
    totalCustomersCount: customers.length,
    newCustomersCount,
    recurrentCustomersCount,
    inactiveCustomersCount,
    averageFrequencyDays,
    topCustomersByLTV: ltvList.slice(0, 10),
  };
}

// --------------------------------------------------------------------
// 3. RELATÓRIO DE FUNCIONÁRIOS / BARBEIROS
// --------------------------------------------------------------------

export interface RawEmployeePerformance {
  employeeId: string;
  employeeName: string;
  appointments: Array<{
    status: string;
    totalAmount: number;
    createdAt: string;
  }>;
  commissions: Array<{
    amount: number;
    status: "PENDING" | "PAID" | "CANCELED";
    createdAt: string;
  }>;
}

export interface EmployeeReportEntry {
  employeeId: string;
  employeeName: string;
  totalAppointments: number;
  completedAppointments: number;
  canceledAppointments: number;
  noShowCount: number;
  totalRevenueGenerated: number;
  totalCommissionsEarned: number;
  averageTicket: number;
  cancellationRate: number; // %
}

export function generateEmployeesReport(
  employees: RawEmployeePerformance[],
  range: ReportDateRange
): EmployeeReportEntry[] {
  const start = new Date(range.startDate + "T00:00:00Z").getTime();
  const end = new Date(range.endDate + "T23:59:59.999Z").getTime();

  return employees.map((emp) => {
    const periodApps = emp.appointments.filter((a) => {
      const t = new Date(a.createdAt).getTime();
      return t >= start && t <= end;
    });

    const completed = periodApps.filter((a) => a.status === "CONCLUIDO");
    const canceled = periodApps.filter((a) => a.status === "CANCELADO");
    const noShow = periodApps.filter((a) => a.status === "NAO_COMPARECEU");

    const totalRevenue = completed.reduce((sum, a) => sum + a.totalAmount, 0);

    const periodComms = emp.commissions.filter((c) => {
      const t = new Date(c.createdAt).getTime();
      return t >= start && t <= end && c.status !== "CANCELED";
    });
    const totalCommissions = periodComms.reduce((sum, c) => sum + c.amount, 0);

    const avgTicket = completed.length > 0 ? Number((totalRevenue / completed.length).toFixed(2)) : 0.0;
    const cancelRate = periodApps.length > 0
      ? Number(((canceled.length / periodApps.length) * 100).toFixed(1))
      : 0.0;

    return {
      employeeId: emp.employeeId,
      employeeName: emp.employeeName,
      totalAppointments: periodApps.length,
      completedAppointments: completed.length,
      canceledAppointments: canceled.length,
      noShowCount: noShow.length,
      totalRevenueGenerated: Number(totalRevenue.toFixed(2)),
      totalCommissionsEarned: Number(totalCommissions.toFixed(2)),
      averageTicket: avgTicket,
      cancellationRate: cancelRate,
    };
  });
}

// --------------------------------------------------------------------
// 4. RELATÓRIO DA AGENDA
// --------------------------------------------------------------------

export interface RawScheduleAppointment {
  id: string;
  status: string;
  startTime: string; // ISO
  endTime: string;
  durationMinutes: number;
}

export interface ScheduleReportResult {
  period: ReportDateRange;
  totalAppointments: number;
  completedCount: number;
  canceledCount: number;
  noShowCount: number;
  occupancyRatePercentage: number;
  peakHoursDistribution: Record<string, number>; // "09:00" -> count
}

export function generateScheduleReport(
  appointments: RawScheduleAppointment[],
  range: ReportDateRange,
  totalAvailableHoursInPeriod: number = 80 // e.g. 10 days * 8h
): ScheduleReportResult {
  const start = new Date(range.startDate + "T00:00:00Z").getTime();
  const end = new Date(range.endDate + "T23:59:59.999Z").getTime();

  const filtered = appointments.filter((a) => {
    const t = new Date(a.startTime).getTime();
    return t >= start && t <= end;
  });

  const completed = filtered.filter((a) => a.status === "CONCLUIDO");
  const canceled = filtered.filter((a) => a.status === "CANCELADO");
  const noShow = filtered.filter((a) => a.status === "NAO_COMPARECEU");

  // Horários de pico (hora de início)
  const peakDist: Record<string, number> = {};
  for (const a of filtered) {
    if (a.status !== "CANCELADO") {
      const d = new Date(a.startTime);
      const hourStr = `${String(d.getUTCHours()).padStart(2, "0")}:00`;
      peakDist[hourStr] = (peakDist[hourStr] || 0) + 1;
    }
  }

  // Cálculo da taxa de ocupação: minutos agendados válidos / total minutos disponíveis
  const activeApps = filtered.filter((a) => a.status !== "CANCELADO" && a.status !== "NAO_COMPARECEU");
  const totalOccupiedMinutes = activeApps.reduce((sum, a) => sum + a.durationMinutes, 0);
  const totalAvailableMinutes = totalAvailableHoursInPeriod * 60;
  const occupancyRate = totalAvailableMinutes > 0
    ? Number(Math.min(100, (totalOccupiedMinutes / totalAvailableMinutes) * 100).toFixed(1))
    : 0.0;

  return {
    period: range,
    totalAppointments: filtered.length,
    completedCount: completed.length,
    canceledCount: canceled.length,
    noShowCount: noShow.length,
    occupancyRatePercentage: occupancyRate,
    peakHoursDistribution: peakDist,
  };
}

// --------------------------------------------------------------------
// 5. RELATÓRIO FINANCEIRO (DRE & CONTAS)
// --------------------------------------------------------------------

export interface FinancialReportInput {
  period: ReportDateRange;
  salesRevenue: number;
  subscriptionRevenue: number;
  totalDiscounts: number;
  commissionsPaid: number;
  costOfGoodsSoldCMV: number;
  operatingExpenses: number; // Aluguel, luz, água, materiais de consumo etc.
  accountsPayable: Array<{
    amount: number;
    status: "PENDING" | "PAID" | "OVERDUE";
  }>;
  accountsReceivable: Array<{
    amount: number;
    status: "PENDING" | "RECEIVED" | "OVERDUE";
  }>;
}

export interface FinancialDREResult {
  period: ReportDateRange;
  receitaBruta: number;
  descontos: number;
  receitaLiquida: number;
  custosDiretos: {
    comissoes: number;
    custoMercadoriasCMV: number;
    totalCustos: number;
  };
  lucroBruto: number;
  despesasOperacionais: number;
  resultadoLiquido: number; // Lucro ou prejuízo
  contasAPagar: {
    totalPendente: number;
    totalPago: number;
    totalVencido: number;
  };
  contasAReceber: {
    totalPendente: number;
    totalRecebido: number;
    totalVencido: number;
  };
}

export function generateFinancialDRE(input: FinancialReportInput): FinancialDREResult {
  const receitaBruta = Number((input.salesRevenue + input.subscriptionRevenue).toFixed(2));
  const descontos = Number(input.totalDiscounts.toFixed(2));
  const receitaLiquida = Number((receitaBruta - descontos).toFixed(2));

  const comissoes = Number(input.commissionsPaid.toFixed(2));
  const custoMercadoriasCMV = Number(input.costOfGoodsSoldCMV.toFixed(2));
  const totalCustos = Number((comissoes + custoMercadoriasCMV).toFixed(2));

  const lucroBruto = Number((receitaLiquida - totalCustos).toFixed(2));
  const despesasOperacionais = Number(input.operatingExpenses.toFixed(2));
  const resultadoLiquido = Number((lucroBruto - despesasOperacionais).toFixed(2));

  const payables = { totalPendente: 0, totalPago: 0, totalVencido: 0 };
  for (const ap of input.accountsPayable) {
    if (ap.status === "PAID") payables.totalPago += ap.amount;
    else if (ap.status === "OVERDUE") payables.totalVencido += ap.amount;
    else payables.totalPendente += ap.amount;
  }
  payables.totalPendente = Number(payables.totalPendente.toFixed(2));
  payables.totalPago = Number(payables.totalPago.toFixed(2));
  payables.totalVencido = Number(payables.totalVencido.toFixed(2));

  const receivables = { totalPendente: 0, totalRecebido: 0, totalVencido: 0 };
  for (const ar of input.accountsReceivable) {
    if (ar.status === "RECEIVED") receivables.totalRecebido += ar.amount;
    else if (ar.status === "OVERDUE") receivables.totalVencido += ar.amount;
    else receivables.totalPendente += ar.amount;
  }
  receivables.totalPendente = Number(receivables.totalPendente.toFixed(2));
  receivables.totalRecebido = Number(receivables.totalRecebido.toFixed(2));
  receivables.totalVencido = Number(receivables.totalVencido.toFixed(2));

  return {
    period: input.period,
    receitaBruta,
    descontos,
    receitaLiquida,
    custosDiretos: {
      comissoes,
      custoMercadoriasCMV,
      totalCustos,
    },
    lucroBruto,
    despesasOperacionais,
    resultadoLiquido,
    contasAPagar: payables,
    contasAReceber: receivables,
  };
}

// --------------------------------------------------------------------
// 6. RELATÓRIO DE ESTOQUE
// --------------------------------------------------------------------

export interface RawStockProduct {
  id: string;
  name: string;
  sku?: string | null;
  costPrice: number;
  salePrice: number;
  currentStock: number;
  minStock: number;
}

export interface RawStockMovementData {
  type: "INBOUND" | "SALE" | "CONSUMPTION" | "LOSS" | "ADJUSTMENT" | "RETURN";
  quantity: number;
  productId: string;
  createdAt: string;
}

export interface StockReportResult {
  totalProductsCount: number;
  totalInventoryUnits: number;
  totalInventoryValueAtCost: number;
  totalInventoryValueAtRetail: number;
  projectedProfit: number;
  movementsSummary: Record<string, number>;
  lowStockItems: Array<{ id: string; name: string; currentStock: number; minStock: number }>;
}

export function generateStockReport(
  products: RawStockProduct[],
  movements: RawStockMovementData[]
): StockReportResult {
  let totalUnits = 0;
  let totalValueAtCost = 0;
  let totalValueAtRetail = 0;
  const lowStockItems: Array<{ id: string; name: string; currentStock: number; minStock: number }> = [];

  for (const p of products) {
    totalUnits += p.currentStock;
    totalValueAtCost += p.currentStock * p.costPrice;
    totalValueAtRetail += p.currentStock * p.salePrice;

    if (p.currentStock <= p.minStock) {
      lowStockItems.push({
        id: p.id,
        name: p.name,
        currentStock: p.currentStock,
        minStock: p.minStock,
      });
    }
  }

  const movementsSummary: Record<string, number> = {
    INBOUND: 0,
    SALE: 0,
    CONSUMPTION: 0,
    LOSS: 0,
    ADJUSTMENT: 0,
    RETURN: 0,
  };

  for (const m of movements) {
    const currentVal = movementsSummary[m.type];
    if (currentVal !== undefined) {
      movementsSummary[m.type] = currentVal + m.quantity;
    }
  }

  const totalCost = Number(totalValueAtCost.toFixed(2));
  const totalRetail = Number(totalValueAtRetail.toFixed(2));
  const projectedProfit = Number((totalRetail - totalCost).toFixed(2));

  return {
    totalProductsCount: products.length,
    totalInventoryUnits: totalUnits,
    totalInventoryValueAtCost: totalCost,
    totalInventoryValueAtRetail: totalRetail,
    projectedProfit,
    movementsSummary,
    lowStockItems,
  };
}
