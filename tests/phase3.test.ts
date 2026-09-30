import { describe, it, expect } from "vitest";
import {
  calculateAvailableSlots,
  hasTimeOverlap,
  validateNoAppointmentConflict,
  parseTimeToDate,
} from "../src/server/appointments/availability.engine";
import {
  APPOINTMENT_STATUS,
  canTransitionStatus,
  assertValidStatusTransition,
  buildAppointmentCreatePayload,
  buildReschedulePayload,
} from "../src/server/appointments/appointment.service";
import {
  findMatchingWaitingList,
  isPeriodCompatible,
  type WaitingListEntry,
} from "../src/server/appointments/waiting-list.service";
import {
  formatWhatsAppPhone,
  generateWhatsAppConfirmationLink,
  generateWhatsAppCancellationLink,
} from "../src/server/appointments/whatsapp.helper";

describe("Fase 3: Motor de Disponibilidade & Validação Anti-Sobreposição", () => {
  const baseDate = new Date("2026-10-15T00:00:00Z");

  it("deve detectar sobreposição matemática entre dois intervalos corretamente", () => {
    const aStart = new Date("2026-10-15T14:00:00Z");
    const aEnd = new Date("2026-10-15T15:00:00Z");

    const bOverlap = new Date("2026-10-15T14:30:00Z");
    const bOverlapEnd = new Date("2026-10-15T15:30:00Z");

    const cSeparate = new Date("2026-10-15T15:00:00Z");
    const cSeparateEnd = new Date("2026-10-15T16:00:00Z");

    expect(hasTimeOverlap(aStart, aEnd, bOverlap, bOverlapEnd)).toBe(true);
    // Intervalos contíguos (ex: 14h-15h e 15h-16h) NÃO se sobrepõem
    expect(hasTimeOverlap(aStart, aEnd, cSeparate, cSeparateEnd)).toBe(false);
  });

  it("regra do prompt: serviço de 60 min não pode estar disponível às 14:00 se houver atendimento 14:30-15:00", () => {
    const config = {
      openingTime: "14:00",
      closingTime: "18:00",
      intervalMinutes: 30,
    };

    // Caso 1: Barbeiro totalmente livre das 14:00 às 15:00 -> 14:00 disponível
    const slotsFree = calculateAvailableSlots({
      date: baseDate,
      serviceDurationMinutes: 60,
      config,
      existingAppointments: [],
    });
    expect(slotsFree.some((s) => s.formattedTime === "14:00")).toBe(true);

    // Caso 2: Existe outro atendimento das 14:30 às 15:00
    const existingAppointments = [
      {
        startTime: parseTimeToDate(baseDate, "14:30"),
        endTime: parseTimeToDate(baseDate, "15:00"),
        status: "AGENDADO",
      },
    ];

    const slotsWithConflict = calculateAvailableSlots({
      date: baseDate,
      serviceDurationMinutes: 60, // 14:00 precisa ir até 15:00, colidindo com 14:30
      config,
      existingAppointments,
    });

    // 14:00 NÃO deve estar disponível!
    expect(slotsWithConflict.some((s) => s.formattedTime === "14:00")).toBe(false);
    // Mas 15:00 (15h-16h) deve estar livre
    expect(slotsWithConflict.some((s) => s.formattedTime === "15:00")).toBe(true);
  });

  it("agendamentos CANCELADOS devem liberar o horário na agenda", () => {
    const config = {
      openingTime: "14:00",
      closingTime: "17:00",
      intervalMinutes: 30,
    };

    const canceledAppointment = [
      {
        startTime: parseTimeToDate(baseDate, "14:00"),
        endTime: parseTimeToDate(baseDate, "14:30"),
        status: "CANCELADO",
      },
    ];

    const slots = calculateAvailableSlots({
      date: baseDate,
      serviceDurationMinutes: 30,
      config,
      existingAppointments: canceledAppointment,
    });

    expect(slots.some((s) => s.formattedTime === "14:00")).toBe(true);
  });

  it("bloqueios de horário (ScheduleBlock) devem remover os horários correspondentes", () => {
    const config = {
      openingTime: "12:00",
      closingTime: "16:00",
      intervalMinutes: 30,
    };

    const blocks = [
      {
        startTime: parseTimeToDate(baseDate, "12:00"),
        endTime: parseTimeToDate(baseDate, "13:00"),
        title: "Almoço da Equipe",
      },
    ];

    const slots = calculateAvailableSlots({
      date: baseDate,
      serviceDurationMinutes: 30,
      config,
      existingAppointments: [],
      blocks,
    });

    expect(slots.some((s) => s.formattedTime === "12:00")).toBe(false);
    expect(slots.some((s) => s.formattedTime === "12:30")).toBe(false);
    expect(slots.some((s) => s.formattedTime === "13:00")).toBe(true);
  });

  it("validateNoAppointmentConflict deve impedir salvar agendamento conflitante", () => {
    const apt1 = {
      id: "apt-1",
      startTime: parseTimeToDate(baseDate, "10:00"),
      endTime: parseTimeToDate(baseDate, "10:45"),
      status: "CONFIRMADO",
    };

    const resultConflict = validateNoAppointmentConflict({
      startTime: parseTimeToDate(baseDate, "10:30"),
      endTime: parseTimeToDate(baseDate, "11:00"),
      existingAppointments: [apt1],
    });
    expect(resultConflict.valid).toBe(false);
    expect(resultConflict.conflictReason).toContain("Conflito de horário");

    const resultIgnored = validateNoAppointmentConflict({
      startTime: parseTimeToDate(baseDate, "10:00"),
      endTime: parseTimeToDate(baseDate, "10:45"),
      existingAppointments: [apt1],
      ignoreAppointmentId: "apt-1", // Próprio agendamento sendo alterado
    });
    expect(resultIgnored.valid).toBe(true);
  });
});

