// BarberHub Pro ERP - Meta WhatsApp Cloud API Types & Contracts
// Especificação estrita da Meta Graph API v21.0 - Multi-Tenant e Isolado por Barbearia

export type WhatsAppConnectionStatus =
  | "NOT_CONFIGURED"
  | "CONFIGURED"
  | "VALIDATING"
  | "CONNECTED"
  | "ERROR"
  | "DISCONNECTED";

export interface MetaValidationResult {
  success: boolean;
  status: WhatsAppConnectionStatus;
  metaData?: {
    verifiedName?: string | undefined;
    displayPhoneNumber?: string | undefined;
    qualityRating?: string | undefined;
    codeVerificationStatus?: string | undefined;
  } | undefined;
  error?: string | undefined;
}

export interface WhatsAppCloudConfig {
  id: string;
  tenantId: string;
  unitId?: string | null | undefined;
  wabaId: string; // WhatsApp Business Account ID
  phoneNumberId: string; // Phone Number ID (Chave única de resolução do webhook)
  displayPhoneNumber: string; // Ex: "+55 86 981116254" (Telefone de exibição real associado)
  accessToken: string; // Token do Sistema Permanente Meta (armazenado no cofre)
  appId?: string | undefined; // Meta App ID
  appSecret?: string | undefined; // Meta App Secret (usado para validar assinatura HMAC-SHA256)
  verifyToken: string; // Token secreto configurado pelo tenant para handshake GET do webhook
  graphApiVersion: string; // Ex: "v21.0"
  status: WhatsAppConnectionStatus;
  webhookUrl?: string | undefined;

  // Evidências e auditoria de validação real
  lastValidatedAt?: string | undefined;
  lastValidationError?: string | undefined;
  verifiedName?: string | undefined;
  qualityRating?: string | undefined;

  // Canais e flags operacionais independentes
  whatsappEnabled?: boolean | undefined;
  whatsappBotEnabled?: boolean | undefined;
  whatsappHumanHandoffEnabled?: boolean | undefined;
  webChatEnabled?: boolean | undefined;
  webChatBotEnabled?: boolean | undefined;
  webChatHumanHandoffEnabled?: boolean | undefined;

  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// PAYLOADS INBOUND DO WEBHOOK OFICIAL DA META
// -------------------------------------------------------------
export interface MetaWebhookContact {
  profile: {
    name: string;
  };
  wa_id: string; // Telefone internacional: "5511987654321"
}

export interface MetaWebhookTextMessage {
  body: string;
}

export interface MetaWebhookInteractiveMessage {
  type: "button_reply" | "list_reply";
  button_reply?: {
    id: string;
    title: string;
  };
  list_reply?: {
    id: string;
    title: string;
    description?: string;
  };
}

export interface MetaWebhookInboundMessage {
  from: string; // "5511987654321"
  id: string; // "wamid.HBg..."
  timestamp: string; // "1727712345"
  type: "text" | "interactive" | "button" | "unknown";
  text?: MetaWebhookTextMessage | undefined;
  interactive?: MetaWebhookInteractiveMessage | undefined;
}

export interface MetaWebhookStatusUpdate {
  id: string; // Message ID original da mensagem
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
    message?: string;
  }> | undefined;
}

export interface MetaWebhookValue {
  messaging_product: "whatsapp";
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: MetaWebhookContact[] | undefined;
  messages?: MetaWebhookInboundMessage[] | undefined;
  statuses?: MetaWebhookStatusUpdate[] | undefined;
}

export interface MetaWebhookChange {
  field: "messages";
  value: MetaWebhookValue;
}

export interface MetaWebhookEntry {
  id: string; // WABA ID
  changes: MetaWebhookChange[];
}

export interface MetaWebhookPayload {
  object: "whatsapp_business_account";
  entry: MetaWebhookEntry[];
}

// -------------------------------------------------------------
// PAYLOADS OUTBOUND (ENVIADOS PARA A META GRAPH API)
// -------------------------------------------------------------
export interface MetaOutboundTextMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string; // Número destino: "5511987654321"
  type: "text";
  text: {
    preview_url?: boolean;
    body: string;
  };
}

export interface MetaInteractiveButtonAction {
  buttons: Array<{
    type: "reply";
    reply: {
      id: string;
      title: string; // Máximo 20 caracteres por restrição da Meta
    };
  }>;
}

export interface MetaInteractiveListSectionRow {
  id: string;
  title: string; // Máximo 24 caracteres
  description?: string | undefined; // Máximo 72 caracteres
}

export interface MetaInteractiveListSection {
  title: string;
  rows: MetaInteractiveListSectionRow[];
}

export interface MetaInteractiveListAction {
  button: string; // Texto do botão dropdown (ex: "Ver Horários")
  sections: MetaInteractiveListSection[];
}

export interface MetaOutboundInteractiveButtonsMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "interactive";
  interactive: {
    type: "button";
    body: {
      text: string;
    };
    footer?: {
      text: string;
    } | undefined;
    action: MetaInteractiveButtonAction;
  };
}

export interface MetaOutboundInteractiveListMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "interactive";
  interactive: {
    type: "list";
    header?: {
      type: "text";
      text: string;
    } | undefined;
    body: {
      text: string;
    };
    footer?: {
      text: string;
    } | undefined;
    action: MetaInteractiveListAction;
  };
}

export type MetaOutboundMessagePayload =
  | MetaOutboundTextMessage
  | MetaOutboundInteractiveButtonsMessage
  | MetaOutboundInteractiveListMessage;

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string | undefined;
  error?: string | undefined;
  isOutside24hWindow?: boolean | undefined;
}
