// BarberHub Pro ERP - WhatsApp Link Generator (Sem APIs Pagas)
// Protocolo Universal wa.me com formatação de mensagens determinística

/**
 * Normaliza o telefone para o formato internacional aceito pelo WhatsApp (DDI 55 para o Brasil)
 */
export function formatWhatsAppPhone(phoneRaw: string): string {
  const digits = phoneRaw.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export interface WhatsAppMessageParams {
  customerName: string;
  customerPhone: string;
  shopName: string;
  serviceName: string;
  barberName: string;
  formattedDate: string; // "30/09/2026"
  formattedTime: string; // "14:30"
  appointmentToken?: string;
  baseUrl?: string;
}

/**
 * Gera link universal oficial wa.me para confirmação de agendamento
 */
export function generateWhatsAppConfirmationLink(params: WhatsAppMessageParams): string {
  const {
    customerName,
    customerPhone,
    shopName,
    serviceName,
    barberName,
    formattedDate,
    formattedTime,
    appointmentToken,
    baseUrl = "https://barberhub.app",
  } = params;

  const phone = formatWhatsAppPhone(customerPhone);
  const linkText = appointmentToken
    ? `\n\nGerencie ou consulte seu agendamento aqui:\n${baseUrl}/agendamento/${appointmentToken}`
    : "";

  const message =
    `Olá, ${customerName}! 👋\n\n` +
    `Seu agendamento na *${shopName}* foi confirmado com sucesso!\n\n` +
    `💈 *Serviço:* ${serviceName}\n` +
    `✂️ *Profissional:* ${barberName}\n` +
    `📅 *Data:* ${formattedDate}\n` +
    `⏰ *Horário:* ${formattedTime}` +
    linkText;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Gera link universal oficial wa.me para cancelamento de agendamento
 */
export function generateWhatsAppCancellationLink(params: WhatsAppMessageParams): string {
  const { customerName, customerPhone, shopName, serviceName, formattedDate, formattedTime } =
    params;

  const phone = formatWhatsAppPhone(customerPhone);
  const message =
    `Olá, ${customerName}.\n\n` +
    `Informamos que o seu agendamento para *${serviceName}* na *${shopName}* do dia *${formattedDate}* às *${formattedTime}* foi cancelado.\n\n` +
    `Fique à vontade para escolher um novo horário quando desejar!`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
