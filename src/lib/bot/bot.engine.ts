// BarberHub Pro ERP - Bot Response Engine (Deterministic & Realtime)
// 100% Determinístico - Sem custos de LLM/IA paga nesta etapa
// Integrado ao Availability Engine, Catálogo de Serviços, Profissionais e Central Omnichannel

import {
  type BotConversation,
  type BotConversationStatus,
  type BotMessage,
  type BotIntent,
  type BotQuickAction,
  type BotBookingState,
  type BotKnowledgeFaq,
} from "./bot.types";

import {
  getUnifiedAvailability,
  toDateStringYYYYMMDD,
  type ServiceDefinition,
  type EmployeeDefinition,
} from "@/lib/appointments/availability.service";

import { type ExistingAppointmentSlot } from "@/lib/appointments/availability.engine";

import type { AttendanceItem } from "@/components/modules/PosCheckoutView";
import { whatsAppVault } from "@/lib/whatsapp/whatsapp-vault.service";

export interface BotEngineContext {
  tenantId?: string | undefined;
  unitId?: string | null | undefined;
  businessSettings: {
    name: string;
    phone: string;
    address: string;
    weekdayOpeningTime?: string | undefined;
    weekdayClosingTime?: string | undefined;
    saturdayOpeningTime?: string | undefined;
    saturdayClosingTime?: string | undefined;
    sundayOpeningTime?: string | undefined;
    sundayClosingTime?: string | undefined;
    intervalMinutes?: number | undefined;
    appointmentBufferMinutes?: number | undefined;
    cancellationGraceMinutes?: number | undefined;
    enableOnlineBooking?: boolean | undefined;
    requirePhoneConfirmation?: boolean | undefined;
  };
  services: Array<{
    id: string;
    name: string;
    price: number;
    duration?: number | string | undefined;
    durationMinutes?: number | undefined;
    category?: string | undefined;
    isActive?: boolean | undefined;
  }>;
  employees: Array<{
    id: string;
    name: string;
    role?: string | undefined;
    position?: string | undefined;
    status?: string | undefined;
    unitId?: string | null | undefined;
  }>;
  attendances?: AttendanceItem[] | undefined;
  loyaltySettings?: {
    pointsPerReal?: number | undefined;
    spendBaseUnit?: number | undefined;
    pointsPerBaseUnit?: number | undefined;
    birthdayBonusActive?: boolean | undefined;
    birthdayBonusPoints?: number | undefined;
    referralActive?: boolean | undefined;
    referralReferrerPoints?: number | undefined;
  } | undefined;
  loyaltyRewards?: Array<{
    id: string;
    title: string;
    pointsCost: number;
    isActive: boolean;
  }> | undefined;
  faqList?: BotKnowledgeFaq[] | undefined;
  authenticatedCustomer?: {
    id: string;
    name: string;
    phone: string;
    points?: number | undefined;
    appointments?: AttendanceItem[] | undefined;
  } | null | undefined;
  humanWorkingHours?: {
    start: string; // "09:00"
    end: string;   // "19:00"
    isWorkday?: boolean | undefined;
  } | undefined;
}

export interface BotProcessResult {
  updatedConversation: BotConversation;
  createdAppointment?: AttendanceItem | null | undefined;
  shouldNotifyAgent?: boolean | undefined;
}

/**
 * Normaliza strings para matching robusto de intenção (sem acentos, minúsculo, sem pontuação extrema)
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Classifica a intenção da mensagem através de heurísticas e padrões determinísticos
 */