describe("Fase 3: Ciclo de Vida do Agendamento & Máquina de Estados", () => {
  it("deve permitir o fluxo linear de atendimento: AGENDADO -> CONFIRMADO -> AGUARDANDO -> EM_ATENDIMENTO -> CONCLUIDO", () => {
    expect(canTransitionStatus("AGENDADO", "CONFIRMADO")).toBe(true);
    expect(canTransitionStatus("CONFIRMADO", "AGUARDANDO")).toBe(true);
    expect(canTransitionStatus("AGUARDANDO", "EM_ATENDIMENTO")).toBe(true);
    expect(canTransitionStatus("EM_ATENDIMENTO", "CONCLUIDO")).toBe(true);
  });

  it("deve permitir cancelamento a partir de estados intermediários", () => {
    expect(canTransitionStatus("AGENDADO", "CANCELADO")).toBe(true);
    expect(canTransitionStatus("CONFIRMADO", "CANCELADO")).toBe(true);
    expect(canTransitionStatus("AGUARDANDO", "CANCELADO")).toBe(true);
    expect(canTransitionStatus("EM_ATENDIMENTO", "CANCELADO")).toBe(true);
  });

  it("deve proibir transições a partir de estados finais (CONCLUIDO, CANCELADO, NAO_COMPARECEU)", () => {
    expect(canTransitionStatus("CONCLUIDO", "AGENDADO")).toBe(false);
    expect(canTransitionStatus("CANCELADO", "CONFIRMADO")).toBe(false);
    expect(canTransitionStatus("NAO_COMPARECEU", "EM_ATENDIMENTO")).toBe(false);

    expect(() =>
      assertValidStatusTransition("CONCLUIDO", "AGENDADO")
    ).toThrow("Transição de status inválida");
  });

  it("buildAppointmentCreatePayload deve calcular término e preço somado de múltiplos serviços", () => {
    const payload = buildAppointmentCreatePayload("tenant_barber_1", {
      customerId: "cust-1",
      employeeId: "emp-barber-1",
      startTime: new Date("2026-10-15T14:00:00Z"),
      services: [
        { serviceId: "srv-corte", durationMinutes: 30, price: 40, commissionValue: 20 },
        { serviceId: "srv-barba", durationMinutes: 30, price: 35, commissionValue: 17.5 },
      ],
    });

    expect(payload.tenantId).toBe("tenant_barber_1");
    expect(payload.code).toMatch(/^BH-\d{6}$/);
    expect(payload.token).toHaveLength(64);
    expect(payload.durationMinutes).toBe(60);
    expect(payload.totalPrice).toBe(75.0);
    expect(payload.endTime).toEqual(new Date("2026-10-15T15:00:00Z"));
    expect(payload.status).toBe(APPOINTMENT_STATUS.AGENDADO);
  });

  it("buildReschedulePayload deve criar novo agendamento com histórico", () => {
    const original = {
      id: "apt-antigo-123",
      tenantId: "tenant_1",
      customerId: "cust-1",
      employeeId: "emp-1",
      services: [{ serviceId: "srv-1", durationMinutes: 30, price: 50, commissionValue: 25 }],
    };

    const rescheduled = buildReschedulePayload({
      originalAppointment: original,
      newStartTime: new Date("2026-10-16T10:00:00Z"),
    });

    expect(rescheduled.startTime).toEqual(new Date("2026-10-16T10:00:00Z"));
    expect(rescheduled.notes).toContain("apt-antigo-123");
    expect(rescheduled.token).toBeDefined();
  });
});

