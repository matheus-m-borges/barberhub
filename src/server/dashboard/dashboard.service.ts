export interface DashboardAppointment {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  employeeId: string;
  employeeName: string;
  serviceId: string;
  serviceName: string;
  serviceDuration: number;
  price: number;
  startTime: string; // ISO string or "HH:mm"
  endTime: string;
  status: "AGENDADO" | "CONFIRMADO" | "AGUARDANDO" | "EM_ATENDIMENTO" | "CONCLUIDO" | "CANCELADO" | "NAO_COMPARECEU";
}

export interface DashboardSale {
  id: string;
  code: string;
  customerId?: string | null;
  status: "COMPLETED" | "CANCELED";
  totalAmount: number;
  createdAt: string;
}

export interface BusinessHoursInput {
  openTime: string; // "09:00"
  closeTime: string; // "19:00"
  slotIntervalMinutes: number; // e.g. 30
  activeBarbersCount: number; // e.g. 3
}

export interface DashboardTodayMetrics {
  faturamentoHoje: number;
  totalAtendimentos: number;
  totalAgendamentos: number;
  cancelamentos: number;
  faltas: number;
  ticketMedio: number;
  clientesNovos: number;
  clientesRecorrentes: number;
  taxaOcupacao: number; // 0.0 to 100.0 %
}

export interface DashboardAlert {
  type: "CAIXA_FECHADO" | "ESTOQUE_BAIXO" | "HORARIOS_OCIOSOS" | "CLIENTES_AGUARDANDO" | "CONTAS_VENCIDAS" | "CLIENTES_INATIVOS";
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  count?: number;
  items?: Array<{ id: string; label: string; detail?: string }>;
}

export interface DashboardAlertsInput {
  isCashOpenToday: boolean;
  lowStockProducts: Array<{ id: string; name: string; currentStock: number; minStock: number }>;
  waitingAppointments: Array<{ id: string; customerName: string; serviceName: string; scheduledTime: string }>;
  overduePayables: Array<{ id: string; description: string; amount: number; dueDate: string }>;
  inactiveCustomers: Array<{ id: string; name: string; lastVisitDate: string; daysInactive: number }>;
  vacantSlotsCount: number;
}

/**
 * Calcula as métricas operacionais e financeiras de hoje para o Dashboard em tempo real.
 */
export function computeDashboardTodayMetrics(params: {
  sales: DashboardSale[];
  appointments: DashboardAppointment[];
  businessHours: BusinessHoursInput;
  historicalCustomerIdsWithPriorVisits: Set<string>;
}): DashboardTodayMetrics {
  const { sales, appointments, businessHours, historicalCustomerIdsWithPriorVisits } = params;

  // 1. Faturamento de vendas concluídas
  const completedSales = sales.filter((s) => s.status === "COMPLETED");
  const faturamentoHoje = completedSales.reduce((acc, s) => acc + s.totalAmount, 0);

  // 2. Contadores de agendamentos
  const totalAgendamentos = appointments.length;
  const completedAppointments = appointments.filter((a) => a.status === "CONCLUIDO");
  const cancelamentos = appointments.filter((a) => a.status === "CANCELADO").length;
  const faltas = appointments.filter((a) => a.status === "NAO_COMPARECEU").length;

  // Atendimentos totais: baseados em agendamentos concluídos ou vendas de balcão concluídas
  const totalAtendimentos = Math.max(completedAppointments.length, completedSales.length);

  // 3. Ticket médio (R$ total / quantidade de atendimentos)
  const ticketMedio = totalAtendimentos > 0 ? Number((faturamentoHoje / totalAtendimentos).toFixed(2)) : 0.0;

  // 4. Clientes novos vs recorrentes no dia
  // Um cliente atendido hoje é "recorrente" se já existia visita registrada anterior a hoje
  const servedCustomerIds = new Set<string>();
  for (const a of appointments) {
    if (a.status === "CONCLUIDO" || a.status === "EM_ATENDIMENTO") {
      servedCustomerIds.add(a.customerId);
    }
  }
  for (const s of completedSales) {
    if (s.customerId) {
      servedCustomerIds.add(s.customerId);
    }
  }

  let clientesNovos = 0;
  let clientesRecorrentes = 0;

  for (const custId of servedCustomerIds) {
    if (historicalCustomerIdsWithPriorVisits.has(custId)) {
      clientesRecorrentes++;
    } else {
      clientesNovos++;
    }
  }

  // 5. Taxa de ocupação da agenda
  // Capacidade total de slots no dia = (horas trabalhadas * 60 / intervalo) * número de barbeiros
  const [openH = 0, openM = 0] = businessHours.openTime.split(":").map(Number);
  const [closeH = 0, closeM = 0] = businessHours.closeTime.split(":").map(Number);
  const totalOperatingMinutes = closeH * 60 + closeM - (openH * 60 + openM);
  const slotsPerBarber = Math.max(1, Math.floor(totalOperatingMinutes / businessHours.slotIntervalMinutes));
  const totalAvailableSlots = slotsPerBarber * Math.max(1, businessHours.activeBarbersCount);

  // Slots ocupados (agendamentos não cancelados)
  const activeOccupyingAppointments = appointments.filter(
    (a) => a.status !== "CANCELADO" && a.status !== "NAO_COMPARECEU"
  );
  const occupiedSlots = activeOccupyingAppointments.reduce((sum, a) => {
    const slotsUsed = Math.max(1, Math.ceil(a.serviceDuration / businessHours.slotIntervalMinutes));
    return sum + slotsUsed;
  }, 0);

  const taxaOcupacao = totalAvailableSlots > 0
    ? Number(Math.min(100, (occupiedSlots / totalAvailableSlots) * 100).toFixed(1))
    : 0.0;

  return {
    faturamentoHoje: Number(faturamentoHoje.toFixed(2)),
    totalAtendimentos,
    totalAgendamentos,
    cancelamentos,
    faltas,
    ticketMedio,
    clientesNovos,
    clientesRecorrentes,
    taxaOcupacao,
  };
}