export function detectIntent(
  text: string,
  context: BotEngineContext
): {
  intent: BotIntent;
  matchedFaq?: BotKnowledgeFaq | undefined;
  matchedService?: BotEngineContext["services"][0] | undefined;
  matchedEmployee?: BotEngineContext["employees"][0] | undefined;
} {
  const norm = normalizeText(text);

  if (!norm) {
    return { intent: "SAUDACAO" };
  }

  // 1. Pedido explícito de falar com atendente humano
  if (
    norm.includes("atendente") ||
    norm.includes("humano") ||
    norm.includes("recepcionista") ||
    norm.includes("recepcao") ||
    norm.includes("falar com uma pessoa") ||
    norm.includes("falar com alguem") ||
    norm.includes("suporte humano") ||
    norm.includes("pessoa") ||
    norm.includes("atendimento humano")
  ) {
    return { intent: "FALAR_HUMANO" };
  }

  // 2. WhatsApp
  if (
    norm.includes("whatsapp") ||
    norm.includes("prefiro whatsapp") ||
    norm.includes("abrir whatsapp") ||
    norm.includes("zap") ||
    norm.includes("wa.me")
  ) {
    return { intent: "WHATSAPP" };
  }

  // 3. Cancelamento ou remarcação
  if (norm.includes("cancelar") || norm.includes("desmarcar") || norm.includes("cancelamento")) {
    return { intent: "CANCELAR_AGENDAMENTO" };
  }
  if (
    norm.includes("remarcar") ||
    norm.includes("mudar data") ||
    norm.includes("trocar horario") ||
    norm.includes("adiar")
  ) {
    return { intent: "REMARCAR_AGENDAMENTO" };
  }

  // 4. Consulta de agendamento existente
  if (
    norm.includes("consultar") ||
    norm.includes("meu agendamento") ||
    norm.includes("ver agendamento") ||
    norm.includes("meu horario") ||
    norm.includes("minha reserva") ||
    norm.includes("quando e meu")
  ) {
    return { intent: "CONSULTAR_AGENDAMENTO" };
  }

  // 5. Horário de Funcionamento
  if (
    norm.includes("horario de funcionamento") ||
    norm.includes("que horas abre") ||
    norm.includes("que horas fecha") ||
    norm.includes("abrem amanha") ||
    norm.includes("abre amanha") ||
    norm.includes("funciona sabado") ||
    norm.includes("funciona domingo") ||
    norm.includes("horario de atendimento") ||
    norm.includes("esta aberto") ||
    norm.includes("aberto hoje") ||
    norm.includes("funcionamento")
  ) {
    return { intent: "HORARIO_FUNCIONAMENTO" };
  }

  // 6. Endereço / Localização
  if (
    norm.includes("endereco") ||
    norm.includes("onde fica") ||
    norm.includes("localizacao") ||
    norm.includes("como chegar") ||
    norm.includes("qual o endereco") ||
    norm.includes("qual endereco") ||
    norm.includes("qual bairro") ||
    norm.includes("onde voces estao") ||
    norm.includes("rua") ||
    norm.includes("mapa")
  ) {
    return { intent: "ENDERECO" };
  }

  // 7. Planos e Assinaturas
  if (
    norm.includes("plano") ||
    norm.includes("planos") ||
    norm.includes("barber black") ||
    norm.includes("assinatura") ||
    norm.includes("clube") ||
    norm.includes("mensalidade")
  ) {
    return { intent: "PLANOS" };
  }

  // 8. Fidelidade / Pontos / Recompensas
  if (
    norm.includes("quantos pontos") ||
    norm.includes("meu saldo de pontos") ||
    norm.includes("meus pontos") ||
    norm.includes("consultar pontos")
  ) {
    return { intent: "PONTOS" };
  }
  if (
    norm.includes("recompensa") ||
    norm.includes("o que posso trocar") ||
    norm.includes("trocar pontos") ||
    norm.includes("resgatar premio") ||
    norm.includes("catalogo de premios") ||
    norm.includes("premios")
  ) {
    return { intent: "RECOMPENSAS" };
  }
  if (
    norm.includes("fidelidade") ||
    norm.includes("programa de pontos") ||
    norm.includes("como funciona pontos") ||
    norm.includes("acumular pontos") ||
    norm.includes("pontuacao")
  ) {
    return { intent: "FIDELIDADE" };
  }

  // 9. Formas de pagamento
  if (
    norm.includes("forma de pagamento") ||
    norm.includes("formas de pagamento") ||
    norm.includes("aceita cartao") ||
    norm.includes("aceita pix") ||
    norm.includes("parcela") ||
    norm.includes("dinheiro") ||
    norm.includes("pagar no pix")
  ) {
    return { intent: "FORMAS_PAGAMENTO" };
  }

  // 10. Promoções
  if (
    norm.includes("promocao") ||
    norm.includes("promocoes") ||
    norm.includes("desconto") ||
    norm.includes("cupom") ||
    norm.includes("oferta")
  ) {
    return { intent: "PROMOCOES" };
  }

  // 11. Preço de Serviço (verificar se cita um serviço específico)
  const matchedService = context.services.find((s) => {
    const sName = normalizeText(s.name);
    return norm.includes(sName) || (sName.includes("corte") && norm.includes("corte")) || (sName.includes("barba") && norm.includes("barba"));
  });

  if (
    norm.includes("quanto custa") ||
    norm.includes("qual o valor") ||
    norm.includes("preco") ||
    norm.includes("precos") ||
    norm.includes("tabela de preco") ||
    norm.includes("valor do") ||
    norm.includes("quanto e") ||
    (matchedService && (norm.includes("custa") || norm.includes("valor")))
  ) {
    return { intent: "PRECO_SERVICO", matchedService: matchedService || undefined };
  }

  // 12. Profissionais / Barbeiros
  const matchedEmployee = context.employees.find((e) => {
    const empName = normalizeText(e.name);
    const firstName = empName.split(" ")[0] || "";
    return norm.includes(empName) || (firstName.length >= 3 && norm.includes(firstName));
  });

  if (
    norm.includes("profissional") ||
    norm.includes("profissionais") ||
    norm.includes("barbeiro") ||
    norm.includes("barbeiros") ||
    norm.includes("quem atende") ||
    norm.includes("equipe") ||
    (matchedEmployee && !norm.includes("agendar") && !norm.includes("marcar"))
  ) {
    return { intent: "PROFISSIONAIS", matchedEmployee: matchedEmployee || undefined };
  }

  // 13. Lista Geral de Serviços
  if (
    norm.includes("quais servicos") ||
    norm.includes("lista de servicos") ||
    norm.includes("o que voces fazem") ||
    norm.includes("catalogo de servicos") ||
    norm.includes("opcoes de servico") ||
    norm === "servicos"
  ) {
    return { intent: "SERVICOS" };
  }

  // 14. Iniciar Agendamento
  if (
    norm.includes("agendar") ||
    norm.includes("marcar") ||
    norm.includes("reserva") ||
    norm.includes("reservar") ||
    norm.includes("quero cortar") ||
    norm.includes("fazer a barba") ||
    norm.includes("marcar horario") ||
    norm.includes("tem horario") ||
    norm === "agendamento"
  ) {
    return {
      intent: "AGENDAMENTO",
      matchedService: matchedService || undefined,
      matchedEmployee: matchedEmployee || undefined,
    };
  }

  // 15. FAQ / Base de Conhecimento Cadastrada
  if (context.faqList && context.faqList.length > 0) {
    for (const faq of context.faqList) {
      const qNorm = normalizeText(faq.question);
      if (norm.includes(qNorm) || qNorm.includes(norm)) {
        return { intent: "DESCONHECIDO", matchedFaq: faq };
      }
      for (const kw of faq.keywords) {
        const kwNorm = normalizeText(kw);
        if (kwNorm && norm.includes(kwNorm)) {
          return { intent: "DESCONHECIDO", matchedFaq: faq };
        }
      }
    }
  }

  // 16. Despedida / Agradecimento
  if (
    norm.includes("obrigado") ||
    norm.includes("obrigada") ||
    norm.includes("valeu") ||
    norm.includes("tchau") ||
    norm.includes("ate mais") ||
    norm.includes("flw") ||
    norm.includes("falou") ||
    norm.includes("agradecido") ||
    norm.includes("show")
  ) {
    return { intent: "DESPEDIDA" };
  }

  // 17. Saudação Inicial
  if (
    norm.includes("ola") ||
    norm.includes("olá") ||
    norm === "oi" ||
    norm.startsWith("oi ") ||
    norm.includes("bom dia") ||
    norm.includes("boa tarde") ||
    norm.includes("boa noite") ||
    norm.includes("opa") ||
    norm.includes("e ai") ||
    norm.includes("salve") ||
    norm.includes("hey") ||
    norm.includes("hello")
  ) {
    return { intent: "SAUDACAO" };
  }

  return { intent: "DESCONHECIDO" };
}

/**
 * Gera mensagem formatada e opções para o fluxo de resposta automática do Bot
 */
