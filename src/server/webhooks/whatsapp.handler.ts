// BarberHub Pro ERP - Meta WhatsApp Cloud API Webhook Handler
// Endpoint canônico multi-tenant para handshake e recebimento de mensagens e status

import {
  whatsAppVault,
  verifyMetaWebhookSignature,
  verifyWebhookHandshake,
} from "@/lib/whatsapp/whatsapp-vault.service";

import {
  processWhatsAppWebhookInbound,
  type WhatsAppInboundResult,
} from "@/lib/whatsapp/whatsapp-adapter.service";

import { type MetaWebhookPayload } from "@/lib/whatsapp/whatsapp.types";
import { type BotConversation } from "@/lib/bot/bot.types";
import { type BotEngineContext } from "@/lib/bot/bot.engine";
import type { CustomerItem } from "@/routes/index";

export interface WebhookGetQuery {
  "hub.mode"?: string | undefined;
  "hub.challenge"?: string | undefined;
  "hub.verify_token"?: string | undefined;
}

/**
 * Manipulador da verificação inicial da Meta (HTTP GET Handshake)
 */
export function handleWhatsAppWebhookGet(
  query: WebhookGetQuery,
  expectedVerifyToken?: string
): { status: number; body: string } {
  const token = query["hub.verify_token"];
  const mode = query["hub.mode"];
  const challenge = query["hub.challenge"];

  if (mode !== "subscribe" || !token || !challenge) {
    return { status: 403, body: "Parâmetros de verificação inválidos." };
  }

  // Se passou expectedVerifyToken explicitamente
  if (expectedVerifyToken) {
    if (token === expectedVerifyToken) {
      return { status: 200, body: challenge };
    }
    return { status: 403, body: "Verify token não confere com o configurado." };
  }

  // Token padrão
  if (token === "barberhub_meta_webhook_token_2026") {
    return { status: 200, body: challenge };
  }

  return { status: 403, body: "Falha na verificação de token do webhook da Meta." };
}

/**
 * Manipulador do recebimento de eventos da Meta (HTTP POST Webhook)
 */
export function handleWhatsAppWebhookPost(params: {
  headers?: Record<string, string | undefined> | undefined;
  signatureHeader?: string | null | undefined;
  rawBody: string;
  payload?: MetaWebhookPayload | undefined;
  existingConversations: BotConversation[];
  customers: CustomerItem[];
  botContext: BotEngineContext;
}): {
  status: number;
  result?: WhatsAppInboundResult | undefined;
  error?: string | undefined;
  body: { success?: boolean | undefined; processedCount?: number | undefined; error?: string | undefined };
} {
  const { headers = {}, signatureHeader, rawBody, payload, existingConversations, customers, botContext } = params;

  let parsedPayload: MetaWebhookPayload;
  try {
    parsedPayload = payload || (rawBody ? JSON.parse(rawBody) : {});
  } catch {
    return {
      status: 400,
      error: "JSON inválido no corpo da requisição.",
      body: { error: "JSON inválido no corpo da requisição." },
    };
  }

  // 1. Identificar Phone Number ID no payload para localizar o segredo no cofre
  const phoneNumberId = parsedPayload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
  const config = phoneNumberId ? whatsAppVault.resolveByPhoneNumberId(phoneNumberId) : null;

  // 2. Validação criptográfica da assinatura HMAC-SHA256 se appSecret estiver configurado
  const sigHeader = signatureHeader || headers["x-hub-signature-256"] || headers["X-Hub-Signature-256"];

  if (sigHeader) {
    if (!config?.appSecret) {
      return {
        status: 401,
        error: "App Secret não configurado para o tenant deste Phone Number ID. Requisição não autorizada.",
        body: { error: "App Secret não configurado" },
      };
    }
    const isValidSignature = verifyMetaWebhookSignature(rawBody, sigHeader, config.appSecret);
    if (!isValidSignature) {
      return {
        status: 401,
        error: "Assinatura do webhook inválida (HMAC-SHA256 mismatch). Requisição não autorizada.",
        body: { error: "Assinatura HMAC inválida" },
      };
    }
  }

  // 3. Processar payload através do adaptador
  const result = processWhatsAppWebhookInbound({
    payload: parsedPayload,
    existingConversations,
    customers,
    botContext,
  });

  if (!result.success) {
    return {
      status: 400,
      result,
      error: result.error,
      body: { success: false, error: result.error },
    };
  }

  return {
    status: 200,
    result,
    body: { success: true, processedCount: result.processedCount },
  };
}
