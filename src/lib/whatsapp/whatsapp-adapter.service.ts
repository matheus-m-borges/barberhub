// BarberHub Pro ERP - Meta WhatsApp Cloud API Adapter
// Conecta o canal oficial do WhatsApp ao motor determinístico BotResponseEngine
// e à Central de Atendimento Omnichannel existente

import {
  type MetaWebhookPayload,
  type MetaOutboundMessagePayload,
  type WhatsAppCloudConfig,
  type WhatsAppSendResult,
  type MetaOutboundTextMessage,
  type MetaOutboundInteractiveButtonsMessage,
  type MetaOutboundInteractiveListMessage,
} from "./whatsapp.types";

import {
  type BotConversation,
  type BotMessage,
  type BotQuickAction,
  type BotDeliveryStatus,
} from "@/lib/bot/bot.types";

import {
  processBotMessage,
  type BotEngineContext,
} from "@/lib/bot/bot.engine";

import { whatsAppVault } from "./whatsapp-vault.service";
import type { CustomerItem } from "@/routes/index";
import type { AttendanceItem } from "@/components/modules/PosCheckoutView";

export interface WhatsAppInboundResult {
  success: boolean;
  tenantId?: string | undefined;
  unitId?: string | null | undefined;
  processedCount: number;
  updatedConversations: BotConversation[];
  createdAppointments: AttendanceItem[];
  outboundPayloads: MetaOutboundMessagePayload[];
  error?: string | undefined;
}

/**
 * Normaliza número de telefone para formato brasileiro canônico e internacional.
 */
export function normalizePhoneNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  // Se vier sem DDI 55 (ex: 11987654321), adiciona
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

/**
 * Formata telefone internacional (5511987654321) para exibição amigável: (11) 98765-4321
 */
export function formatDisplayPhone(phoneWithCountry: string): string {
  const digits = phoneWithCountry.replace(/\D/g, "");
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return phoneWithCountry;
}

/**
 * Verifica se a conversa está dentro da janela de 24 horas da Meta para mensagens livres.
 */
export function isWithin24hWindow(lastCustomerMessageTimestamp?: number): boolean {
  if (!lastCustomerMessageTimestamp) return true; // Nova conversa ou sem registro
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  return Date.now() - lastCustomerMessageTimestamp <= twentyFourHoursMs;
}

/**
 * Converte resposta do Bot em payload oficial da Meta Graph API
 * (Botões interativos se <= 3, Lista com seções se > 3, ou Texto puro)
 */
export function convertBotReplyToWhatsAppPayload(
  toPhone: string,
  botReply: BotMessage
): MetaOutboundMessagePayload {
  const cleanTo = normalizePhoneNumber(toPhone);
  const actions = botReply.quickActions || [];

  // 1. Se houver até 3 botões rápidos -> Interactive Buttons (Limite Meta: 3)
  if (actions.length > 0 && actions.length <= 3) {
    const interactiveButtons: MetaOutboundInteractiveButtonsMessage = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanTo,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: botReply.text,
        },
        action: {
          buttons: actions.map((act) => ({
            type: "reply",
            reply: {
              id: act.id,
              // O título do botão na Meta tem limite rígido de 20 caracteres
              title: act.label.slice(0, 20).trim(),
            },
          })),
        },
      },
    };
    return interactiveButtons;
  }

  // 2. Se houver mais de 3 botões -> Interactive List (Dropdown suporta até 10 itens por seção)
  if (actions.length > 3) {
    const interactiveList: MetaOutboundInteractiveListMessage = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanTo,
      type: "interactive",
      interactive: {
        type: "list",
        body: {
          text: botReply.text,
        },
        action: {
          button: "Ver Opções",
          sections: [
            {
              title: "Opções Disponíveis",
              rows: actions.slice(0, 10).map((act) => ({
                id: act.id,
                title: act.label.slice(0, 24).trim(),
                description: act.payload ? String(act.payload).slice(0, 72) : undefined,
              })),
            },
          ],
        },
      },
    };
    return interactiveList;
  }

  // 3. Texto Puro
  const textMsg: MetaOutboundTextMessage = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanTo,
    type: "text",
    text: {
      preview_url: false,
      body: botReply.text,
    },
  };
  return textMsg;
}

/**
 * Cria payload para envio de mensagem de atendente humano pela Central via WhatsApp oficial.
 * Valida a janela de atendimento de 24 horas da Meta.
 */
export function buildAttendantWhatsAppOutbound(params: {
  toPhone: string;
  text: string;
  lastCustomerMessageTimestamp?: number | undefined;
}): { payload: MetaOutboundTextMessage | null; error?: string } {
  const { toPhone, text, lastCustomerMessageTimestamp } = params;

  if (!isWithin24hWindow(lastCustomerMessageTimestamp)) {
    return {
      payload: null,
      error:
        "A janela de atendimento de 24 horas da Meta expirou. Para reabrir a conversa, envie um modelo de mensagem aprovado (Template) ou aguarde o cliente responder.",
    };
  }

  return {
    payload: {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhoneNumber(toPhone),
      type: "text",
      text: {
        preview_url: false,
        body: text,
      },
    },
  };
}

