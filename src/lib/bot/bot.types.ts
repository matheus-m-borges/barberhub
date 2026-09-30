// BarberHub Pro ERP - Bot & Omnichannel Support Types
// Ponto único de tipagem para o Assistente Web, WhatsApp Cloud API Oficial e Central de Atendimento

export type BotSender = "BOT" | "CLIENT" | "AGENT" | "SYSTEM";

export type BotConversationStatus =
  | "BOT"
  | "AGUARDANDO_HUMANO"
  | "EM_ATENDIMENTO"
  | "FINALIZADO";

export type BotDeliveryStatus = "sent" | "delivered" | "read" | "failed";

export type BotIntent =
  | "SAUDACAO"
  | "AGENDAMENTO"
  | "CONSULTAR_AGENDAMENTO"
  | "CANCELAR_AGENDAMENTO"
  | "REMARCAR_AGENDAMENTO"
  | "HORARIO_FUNCIONAMENTO"
  | "ENDERECO"
  | "SERVICOS"
  | "PRECO_SERVICO"
  | "PROFISSIONAIS"
  | "PLANOS"
  | "FIDELIDADE"
  | "PONTOS"
  | "RECOMPENSAS"
  | "PROMOCOES"
  | "FORMAS_PAGAMENTO"
  | "FALAR_HUMANO"
  | "WHATSAPP"
  | "DESPEDIDA"
  | "DESCONHECIDO";

export interface BotQuickAction {
  id: string;
  label: string;
  action: string; // Ex: "SELECT_SERVICE", "REQUEST_HUMAN", "OPEN_WHATSAPP", "TRIGGER_INTENT"
  payload?: any;
  variant?: "default" | "primary" | "whatsapp" | "outline" | undefined;
}

export interface BotBookingState {
  serviceId?: string | undefined;
  serviceName?: string | undefined;
  servicePrice?: number | undefined;
  employeeId?: string | undefined; // "ANY" ou ID do barbeiro
  barberName?: string | undefined;
  dateStr?: string | undefined; // YYYY-MM-DD
  timeSlot?: string | undefined; // HH:mm
  customerName?: string | undefined;
  customerPhone?: string | undefined;
  customerId?: string | undefined;
  notes?: string | undefined;
}

export type BotBookingStep =
  | "SELECT_SERVICE"
  | "SELECT_BARBER"
  | "SELECT_DATE"
  | "SELECT_TIME"
  | "INPUT_CUSTOMER"
  | "CONFIRM"
  | "COMPLETED";

export interface BotMessage {
  id: string;
  sender: BotSender;
  text: string;
  time: string;
  timestamp?: number | undefined;
  quickActions?: BotQuickAction[] | undefined;
  bookingStep?: BotBookingStep | undefined;
  bookingData?: Partial<BotBookingState> | undefined;
  cardData?: any | undefined;
  whatsappMessageId?: string | undefined;
  deliveryStatus?: BotDeliveryStatus | undefined;
}

export interface BotConversation {
  id: string;
  channel: "WEB_CHAT" | "WHATSAPP_OFFICIAL" | "WHATSAPP_MANUAL";
  tenantId?: string | undefined;
  unitId?: string | null | undefined;
  customerName: string;
  customerPhone: string;
  customerId?: string | undefined;
  status: BotConversationStatus;
  assignedAgent?: string | null | undefined;
  assignedAgentId?: string | null | undefined;
  acceptedAt?: string | null | undefined;
  lastMessage: string;
  lastTime: string;
  lastTimestamp?: number | undefined;
  lastCustomerMessageTimestamp?: number | undefined; // Para cálculo da janela de 24h da Meta
  unreadByAgent?: boolean | undefined;
  unreadByClient?: boolean | undefined;
  consecutiveFailures: number;
  bookingState?: BotBookingState | undefined;
  deliveryStatus?: BotDeliveryStatus | undefined;
  messages: BotMessage[];
}

export interface BotKnowledgeFaq {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
}

// Compatibilidade estrita com interfaces legadas de CentralAtendimentoView
export type BotChatMessage = BotMessage;
export type ChatConversation = BotConversation;
