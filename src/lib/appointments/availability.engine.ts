// BarberHub Pro ERP - Availability Engine (Motor de Disponibilidade)
// Regras determinísticas de cálculo de horários livres sem sobreposições acidentais

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  formattedTime: string; // "HH:mm"
}

export interface ExistingAppointmentSlot {
  id?: string;
  startTime: Date;
  endTime: Date;
  status: string; // AGENDADO, CONFIRMADO, AGUARDANDO, EM_ATENDIMENTO, CONCLUIDO, CANCELADO, NAO_COMPARECEU
}

export interface ScheduleBlockSlot {
  id?: string;
  startTime: Date;
  endTime: Date;
  title?: string;
}

export interface BusinessHoursConfig {
  openingTime: string; // "08:00"
  closingTime: string; // "19:00"
  intervalMinutes: number; // 15, 20, 30, etc.
  bufferMinutes?: number; // 0, 5, 10
}

/**
 * Verifica se dois intervalos de tempo se sobrepõem matematicamente.
 * Dois intervalos [A_start, A_end) e [B_start, B_end) colidem se:
 * A_start < B_end && A_end > B_start
 */
export function hasTimeOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
}

/**
 * Converte data base + "HH:mm" para objeto Date no timezone local/ISO
 */
export function parseTimeToDate(baseDate: Date, timeStr: string): Date {
  const [hours = 0, minutes = 0] = timeStr.split(":").map(Number);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Formata um objeto Date para "HH:mm"
 */
export function formatTimeHHmm(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Motor Principal: Calcula todos os slots de horários disponíveis para um barbeiro
 */
export function calculateAvailableSlots(params: {
  date: Date;
  serviceDurationMinutes: number;
  config: BusinessHoursConfig;
  existingAppointments: ExistingAppointmentSlot[];
  blocks?: ScheduleBlockSlot[];
  minAdvanceMinutes?: number; // Não exibir horários que já passaram ou em menos de X min
  now?: Date;
}): TimeSlot[] {
  const {
    date,
    serviceDurationMinutes,
    config,
    existingAppointments,
    blocks = [],
    minAdvanceMinutes = 0,
    now = new Date(),
  } = params;

  if (serviceDurationMinutes <= 0) {
    throw new Error("Duração do serviço deve ser maior que zero.");
  }

  const {
    openingTime,
    closingTime,
    intervalMinutes,
    bufferMinutes = 0,
  } = config;

  const dayOpening = parseTimeToDate(date, openingTime);
  const dayClosing = parseTimeToDate(date, closingTime);

  // Filtrar apenas agendamentos ativos que bloqueiam a agenda
  // Agendamentos com status CANCELADO não bloqueiam horário
  const activeAppointments = existingAppointments.filter(
    (apt) => apt.status !== "CANCELADO" && apt.status !== "NAO_COMPARECEU"
  );

  const availableSlots: TimeSlot[] = [];
  const totalOccupiedTime = serviceDurationMinutes + bufferMinutes;

  let currentPointer = new Date(dayOpening);

  while (currentPointer.getTime() < dayClosing.getTime()) {
    const slotStart = new Date(currentPointer);
    const slotEnd = new Date(slotStart.getTime() + serviceDurationMinutes * 60 * 1000);
    const slotEndWithBuffer = new Date(slotStart.getTime() + totalOccupiedTime * 60 * 1000);

    // 1. O serviço completo + buffer cabe antes do fechamento da barbearia?
    if (slotEnd.getTime() > dayClosing.getTime()) {
      break;
    }

    // 2. Se for no mesmo dia, o horário já passou do limite mínimo de antecedência?
    const earliestAllowed = new Date(now.getTime() + minAdvanceMinutes * 60 * 1000);
    const isPast = slotStart.getTime() < earliestAllowed.getTime();

    // 3. Colide com algum agendamento ativo existente?
    const conflictsWithAppointment = activeAppointments.some((apt) =>
      hasTimeOverlap(slotStart, slotEndWithBuffer, apt.startTime, apt.endTime)
    );

    // 4. Colide com algum bloqueio de agenda (almoço, folga, reunião)?
    const conflictsWithBlock = blocks.some((blk) =>
      hasTimeOverlap(slotStart, slotEndWithBuffer, blk.startTime, blk.endTime)
    );

    // Se estiver livre e no futuro, é um slot válido!
    if (!isPast && !conflictsWithAppointment && !conflictsWithBlock) {
      availableSlots.push({
        startTime: slotStart,
        endTime: slotEnd,
        formattedTime: formatTimeHHmm(slotStart),
      });
    }

    // Avança o ponteiro pelo intervalo configurado da barbearia (ex: de 30 em 30 min)
    currentPointer = new Date(currentPointer.getTime() + intervalMinutes * 60 * 1000);
  }

  return availableSlots;
}

/**
 * Validação rigorosa: Garante que um agendamento novo não entra em conflito antes de salvar
 */
export function validateNoAppointmentConflict(params: {
  startTime: Date;
  endTime: Date;
  existingAppointments: ExistingAppointmentSlot[];
  blocks?: ScheduleBlockSlot[];
  ignoreAppointmentId?: string; // Para reagendamentos
}): { valid: boolean; conflictReason?: string } {
  const { startTime, endTime, existingAppointments, blocks = [], ignoreAppointmentId } = params;

  if (startTime.getTime() >= endTime.getTime()) {
    return { valid: false, conflictReason: "Horário de término deve ser posterior ao início." };
  }

  // Checar colisão com agendamentos ativos
  for (const apt of existingAppointments) {
    if (ignoreAppointmentId && apt.id === ignoreAppointmentId) continue;
    if (apt.status === "CANCELADO" || apt.status === "NAO_COMPARECEU") continue;

    if (hasTimeOverlap(startTime, endTime, apt.startTime, apt.endTime)) {
      return {
        valid: false,
        conflictReason: `Conflito de horário com agendamento existente (${formatTimeHHmm(
          apt.startTime
        )} - ${formatTimeHHmm(apt.endTime)}).`,
      };
    }
  }

  // Checar colisão com bloqueios de agenda
  for (const blk of blocks) {
    if (hasTimeOverlap(startTime, endTime, blk.startTime, blk.endTime)) {
      return {
        valid: false,
        conflictReason: `Horário bloqueado (${blk.title || "Indisponível"}: ${formatTimeHHmm(
          blk.startTime
        )} - ${formatTimeHHmm(blk.endTime)}).`,
      };
    }
  }

  return { valid: true };
}
