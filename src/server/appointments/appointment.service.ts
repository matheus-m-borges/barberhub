// BarberHub Pro ERP - Appointment Service
// Regras determinísticas de criação, status e transições de agendamentos

import crypto from "node:crypto";
import { z } from "zod";

export const APPOINTMENT_STATUS = {
  AGENDADO: "AGENDADO",
  CONFIRMADO: "CONFIRMADO",
  AGUARDANDO: "AGUARDANDO",
  EM_ATENDIMENTO: "EM_ATENDIMENTO",
  CONCLUIDO: "CONCLUIDO",
  CANCELADO: "CANCELADO",
  NAO_COMPARECEU: "NAO_COMPARECEU",
} as const;

export type AppointmentStatus = keyof typeof APPOINTMENT_STATUS;

/**
 * Gera um código human-readable curto e único (ex: BH-782914)
 */
export function generateAppointmentCode(): string {
  const num = crypto.randomInt(100000, 999999);
  return `BH-${num}`;
}

/**
 * Gera token criptográfico não previsível de 32 bytes (64 hex chars)
 * Usado para a URL pública /agendamento/:token
 */
export function generatePublicAppointmentToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Máquina de Estados Estrita para o ciclo de vida do Agendamento
 */
const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  AGENDADO: ["CONFIRMADO", "AGUARDANDO", "CANCELADO", "NAO_COMPARECEU"],
  CONFIRMADO: ["AGUARDANDO", "EM_ATENDIMENTO", "CANCELADO", "NAO_COMPARECEU"],
  AGUARDANDO: ["EM_ATENDIMENTO", "CANCELADO", "NAO_COMPARECEU"],
  EM_ATENDIMENTO: ["CONCLUIDO", "CANCELADO"],
  CONCLUIDO: [], // Terminal
  CANCELADO: [], // Terminal
  NAO_COMPARECEU: [], // Terminal
};

export function canTransitionStatus(
  current: AppointmentStatus,
  target: AppointmentStatus
): boolean {
  if (current === target) return true;
  const allowed = VALID_TRANSITIONS[current] || [];
  return allowed.includes(target);
}

export function assertValidStatusTransition(
  current: AppointmentStatus,
  target: AppointmentStatus
): void {
  if (!canTransitionStatus(current, target)) {
    throw new Error(
      `Transição de status inválida: não é permitido alterar de '${current}' para '${target}'.`
    );
  }
}

export const appointmentCreateSchema = z.object({
  customerId: z.string().min(1, "Cliente é obrigatório"),
  employeeId: z.string().min(1, "Barbeiro é obrigatório"),
  unitId: z.string().optional().nullable(),
  origin: z
    .enum(["SITE", "BOT", "PORTAL_CLIENTE", "RECEPCAO", "TELEFONE", "WHATSAPP_MANUAL", "ENCAIXE"])
    .default("SITE"),
  startTime: z.coerce.date(),
  services: z
    .array(
      z.object({
        serviceId: z.string().min(1),
        price: z.number().min(0),
        durationMinutes: z.number().int().min(5),
        commissionValue: z.number().min(0).default(0),
      })
    )
    .min(1, "Selecione ao menos um serviço"),
  isFitting: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});

export type AppointmentCreateInput = z.input<typeof appointmentCreateSchema>;

/**
 * Constrói payload seguro para criação com garantia de tenant e cálculo exato de término
 */
export function buildAppointmentCreatePayload(
  tenantId: string,
  input: AppointmentCreateInput
) {
  if (!tenantId) {
    throw new Error("tenantId é obrigatório para agendamento.");
  }
  const validated = appointmentCreateSchema.parse(input);

  const totalDuration = validated.services.reduce(
    (acc, curr) => acc + curr.durationMinutes,
    0
  );
  const totalPrice = validated.services.reduce(
    (acc, curr) => acc + curr.price,
    0
  );

  const start = new Date(validated.startTime);
  const end = new Date(start.getTime() + totalDuration * 60 * 1000);

  return {
    tenantId,
    unitId: validated.unitId ?? null,
    code: generateAppointmentCode(),
    token: generatePublicAppointmentToken(),
    origin: validated.origin,
    customerId: validated.customerId,
    employeeId: validated.employeeId,
    startTime: start,
    endTime: end,
    durationMinutes: totalDuration,
    totalPrice: Math.round(totalPrice * 100) / 100,
    status: APPOINTMENT_STATUS.AGENDADO,
    isFitting: validated.isFitting,
    notes: validated.notes ?? null,
    services: validated.services,
  };
}

/**
 * Constrói payload de reagendamento seguro
 */
export function buildReschedulePayload(params: {
  originalAppointment: {
    id: string;
    tenantId: string;
    customerId: string;
    employeeId: string;
    services: Array<{
      serviceId: string;
      price: number;
      durationMinutes: number;
      commissionValue: number;
    }>;
  };
  newStartTime: Date;
  newEmployeeId?: string;
}) {
  const { originalAppointment, newStartTime, newEmployeeId } = params;

  return buildAppointmentCreatePayload(originalAppointment.tenantId, {
    customerId: originalAppointment.customerId,
    employeeId: newEmployeeId || originalAppointment.employeeId,
    startTime: newStartTime,
    services: originalAppointment.services,
    origin: "PORTAL_CLIENTE",
    isFitting: false,
    notes: `Reagendado a partir de ${originalAppointment.id}`,
  });
}
