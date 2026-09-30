// BarberHub Pro ERP - Unified Availability Service
// Ponto único da verdade para cálculo de horários livres em todos os canais:
// Site, Bot, Portal do Cliente, Recepção e Agenda Interna

import {
  calculateAvailableSlots,
  validateNoAppointmentConflict,
  parseTimeToDate,
  formatTimeHHmm,
  type BusinessHoursConfig,
  type ExistingAppointmentSlot,
  type ScheduleBlockSlot,
  type TimeSlot,
} from "./availability.engine";

import {
  assignProfessionalEquitably,
  type EligibleProfessional,
  type DayAppointmentSummary,
} from "./assignment.service";

export interface UnifiedSlot {
  formattedTime: string; // "14:00"
  startTime: Date;
  endTime: Date;
  period: "MANHA" | "TARDE" | "NOITE";
  eligibleBarbers: EligibleProfessional[];
}

export interface UnifiedAvailabilityResult {
  success: boolean;
  dateStr: string; // "YYYY-MM-DD"
  serviceId: string;
  serviceName: string;
  serviceDurationMinutes: number;
  servicePrice: number;
  preferredBarberId?: string | null | undefined;
  slots: UnifiedSlot[];
  slotsByPeriod: {
    MANHA: UnifiedSlot[];
    TARDE: UnifiedSlot[];
    NOITE: UnifiedSlot[];
  };
  hasAvailableSlots: boolean;
  nextAvailableDate?: string | null | undefined;
  error?: string | undefined;
}

export interface ServiceDefinition {
  id: string;
  name: string;
  price: number;
  duration?: number | string | undefined;
  durationMinutes?: number | undefined;
  isActive?: boolean | undefined;
}

export interface EmployeeDefinition {
  id: string;
  name: string;
  role?: string | undefined;
  position?: string | undefined;
  status?: string | undefined;
  unitId?: string | null | undefined;
}

export interface UnifiedAvailabilityQuery {
  tenantId: string;
  unitId?: string | null | undefined;
  serviceId: string;
  date: Date | string; // Date ou "YYYY-MM-DD"
  preferredBarberId?: string | null | undefined; // null ou "ANY" = Sem Preferência
  services: ServiceDefinition[];
  employees: EmployeeDefinition[];
  businessSettings: {
    weekdayOpeningTime?: string;
    weekdayClosingTime?: string;
    intervalMinutes?: number;
    appointmentBufferMinutes?: number;
    cancellationGraceMinutes?: number;
    enableOnlineBooking?: boolean;
  };
  existingAppointments: ExistingAppointmentSlot[];
  scheduleBlocks?: ScheduleBlockSlot[];
  minAdvanceMinutes?: number;
  now?: Date;
}

/**
 * Converte qualquer representação de data para string YYYY-MM-DD local
 */
export function toDateStringYYYYMMDD(dateInput: Date | string): string {
  if (typeof dateInput === "string") {
    // Se já estiver no formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
      return dateInput.trim();
    }
  }
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Extrai a duração numérica em minutos de um serviço
 */