export function processBotMessage(
  incomingText: string,
  conversation: BotConversation,
  context: BotEngineContext,
  quickAction?: BotQuickAction
): BotProcessResult {
  const now = new Date();
  const currentTimeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const timeMs = now.getTime();

  // CLÁUSULA PÉTREA DE PROTEÇÃO:
  // Se o atendimento está com humano (EM_ATENDIMENTO ou AGUARDANDO_HUMANO), o BOT JAMAIS GERA RESPOSTA!
  if (conversation.status === "EM_ATENDIMENTO" || conversation.status === "AGUARDANDO_HUMANO") {
    // Se a mensagem veio do cliente, apenas adiciona ao histórico da conversa para o atendente ler
    if (incomingText) {
      const clientMsg: BotMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: "CLIENT",
        text: incomingText,
        time: currentTimeStr,
        timestamp: timeMs,
      };

      const updated: BotConversation = {
        ...conversation,
        lastMessage: incomingText,
        lastTime: currentTimeStr,
        lastTimestamp: timeMs,
        unreadByAgent: true,
        messages: [...conversation.messages, clientMsg],
      };

      return {
        updatedConversation: updated,
        createdAppointment: null,
        shouldNotifyAgent: true,
      };
    }
    return { updatedConversation: conversation, createdAppointment: null };
  }

  // Adicionar mensagem enviada pelo visitante ao histórico
  const updatedMessages = [...conversation.messages];
  if (incomingText && (!quickAction || incomingText !== quickAction.label)) {
    updatedMessages.push({
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: "CLIENT",
      text: incomingText,
      time: currentTimeStr,
      timestamp: timeMs,
    });
  } else if (quickAction) {
    updatedMessages.push({
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: "CLIENT",
      text: quickAction.label,
      time: currentTimeStr,
      timestamp: timeMs,
    });
  }

  // -------------------------------------------------------------
  // TRATAMENTO DO FLUXO DE AGENDAMENTO VIA CHAT (State Machine)
  // -------------------------------------------------------------
  let bookingState: BotBookingState = conversation.bookingState ? { ...conversation.bookingState } : {};
  let createdAppointment: AttendanceItem | null = null;

  // Se houver uma ação rápida de agendamento em andamento
  if (quickAction?.action === "SELECT_SERVICE" && quickAction.payload?.serviceId) {
    const srv = context.services.find((s) => s.id === quickAction.payload.serviceId);
    if (srv) {
      bookingState.serviceId = srv.id;
      bookingState.serviceName = srv.name;
      bookingState.servicePrice = srv.price;

      const activeBarbers = context.employees.filter((e) => {
        const isBarber = e.role === "BARBEIRO" || e.position === "BARBEIRO";
        const isActive = e.status === "ACTIVE" || !e.status;
        const isSameUnit = !context.unitId || !e.unitId || e.unitId === context.unitId;
        return isBarber && isActive && isSameUnit;
      });

      const barberActions: BotQuickAction[] = [
        {
          id: "act-barber-any",
          label: "⭐ Qualquer Barbeiro (Sem Preferência)",
          action: "SELECT_BARBER",
          payload: { employeeId: "ANY", barberName: "Qualquer Barbeiro" },
          variant: "primary",
        },
        ...activeBarbers.map((b) => ({
          id: `act-barber-${b.id}`,
          label: `🧔 ${b.name}`,
          action: "SELECT_BARBER",
          payload: { employeeId: b.id, barberName: b.name },
          variant: "outline" as const,
        })),
      ];

      const botReply: BotMessage = {
        id: `bot-${Date.now()}`,
        sender: "BOT",
        text: `Excelente escolha: **${srv.name}** (R$ ${srv.price.toFixed(2)}).\nVocê tem preferência por algum profissional?`,
        time: currentTimeStr,
        timestamp: timeMs + 10,
        bookingStep: "SELECT_BARBER",
        bookingData: bookingState,
        quickActions: barberActions,
      };

      return {
        updatedConversation: {
          ...conversation,
          bookingState,
          lastMessage: botReply.text,
          lastTime: currentTimeStr,
          lastTimestamp: timeMs,
          messages: [...updatedMessages, botReply],
        },
        createdAppointment: null,
      };
    }
  }

  if (quickAction?.action === "SELECT_BARBER") {
    bookingState.employeeId = quickAction.payload.employeeId;
    bookingState.barberName = quickAction.payload.barberName;

    // Gerar opções de datas rápidas: Hoje, Amanhã, Depois de amanhã
    const today = new Date();
    const d1 = new Date(today);
    d1.setDate(d1.getDate() + 1);
    const d2 = new Date(today);
    d2.setDate(d2.getDate() + 2);

    const dateActions: BotQuickAction[] = [
      {
        id: "act-date-today",
        label: `Hoje (${today.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })})`,
        action: "SELECT_DATE",
        payload: { dateStr: toDateStringYYYYMMDD(today) },
      },
      {
        id: "act-date-tomorrow",
        label: `Amanhã (${d1.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })})`,
        action: "SELECT_DATE",
        payload: { dateStr: toDateStringYYYYMMDD(d1) },
      },
      {
        id: "act-date-d2",
        label: `${d2.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}`,
        action: "SELECT_DATE",
        payload: { dateStr: toDateStringYYYYMMDD(d2) },
      },
    ];

    const botReply: BotMessage = {
      id: `bot-${Date.now()}`,
      sender: "BOT",
      text: `Perfeito! Atendimento com **${bookingState.barberName}**.\nPara qual dia você gostaria de agendar?`,
      time: currentTimeStr,
      timestamp: timeMs + 10,
      bookingStep: "SELECT_DATE",
      bookingData: bookingState,
      quickActions: dateActions,
    };

    return {
      updatedConversation: {
        ...conversation,
        bookingState,
        lastMessage: botReply.text,
        lastTime: currentTimeStr,
        lastTimestamp: timeMs,
        messages: [...updatedMessages, botReply],
      },
      createdAppointment: null,
    };
  }

  if (quickAction?.action === "SELECT_DATE" && quickAction.payload?.dateStr) {
    bookingState.dateStr = quickAction.payload.dateStr;

    // CONSULTAR DISPONIBILIDADE REAL NO AVAILABILITY ENGINE
    const mappedApts: ExistingAppointmentSlot[] = (context.attendances || []).map((apt) => {
      const parts = (apt.time || "09:00").split(":");
      const hStr = parts[0] || "09";
      const mStr = parts[1] || "00";
      const start = new Date(`${bookingState.dateStr || "2026-10-01"}T${hStr.padStart(2, "0")}:${mStr.padStart(2, "0")}:00`);
      const end = new Date(start.getTime() + 30 * 60000);
      return {
        id: apt.id,
        professionalId: apt.employeeId || "barber-1",
        professionalName: apt.barberName,
        startTime: start,
        endTime: end,
        status: (apt.status === "AGENDADO" || apt.status === "CONFIRMADO") ? "CONFIRMED" : "SCHEDULED",
      };
    });

    const servDefs: ServiceDefinition[] = context.services.map((s) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      duration: s.duration,
      durationMinutes: s.durationMinutes,
      isActive: s.isActive !== false,
    }));

    const empDefs: EmployeeDefinition[] = context.employees.map((e) => ({
      id: e.id,
      name: e.name,
      role: e.role,
      position: e.position,
      status: e.status,
      unitId: e.unitId,
    }));

    const targetDateStr = bookingState.dateStr || toDateStringYYYYMMDD(new Date());

    const availResult = getUnifiedAvailability({
      tenantId: context.tenantId || "tenant-default",
      unitId: context.unitId,
      serviceId: bookingState.serviceId || context.services[0]?.id || "s1",
      date: targetDateStr,
      preferredBarberId: bookingState.employeeId === "ANY" ? null : bookingState.employeeId,
      services: servDefs,
      employees: empDefs,
      businessSettings: {
        weekdayOpeningTime: context.businessSettings.weekdayOpeningTime || "09:00",
        weekdayClosingTime: context.businessSettings.weekdayClosingTime || "19:00",
        intervalMinutes: context.businessSettings.intervalMinutes || 30,
        appointmentBufferMinutes: context.businessSettings.appointmentBufferMinutes || 0,
        enableOnlineBooking: true,
      },
      existingAppointments: mappedApts,
      minAdvanceMinutes: 0,
      now: new Date(),
    });

    if (!availResult.hasAvailableSlots || availResult.slots.length === 0) {
      // Carlos/Barbeiro não tem horário
      const barberName = bookingState.barberName || "O profissional";
      const failActions: BotQuickAction[] = [
        {
          id: "act-retry-date",
          label: "📅 Escolher Outro Dia",
          action: "SELECT_BARBER",
          payload: { employeeId: bookingState.employeeId, barberName: bookingState.barberName },
        },
        {
          id: "act-retry-any-barber",
          label: "⭐ Ver Qualquer Barbeiro",
          action: "SELECT_BARBER",
          payload: { employeeId: "ANY", barberName: "Qualquer Barbeiro" },
          variant: "primary",
        },
        {
          id: "act-human-help",
          label: "👤 Falar com Atendente Aqui",
          action: "REQUEST_HUMAN",
        },
      ];

      const botReply: BotMessage = {
        id: `bot-${Date.now()}`,
        sender: "BOT",
        text: `${barberName} não possui horários disponíveis para esta data.\nPosso verificar outro dia ou outro barbeiro para você?`,
        time: currentTimeStr,
        timestamp: timeMs + 10,
        quickActions: failActions,
      };

      return {
        updatedConversation: {
          ...conversation,
          bookingState,
          lastMessage: botReply.text,
          lastTime: currentTimeStr,
          lastTimestamp: timeMs,
          messages: [...updatedMessages, botReply],
        },
        createdAppointment: null,
      };
    }

    // Apresentar até os 6 primeiros horários livres
    const topSlots = availResult.slots.slice(0, 6);
    const slotActions: BotQuickAction[] = topSlots.map((slot) => ({
      id: `act-slot-${slot.formattedTime.replace(":", "")}`,
      label: `⏰ ${slot.formattedTime}`,
      action: "SELECT_TIME",
      payload: {
        timeSlot: slot.formattedTime,
        assignedBarber: slot.eligibleBarbers[0]?.name || bookingState.barberName,
        assignedBarberId: slot.eligibleBarbers[0]?.id || bookingState.employeeId,
      },
    }));

    const dateFormatted = new Date(`${bookingState.dateStr}T12:00:00`).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
    });

    const botReply: BotMessage = {
      id: `bot-${Date.now()}`,
      sender: "BOT",
      text: `Encontrei os seguintes horários disponíveis para **${dateFormatted}**:\nEscolha o melhor horário para você:`,
      time: currentTimeStr,
      timestamp: timeMs + 10,
      bookingStep: "SELECT_TIME",
      bookingData: bookingState,
      quickActions: slotActions,
    };

    return {
      updatedConversation: {
        ...conversation,
        bookingState,
        lastMessage: botReply.text,
        lastTime: currentTimeStr,
        lastTimestamp: timeMs,
        messages: [...updatedMessages, botReply],
      },
      createdAppointment: null,
    };
  }

  if (quickAction?.action === "SELECT_TIME" && quickAction.payload?.timeSlot) {
    bookingState.timeSlot = quickAction.payload.timeSlot;
    if (quickAction.payload.assignedBarber && (!bookingState.barberName || bookingState.employeeId === "ANY")) {
      bookingState.barberName = quickAction.payload.assignedBarber;
      bookingState.employeeId = quickAction.payload.assignedBarberId || bookingState.employeeId;
    }

    // Se o cliente já estiver autenticado ou já identificou nome e telefone na conversa
    const customerName = context.authenticatedCustomer?.name || conversation.customerName || "Cliente";
    const customerPhone = context.authenticatedCustomer?.phone || conversation.customerPhone || "";

    bookingState.customerName = customerName;
    bookingState.customerPhone = customerPhone;

    // Resumo de Confirmação (Section 22)
    const dateFormatted = new Date(`${bookingState.dateStr}T12:00:00`).toLocaleDateString("pt-BR");
    const summaryCard = {
      service: bookingState.serviceName,
      barber: bookingState.barberName,
      date: dateFormatted,
      time: bookingState.timeSlot,
      price: `R$ ${(bookingState.servicePrice || 0).toFixed(2)}`,
    };

    const confirmActions: BotQuickAction[] = [
      {
        id: "act-confirm-booking",
        label: "✅ CONFIRMAR AGENDAMENTO",
        action: "CONFIRM_BOOKING",
        payload: { ...bookingState },
        variant: "primary",
      },
      {
        id: "act-cancel-booking",
        label: "❌ Cancelar",
        action: "CANCEL_FLOW",
        variant: "outline",
      },
    ];

    const botReply: BotMessage = {
      id: `bot-${Date.now()}`,
      sender: "BOT",
      text: `📋 **CONFIRME SEU AGENDAMENTO**:\n\n• **Serviço**: ${summaryCard.service}\n• **Profissional**: ${summaryCard.barber}\n• **Data**: ${summaryCard.date}\n• **Horário**: ${summaryCard.time}\n• **Valor**: ${summaryCard.price}\n\nDeseja confirmar a reserva?`,
      time: currentTimeStr,
      timestamp: timeMs + 10,
      bookingStep: "CONFIRM",
      bookingData: bookingState,
      cardData: summaryCard,
      quickActions: confirmActions,
    };

    return {
      updatedConversation: {
        ...conversation,
        bookingState,
        lastMessage: botReply.text,
        lastTime: currentTimeStr,
        lastTimestamp: timeMs,
        messages: [...updatedMessages, botReply],
      },
      createdAppointment: null,
    };
  }

  if (quickAction?.action === "CONFIRM_BOOKING") {
    // CRIAR AGENDAMENTO REAL (Section 23)
    const code = `#BH-BOT-${Date.now().toString().slice(-5)}`;
    const barber =
      context.employees.find((e) => e.id === bookingState.employeeId) ||
      context.employees.find((e) => e.name === bookingState.barberName) ||
      context.employees[0] || { id: "barber-1", name: "Gabriel Silva" };

    const service =
      context.services.find((s) => s.id === bookingState.serviceId) ||
      context.services[0] || { id: "s1", name: "Corte Tradicional", price: 50 };

    createdAppointment = {
      id: `apt-bot-${Date.now()}`,
      code,
      time: bookingState.timeSlot || "14:00",
      customerName: bookingState.customerName || conversation.customerName || "Cliente Web",
      customerPhone: bookingState.customerPhone || conversation.customerPhone || "(11) 98888-0000",
      customerId: conversation.customerId || context.authenticatedCustomer?.id,
      barberName: barber.name,
      employeeId: barber.id,
      origin: "BOT", // Origem rastreável
      status: "AGENDADO",
      services: [{ id: service.id, name: service.name, price: service.price }],
      products: [],
      discount: 0,
      total: service.price,
    };

    const dateFormatted = new Date(`${bookingState.dateStr}T12:00:00`).toLocaleDateString("pt-BR");
    const botReply: BotMessage = {
      id: `bot-${Date.now()}`,
      sender: "BOT",
      text: `🎉 **Agendamento Confirmado com Sucesso!**\n\n• **Código**: \`${code}\`\n• **Profissional**: ${barber.name}\n• **Data & Hora**: ${dateFormatted} às ${bookingState.timeSlot}\n• **Serviço**: ${service.name} (R$ ${service.price.toFixed(2)})\n\nJá registramos na nossa agenda! Caso precise alterar ou tirar dúvidas, estou por aqui.`,
      time: currentTimeStr,
      timestamp: timeMs + 10,
      bookingStep: "COMPLETED",
      bookingData: { ...bookingState },
      quickActions: [
        { id: "act-new-query", label: "💬 Fazer outra pergunta", action: "RESET_MENU" },
        { id: "act-whatsapp-ext", label: "🟢 Prefiro WhatsApp", action: "OPEN_WHATSAPP", variant: "whatsapp" },
      ],
    };

    return {
      updatedConversation: {
        ...conversation,
        bookingState: undefined,
        lastMessage: botReply.text,
        lastTime: currentTimeStr,
        lastTimestamp: timeMs,
        messages: [...updatedMessages, botReply],
      },
      createdAppointment,
    };
  }

  if (quickAction?.action === "CANCEL_FLOW") {
    const botReply: BotMessage = {
      id: `bot-${Date.now()}`,
      sender: "BOT",
      text: "Agendamento cancelado. Como mais posso te ajudar?",
      time: currentTimeStr,
      timestamp: timeMs + 10,
      bookingStep: undefined,
      bookingData: undefined,
      quickActions: [
        { id: "act-sched", label: "📅 Agendar Horário", action: "START_BOOKING", variant: "primary" },
        { id: "act-prices", label: "✂️ Serviços & Preços", action: "TRIGGER_INTENT", payload: "SERVICOS" },
        { id: "act-human", label: "👤 Falar com Atendente Aqui", action: "REQUEST_HUMAN" },
      ],
    };

    return {
      updatedConversation: {
        ...conversation,
        bookingState: undefined,
        lastMessage: botReply.text,
        lastTime: currentTimeStr,
        lastTimestamp: timeMs,
        messages: [...updatedMessages, botReply],
      },
      createdAppointment: null,
    };
  }

  // -------------------------------------------------------------
  // TRATAMENTO DE AÇÃO RÁPIDA: SOLICITAR ATENDIMENTO HUMANO
  // -------------------------------------------------------------
  if (quickAction?.action === "REQUEST_HUMAN") {
    const isHumanOnline = checkHumanTeamAvailability(context.humanWorkingHours);
    let replyText =
      "Pronto! Encaminhei sua conversa para nossa equipe da recepção.\nAssim que um atendente estiver disponível, ele continuará o atendimento diretamente por aqui.";

    if (!isHumanOnline) {
      replyText =
        "Nosso atendimento humano está offline neste momento fora do horário comercial.\nSua mensagem ficará registrada na Central e nossa equipe responderá assim que retornar. Se for urgente, você também pode nos contatar pelo WhatsApp:";
    }

    const botReply: BotMessage = {
      id: `bot-${Date.now()}`,
      sender: "BOT",
      text: replyText,
      time: currentTimeStr,
      timestamp: timeMs + 10,
      quickActions: [
        { id: "act-wa-fallback", label: "🟢 Abrir WhatsApp", action: "OPEN_WHATSAPP", variant: "whatsapp" },
      ],
    };

    return {
      updatedConversation: {
        ...conversation,
        status: "AGUARDANDO_HUMANO",
        lastMessage: botReply.text,
        lastTime: currentTimeStr,
        lastTimestamp: timeMs,
        unreadByAgent: true,
        consecutiveFailures: 0,
        messages: [...updatedMessages, botReply],
      },
      createdAppointment: null,
      shouldNotifyAgent: true,
    };
  }

  // Se clicou em WhatsApp
  if (quickAction?.action === "OPEN_WHATSAPP") {
    const tenantId = context.tenantId || "tenant-matriz";
    const directPhone = whatsAppVault.getDirectWhatsAppNumber(tenantId);

    const botReply: BotMessage =
      directPhone
        ? {
            id: `bot-${Date.now()}`,
            sender: "BOT",
            text: `Você pode falar diretamente com nossa equipe no WhatsApp oficial clicando abaixo:\n\n👉 [Abrir WhatsApp](https://wa.me/${directPhone}?text=Olá!%20Vim%20pelo%20site%20da%20barbearia)`,
            time: currentTimeStr,
            timestamp: timeMs + 10,
            quickActions: [
              { id: "act-human-here", label: "👤 Falar com Atendente Aqui", action: "REQUEST_HUMAN" },
              { id: "act-back-menu", label: "📅 Agendar Horário", action: "START_BOOKING", variant: "primary" },
            ],
          }
        : {
            id: `bot-${Date.now()}`,
            sender: "BOT",
            text: `Nosso canal de atendimento via WhatsApp oficial está temporariamente indisponível no momento. Você pode continuar seu atendimento por aqui mesmo com nosso assistente ou equipe! 😊`,
            time: currentTimeStr,
            timestamp: timeMs + 10,
            quickActions: [
              { id: "act-human-here", label: "👤 Falar com Atendente Aqui", action: "REQUEST_HUMAN" },
              { id: "act-back-menu", label: "📅 Agendar Horário", action: "START_BOOKING", variant: "primary" },
            ],
          };

    return {
      updatedConversation: {
        ...conversation,
        lastMessage: botReply.text,
        lastTime: currentTimeStr,
        lastTimestamp: timeMs,
        messages: [...updatedMessages, botReply],
      },
      createdAppointment: null,
    };
  }

  // Se clicou em Iniciar Agendamento
  if (quickAction?.action === "START_BOOKING") {
    const botReply: BotMessage = {
      id: `bot-${Date.now()}`,
      sender: "BOT",
      text: "Claro! Vamos agendar seu atendimento. Qual serviço você gostaria de realizar?",
      time: currentTimeStr,
      timestamp: timeMs + 10,
      bookingStep: "SELECT_SERVICE",
      quickActions: context.services.slice(0, 4).map((s) => ({
        id: `act-srv-${s.id}`,
        label: `✂️ ${s.name} (R$ ${s.price})`,
        action: "SELECT_SERVICE",
        payload: { serviceId: s.id },
        variant: "outline" as const,
      })),
    };

    return {
      updatedConversation: {
        ...conversation,
        lastMessage: botReply.text,
        lastTime: currentTimeStr,
        lastTimestamp: timeMs,
        messages: [...updatedMessages, botReply],
      },
      createdAppointment: null,
    };
  }

  // -------------------------------------------------------------
  // CLASSIFICAÇÃO DETERMINÍSTICA DE INTENÇÃO VIA TEXTO LIVRE
  // -------------------------------------------------------------
  const classification = detectIntent(incomingText, context);
  const { intent, matchedService, matchedEmployee, matchedFaq } = classification;

  let botText = "";
  let actions: BotQuickAction[] | undefined = undefined;
  let newStatus: BotConversationStatus = conversation.status;
  let newConsecutiveFailures = conversation.consecutiveFailures || 0;
  let shouldNotify = false;

  switch (intent) {
    case "SAUDACAO": {
      newConsecutiveFailures = 0;
      botText = `Olá! 👋 Sou o Assistente BarberHub da **${context.businessSettings.name}**.\n\nPosso te ajudar com agendamentos, serviços, valores, horários e planos da barbearia.\nComo posso te ajudar hoje?`;
      actions = [
        { id: "act-sched", label: "📅 Agendar Horário", action: "START_BOOKING", variant: "primary" },
        { id: "act-check", label: "🔎 Consultar Agendamento", action: "TRIGGER_INTENT", payload: "CONSULTAR_AGENDAMENTO" },
        { id: "act-human", label: "👤 Falar com Atendente Aqui", action: "REQUEST_HUMAN" },
        { id: "act-wa", label: "🟢 Prefiro WhatsApp", action: "OPEN_WHATSAPP", variant: "whatsapp" },
      ];
      break;
    }

    case "AGENDAMENTO": {
      newConsecutiveFailures = 0;
      if (context.services.length === 0) {
        botText = "No momento não temos serviços cadastrados disponíveis para agendamento online.";
      } else {
        botText = "Claro! Vamos agendar seu atendimento. Qual serviço você gostaria de realizar?";
        actions = context.services.slice(0, 4).map((s) => ({
          id: `act-srv-${s.id}`,
          label: `✂️ ${s.name} (R$ ${s.price})`,
          action: "SELECT_SERVICE",
          payload: { serviceId: s.id },
          variant: "outline" as const,
        }));
      }
      break;
    }

    case "PRECO_SERVICO": {
      newConsecutiveFailures = 0;
      if (matchedService) {
        const dur = matchedService.durationMinutes || matchedService.duration || 30;
        botText = `O **${matchedService.name}** custa **R$ ${matchedService.price.toFixed(2)}** e tem duração aproximada de **${dur} minutos**.\n\nGostaria de agendar este serviço?`;
        actions = [
          {
            id: `act-book-${matchedService.id}`,
            label: `📅 Agendar ${matchedService.name}`,
            action: "SELECT_SERVICE",
            payload: { serviceId: matchedService.id },
            variant: "primary",
          },
          { id: "act-see-all", label: "✂️ Ver Outros Serviços", action: "TRIGGER_INTENT", payload: "SERVICOS" },
        ];
      } else {
        const listStr = context.services
          .slice(0, 5)
          .map((s) => `• **${s.name}**: R$ ${s.price.toFixed(2)} (~${s.durationMinutes || 30} min)`)
          .join("\n");
        botText = `Confira a tabela de preços dos nossos principais serviços:\n\n${listStr}\n\nDeseja agendar algum deles?`;
        actions = [
          { id: "act-sched", label: "📅 Agendar um Horário", action: "START_BOOKING", variant: "primary" },
          { id: "act-human", label: "👤 Falar com Atendente", action: "REQUEST_HUMAN" },
        ];
      }
      break;
    }

    case "HORARIO_FUNCIONAMENTO": {
      newConsecutiveFailures = 0;
      const weekOpen = context.businessSettings.weekdayOpeningTime || "09:00";
      const weekClose = context.businessSettings.weekdayClosingTime || "19:00";
      const satOpen = context.businessSettings.saturdayOpeningTime || "08:30";
      const satClose = context.businessSettings.saturdayClosingTime || "18:00";
      const sunOpen = context.businessSettings.sundayOpeningTime;
      const sunClose = context.businessSettings.sundayClosingTime;

      let sunText = "• **Domingos**: Fechado";
      if (sunOpen && sunClose) {
        sunText = `• **Domingos**: ${sunOpen} às ${sunClose}`;
      }

      botText = `Nosso horário de funcionamento na unidade **${context.businessSettings.name}** é:\n\n• **Segunda a Sexta**: ${weekOpen} às ${weekClose}\n• **Sábados**: ${satOpen} às ${satClose}\n${sunText}\n\nPodemos marcar um horário para você?`;
      actions = [
        { id: "act-sched", label: "📅 Ver Horários Livres", action: "START_BOOKING", variant: "primary" },
        { id: "act-loc", label: "📍 Onde Fica?", action: "TRIGGER_INTENT", payload: "ENDERECO" },
      ];
      break;
    }

    case "ENDERECO": {
      newConsecutiveFailures = 0;
      const addr = context.businessSettings.address || "Endereço cadastrado na unidade central";
      botText = `📍 Nosso endereço é:\n**${addr}**\n\nFácil acesso e com estacionamento nas proximidades. Venha nos visitar!`;
      actions = [
        { id: "act-sched", label: "📅 Agendar Horário", action: "START_BOOKING", variant: "primary" },
        { id: "act-hours", label: "⏰ Horário de Funcionamento", action: "TRIGGER_INTENT", payload: "HORARIO_FUNCIONAMENTO" },
      ];
      break;
    }

    case "SERVICOS": {
      newConsecutiveFailures = 0;
      if (context.services.length === 0) {
        botText = "No momento não temos serviços ativos cadastrados.";
      } else {
        const topSrv = context.services.slice(0, 5);
        const srvLines = topSrv.map((s) => `• ✂️ **${s.name}** — R$ ${s.price.toFixed(2)}`).join("\n");
        botText = `Temos os seguintes serviços disponíveis:\n\n${srvLines}\n\nQuer agendar algum deles agora?`;
        actions = topSrv.slice(0, 3).map((s) => ({
          id: `act-srv-${s.id}`,
          label: s.name,
          action: "SELECT_SERVICE",
          payload: { serviceId: s.id },
        }));
      }
      break;
    }

    case "PROFISSIONAIS": {
      newConsecutiveFailures = 0;
      const barbers = context.employees.filter((e) => e.role === "BARBEIRO" || e.position === "BARBEIRO");
      if (barbers.length === 0) {
        botText = "Nossa equipe conta com profissionais altamente qualificados prontos para te atender.";
      } else {
        const names = barbers.map((b) => `• 🧔 **${b.name}**`).join("\n");
        botText = `Nossa equipe de especialistas conta com:\n\n${names}\n\nVocê pode escolher seu profissional preferido ou deixar que o sistema selecione o mais disponível.`;
        actions = [
          { id: "act-sched", label: "📅 Agendar com a Equipe", action: "START_BOOKING", variant: "primary" },
        ];
      }
      break;
    }

    case "PLANOS": {
      newConsecutiveFailures = 0;
      botText = `Conheça nosso clube de assinaturas **Barber Black**:\n\n• Cortes ilimitados ou com descontos progressivos;\n• Atendimento prioritário sem fila;\n• 10% de cashback em produtos de estética;\n• Bebida de cortesia a cada visita.\n\nQuer assinar ou tirar dúvidas com a gerência?`;
      actions = [
        { id: "act-human-plan", label: "👤 Tirar Dúvidas com Atendente", action: "REQUEST_HUMAN", variant: "primary" },
        { id: "act-sched", label: "📅 Agendar Horário Avulso", action: "START_BOOKING" },
      ];
      break;
    }

    case "FIDELIDADE": {
      newConsecutiveFailures = 0;
      const pts = context.loyaltySettings?.pointsPerReal || 1;
      botText = `✨ **Programa de Fidelidade BarberHub**:\n\nA cada **R$ 1,00** em serviços e produtos elegíveis, você ganha **${pts} ponto(s)**!\nAcumulando pontos, você pode resgatar cortes, barba e produtos exclusivos da barbearia.`;
      actions = [
        { id: "act-rewards", label: "🎁 O que posso trocar?", action: "TRIGGER_INTENT", payload: "RECOMPENSAS" },
        { id: "act-my-pts", label: "⭐ Quantos pontos tenho?", action: "TRIGGER_INTENT", payload: "PONTOS" },
      ];
      break;
    }

    case "PONTOS": {
      // PROTEÇÃO DE PRIVACIDADE E DADOS (Section 28, 50)
      if (context.authenticatedCustomer) {
        newConsecutiveFailures = 0;
        const pts = context.authenticatedCustomer.points || 0;
        botText = `Olá, **${context.authenticatedCustomer.name}**! Você possui **${pts} pontos** acumulados no seu saldo de fidelidade.`;
        actions = [
          { id: "act-rewards", label: "🎁 Ver Recompensas Disponíveis", action: "TRIGGER_INTENT", payload: "RECOMPENSAS" },
          { id: "act-sched", label: "📅 Agendar Horário", action: "START_BOOKING" },
        ];
      } else {
        newConsecutiveFailures = 0;
        botText = `🔒 Por motivos de privacidade e proteção de dados (LGPD), o saldo de fidelidade só pode ser consultado por clientes identificados.\n\nVocê pode acessar o **Portal do Cliente** com seu celular ou falar com nossa equipe para consultar.`;
        actions = [
          { id: "act-human", label: "👤 Falar com Atendente Aqui", action: "REQUEST_HUMAN" },
          { id: "act-sched", label: "📅 Agendar Horário", action: "START_BOOKING" },
        ];
      }
      break;
    }

    case "RECOMPENSAS": {
      newConsecutiveFailures = 0;
      const activeRewards = (context.loyaltyRewards || []).filter((r) => r.isActive);
      if (activeRewards.length === 0) {
        botText = "🎁 Nosso catálogo de recompensas inclui: Cortes Cortesia, Pomadas Modeladoras e Bebidas Premium. Consulte no balcão no seu próximo atendimento!";
      } else {
        const rewList = activeRewards
          .slice(0, 4)
          .map((r) => `• 🎁 **${r.title}** — ${r.pointsCost} pontos`)
          .join("\n");
        botText = `Confira algumas recompensas que você pode resgatar com seus pontos:\n\n${rewList}`;
      }
      actions = [
        { id: "act-my-pts", label: "⭐ Meu Saldo de Pontos", action: "TRIGGER_INTENT", payload: "PONTOS" },
        { id: "act-sched", label: "📅 Agendar Horário", action: "START_BOOKING", variant: "primary" },
      ];
      break;
    }

    case "CONSULTAR_AGENDAMENTO": {
      // PROTEÇÃO DE PRIVACIDADE (Section 24, 25)
      const aptList = context.authenticatedCustomer?.appointments;
      if (context.authenticatedCustomer && aptList && aptList.length > 0 && aptList[0]) {
        newConsecutiveFailures = 0;
        const upcoming = aptList[0];
        botText = `Você possui um agendamento marcado:\n\n• **Código**: \`${upcoming.code}\`\n• **Horário**: ${upcoming.time}\n• **Barbeiro**: ${upcoming.barberName}\n• **Status**: ${upcoming.status}`;
        actions = [
          { id: "act-sched-new", label: "📅 Agendar Novo Horário", action: "START_BOOKING" },
          { id: "act-human", label: "👤 Falar com Atendente", action: "REQUEST_HUMAN" },
        ];
      } else {
        newConsecutiveFailures = 0;
        botText = `🔒 Para consultar seu agendamento com segurança, por favor acerte sua identificação pelo Portal do Cliente ou solicite o suporte da nossa recepção:`;
        actions = [
          { id: "act-human", label: "👤 Consultar com Atendente Aqui", action: "REQUEST_HUMAN", variant: "primary" },
          { id: "act-wa", label: "🟢 Consultar no WhatsApp", action: "OPEN_WHATSAPP", variant: "whatsapp" },
        ];
      }
      break;
    }

    case "FORMAS_PAGAMENTO": {
      newConsecutiveFailures = 0;
      botText = `Aceitamos as seguintes formas de pagamento:\n\n• 📱 **PIX** (Instantâneo com QR Code);\n• 💳 **Cartão de Crédito** e **Débito** (Todas as bandeiras);\n• 💵 **Dinheiro** em espécie.`;
      actions = [
        { id: "act-sched", label: "📅 Agendar Horário", action: "START_BOOKING", variant: "primary" },
      ];
      break;
    }

    case "PROMOCOES": {
      newConsecutiveFailures = 0;
      botText = `🎉 Nossas promoções ativas:\n• **Combo Barba + Cabelo**: Valor promocional especial;\n• **Indique um Amigo**: Ganhe 100 pontos de fidelidade na primeira visita do seu amigo!`;
      actions = [
        { id: "act-sched", label: "📅 Aproveitar Promoção", action: "START_BOOKING", variant: "primary" },
      ];
      break;
    }

    case "FALAR_HUMANO": {
      // Handoff direto
      newStatus = "AGUARDANDO_HUMANO";
      shouldNotify = true;
      newConsecutiveFailures = 0;
      botText = `Pronto! Encaminhei sua conversa para nossa equipe da recepção.\nAssim que um atendente estiver disponível, ele continuará o atendimento por aqui. 💬`;
      const tenantId = context.tenantId || "tenant-matriz";
      const directPhone = whatsAppVault.getDirectWhatsAppNumber(tenantId);
      actions = directPhone
        ? [{ id: "act-wa-alt", label: "🟢 Prefiro WhatsApp", action: "OPEN_WHATSAPP", variant: "whatsapp" }]
        : [];
      break;
    }

    case "WHATSAPP": {
      newConsecutiveFailures = 0;
      const tenantId = context.tenantId || "tenant-matriz";
      const directPhone = whatsAppVault.getDirectWhatsAppNumber(tenantId);

      if (directPhone) {
        botText = `Você pode falar diretamente com nossa equipe no WhatsApp oficial clicando abaixo:\n\n👉 [Abrir WhatsApp](https://wa.me/${directPhone}?text=Olá!%20Vim%20pelo%20site%20da%20barbearia)`;
      } else {
        botText = `Nosso canal de atendimento via WhatsApp oficial está temporariamente indisponível. Você pode continuar tirando dúvidas e agendando por aqui mesmo!`;
      }
      actions = [
        { id: "act-human-here", label: "👤 Falar com Atendente Aqui", action: "REQUEST_HUMAN" },
        { id: "act-sched", label: "📅 Agendar Horário no Site", action: "START_BOOKING", variant: "primary" },
      ];
      break;
    }

    case "DESPEDIDA": {
      newConsecutiveFailures = 0;
      botText = `Por nada! Qualquer outra dúvida é só chamar. Tenha um excelente dia e até breve na **${context.businessSettings.name}**! ✂️💈`;
      actions = [
        { id: "act-sched", label: "📅 Agendar Horário", action: "START_BOOKING" },
      ];
      break;
    }

    case "DESCONHECIDO":
    default: {
      if (matchedFaq) {
        newConsecutiveFailures = 0;
        botText = matchedFaq.answer;
        actions = [
          { id: "act-sched", label: "📅 Agendar Horário", action: "START_BOOKING", variant: "primary" },
          { id: "act-human", label: "👤 Falar com Atendente", action: "REQUEST_HUMAN" },
        ];
      } else {
        newConsecutiveFailures += 1;
        // SEGUNDA FALHA CONSECUTIVA (Section 35)
        if (newConsecutiveFailures >= 2) {
          botText = `Percebi que não encontrei uma resposta exata para sua pergunta.\n\nGostaria que eu transferisse agora sua conversa para nossa equipe humana de atendimento?`;
          actions = [
            { id: "act-req-human-auto", label: "👤 Falar com Atendente Aqui", action: "REQUEST_HUMAN", variant: "primary" },
            { id: "act-wa-auto", label: "🟢 Abrir WhatsApp", action: "OPEN_WHATSAPP", variant: "whatsapp" },
            { id: "act-sched-auto", label: "📅 Agendar um Horário", action: "START_BOOKING" },
          ];
        } else {
          // PRIMEIRA FALHA (Section 34)
          botText = `Não encontrei uma resposta segura para isso.\n\nPosso te ajudar com agendamento, serviços, preços ou chamar alguém da nossa equipe.`;
          actions = [
            { id: "act-human-fallback", label: "👤 Falar com Atendente Aqui", action: "REQUEST_HUMAN" },
            { id: "act-wa-fallback", label: "🟢 Abrir WhatsApp", action: "OPEN_WHATSAPP", variant: "whatsapp" },
            { id: "act-sched-fallback", label: "📅 Agendar Horário", action: "START_BOOKING", variant: "primary" },
          ];
        }
      }
      break;
    }
  }

  const botReplyMsg: BotMessage = {
    id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sender: "BOT",
    text: botText,
    time: currentTimeStr,
    timestamp: timeMs + 15,
    quickActions: actions,
  };

  const updatedConv: BotConversation = {
    ...conversation,
    status: newStatus,
    lastMessage: botText,
    lastTime: currentTimeStr,
    lastTimestamp: timeMs + 15,
    consecutiveFailures: newConsecutiveFailures,
    unreadByAgent: shouldNotify,
    messages: [...updatedMessages, botReplyMsg],
  };

  return {
    updatedConversation: updatedConv,
    createdAppointment,
    shouldNotifyAgent: shouldNotify,
  };
}

/**
 * Verifica se a equipe humana está dentro do horário de expediente
 */
export function checkHumanTeamAvailability(
  hours?: { start: string; end: string; isWorkday?: boolean | undefined },
  now: Date = new Date()
): boolean {
  if (!hours) return true;
  if (hours.isWorkday === false) return false;

  const currentHH = now.getHours();
  const currentMM = now.getMinutes();
  const currentTotal = currentHH * 60 + currentMM;

  const startParts = (hours.start || "09:00").split(":");
  const endParts = (hours.end || "19:00").split(":");

  const startH = Number(startParts[0] || 0);
  const startM = Number(startParts[1] || 0);
  const endH = Number(endParts[0] || 0);
  const endM = Number(endParts[1] || 0);

  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;

  return currentTotal >= startTotal && currentTotal <= endTotal;
}