/**
 * Gera alertas inteligentes e determinísticos para a rotina diária da barbearia.
 */
export function computeDashboardAlerts(input: DashboardAlertsInput): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  // Alerta 1: Caixa fechado durante horário de atendimento
  if (!input.isCashOpenToday) {
    alerts.push({
      type: "CAIXA_FECHADO",
      severity: "CRITICAL",
      title: "Caixa Diário Não Aberto",
      message: "O caixa do dia ainda não foi aberto. Realize a abertura para registrar vendas e atendimentos.",
    });
  }

  // Alerta 2: Produtos com estoque crítico
  if (input.lowStockProducts.length > 0) {
    alerts.push({
      type: "ESTOQUE_BAIXO",
      severity: "WARNING",
      title: "Produtos com Estoque Baixo",
      message: `${input.lowStockProducts.length} produto(s) atingiram ou estão abaixo do estoque mínimo.`,
      count: input.lowStockProducts.length,
      items: input.lowStockProducts.map((p) => ({
        id: p.id,
        label: p.name,
        detail: `Atual: ${p.currentStock} / Mínimo: ${p.minStock}`,
      })),
    });
  }

  // Alerta 3: Clientes aguardando atendimento
  if (input.waitingAppointments.length > 0) {
    alerts.push({
      type: "CLIENTES_AGUARDANDO",
      severity: "INFO",
      title: "Clientes Aguardando Atendimento",
      message: `${input.waitingAppointments.length} cliente(s) chegaram e estão aguardando na recepção.`,
      count: input.waitingAppointments.length,
      items: input.waitingAppointments.map((a) => ({
        id: a.id,
        label: a.customerName,
        detail: `${a.serviceName} às ${a.scheduledTime}`,
      })),
    });
  }

  // Alerta 4: Contas a pagar vencidas
  if (input.overduePayables.length > 0) {
    const totalOverdue = input.overduePayables.reduce((acc, p) => acc + p.amount, 0);
    alerts.push({
      type: "CONTAS_VENCIDAS",
      severity: "CRITICAL",
      title: "Contas a Pagar Vencidas",
      message: `${input.overduePayables.length} conta(s) vencida(s) totalizando R$ ${totalOverdue.toFixed(2)}.`,
      count: input.overduePayables.length,
      items: input.overduePayables.map((p) => ({
        id: p.id,
        label: p.description,
        detail: `Vencimento: ${p.dueDate} - R$ ${p.amount.toFixed(2)}`,
      })),
    });
  }

  // Alerta 5: Clientes inativos que precisam de reconquista
  if (input.inactiveCustomers.length > 0) {
    alerts.push({
      type: "CLIENTES_INATIVOS",
      severity: "INFO",
      title: "Clientes Inativos (> 45 dias)",
      message: `${input.inactiveCustomers.length} clientes sem retorno há mais de 45 dias. Excelente oportunidade de contato.`,
      count: input.inactiveCustomers.length,
      items: input.inactiveCustomers.slice(0, 5).map((c) => ({
        id: c.id,
        label: c.name,
        detail: `Última visita: ${c.lastVisitDate} (${c.daysInactive} dias)`,
      })),
    });
  }

  // Alerta 6: Horários ociosos
  if (input.vacantSlotsCount >= 4) {
    alerts.push({
      type: "HORARIOS_OCIOSOS",
      severity: "INFO",
      title: "Horários Ociosos na Agenda",
      message: `Existem ${input.vacantSlotsCount} horários livres disponíveis hoje. Aproveite para encaixar a lista de espera.`,
      count: input.vacantSlotsCount,
    });
  }

  return alerts;
}
