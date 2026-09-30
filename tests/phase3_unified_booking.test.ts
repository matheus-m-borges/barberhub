import { describe, it, expect } from "vitest";
import {
  getUnifiedAvailability,
  validateAndAssignAppointmentSlot,
} from "../src/server/appointments/availability.service";
import {
  assignProfessionalEquitably,
  calculateProfessionalsWorkload,
} from "../src/server/appointments/assignment.service";
import {
  buildAppointmentCreatePayload,
  buildReschedulePayload,
} from "../src/server/appointments/appointment.service";
import { findMatchingWaitingList, type WaitingListEntry } from "../src/server/appointments/waiting-list.service";

describe("Master Engine: Sistema Unificado de Agendamento BarberHub", () => {
  const sampleServices = [
    { id: "srv-corte", name: "Corte Tradicional", price: 50, duration: 40, isActive: true },
    { id: "srv-barba", name: "Barba Terapia", price: 35, duration: 30, isActive: true },
    { id: "srv-combo", name: "Corte + Barba", price: 75, duration: 60, isActive: true },
    { id: "srv-quimica", name: "Alisamento Americano", price: 120, duration: 90, isActive: true },
  ];

  const sampleBarbers = [
    { id: "b-carlos", name: "Carlos", role: "BARBEIRO", isActive: true, eligibleForAppointments: true },
    { id: "b-pedro", name: "Pedro", role: "BARBEIRO", isActive: true, eligibleForAppointments: true },
    { id: "b-marcos", name: "Marcos", role: "BARBEIRO", isActive: true, eligibleForAppointments: true },
  ];

  const businessSettings = {
    weekdayOpeningTime: "09:00",
    weekdayClosingTime: "18:00",
    intervalMinutes: 30,
    appointmentBufferMinutes: 0,
  };

  // =========================================================================
  // SEÇÃO 62: TESTE DA DISTRIBUIÇÃO EQUILIBRADA (PROMPT MESTRE)
  // Carlos: 7 atendimentos, 330 minutos
  // Pedro: 4 atendimentos, 180 minutos
  // Marcos: 4 atendimentos, 240 minutos
  // Resultado esperado: Pedro deve ter prioridade absoluta pelo algoritmo!
  // =========================================================================
  it("Seção 62: Algoritmo de distribuição deve priorizar Pedro (menor atendimentos e menor minutos)", () => {
    const today = "2026-10-15";
    const appointmentsHistory = [
      // Carlos: 7 atendimentos = 330 min (3x60 + 3x40 + 1x30)
      { employeeId: "b-carlos", barberName: "Carlos", startTime: new Date(`${today}T09:00:00Z`), endTime: new Date(`${today}T10:00:00Z`), durationMinutes: 60, status: "AGENDADO" },
      { employeeId: "b-carlos", barberName: "Carlos", startTime: new Date(`${today}T10:00:00Z`), endTime: new Date(`${today}T11:00:00Z`), durationMinutes: 60, status: "AGENDADO" },
      { employeeId: "b-carlos", barberName: "Carlos", startTime: new Date(`${today}T11:00:00Z`), endTime: new Date(`${today}T12:00:00Z`), durationMinutes: 60, status: "AGENDADO" },
      { employeeId: "b-carlos", barberName: "Carlos", startTime: new Date(`${today}T13:00:00Z`), endTime: new Date(`${today}T13:40:00Z`), durationMinutes: 40, status: "AGENDADO" },
      { employeeId: "b-carlos", barberName: "Carlos", startTime: new Date(`${today}T13:40:00Z`), endTime: new Date(`${today}T14:20:00Z`), durationMinutes: 40, status: "AGENDADO" },
      { employeeId: "b-carlos", barberName: "Carlos", startTime: new Date(`${today}T14:20:00Z`), endTime: new Date(`${today}T15:00:00Z`), durationMinutes: 40, status: "AGENDADO" },
      { employeeId: "b-carlos", barberName: "Carlos", startTime: new Date(`${today}T15:00:00Z`), endTime: new Date(`${today}T15:30:00Z`), durationMinutes: 30, status: "AGENDADO" },

      // Pedro: 4 atendimentos = 180 min (2x60 + 2x30)
      { employeeId: "b-pedro", barberName: "Pedro", startTime: new Date(`${today}T09:00:00Z`), endTime: new Date(`${today}T10:00:00Z`), durationMinutes: 60, status: "AGENDADO" },
      { employeeId: "b-pedro", barberName: "Pedro", startTime: new Date(`${today}T10:00:00Z`), endTime: new Date(`${today}T11:00:00Z`), durationMinutes: 60, status: "AGENDADO" },
      { employeeId: "b-pedro", barberName: "Pedro", startTime: new Date(`${today}T11:00:00Z`), endTime: new Date(`${today}T11:30:00Z`), durationMinutes: 30, status: "AGENDADO" },
      { employeeId: "b-pedro", barberName: "Pedro", startTime: new Date(`${today}T11:30:00Z`), endTime: new Date(`${today}T12:00:00Z`), durationMinutes: 30, status: "AGENDADO" },

      // Marcos: 4 atendimentos = 240 min (4x60)
      { employeeId: "b-marcos", barberName: "Marcos", startTime: new Date(`${today}T09:00:00Z`), endTime: new Date(`${today}T10:00:00Z`), durationMinutes: 60, status: "AGENDADO" },
      { employeeId: "b-marcos", barberName: "Marcos", startTime: new Date(`${today}T10:00:00Z`), endTime: new Date(`${today}T11:00:00Z`), durationMinutes: 60, status: "AGENDADO" },
      { employeeId: "b-marcos", barberName: "Marcos", startTime: new Date(`${today}T11:00:00Z`), endTime: new Date(`${today}T12:00:00Z`), durationMinutes: 60, status: "AGENDADO" },
      { employeeId: "b-marcos", barberName: "Marcos", startTime: new Date(`${today}T13:00:00Z`), endTime: new Date(`${today}T14:00:00Z`), durationMinutes: 60, status: "AGENDADO" },
    ];

    const workloads = calculateProfessionalsWorkload(sampleBarbers, appointmentsHistory);

    const carlosLoad = workloads.find((w) => w.employeeId === "b-carlos");
    const pedroLoad = workloads.find((w) => w.employeeId === "b-pedro");
    const marcosLoad = workloads.find((w) => w.employeeId === "b-marcos");

    expect(carlosLoad?.appointmentsCount).toBe(7);
    expect(carlosLoad?.totalMinutes).toBe(330);
    expect(pedroLoad?.appointmentsCount).toBe(4);
    expect(pedroLoad?.totalMinutes).toBe(180);
    expect(marcosLoad?.appointmentsCount).toBe(4);
    expect(marcosLoad?.totalMinutes).toBe(240);

    const assigned = assignProfessionalEquitably(sampleBarbers, appointmentsHistory);

    expect(assigned).not.toBeNull();
    expect(assigned.id).toBe("b-pedro");
    expect(assigned.name).toBe("Pedro");
  });

  // =========================================================================
  // SEÇÃO 63: TESTE DE EMPATE DETERMINÍSTICO (SEM RANDOM PURO)
  // Carlos: 4 atendimentos, 180 min
  // Pedro: 4 atendimentos, 180 min
  // Resultado: Ordem determinística estável e idempotente
  // =========================================================================
  it("Seção 63: Critério de desempate deve ser determinístico e estável, sem Math.random()", () => {
    const today = "2026-10-15";
    const appointmentsHistory = [
      // Carlos: 4 x 45 min = 180 min
      { employeeId: "b-carlos", barberName: "Carlos", startTime: new Date(`${today}T09:00:00Z`), endTime: new Date(`${today}T09:45:00Z`), durationMinutes: 45, status: "AGENDADO" },
      { employeeId: "b-carlos", barberName: "Carlos", startTime: new Date(`${today}T09:45:00Z`), endTime: new Date(`${today}T10:30:00Z`), durationMinutes: 45, status: "AGENDADO" },
      { employeeId: "b-carlos", barberName: "Carlos", startTime: new Date(`${today}T10:30:00Z`), endTime: new Date(`${today}T11:15:00Z`), durationMinutes: 45, status: "AGENDADO" },
      { employeeId: "b-carlos", barberName: "Carlos", startTime: new Date(`${today}T11:15:00Z`), endTime: new Date(`${today}T12:00:00Z`), durationMinutes: 45, status: "AGENDADO" },

      // Pedro: 4 x 45 min = 180 min
      { employeeId: "b-pedro", barberName: "Pedro", startTime: new Date(`${today}T09:00:00Z`), endTime: new Date(`${today}T09:45:00Z`), durationMinutes: 45, status: "AGENDADO" },
      { employeeId: "b-pedro", barberName: "Pedro", startTime: new Date(`${today}T09:45:00Z`), endTime: new Date(`${today}T10:30:00Z`), durationMinutes: 45, status: "AGENDADO" },
      { employeeId: "b-pedro", barberName: "Pedro", startTime: new Date(`${today}T10:30:00Z`), endTime: new Date(`${today}T11:15:00Z`), durationMinutes: 45, status: "AGENDADO" },
      { employeeId: "b-pedro", barberName: "Pedro", startTime: new Date(`${today}T11:15:00Z`), endTime: new Date(`${today}T12:00:00Z`), durationMinutes: 45, status: "AGENDADO" },
    ];

    const result1 = assignProfessionalEquitably(
      [sampleBarbers[0]!, sampleBarbers[1]!],
      appointmentsHistory
    );

    const result2 = assignProfessionalEquitably(
      [sampleBarbers[1]!, sampleBarbers[0]!], // ordem invertida na entrada
      appointmentsHistory
    );

    // O desempate NÃO depende de Math.random() e é estritamente idempotente
    expect(result1.id).toBe(result2.id);
    expect(["b-carlos", "b-pedro"]).toContain(result1.id);
  });

  // =========================================================================
  // SEÇÃO 64: TESTE DE DURAÇÃO COMPLETA [start_at, end_at)
  // Carlos: 14:00 livre, 14:40 possui outro atendimento
  // Serviço solicitado: 60 minutos (14:00 - 15:00)
  // Resultado: 14:00 NÃO pode estar disponível!
  // =========================================================================
  it("Seção 64: Serviço de 60 min às 14:00 deve ser rejeitado se houver agendamento às 14:40", () => {
    const dateStr = "2026-10-15";
    const existing = [
      {
        employeeId: "b-carlos",
        barberName: "Carlos",
        startTime: new Date(`${dateStr}T14:40:00`),
        endTime: new Date(`${dateStr}T15:10:00`),
        status: "AGENDADO",
      },
    ];

    const availability = getUnifiedAvailability({
      tenantId: "tenant-1",
      serviceId: "srv-combo", // 60 min
      date: dateStr,
      preferredBarberId: "b-carlos",
      services: sampleServices,
      employees: sampleBarbers,
      businessSettings,
      existingAppointments: existing,
      minAdvanceMinutes: 0,
      now: new Date(`${dateStr}T08:00:00`),
    });

    const slot1400 = availability.slots.find((s) => s.formattedTime === "14:00");
    // Às 14:00 Carlos NÃO pode constar na lista de slots disponíveis para 60min
    expect(slot1400).toBeUndefined();
  });

  // =========================================================================
  // SEÇÃO 61 & 28: PROTEÇÃO CONTRA DOUBLE BOOKING & CONCORRÊNCIA ATÔMICA
  // =========================================================================
  it("Seção 61 & 28: Duas requisições simultâneas para o mesmo barbeiro -> apenas 1 confirmada", () => {
    const dateStr = "2026-10-15";
    const initialAppointments: any[] = [];

    // Cliente A e B consultam às 14:00 quando apenas Carlos está trabalhando
    const singleBarber = [sampleBarbers[0]!];

    // Cliente A valida e confirma
    const validationA = validateAndAssignAppointmentSlot({
      date: dateStr,
      timeSlot: "14:00",
      serviceDurationMinutes: 40,
      preferredBarberId: "b-carlos",
      eligibleBarbers: singleBarber,
      existingAppointments: initialAppointments,
    });

    expect(validationA.success).toBe(true);
    expect(validationA.assignedBarber?.id).toBe("b-carlos");

    // Appointment de A é inserido no array existente
    const appointmentsAfterA = [
      ...initialAppointments,
      {
        employeeId: validationA.assignedBarber!.id,
        barberName: validationA.assignedBarber!.name,
        startTime: validationA.startTime!,
        endTime: validationA.endTime!,
        status: "AGENDADO",
      },
    ];

    // Cliente B tenta confirmar 2 segundos depois o mesmo horário
    const validationB = validateAndAssignAppointmentSlot({
      date: dateStr,
      timeSlot: "14:00",
      serviceDurationMinutes: 40,
      preferredBarberId: "b-carlos",
      eligibleBarbers: singleBarber,
      existingAppointments: appointmentsAfterA,
    });

    // Cliente B DEVE ser rejeitado com mensagem clara de conflito
    expect(validationB.success).toBe(false);
    expect(validationB.reason).toContain("ocupado");
  });

  // =========================================================================
  // SEÇÃO 65: CANCELAMENTO & LIBERAÇÃO IMEDIATA DE DISPONIBILIDADE
  // =========================================================================
  it("Seção 65: Cancelamento deve liberar imediatamente o horário no motor", () => {
    const dateStr = "2026-10-15";
    const occupiedAppointments = [
      {
        employeeId: "b-carlos",
        barberName: "Carlos",
        startTime: new Date(`${dateStr}T14:00:00`),
        endTime: new Date(`${dateStr}T15:00:00`),
        status: "AGENDADO",
      },
    ];

    // Antes do cancelamento: 14:00 indisponível
    const beforeCancel = getUnifiedAvailability({
      tenantId: "tenant-1",
      serviceId: "srv-combo", // 60 min
      date: dateStr,
      preferredBarberId: "b-carlos",
      services: sampleServices,
      employees: [sampleBarbers[0]!],
      businessSettings,
      existingAppointments: occupiedAppointments,
      minAdvanceMinutes: 0,
      now: new Date(`${dateStr}T08:00:00`),
    });
    expect(beforeCancel.slots.find((s) => s.formattedTime === "14:00")).toBeUndefined();

    // Após cancelamento: status muda para CANCELADO
    const afterCancelAppointments = [
      {
        ...occupiedAppointments[0],
        status: "CANCELADO",
      },
    ];

    const afterCancel = getUnifiedAvailability({
      tenantId: "tenant-1",
      serviceId: "srv-combo",
      date: dateStr,
      preferredBarberId: "b-carlos",
      services: sampleServices,
      employees: [sampleBarbers[0]!],
      businessSettings,
      existingAppointments: afterCancelAppointments,
      minAdvanceMinutes: 0,
      now: new Date(`${dateStr}T08:00:00`),
    });

    // 14:00 está livre novamente!
    expect(afterCancel.slots.find((s) => s.formattedTime === "14:00")).toBeDefined();
  });

  // =========================================================================
  // SEÇÃO 69: PRÓXIMO DIA DISPONÍVEL
  // =========================================================================
  it("Seção 69: Deve localizar a próxima data com vaga real caso hoje esteja lotado", () => {
    const today = "2026-10-15";
    // Lotar o dia inteiro das 09:00 às 18:00 para todos os barbeiros
    const fullDayAppointments: any[] = [];
    sampleBarbers.forEach((barber) => {
      fullDayAppointments.push({
        employeeId: barber.id,
        barberName: barber.name,
        startTime: new Date(`${today}T09:00:00`),
        endTime: new Date(`${today}T18:00:00`),
        status: "CONFIRMADO",
      });
    });

    const availability = getUnifiedAvailability({
      tenantId: "tenant-1",
      serviceId: "srv-corte",
      date: today,
      preferredBarberId: null,
      services: sampleServices,
      employees: sampleBarbers,
      businessSettings,
      existingAppointments: fullDayAppointments,
      minAdvanceMinutes: 0,
      now: new Date(`${today}T08:00:00`),
    });

    expect(availability.hasAvailableSlots).toBe(false);
    expect(availability.nextAvailableDate).not.toBeNull();
    expect(availability.nextAvailableDate).not.toBe(today);
  });

  // =========================================================================
  // SEÇÃO 44 & 46: REMARCAÇÃO E LISTA DE ESPERA COMPATÍVEL
  // =========================================================================
  it("Seção 44 & 46: Remarcação deve registrar nova data e lista de espera detecta vaga liberada", () => {
    const originalAppointment = {
      id: "apt-101",
      tenantId: "tenant-matriz",
      customerId: "cust-1",
      employeeId: "b-carlos",
      services: [
        { serviceId: "srv-corte", price: 50, durationMinutes: 40, commissionValue: 20 },
      ],
    };

    const newStartTime = new Date("2026-10-16T15:00:00Z");
    const payload = buildReschedulePayload({
      originalAppointment,
      newStartTime,
      newEmployeeId: "b-pedro",
    });

    expect(payload.employeeId).toBe("b-pedro");
    expect(payload.startTime).toEqual(newStartTime);
    expect(payload.notes).toContain("Reagendado a partir de apt-101");
    expect(payload.origin).toBe("PORTAL_CLIENTE");

    // Teste de compatibilidade de Lista de Espera para o horário liberado
    const waitingList: WaitingListEntry[] = [
      {
        id: "wait-1",
        tenantId: "tenant-matriz",
        customerId: "cust-wait",
        serviceId: "srv-corte",
        preferredDate: new Date("2026-10-15T00:00:00Z"),
        preferredPeriod: "TARDE",
        employeeId: "b-carlos",
        status: "WAITING",
        priority: 1,
        createdAt: new Date(),
      },
    ];

    const matchingWaiters = findMatchingWaitingList(waitingList, {
      startTime: new Date("2026-10-15T14:00:00Z"),
      employeeId: "b-carlos",
      serviceId: "srv-corte",
    });

    expect(matchingWaiters.length).toBe(1);
    expect(matchingWaiters[0]?.customerId).toBe("cust-wait");
  });
});
