export type BookingStep =
  | "SELECT_SERVICE"
  | "SELECT_BARBER"
  | "SELECT_DATE_TIME"
  | "CUSTOMER_INFO"
  | "CONFIRMED";

export interface MobileBookingDraft {
  step: BookingStep;
  serviceId?: string | null;
  serviceName?: string | null;
  servicePrice?: number | null;
  serviceDuration?: number | null;
  employeeId?: string | null; // pode ser "ANY" para qualquer barbeiro disponível
  employeeName?: string | null;
  date?: string | null; // "YYYY-MM-DD"
  timeSlot?: string | null; // "14:30"
  customerName?: string | null;
  customerPhone?: string | null;
}

/**
 * Validador e máquina de estados progressiva para o fluxo de agendamento online mobile.
 */
export function canAdvanceBookingStep(draft: MobileBookingDraft): boolean {
  switch (draft.step) {
    case "SELECT_SERVICE":
      return Boolean(draft.serviceId && draft.serviceName);
    case "SELECT_BARBER":
      return Boolean(draft.employeeId);
    case "SELECT_DATE_TIME":
      return Boolean(draft.date && draft.timeSlot);
    case "CUSTOMER_INFO":
      return Boolean(
        draft.customerName &&
        draft.customerName.trim().length >= 3 &&
        draft.customerPhone &&
        draft.customerPhone.replace(/\D/g, "").length >= 10
      );
    case "CONFIRMED":
      return false;
  }
}

/**
 * Avança para a próxima etapa válida do agendamento mobile.
 */
export function getNextBookingStep(current: BookingStep): BookingStep {
  switch (current) {
    case "SELECT_SERVICE":
      return "SELECT_BARBER";
    case "SELECT_BARBER":
      return "SELECT_DATE_TIME";
    case "SELECT_DATE_TIME":
      return "CUSTOMER_INFO";
    case "CUSTOMER_INFO":
      return "CONFIRMED";
    case "CONFIRMED":
      return "CONFIRMED";
  }
}

/**
 * Retorna para a etapa anterior do agendamento mobile.
 */
export function getPreviousBookingStep(current: BookingStep): BookingStep {
  switch (current) {
    case "SELECT_SERVICE":
      return "SELECT_SERVICE";
    case "SELECT_BARBER":
      return "SELECT_SERVICE";
    case "SELECT_DATE_TIME":
      return "SELECT_BARBER";
    case "CUSTOMER_INFO":
      return "SELECT_DATE_TIME";
    case "CONFIRMED":
      return "CUSTOMER_INFO";
  }
}

// --------------------------------------------------------------------
// TIMELINE MOBILE DO BARBEIRO
// --------------------------------------------------------------------

export interface RawBarberScheduleItem {
  id: string;
  code: string;
  startTime: string; // "14:00"
  endTime: string; // "14:45"
  customerName: string;
  customerPhone: string;
  serviceName: string;
  price: number;
  status: "AGENDADO" | "CONFIRMADO" | "AGUARDANDO" | "EM_ATENDIMENTO" | "CONCLUIDO" | "CANCELADO" | "NAO_COMPARECEU";
}

export interface MobileBarberTimelineCard {
  appointmentId: string;
  code: string;
  timeRange: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  priceFormatted: string;
  status: string;
  statusLabel: string;
  statusBadgeVariant: "default" | "secondary" | "destructive" | "outline";
  waLink: string;
  callLink: string;
  canStart: boolean;
  canFinish: boolean;
}

/**
 * Formata os agendamentos do dia na visão mobile ultrarrápida do barbeiro.
 */
export function formatBarberMobileTimeline(
  items: RawBarberScheduleItem[]
): MobileBarberTimelineCard[] {
  // Ordena cronologicamente por horário de início
  const sorted = [...items].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return sorted.map((item) => {
    const rawDigits = item.customerPhone.replace(/\D/g, "");
    const formattedPhone = rawDigits.startsWith("55") ? rawDigits : `55${rawDigits}`;
    const cleanFirstName = item.customerName.split(" ")[0];
    const waText = encodeURIComponent(
      `Olá ${cleanFirstName}! Aqui é da barbearia confirmando seu atendimento de ${item.serviceName} às ${item.startTime}. Te esperamos!`
    );

    let statusLabel = "Agendado";
    let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";

    switch (item.status) {
      case "AGENDADO":
        statusLabel = "Agendado";
        badgeVariant = "outline";
        break;
      case "CONFIRMADO":
        statusLabel = "Confirmado";
        badgeVariant = "secondary";
        break;
      case "AGUARDANDO":
        statusLabel = "Na Recepção";
        badgeVariant = "default";
        break;
      case "EM_ATENDIMENTO":
        statusLabel = "Na Cadeira";
        badgeVariant = "default";
        break;
      case "CONCLUIDO":
        statusLabel = "Finalizado";
        badgeVariant = "secondary";
        break;
      case "CANCELADO":
        statusLabel = "Cancelado";
        badgeVariant = "destructive";
        break;
      case "NAO_COMPARECEU":
        statusLabel = "Não Compareceu";
        badgeVariant = "destructive";
        break;
    }

    const canStart = item.status === "AGUARDANDO" || item.status === "CONFIRMADO" || item.status === "AGENDADO";
    const canFinish = item.status === "EM_ATENDIMENTO";

    return {
      appointmentId: item.id,
      code: item.code,
      timeRange: `${item.startTime} - ${item.endTime}`,
      customerName: item.customerName,
      customerPhone: item.customerPhone,
      serviceName: item.serviceName,
      priceFormatted: `R$ ${item.price.toFixed(2)}`,
      status: item.status,
      statusLabel,
      statusBadgeVariant: badgeVariant,
      waLink: `https://wa.me/${formattedPhone}?text=${waText}`,
      callLink: `tel:+${formattedPhone}`,
      canStart,
      canFinish,
    };
  });
}
