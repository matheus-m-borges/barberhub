// BarberHub Pro ERP - Professional Assignment Service
// Motor determinístico de distribuição equilibrada de atendimentos para clientes "Sem Preferência"
// ZERO Math.random() | ZERO IA | 100% Auditável e Equitativo

export interface EligibleProfessional {
  id: string;
  name: string;
  role?: string;
}

export interface DayAppointmentSummary {
  employeeId?: string | null | undefined;
  barberName?: string | null | undefined;
  durationMinutes?: number | undefined;
  startTime?: Date | string | undefined;
  endTime?: Date | string | undefined;
  status: string; // AGENDADO, CONFIRMADO, AGUARDANDO, EM_ATENDIMENTO, CONCLUIDO, CANCELADO, NAO_COMPARECEU
}

export interface ProfessionalWorkload {
  employeeId: string;
  name: string;
  appointmentsCount: number;
  totalMinutes: number;
}

/**
 * Calcula a carga de trabalho de cada profissional para o dia especificado
 */
export function calculateProfessionalsWorkload(
  professionals: EligibleProfessional[],
  dayAppointments: DayAppointmentSummary[]
): ProfessionalWorkload[] {
  if (!dayAppointments || !Array.isArray(dayAppointments)) {
    return professionals.map((p) => ({
      employeeId: p.id,
      name: p.name,
      appointmentsCount: 0,
      totalMinutes: 0,
    }));
  }

  // Filtrar apenas agendamentos ativos que geram carga de trabalho real no dia
  const activeAppointments = dayAppointments.filter(
    (apt) => apt.status !== "CANCELADO" && apt.status !== "NAO_COMPARECEU"
  );

  return professionals.map((prof) => {
    const profApts = activeAppointments.filter(
      (apt) =>
        apt.employeeId === prof.id ||
        (apt.barberName && prof?.name && apt.barberName.toLowerCase() === prof.name.toLowerCase())
    );

    const appointmentsCount = profApts.length;
    const totalMinutes = profApts.reduce((acc, curr) => {
      if (curr.durationMinutes != null && !isNaN(curr.durationMinutes)) {
        return acc + curr.durationMinutes;
      }
      if (curr.startTime && curr.endTime) {
        const start = new Date(curr.startTime).getTime();
        const end = new Date(curr.endTime).getTime();
        const diffMinutes = Math.round((end - start) / 60000);
        return acc + (diffMinutes > 0 ? diffMinutes : 0);
      }
      return acc;
    }, 0);

    return {
      employeeId: prof.id,
      name: prof.name,
      appointmentsCount,
      totalMinutes,
    };
  });
}

/**
 * ALGORITMO DE DISTRIBUIÇÃO EQUILIBRADA (Regra Estrita do BarberHub):
 * 
 * Entre todos os profissionais elegíveis e disponíveis no slot:
 * 1. Menor quantidade de atendimentos atribuídos no dia (appointmentsCount);
 * 2. Menor quantidade de minutos de serviços atribuídos no dia (totalMinutes);
 * 3. Desempate estável / Round-Robin determinístico (ordenação por ID/Nome);
 * 
 * NUNCA utiliza Math.random() ou sorteio arbitrário.
 */
export function assignProfessionalEquitably(
  eligibleCandidates: EligibleProfessional[],
  dayAppointments: DayAppointmentSummary[]
): EligibleProfessional {
  if (eligibleCandidates.length === 0) {
    throw new Error("Nenhum profissional elegível fornecido para distribuição.");
  }

  if (eligibleCandidates.length === 1) {
    return eligibleCandidates[0]!;
  }

  // 1. Obter carga de trabalho de cada candidato no dia
  const workloads = calculateProfessionalsWorkload(eligibleCandidates, dayAppointments);

  // 2. Ordenar estritamente pelos critérios da arquitetura
  const sorted = [...workloads].sort((a, b) => {
    // Critério 1: Menor quantidade de atendimentos
    if (a.appointmentsCount !== b.appointmentsCount) {
      return a.appointmentsCount - b.appointmentsCount;
    }

    // Critério 2: Menor tempo trabalhado em minutos
    if (a.totalMinutes !== b.totalMinutes) {
      return a.totalMinutes - b.totalMinutes;
    }

    // Critério 3: Desempate determinístico (alfabético por ID para garantir idempotência)
    return a.employeeId.localeCompare(b.employeeId);
  });

  const bestWorkload = sorted[0]!;
  const selected = eligibleCandidates.find((c) => c.id === bestWorkload.employeeId);

  if (!selected) {
    return eligibleCandidates[0]!;
  }

  return selected;
}
