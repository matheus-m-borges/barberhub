// BarberHub Pro ERP - Waiting List Service
// Fila de espera inteligente e motor determinístico de matching

import { z } from "zod";

export const PREFERRED_PERIODS = {
  MANHA: "MANHA",
  TARDE: "TARDE",
  NOITE: "NOITE",
  QUALQUER: "QUALQUER",
} as const;

export type PreferredPeriod = keyof typeof PREFERRED_PERIODS;

export interface WaitingListEntry {
  id: string;
  tenantId: string;
  customerId: string;
  serviceId: string;
  employeeId?: string | null;
  preferredDate: Date;
  preferredPeriod: PreferredPeriod;
  priority: number;
  status: "WAITING" | "NOTIFIED" | "BOOKED" | "CANCELED";
  createdAt: Date;
}

export const waitingListInputSchema = z.object({
  customerId: z.string().min(1, "Cliente é obrigatório"),
  serviceId: z.string().min(1, "Serviço é obrigatório"),
  employeeId: z.string().optional().nullable(),
  preferredDate: z.coerce.date(),
  preferredPeriod: z.enum(["MANHA", "TARDE", "NOITE", "QUALQUER"]).default("QUALQUER"),
  priority: z.number().int().min(1).max(5).default(1),
  notes: z.string().optional().nullable(),
});

export type WaitingListInput = z.infer<typeof waitingListInputSchema>;

/**
 * Determina se o horário do slot vago corresponde ao período preferido do cliente
 */
export function isPeriodCompatible(hour: number, period: PreferredPeriod): boolean {
  if (period === "QUALQUER") return true;
  if (period === "MANHA") return hour < 12;
  if (period === "TARDE") return hour >= 12 && hour < 18;
  if (period === "NOITE") return hour >= 18;
  return false;
}

/**
 * Compara se duas datas correspondem ao mesmo dia civil (ano, mês, dia UTC)
 */
export function isSameDay(dateA: Date, dateB: Date): boolean {
  return (
    dateA.getUTCFullYear() === dateB.getUTCFullYear() &&
    dateA.getUTCMonth() === dateB.getUTCMonth() &&
    dateA.getUTCDate() === dateB.getUTCDate()
  );
}

/**
 * Motor de Matching: Localiza clientes compatíveis na lista de espera para preencher um horário vago
 */
export function findMatchingWaitingList(
  entries: WaitingListEntry[],
  vacatedSlot: {
    startTime: Date;
    employeeId: string;
    serviceId?: string;
  }
): WaitingListEntry[] {
  // Usar getUTCHours para consistência com isSameDay (UTC)
  const slotHour = vacatedSlot.startTime.getUTCHours();

  const matching = entries.filter((entry) => {
    // 1. Apenas entradas ativas na fila
    if (entry.status !== "WAITING") return false;

    // 2. Mesma data civil
    if (!isSameDay(entry.preferredDate, vacatedSlot.startTime)) return false;

    // 3. Compatibilidade de período do dia
    if (!isPeriodCompatible(slotHour, entry.preferredPeriod)) return false;

    // 4. Barbeiro compatível (se o cliente especificou, deve ser o mesmo)
    if (entry.employeeId && entry.employeeId !== vacatedSlot.employeeId) return false;

    return true;
  });

  // Ordenar por prioridade (maior primeiro) e tempo de espera (mais antigo primeiro)
  return matching.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}
