// BarberHub Pro ERP - Business Settings Service
// Regras determinísticas de funcionamento da barbearia

import { z } from "zod";

const timeStringRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const businessSettingSchema = z
  .object({
    businessName: z.string().min(2, "Nome da barbearia deve ter no mínimo 2 caracteres").trim(),
    weekdayOpeningTime: z
      .string()
      .regex(timeStringRegex, "Horário de abertura deve estar no formato HH:mm (ex: 08:00)"),
    weekdayClosingTime: z
      .string()
      .regex(timeStringRegex, "Horário de fechamento deve estar no formato HH:mm (ex: 19:00)"),
    intervalMinutes: z
      .number()
      .int()
      .refine((val) => [15, 20, 30, 45, 60].includes(val), {
        message: "Intervalo entre slots deve ser de 15, 20, 30, 45 ou 60 minutos",
      }),
    appointmentBufferMinutes: z.number().int().min(0).max(60).default(0),
    cancellationGraceMinutes: z
      .number()
      .int()
      .min(0, "Tolerância de cancelamento não pode ser negativa")
      .default(120),
    enableOnlineBooking: z.boolean().default(true),
    requirePhoneConfirmation: z.boolean().default(false),
  })
  .refine(
    (data) => {
      const [openHour = 0, openMin = 0] = data.weekdayOpeningTime.split(":").map(Number);
      const [closeHour = 0, closeMin = 0] = data.weekdayClosingTime.split(":").map(Number);
      const openMinutes = openHour * 60 + openMin;
      const closeMinutes = closeHour * 60 + closeMin;
      return closeMinutes > openMinutes;
    },
    {
      message: "Horário de fechamento deve ser posterior ao horário de abertura",
      path: ["weekdayClosingTime"],
    }
  );

export type BusinessSettingInput = z.infer<typeof businessSettingSchema>;

/**
 * Converte string 'HH:mm' para total de minutos desde a meia-noite
 */
export function timeStringToMinutes(timeStr: string): number {
  const [hours = 0, minutes = 0] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Verifica se um cancelamento está dentro do período de tolerância gratuita
 */
export function isCancellationFree(
  appointmentStartTime: Date,
  cancellationGraceMinutes: number,
  now = new Date()
): { isFree: boolean; minutesUntilStart: number } {
  const diffMs = appointmentStartTime.getTime() - now.getTime();
  const minutesUntilStart = Math.floor(diffMs / (1000 * 60));

  return {
    isFree: minutesUntilStart >= cancellationGraceMinutes,
    minutesUntilStart,
  };
}