export function extractServiceDurationMinutes(service: ServiceDefinition): number {
  if (typeof service.durationMinutes === "number" && service.durationMinutes > 0) {
    return service.durationMinutes;
  }
  if (typeof service.duration === "number" && service.duration > 0) {
    return service.duration;
  }
  if (typeof service.duration === "string") {
    const parsed = parseInt(service.duration.replace(/\D/g, ""), 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 30; // Fallback padrão seguro de 30 minutos
}

/**
 * Classifica um horário em período do dia
 */
export function classifyTimePeriod(timeStr: string): "MANHA" | "TARDE" | "NOITE" {
  const [hours = 0] = timeStr.split(":").map(Number);
  if (hours < 12) return "MANHA";
  if (hours < 18) return "TARDE";
  return "NOITE";
}

/**
 * MOTOR DE DISPONIBILIDADE UNIFICADO
 * Responde de forma consistente e segura para todos os canais
 */
export function getUnifiedAvailability(query: UnifiedAvailabilityQuery): UnifiedAvailabilityResult {
  const {
    tenantId,
    unitId,
    serviceId,
    date,
    preferredBarberId,
    services,
    employees,
    businessSettings,
    existingAppointments,
    scheduleBlocks = [],
    minAdvanceMinutes = 60,
    now = new Date(),
  } = query;

  const dateStr = toDateStringYYYYMMDD(date);
  const baseDate = new Date(`${dateStr}T12:00:00`); // Meio-dia para evitar deslocamento de fuso

  // 1. Validar e localizar o serviço
  const service = services.find((s) => s.id === serviceId);
  if (!service) {
    return {
      success: false,
      dateStr,
      serviceId,
      serviceName: "Serviço Desconhecido",
      serviceDurationMinutes: 30,
      servicePrice: 0,
      slots: [],
      slotsByPeriod: { MANHA: [], TARDE: [], NOITE: [] },
      hasAvailableSlots: false,
      error: "Serviço não encontrado no catálogo.",
    };
  }

  const durationMinutes = extractServiceDurationMinutes(service);

  // 2. Configurações de Horário de Funcionamento
  const config: BusinessHoursConfig = {
    openingTime: businessSettings.weekdayOpeningTime || "09:00",
    closingTime: businessSettings.weekdayClosingTime || "19:00",
    intervalMinutes: businessSettings.intervalMinutes || 30,
    bufferMinutes: businessSettings.appointmentBufferMinutes || 0,
  };

  // 3. Filtrar profissionais elegíveis (Ativos + Barbeiros + Unidade)
  const isAnyBarber = !preferredBarberId || preferredBarberId === "ANY";

  const eligibleBarbers = employees.filter((emp) => {
    const isBarber = emp.role === "BARBEIRO" || emp.position === "BARBEIRO";
    const isActive = emp.status === "ACTIVE" || !emp.status;
    const isSameUnit = !unitId || !emp.unitId || emp.unitId === unitId;

    if (!isBarber || !isActive || !isSameUnit) return false;

    if (!isAnyBarber && emp.id !== preferredBarberId && emp.name !== preferredBarberId) {
      return false;
    }

    return true;
  });

  if (eligibleBarbers.length === 0) {
    return {
      success: false,
      dateStr,
      serviceId: service.id,
      serviceName: service.name,
      serviceDurationMinutes: durationMinutes,
      servicePrice: service.price,
      preferredBarberId,
      slots: [],
      slotsByPeriod: { MANHA: [], TARDE: [], NOITE: [] },
      hasAvailableSlots: false,
      error: isAnyBarber
        ? "Nenhum barbeiro ativo cadastrado para esta unidade."
        : "O profissional selecionado não está disponível nesta data.",
    };
  }

  // 4. Calcular slots por profissional
  const timeMap = new Map<string, { slot: TimeSlot; barbers: EligibleProfessional[] }>();

  for (const barber of eligibleBarbers) {
    const barberAppointments = existingAppointments.filter((apt) => {
      const aptEmployeeId = (apt as any).employeeId || (apt as any).barberId;
      const aptBarberName = (apt as any).barberName;

      if (aptEmployeeId && aptEmployeeId === barber.id) return true;
      if (aptBarberName && aptBarberName.toLowerCase() === barber.name.toLowerCase()) return true;
      return false;
    });

    const barberBlocks = scheduleBlocks.filter((blk) => {
      const blkEmployeeId = (blk as any).employeeId;
      return !blkEmployeeId || blkEmployeeId === barber.id;
    });

    const slots = calculateAvailableSlots({
      date: baseDate,
      serviceDurationMinutes: durationMinutes,
      config,
      existingAppointments: barberAppointments,
      blocks: barberBlocks,
      minAdvanceMinutes,
      now,
    });

    for (const slot of slots) {
      const existing = timeMap.get(slot.formattedTime);
      const profObj: EligibleProfessional = { id: barber.id, name: barber.name, role: "BARBEIRO" };

      if (existing) {
        existing.barbers.push(profObj);
      } else {
        timeMap.set(slot.formattedTime, {
          slot,
          barbers: [profObj],
        });
      }
    }
  }

  // 5. Montar lista de slots unificados e ordenar cronologicamente
  const sortedTimes = Array.from(timeMap.keys()).sort();

  const unifiedSlots: UnifiedSlot[] = sortedTimes.map((time) => {
    const entry = timeMap.get(time)!;
    return {
      formattedTime: time,
      startTime: entry.slot.startTime,
      endTime: entry.slot.endTime,
      period: classifyTimePeriod(time),
      eligibleBarbers: entry.barbers,
    };
  });

  const slotsByPeriod = {
    MANHA: unifiedSlots.filter((s) => s.period === "MANHA"),
    TARDE: unifiedSlots.filter((s) => s.period === "TARDE"),
    NOITE: unifiedSlots.filter((s) => s.period === "NOITE"),
  };

  const hasAvailableSlots = unifiedSlots.length > 0;

  // 6. Se não houver horários, procurar o próximo dia disponível (até 7 dias à frente)
  let nextAvailableDate: string | null = null;
  if (!hasAvailableSlots) {
    for (let offset = 1; offset <= 7; offset++) {
      const candidateDate = new Date(baseDate.getTime() + offset * 24 * 60 * 60 * 1000);
      const candidateStr = toDateStringYYYYMMDD(candidateDate);

      let dayHasSlots = false;
      for (const barber of eligibleBarbers) {
        const bApts = existingAppointments.filter((apt) => {
          const aptDateStr = toDateStringYYYYMMDD(apt.startTime);
          return aptDateStr === candidateStr;
        });

        const quickSlots = calculateAvailableSlots({
          date: candidateDate,
          serviceDurationMinutes: durationMinutes,
          config,
          existingAppointments: bApts,
          blocks: scheduleBlocks,
          minAdvanceMinutes: 0,
          now,
        });

        if (quickSlots.length > 0) {
          dayHasSlots = true;
          break;
        }
      }

      if (dayHasSlots) {
        nextAvailableDate = candidateStr;
        break;
      }
    }
  }

  return {
    success: true,
    dateStr,
    serviceId: service.id,
    serviceName: service.name,
    serviceDurationMinutes: durationMinutes,
    servicePrice: service.price,
    preferredBarberId,
    slots: unifiedSlots,
    slotsByPeriod,
    hasAvailableSlots,
    nextAvailableDate,
  };
}

/**
 * VALIDAÇÃO ATÔMICA & ATRIBUIÇÃO NO MOMENTO DA CONFIRMAÇÃO (ANTI DOUBLE-BOOKING)
 */
export function validateAndAssignAppointmentSlot(params: {
  date: Date | string;
  timeSlot: string; // "14:00"
  serviceDurationMinutes: number;
  preferredBarberId?: string | null;
  eligibleBarbers: EligibleProfessional[];
  existingAppointments: ExistingAppointmentSlot[];
  scheduleBlocks?: ScheduleBlockSlot[];
}): {
  success: boolean;
  assignedBarber?: EligibleProfessional;
  startTime?: Date;
  endTime?: Date;
  conflict?: boolean;
  reason?: string;
} {
  const {
    date,
    timeSlot,
    serviceDurationMinutes,
    preferredBarberId,
    eligibleBarbers,
    existingAppointments,
    scheduleBlocks = [],
  } = params;

  const dateStr = toDateStringYYYYMMDD(date);
  const baseDate = new Date(`${dateStr}T12:00:00`);
  const startTime = parseTimeToDate(baseDate, timeSlot);
  const endTime = new Date(startTime.getTime() + serviceDurationMinutes * 60 * 1000);

  // 1. Filtrar barbeiros que continuam realmente livres neste intervalo exato [start, end)
  const availableCandidates: EligibleProfessional[] = [];

  for (const barber of eligibleBarbers) {
    if (preferredBarberId && preferredBarberId !== "ANY" && barber.id !== preferredBarberId) {
      continue;
    }

    const barberApts = existingAppointments.filter((apt) => {
      const aptEmployeeId = (apt as any).employeeId || (apt as any).barberId;
      const aptBarberName = (apt as any).barberName;
      if (aptEmployeeId && aptEmployeeId === barber.id) return true;
      if (aptBarberName && aptBarberName.toLowerCase() === barber.name.toLowerCase()) return true;
      return false;
    });

    const barberBlocks = scheduleBlocks.filter((blk) => {
      const blkEmployeeId = (blk as any).employeeId;
      return !blkEmployeeId || blkEmployeeId === barber.id;
    });

    const validation = validateNoAppointmentConflict({
      startTime,
      endTime,
      existingAppointments: barberApts,
      blocks: barberBlocks,
    });

    if (validation.valid) {
      availableCandidates.push(barber);
    }
  }

  // 2. Se nenhum barbeiro estiver livre, ocorreu colisão de double booking!
  if (availableCandidates.length === 0) {
    return {
      success: false,
      conflict: true,
      reason: "Esse horário acabou de ser ocupado por outro cliente. Por favor, escolha outro horário disponível.",
    };
  }

  // 3. Atribuir o profissional
  let assignedBarber: EligibleProfessional;

  if (preferredBarberId && preferredBarberId !== "ANY") {
    assignedBarber = availableCandidates[0]!;
  } else {
    const dayAptsSummary: DayAppointmentSummary[] = existingAppointments
      .filter((apt) => toDateStringYYYYMMDD(apt.startTime) === dateStr)
      .map((apt) => ({
        employeeId: (apt as any).employeeId || (apt as any).barberId || null,
        barberName: (apt as any).barberName || null,
        durationMinutes: Math.round((apt.endTime.getTime() - apt.startTime.getTime()) / 60000),
        status: apt.status,
      }));

    assignedBarber = assignProfessionalEquitably(availableCandidates, dayAptsSummary);
  }

  return {
    success: true,
    assignedBarber,
    startTime,
    endTime,
  };
}