describe("Fase 3: Fila de Espera Inteligente (Waiting List Matching)", () => {
  it("deve verificar compatibilidade de períodos do dia (MANHA, TARDE, NOITE, QUALQUER)", () => {
    expect(isPeriodCompatible(9, "MANHA")).toBe(true);
    expect(isPeriodCompatible(14, "MANHA")).toBe(false);
    expect(isPeriodCompatible(15, "TARDE")).toBe(true);
    expect(isPeriodCompatible(20, "NOITE")).toBe(true);
    expect(isPeriodCompatible(11, "QUALQUER")).toBe(true);
  });

  it("deve fazer matching de clientes na lista de espera e ordenar por prioridade", () => {
    const date = new Date("2026-10-20T14:30:00Z");

    const entries: WaitingListEntry[] = [
      {
        id: "w-1",
        tenantId: "t1",
        customerId: "c1",
        serviceId: "s1",
        preferredDate: new Date("2026-10-20T00:00:00Z"),
        preferredPeriod: "TARDE",
        priority: 1, // Prioridade normal
        status: "WAITING",
        createdAt: new Date("2026-10-18T10:00:00Z"),
      },
      {
        id: "w-2",
        tenantId: "t1",
        customerId: "c2",
        serviceId: "s1",
        preferredDate: new Date("2026-10-20T00:00:00Z"),
        preferredPeriod: "QUALQUER",
        priority: 5, // Prioridade VIP máxima
        status: "WAITING",
        createdAt: new Date("2026-10-19T10:00:00Z"),
      },
      {
        id: "w-3",
        tenantId: "t1",
        customerId: "c3",
        serviceId: "s1",
        preferredDate: new Date("2026-10-21T00:00:00Z"), // Outro dia!
        preferredPeriod: "TARDE",
        priority: 5,
        status: "WAITING",
        createdAt: new Date("2026-10-19T10:00:00Z"),
      },
    ];

    const matches = findMatchingWaitingList(entries, {
      startTime: date,
      employeeId: "emp-barber",
    });

    // Apenas w-1 e w-2 são para o mesmo dia e período da tarde
    expect(matches).toHaveLength(2);
    // w-2 deve vir primeiro porque tem prioridade 5 contra 1
    expect(matches[0].id).toBe("w-2");
    expect(matches[1].id).toBe("w-1");
  });
});

describe("Fase 3: Protocolo WhatsApp sem APIs Pagas (wa.me)", () => {
  it("deve formatar o telefone adicionando DDI 55 quando necessário", () => {
    expect(formatWhatsAppPhone("11988887777")).toBe("5511988887777");
    expect(formatWhatsAppPhone("(21) 97777-6666")).toBe("5521977776666");
    expect(formatWhatsAppPhone("5511988887777")).toBe("5511988887777");
  });

  it("deve gerar link oficial wa.me com mensagem e link do agendamento /agendamento/:token", () => {
    const link = generateWhatsAppConfirmationLink({
      customerName: "Carlos",
      customerPhone: "11999998888",
      shopName: "Barbearia Imperial",
      serviceName: "Corte + Barba",
      barberName: "Marcos",
      formattedDate: "15/10/2026",
      formattedTime: "14:00",
      appointmentToken: "token_seguro_xyz_123",
      baseUrl: "https://barberhub.app",
    });

    expect(link.startsWith("https://wa.me/5511999998888?text=")).toBe(true);
    expect(link).toContain(encodeURIComponent("Carlos"));
    expect(link).toContain(encodeURIComponent("Barbearia Imperial"));
    expect(link).toContain(encodeURIComponent("https://barberhub.app/agendamento/token_seguro_xyz_123"));
  });

  it("deve gerar link de cancelamento sem erros", () => {
    const link = generateWhatsAppCancellationLink({
      customerName: "Lucas",
      customerPhone: "11988881111",
      shopName: "Barbearia Imperial",
      serviceName: "Barboterapia",
      barberName: "Marcos",
      formattedDate: "15/10/2026",
      formattedTime: "16:00",
    });

    expect(link.startsWith("https://wa.me/5511988881111?text=")).toBe(true);
    expect(link).toContain(encodeURIComponent("cancelado"));
  });
});