/**
 * Processador central de eventos de webhook do WhatsApp Cloud API.
 * Recebe o payload da Meta, identifica o tenant pelo phoneNumberId,
 * atualiza status de mensagens ou alimenta o motor de conversa determinístico.
 */
export function processWhatsAppWebhookInbound(params: {
  payload: MetaWebhookPayload;
  existingConversations: BotConversation[];
  customers: CustomerItem[];
  botContext: BotEngineContext;
}): WhatsAppInboundResult {
  const { payload, existingConversations, customers, botContext } = params;

  if (payload.object !== "whatsapp_business_account" || !payload.entry || payload.entry.length === 0) {
    return {
      success: false,
      processedCount: 0,
      updatedConversations: existingConversations,
      createdAppointments: [],
      outboundPayloads: [],
      error: "Payload de webhook inválido: objeto não reconhecido.",
    };
  }

  let processedCount = 0;
  let currentConversations = [...existingConversations];
  const createdAppointments: AttendanceItem[] = [];
  const outboundPayloads: MetaOutboundMessagePayload[] = [];
  let resolvedTenantId: string | undefined = undefined;
  let resolvedUnitId: string | null | undefined = undefined;

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") continue;
      const val = change.value;
      const phoneNumberId = val.metadata?.phone_number_id;

      // RESOLUÇÃO DE TENANT PELO PHONE NUMBER ID NO COFRE
      const vaultConfig = whatsAppVault.resolveByPhoneNumberId(phoneNumberId);
      if (vaultConfig) {
        resolvedTenantId = vaultConfig.tenantId;
        resolvedUnitId = vaultConfig.unitId;
      }

      // 1. Processar Atualizações de Status de Entrega (sent, delivered, read, failed)
      if (val.statuses && val.statuses.length > 0) {
        for (const statusUpdate of val.statuses) {
          const msgId = statusUpdate.id;
          const newStatus = statusUpdate.status as BotDeliveryStatus;

          currentConversations = currentConversations.map((conv) => {
            const hasTargetMsg = conv.messages.some((m) => m.whatsappMessageId === msgId);
            if (!hasTargetMsg) return conv;

            return {
              ...conv,
              deliveryStatus: newStatus,
              messages: conv.messages.map((m) =>
                m.whatsappMessageId === msgId ? { ...m, deliveryStatus: newStatus } : m
              ),
            };
          });
          processedCount++;
        }
      }

      // 2. Processar Mensagens Inbound do Cliente
      if (val.messages && val.messages.length > 0) {
        const contactProfile = val.contacts && val.contacts[0] ? val.contacts[0].profile.name : "Cliente WhatsApp";

        for (const inboundMsg of val.messages) {
          const fromRaw = inboundMsg.from; // "5511987654321"
          const displayPhone = formatDisplayPhone(fromRaw);
          const timeNow = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          const timeMs = Date.now();

          // Extrair texto ou resposta de botão/lista
          let messageText = "";
          let quickAction: BotQuickAction | undefined = undefined;

          if (inboundMsg.type === "text" && inboundMsg.text) {
            messageText = inboundMsg.text.body;
          } else if (inboundMsg.type === "interactive" && inboundMsg.interactive) {
            if (inboundMsg.interactive.button_reply) {
              const bReply = inboundMsg.interactive.button_reply;
              messageText = bReply.title;
              quickAction = {
                id: bReply.id,
                label: bReply.title,
                action: bReply.id.startsWith("act-") ? bReply.id.replace("act-", "").toUpperCase() : "SELECT_OPTION",
                payload: { id: bReply.id },
              };
            } else if (inboundMsg.interactive.list_reply) {
              const lReply = inboundMsg.interactive.list_reply;
              messageText = lReply.title;
              quickAction = {
                id: lReply.id,
                label: lReply.title,
                action: lReply.id.startsWith("act-") ? lReply.id.replace("act-", "").toUpperCase() : "SELECT_OPTION",
                payload: { id: lReply.id },
              };
            }
          }

          // LOCALIZAR OU CRIAR CONVERSA NO CANAL WHATSAPP_OFFICIAL
          let targetConv = currentConversations.find(
            (c) => c.channel === "WHATSAPP_OFFICIAL" && normalizePhoneNumber(c.customerPhone) === normalizePhoneNumber(fromRaw)
          );

          // VINCULAÇÃO AUTOMÁTICA AO CRM (Clientes Cadastrados)
          const matchedCustomer = customers.find((cust) => {
            const custNorm = normalizePhoneNumber(cust.phone);
            const fromNorm = normalizePhoneNumber(fromRaw);
            return custNorm === fromNorm || custNorm.endsWith(fromNorm.slice(-8));
          });

          const customerName = matchedCustomer?.name || contactProfile || displayPhone;
          const customerId = matchedCustomer?.id;

          if (!targetConv) {
            targetConv = {
              id: `conv-wa-${fromRaw}`,
              channel: "WHATSAPP_OFFICIAL",
              tenantId: resolvedTenantId || botContext.tenantId,
              unitId: resolvedUnitId || botContext.unitId,
              customerName,
              customerPhone: displayPhone,
              customerId,
              status: "BOT",
              lastMessage: messageText,
              lastTime: timeNow,
              lastTimestamp: timeMs,
              lastCustomerMessageTimestamp: timeMs,
              consecutiveFailures: 0,
              messages: [],
            };
          } else {
            targetConv = {
              ...targetConv,
              lastCustomerMessageTimestamp: timeMs,
              customerName: matchedCustomer?.name || targetConv.customerName,
              customerId: customerId || targetConv.customerId,
            };
          }

          // CLÁUSULA PÉTREA: SE EM ATENDIMENTO HUMANO, O BOT FICA CALADO
          if (targetConv.status === "EM_ATENDIMENTO" || targetConv.status === "AGUARDANDO_HUMANO") {
            const clientMsg: BotMessage = {
              id: inboundMsg.id || `m-wa-${timeMs}`,
              sender: "CLIENT",
              text: messageText,
              time: timeNow,
              timestamp: timeMs,
              whatsappMessageId: inboundMsg.id,
            };

            const updatedConv: BotConversation = {
              ...targetConv,
              lastMessage: messageText,
              lastTime: timeNow,
              lastTimestamp: timeMs,
              unreadByAgent: true,
              messages: [...targetConv.messages, clientMsg],
            };

            const idx = currentConversations.findIndex((c) => c.id === targetConv!.id);
            if (idx >= 0) {
              currentConversations[idx] = updatedConv;
            } else {
              currentConversations.push(updatedConv);
            }

            processedCount++;
            continue; // Não gera mensagem do bot
          }

          // SE BOT ATIVO, PROCESSAR DETERMINISTICAMENTE
          const enrichedContext: BotEngineContext = {
            ...botContext,
            tenantId: resolvedTenantId || botContext.tenantId,
            unitId: resolvedUnitId || botContext.unitId,
            authenticatedCustomer: matchedCustomer
              ? {
                  id: matchedCustomer.id,
                  name: matchedCustomer.name,
                  phone: matchedCustomer.phone,
                  points: matchedCustomer.loyaltyPoints,
                }
              : null,
          };

          const botResult = processBotMessage(messageText, targetConv, enrichedContext, quickAction);

          if (botResult.createdAppointment) {
            createdAppointments.push({
              ...botResult.createdAppointment,
              origin: "WHATSAPP", // Origem explícita
            });
          }

          // Pegar a resposta gerada para o cliente
          const latestBotMsg = botResult.updatedConversation.messages[botResult.updatedConversation.messages.length - 1];
          if (latestBotMsg && latestBotMsg.sender === "BOT") {
            const outboundMeta = convertBotReplyToWhatsAppPayload(fromRaw, latestBotMsg);
            outboundPayloads.push(outboundMeta);
          }

          const convIdx = currentConversations.findIndex((c) => c.id === targetConv!.id);
          if (convIdx >= 0) {
            currentConversations[convIdx] = botResult.updatedConversation;
          } else {
            currentConversations.push(botResult.updatedConversation);
          }

          processedCount++;
        }
      }
    }
  }

  return {
    success: true,
    tenantId: resolvedTenantId,
    unitId: resolvedUnitId,
    processedCount,
    updatedConversations: currentConversations,
    createdAppointments,
    outboundPayloads,
  };
}

/**
 * Envia uma mensagem via Meta WhatsApp Cloud API (Graph API).
 * Em ambiente de teste ou demonstração, simula o envio com sucesso retornando message ID realístico.
 */
export async function sendWhatsAppCloudMessage(params: {
  config: WhatsAppCloudConfig;
  payload: MetaOutboundMessagePayload;
}): Promise<WhatsAppSendResult> {
  const { config, payload } = params;

  if (!config.accessToken?.trim() || !config.phoneNumberId?.trim()) {
    return {
      success: false,
      error: "Credenciais do WhatsApp Cloud API incompletas ou ausentes no cofre deste tenant.",
    };
  }

  if (config.whatsappEnabled === false) {
    return {
      success: false,
      error: "Canal de WhatsApp está desabilitado para este estabelecimento.",
    };
  }

  try {
    const url = `https://graph.facebook.com/${config.graphApiVersion || "v21.0"}/${config.phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `Meta Graph API Error [${response.status}]: ${JSON.stringify(errJson)}`,
      };
    }

    const resData = (await response.json()) as any;
    return {
      success: true,
      messageId: resData?.messages?.[0]?.id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Falha na requisição para Graph API: ${err.message}`,
    };
  }
}
