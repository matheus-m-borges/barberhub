import { describe, it, expect, beforeEach } from "vitest";
import crypto from "node:crypto";
import {
  whatsAppVault,
  maskSecret,
  verifyMetaWebhookSignature,
  verifyWebhookHandshake,
} from "../src/lib/whatsapp/whatsapp-vault.service";
import {
  normalizePhoneNumber,
  formatDisplayPhone,
  isWithin24hWindow,
  convertBotReplyToWhatsAppPayload,
  buildAttendantWhatsAppOutbound,
  processWhatsAppWebhookInbound,
  sendWhatsAppCloudMessage,
} from "../src/lib/whatsapp/whatsapp-adapter.service";
import {
  handleWhatsAppWebhookGet,
  handleWhatsAppWebhookPost,
} from "../src/server/webhooks/whatsapp.handler";
import type { MetaWebhookPayload, WhatsAppCloudConfig } from "../src/lib/whatsapp/whatsapp.types";
import type { BotConversation, BotMessage } from "../src/lib/bot/bot.types";
import type { BotEngineContext } from "../src/lib/bot/bot.engine";
import type { CustomerItem } from "../src/routes/index";

describe("BarberHub Pro — WhatsApp Cloud API Oficial Suite", () => {
  const mockTenantMatriz = "tenant-matriz";
  const mockTenantFilial = "tenant-filial-pinheiros";

  const mockContext: BotEngineContext = {
    tenantId: mockTenantMatriz,
    unitId: "unit-central",
    businessSettings: {
      name: "BarberHub Studio Moema",
      phone: "(11) 98765-4321",
      address: "Av. Moema, 450 - Moema, São Paulo - SP",
      weekdayOpeningTime: "09:00",
      weekdayClosingTime: "20:00",
      saturdayOpeningTime: "08:30",
      saturdayClosingTime: "19:00",
      intervalMinutes: 30,
      appointmentBufferMinutes: 0,
    },
    services: [
      { id: "srv-1", name: "Corte Tradicional", price: 50, duration: "40 min", durationMinutes: 40, isActive: true },
      { id: "srv-2", name: "Barba & Toalha Quente", price: 40, duration: "30 min", durationMinutes: 30, isActive: true },
      { id: "srv-3", name: "Combo Cabelo + Barba", price: 80, duration: "60 min", durationMinutes: 60, isActive: true },
      { id: "srv-4", name: "Pigmentação", price: 35, duration: "25 min", durationMinutes: 25, isActive: true },
    ],
    employees: [
      { id: "emp-carlos", name: "Carlos Barbeiro", role: "BARBEIRO", status: "ACTIVE", unitId: "unit-central" },
      { id: "emp-pedro", name: "Pedro Silva", role: "BARBEIRO", status: "ACTIVE", unitId: "unit-central" },
    ],
    attendances: [],
    loyaltySettings: {
      pointsPerReal: 1.0,
    },
    loyaltyRewards: [],
    faqList: [
      {
        id: "faq-estacionamento",
        category: "Comodidades",
        question: "Possuem estacionamento?",
        answer: "Sim! Temos convênio com o estacionamento Estapar ao lado da barbearia.",
        keywords: ["estacionamento", "carro", "vaga"],
      },
    ],
    humanWorkingHours: { start: "09:00", end: "19:00" },
  };

  const mockCustomers: CustomerItem[] = [
    {
      id: "cust-rodrigo",
      name: "Rodrigo Alencar",
      phone: "(11) 97123-4567",
      email: "rodrigo@email.com",
      status: "ACTIVE",
      totalSpent: 420.0,
      appointmentsCount: 6,
      loyaltyPoints: 420,
    },
    {
      id: "cust-marcos",
      name: "Marcos Vinicius",
      phone: "(11) 98888-7777",
      email: "marcos@email.com",
      status: "ACTIVE",
      totalSpent: 120.0,
      appointmentsCount: 2,
      loyaltyPoints: 120,
    },
  ];

  beforeEach(() => {
    whatsAppVault.clearForTesting();

    // Registra Matriz
    whatsAppVault.saveConfig(mockTenantMatriz, {
      id: "waba-matriz",
      tenantId: mockTenantMatriz,
      unitId: "unit-central",
      wabaId: "109876543210987",
      phoneNumberId: "101112131415161",
      displayPhoneNumber: "+55 11 98765-4321",
      accessToken: "EAAG_MATRIZ_SECURE_TOKEN_2026",
      appId: "987654321098765",
      appSecret: "secret_meta_matriz_2026",
      verifyToken: "token_handshake_matriz",
      graphApiVersion: "v21.0",
      status: "ACTIVE",
      createdAt: "2026-09-30T10:00:00Z",
      updatedAt: "2026-09-30T10:00:00Z",
    });

    // Registra Filial Pinheiros (Tenant isolado)
    whatsAppVault.saveConfig(mockTenantFilial, {
      id: "waba-pinheiros",
      tenantId: mockTenantFilial,
      unitId: "unit-pinheiros",
      wabaId: "209876543210999",
      phoneNumberId: "202223242526272",
      displayPhoneNumber: "+55 11 91234-5678",
      accessToken: "EAAG_PINHEIROS_SECURE_TOKEN_2026",
      appId: "987654321098765",
      appSecret: "secret_meta_pinheiros_2026",
      verifyToken: "token_handshake_pinheiros",
      graphApiVersion: "v21.0",
      status: "ACTIVE",
      createdAt: "2026-09-30T10:00:00Z",
      updatedAt: "2026-09-30T10:00:00Z",
    });
  });

  // =========================================================================
  // 1. COFRE DE CREDENCIAIS & ISOLAMENTO MULTI-TENANT (ANTI-IDOR)
  // =========================================================================
  describe("1. Cofre de Credenciais & Isolamento Multi-Tenant", () => {
    it("deve permitir que o tenant acesse suas próprias credenciais", () => {
      const config = whatsAppVault.getConfig(mockTenantMatriz, mockTenantMatriz);
      expect(config).not.toBeNull();
      expect(config?.phoneNumberId).toBe("101112131415161");
      expect(config?.displayPhoneNumber).toBe("+55 11 98765-4321");
    });

    it("deve lançar violação de segurança Anti-IDOR se um tenant tentar acessar outro tenant", () => {
      expect(() => {
        whatsAppVault.getConfig(mockTenantMatriz, mockTenantFilial);
      }).toThrow(/CROSS_TENANT_ACCESS_DENIED/i);
    });

    it("deve resolver a barbearia correta pelo Phone Number ID recebido da Meta", () => {
      const resolvedMatriz = whatsAppVault.resolveByPhoneNumberId("101112131415161");
      expect(resolvedMatriz?.tenantId).toBe(mockTenantMatriz);
      expect(resolvedMatriz?.unitId).toBe("unit-central");

      const resolvedFilial = whatsAppVault.resolveByPhoneNumberId("202223242526272");
      expect(resolvedFilial?.tenantId).toBe(mockTenantFilial);
      expect(resolvedFilial?.unitId).toBe("unit-pinheiros");
    });

    it("deve retornar null se o Phone Number ID não estiver cadastrado em nenhum tenant", () => {
      const notFound = whatsAppVault.resolveByPhoneNumberId("999999999999999");
      expect(notFound).toBeNull();
    });

    it("deve mascarar tokens e segredos para exibição segura na interface", () => {
      const masked = whatsAppVault.getMaskedConfig(mockTenantMatriz, mockTenantMatriz);
      expect(masked?.accessToken).toBe("EAAG...2026");
      expect(masked?.appSecret).toBe("secr...2026");
      expect(maskSecret("short")).toBe("********");
    });
  });

  // =========================================================================
  // 2. VALIDAÇÃO CRIPTOGRÁFICA (HMAC-SHA256) E HANDSHAKE DO WEBHOOK
  // =========================================================================
  describe("2. Validação Criptográfica e Handshake", () => {
    it("deve validar o handshake GET da Meta quando o verifyToken for idêntico", () => {
      const challenge = "meta_challenge_123456789";
      const result = verifyWebhookHandshake({
        mode: "subscribe",
        verifyToken: "token_handshake_matriz",
        challenge,
        expectedToken: "token_handshake_matriz",
      });
      expect(result).toBe(challenge);
    });

    it("deve rejeitar o handshake GET com token incorreto ou modo inválido", () => {
      const result = verifyWebhookHandshake({
        mode: "subscribe",
        verifyToken: "token_falso",
        challenge: "chal",
        expectedToken: "token_handshake_matriz",
      });
      expect(result).toBeNull();
    });

    it("deve validar com sucesso a assinatura HMAC-SHA256 da Meta", () => {
      const rawBody = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
      const appSecret = "secret_meta_matriz_2026";
      const digest = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
      const signatureHeader = `sha256=${digest}`;

      const isValid = verifyMetaWebhookSignature(rawBody, signatureHeader, appSecret);
      expect(isValid).toBe(true);
    });

    it("deve rejeitar requisição com assinatura HMAC forjada ou payload adulterado", () => {
      const rawBody = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
      const tamperedBody = JSON.stringify({ object: "whatsapp_business_account", entry: [], tampered: true });
      const appSecret = "secret_meta_matriz_2026";
      const digest = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
      const signatureHeader = `sha256=${digest}`;

      const isValid = verifyMetaWebhookSignature(tamperedBody, signatureHeader, appSecret);
      expect(isValid).toBe(false);
    });
  });

  // =========================================================================
  // 3. ADAPTADOR DE ENTRADA (MENSAGENS TEXTO, BOTÕES, LISTAS, CRM)
  // =========================================================================
  describe("3. Adaptador de Entrada (Inbound Webhook)", () => {
    it("deve processar mensagem de texto de novo cliente e responder determinísticamente", () => {
      const payload: MetaWebhookPayload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "109876543210987",
            changes: [
              {
                value: {
                  messaging_product: "whatsapp",
                  metadata: {
                    display_phone_number: "5511987654321",
                    phone_number_id: "101112131415161",
                  },
                  contacts: [
                    {
                      profile: { name: "Lucas Moura" },
                      wa_id: "5511999991111",
                    },
                  ],
                  messages: [
                    {
                      from: "5511999991111",
                      id: "wamid.msg1",
                      timestamp: String(Math.floor(Date.now() / 1000)),
                      type: "text",
                      text: { body: "Olá, quais os serviços de vocês?" },
                    },
                  ],
                },
                field: "messages",
              },
            ],
          },
        ],
      };

      const result = processWhatsAppWebhookInbound({
        payload,
        existingConversations: [],
        customers: mockCustomers,
        botContext: mockContext,
      });

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(1);
      expect(result.tenantId).toBe(mockTenantMatriz);
      expect(result.updatedConversations.length).toBe(1);

      const conv = result.updatedConversations[0]!;
      expect(conv.channel).toBe("WHATSAPP_OFFICIAL");
      expect(conv.customerName).toBe("Lucas Moura");
      expect(conv.customerPhone).toBe("(11) 99999-1111");
      expect(conv.status).toBe("BOT");

      // Bot deve ter retornado resposta determinística
      expect(result.outboundPayloads.length).toBe(1);
      const outbound = result.outboundPayloads[0]!;
      expect(outbound.to).toBe("5511999991111");
      expect(outbound.type).toBe("interactive");
    });

    it("deve vincular automaticamente cliente cadastrado no CRM pelo telefone", () => {
      const payload: MetaWebhookPayload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "109876543210987",
            changes: [
              {
                value: {
                  messaging_product: "whatsapp",
                  metadata: {
                    display_phone_number: "5511987654321",
                    phone_number_id: "101112131415161",
                  },
                  contacts: [
                    {
                      profile: { name: "Rodrigo" },
                      wa_id: "5511971234567",
                    },
                  ],
                  messages: [
                    {
                      from: "5511971234567",
                      id: "wamid.msg2",
                      timestamp: String(Math.floor(Date.now() / 1000)),
                      type: "text",
                      text: { body: "Gostaria de agendar um horário" },
                    },
                  ],
                },
                field: "messages",
              },
            ],
          },
        ],
      };

      const result = processWhatsAppWebhookInbound({
        payload,
        existingConversations: [],
        customers: mockCustomers,
        botContext: mockContext,
      });

      expect(result.success).toBe(true);
      const conv = result.updatedConversations[0]!;
      expect(conv.customerId).toBe("cust-rodrigo");
      expect(conv.customerName).toBe("Rodrigo Alencar"); // Usa nome do CRM
    });

    it("deve processar resposta de botão interativo (interactive button_reply)", () => {
      const existingConv: BotConversation = {
        id: "conv-wa-btn",
        channel: "WHATSAPP_OFFICIAL",
        customerName: "Rodrigo Alencar",
        customerPhone: "(11) 97123-4567",
        customerId: "cust-rodrigo",
        status: "BOT",
        lastMessage: "Selecione uma opção",
        lastTime: "10:00",
        consecutiveFailures: 0,
        messages: [],
      };

      const payload: MetaWebhookPayload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "109876543210987",
            changes: [
              {
                value: {
                  messaging_product: "whatsapp",
                  metadata: {
                    display_phone_number: "5511987654321",
                    phone_number_id: "101112131415161",
                  },
                  messages: [
                    {
                      from: "5511971234567",
                      id: "wamid.btn1",
                      timestamp: String(Math.floor(Date.now() / 1000)),
                      type: "interactive",
                      interactive: {
                        type: "button_reply",
                        button_reply: {
                          id: "act-human",
                          title: "Falar com Atendente",
                        },
                      },
                    },
                  ],
                },
                field: "messages",
              },
            ],
          },
        ],
      };

      const result = processWhatsAppWebhookInbound({
        payload,
        existingConversations: [existingConv],
        customers: mockCustomers,
        botContext: mockContext,
      });

      const updated = result.updatedConversations.find((c) => c.id === "conv-wa-btn")!;
      expect(updated.status).toBe("AGUARDANDO_HUMANO");
    });

    it("deve silenciar o bot se a conversa já estiver EM_ATENDIMENTO por humano", () => {
      const convInAttendance: BotConversation = {
        id: "conv-wa-human",
        channel: "WHATSAPP_OFFICIAL",
        customerName: "Rodrigo Alencar",
        customerPhone: "(11) 97123-4567",
        customerId: "cust-rodrigo",
        status: "EM_ATENDIMENTO",
        assignedAgent: "Carlos Barbeiro",
        lastMessage: "Combinado às 14h!",
        lastTime: "10:30",
        consecutiveFailures: 0,
        messages: [],
      };

      const payload: MetaWebhookPayload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "109876543210987",
            changes: [
              {
                value: {
                  messaging_product: "whatsapp",
                  metadata: {
                    display_phone_number: "5511987654321",
                    phone_number_id: "101112131415161",
                  },
                  messages: [
                    {
                      from: "5511971234567",
                      id: "wamid.msg-silence",
                      timestamp: String(Math.floor(Date.now() / 1000)),
                      type: "text",
                      text: { body: "Obrigado Carlos, estou a caminho!" },
                    },
                  ],
                },
                field: "messages",
              },
            ],
          },
        ],
      };

      const result = processWhatsAppWebhookInbound({
        payload,
        existingConversations: [convInAttendance],
        customers: mockCustomers,
        botContext: mockContext,
      });

      // Bot não deve enviar nenhuma resposta automática
      expect(result.outboundPayloads.length).toBe(0);

      // Conversa deve ter sido atualizada com a mensagem do cliente para o atendente
      const updated = result.updatedConversations.find((c) => c.id === "conv-wa-human")!;
      expect(updated.lastMessage).toBe("Obrigado Carlos, estou a caminho!");
      expect(updated.status).toBe("EM_ATENDIMENTO");
    });
  });

  // =========================================================================
  // 4. ATUALIZAÇÕES DE STATUS DE ENTREGA (SENT, DELIVERED, READ)
  // =========================================================================
  describe("4. Atualizações de Status de Entrega (Delivery Status)", () => {
    it("deve atualizar status da mensagem para 'delivered' e 'read'", () => {
      const convWithOutbound: BotConversation = {
        id: "conv-status-test",
        channel: "WHATSAPP_OFFICIAL",
        customerName: "Rodrigo Alencar",
        customerPhone: "(11) 97123-4567",
        status: "EM_ATENDIMENTO",
        lastMessage: "Seu horário está confirmado!",
        lastTime: "10:00",
        consecutiveFailures: 0,
        messages: [
          {
            id: "m-outbound-1",
            sender: "AGENT",
            text: "Seu horário está confirmado!",
            time: "10:00",
            whatsappMessageId: "wamid.track123",
            deliveryStatus: "sent",
          },
        ],
      };

      const payloadStatus: MetaWebhookPayload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "109876543210987",
            changes: [
              {
                value: {
                  messaging_product: "whatsapp",
                  metadata: {
                    display_phone_number: "5511987654321",
                    phone_number_id: "101112131415161",
                  },
                  statuses: [
                    {
                      id: "wamid.track123",
                      status: "read",
                      timestamp: String(Math.floor(Date.now() / 1000)),
                      recipient_id: "5511971234567",
                    },
                  ],
                },
                field: "messages",
              },
            ],
          },
        ],
      };

      const result = processWhatsAppWebhookInbound({
        payload: payloadStatus,
        existingConversations: [convWithOutbound],
        customers: mockCustomers,
        botContext: mockContext,
      });

      const updated = result.updatedConversations.find((c) => c.id === "conv-status-test")!;
      expect(updated.messages[0]?.deliveryStatus).toBe("read");
    });
  });

  // =========================================================================
  // 5. FORMATAÇÃO DE PAYLOADS DE SAÍDA (BOTÕES <= 3, LISTA > 3, TEXTO)
  // =========================================================================
  describe("5. Formatação de Payloads Meta Graph API", () => {
    it("deve converter resposta com até 3 opções em interactive button", () => {
      const botMsg: BotMessage = {
        id: "msg-3btn",
        sender: "BOT",
        text: "Escolha uma opção:",
        time: "12:00",
        quickActions: [
          { id: "act-1", label: "Opção 1", action: "TRIGGER_INTENT" },
          { id: "act-2", label: "Opção 2", action: "TRIGGER_INTENT" },
          { id: "act-3", label: "Opção 3", action: "TRIGGER_INTENT" },
        ],
      };

      const payload = convertBotReplyToWhatsAppPayload("(11) 98765-4321", botMsg);
      expect(payload.type).toBe("interactive");
      if (payload.type === "interactive") {
        expect(payload.interactive.type).toBe("button");
      }
    });

    it("deve converter resposta com mais de 3 opções em interactive list", () => {
      const botMsg: BotMessage = {
        id: "msg-list",
        sender: "BOT",
        text: "Nossos serviços:",
        time: "12:00",
        quickActions: [
          { id: "act-1", label: "Corte", action: "TRIGGER_INTENT" },
          { id: "act-2", label: "Barba", action: "TRIGGER_INTENT" },
          { id: "act-3", label: "Combo", action: "TRIGGER_INTENT" },
          { id: "act-4", label: "Pigmentação", action: "TRIGGER_INTENT" },
        ],
      };

      const payload = convertBotReplyToWhatsAppPayload("(11) 98765-4321", botMsg);
      expect(payload.type).toBe("interactive");
      if (payload.type === "interactive") {
        expect(payload.interactive.type).toBe("list");
      }
    });

    it("deve converter resposta sem botões em mensagem de texto puro", () => {
      const botMsg: BotMessage = {
        id: "msg-txt",
        sender: "BOT",
        text: "Nosso endereço é Av. Moema, 450.",
        time: "12:00",
      };

      const payload = convertBotReplyToWhatsAppPayload("(11) 98765-4321", botMsg);
      expect(payload.type).toBe("text");
    });
  });

  // =========================================================================
  // 6. JANELA DE ATENDIMENTO DE 24 HORAS (CUSTOMER CARE WINDOW)
  // =========================================================================
  describe("6. Janela de Atendimento de 24 Horas", () => {
    it("deve validar que mensagem enviada dentro de 24h é permitida", () => {
      const recentTimestamp = Date.now() - 2 * 60 * 60 * 1000; // 2 horas atrás
      expect(isWithin24hWindow(recentTimestamp)).toBe(true);

      const outbound = buildAttendantWhatsAppOutbound({
        toPhone: "(11) 97123-4567",
        text: "Olá! Tudo bem?",
        lastCustomerMessageTimestamp: recentTimestamp,
      });

      expect(outbound.payload).not.toBeNull();
      expect(outbound.error).toBeUndefined();
    });

    it("deve bloquear envio livre e alertar se a janela de 24h tiver expirado", () => {
      const expiredTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 horas atrás
      expect(isWithin24hWindow(expiredTimestamp)).toBe(false);

      const outbound = buildAttendantWhatsAppOutbound({
        toPhone: "(11) 97123-4567",
        text: "Olá! Tudo bem?",
        lastCustomerMessageTimestamp: expiredTimestamp,
      });

      expect(outbound.payload).toBeNull();
      expect(outbound.error).toContain("janela de atendimento de 24 horas da Meta expirou");
    });
  });

  // =========================================================================
  // 7. CANONICAL WEBHOOK ROUTE HANDLERS (GET & POST)
  // =========================================================================
  describe("7. Canonical Webhook Route Handlers", () => {
    it("GET /api/webhooks/whatsapp deve validar handshake com query correta", () => {
      const response = handleWhatsAppWebhookGet({
        "hub.mode": "subscribe",
        "hub.verify_token": "token_handshake_matriz",
        "hub.challenge": "115599",
      }, "token_handshake_matriz");

      expect(response.status).toBe(200);
      expect(response.body).toBe("115599");
    });

    it("GET /api/webhooks/whatsapp deve rejeitar com 403 se verify_token for inválido", () => {
      const response = handleWhatsAppWebhookGet({
        "hub.mode": "subscribe",
        "hub.verify_token": "token_errado",
        "hub.challenge": "115599",
      });

      expect(response.status).toBe(403);
    });

    it("POST /api/webhooks/whatsapp deve rejeitar com 401 se assinatura HMAC for inválida", () => {
      const rawBody = JSON.stringify({
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                value: {
                  metadata: { phone_number_id: "101112131415161" },
                },
              },
            ],
          },
        ],
      });

      const response = handleWhatsAppWebhookPost({
        rawBody,
        signatureHeader: "sha256=invalid_hash",
        existingConversations: [],
        customers: mockCustomers,
        botContext: mockContext,
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain("Assinatura HMAC inválida");
    });

    it("POST /api/webhooks/whatsapp deve aceitar requisição com assinatura HMAC legítima", () => {
      const rawBody = JSON.stringify({
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                value: {
                  messaging_product: "whatsapp",
                  metadata: { phone_number_id: "101112131415161" },
                  messages: [
                    {
                      from: "5511971234567",
                      id: "wamid.valid1",
                      timestamp: String(Math.floor(Date.now() / 1000)),
                      type: "text",
                      text: { body: "Qual o horário de funcionamento?" },
                    },
                  ],
                },
                field: "messages",
              },
            ],
          },
        ],
      });

      const digest = crypto.createHmac("sha256", "secret_meta_matriz_2026").update(rawBody, "utf8").digest("hex");
      const signatureHeader = `sha256=${digest}`;

      const response = handleWhatsAppWebhookPost({
        rawBody,
        signatureHeader,
        existingConversations: [],
        customers: mockCustomers,
        botContext: mockContext,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.processedCount).toBe(1);
    });
  });

  // =========================================================================
  // 7. AUDITORIA CRÍTICA — FONTE ÚNICA DO NÚMERO, ESTADOS REAIS E FAIL CLOSED
  // =========================================================================
  describe("7. Auditoria Crítica — Fonte Única do Número, Estados Reais e Fail Closed", () => {
    const tenantA = "tenant-a-barbearia";
    const tenantB = "tenant-b-barbearia";
    const tenantC = "tenant-c-sem-whatsapp";

    beforeEach(() => {
      whatsAppVault.clearForTesting();
    });

    it("Estado Inicial: deve ser NOT_CONFIGURED quando não existirem dados no cofre", () => {
      const channel = whatsAppVault.getChannelSettings(tenantA);
      expect(channel.connectionStatus).toBe("NOT_CONFIGURED");
      expect(channel.whatsappConnected).toBe(false);
      expect(channel.whatsappDisplayNumber).toBeNull();
      expect(whatsAppVault.isWhatsAppOperational(tenantA)).toBe(false);
    });

    it("Salvar Credenciais NÃO SIGNIFICA Estar Conectado (Regra 17)", () => {
      const saved = whatsAppVault.saveConfig(tenantA, {
        id: "waba-a",
        tenantId: tenantA,
        wabaId: "123456789",
        phoneNumberId: "987654321",
        displayPhoneNumber: "+55 86 98111-6254",
        accessToken: "EAAG_FAKE_TOKEN_XYZ",
        verifyToken: "token_xyz",
        graphApiVersion: "v21.0",
        status: "NOT_CONFIGURED",
        whatsappEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Status deve ser CONFIGURED, NUNCA CONNECTED!
      expect(saved.status).toBe("CONFIGURED");
      expect(whatsAppVault.isWhatsAppOperational(tenantA)).toBe(false);
      expect(whatsAppVault.getOperationalWhatsAppNumber(tenantA)).toBeNull();
    });

    it("Demote Automático: se status era CONNECTED e credencial for editada, rebaixa para CONFIGURED (Regra 20)", () => {
      // Simula estado conectado prévio
      whatsAppVault.saveConfig(tenantA, {
        id: "waba-a",
        tenantId: tenantA,
        wabaId: "123456789",
        phoneNumberId: "987654321",
        displayPhoneNumber: "+55 86 98111-6254",
        accessToken: "EAAG_TOKEN_VALIDO",
        verifyToken: "token_xyz",
        graphApiVersion: "v21.0",
        status: "CONFIGURED",
        whatsappEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Validação marca como CONNECTED
      whatsAppVault.updateStatus(tenantA, "CONNECTED", {
        lastValidatedAt: new Date().toISOString(),
      });
      expect(whatsAppVault.getConfig(tenantA, tenantA)?.status).toBe("CONNECTED");

      // Usuário edita o phoneNumberId
      const reconfigured = whatsAppVault.saveConfig(tenantA, {
        id: "waba-a",
        tenantId: tenantA,
        wabaId: "123456789",
        phoneNumberId: "111222333444", // Novo phone ID
        displayPhoneNumber: "+55 86 98111-6254",
        accessToken: "EAAG_TOKEN_VALIDO",
        verifyToken: "token_xyz",
        graphApiVersion: "v21.0",
        status: "CONNECTED", // frontend não pode impor CONNECTED
        whatsappEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Deve ter sido rebaixado imediatamente para CONFIGURED
      expect(reconfigured.status).toBe("CONFIGURED");
      expect(whatsAppVault.isWhatsAppOperational(tenantA)).toBe(false);
    });

    it("Validação Real da Meta: sucesso quando a API retorna número coincidente", async () => {
      whatsAppVault.saveConfig(tenantA, {
        id: "waba-a",
        tenantId: tenantA,
        wabaId: "123456789",
        phoneNumberId: "1086981116254",
        displayPhoneNumber: "+55 86 98111-6254",
        accessToken: "EAAG_TEST_TOKEN",
        verifyToken: "token_xyz",
        graphApiVersion: "v21.0",
        status: "CONFIGURED",
        whatsappEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Mock do fetch da Meta Graph API v21.0 retornando dados reais coincidentes
      const originalFetch = global.fetch;
      global.fetch = async (url: any) => {
        if (String(url).includes("graph.facebook.com")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              verified_name: "Barbearia Imperial",
              display_phone_number: "+55 86 98111-6254",
              quality_rating: "GREEN",
              code_verification_status: "VERIFIED",
            }),
          } as any;
        }
        return originalFetch(url);
      };

      try {
        const validation = await whatsAppVault.validateMetaConnection(tenantA);
        expect(validation.success).toBe(true);
        expect(validation.status).toBe("CONNECTED");
        expect(validation.metaData?.verifiedName).toBe("Barbearia Imperial");

        // Agora sim está operacional!
        expect(whatsAppVault.isWhatsAppOperational(tenantA)).toBe(true);
        expect(whatsAppVault.getOperationalWhatsAppNumber(tenantA)).toBe("5586981116254");
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("Inconsistência de Número (Seção 15): deve rejeitar com ERROR se o Phone ID pertencer a outro número na Meta", async () => {
      whatsAppVault.saveConfig(tenantA, {
        id: "waba-a",
        tenantId: tenantA,
        wabaId: "123456789",
        phoneNumberId: "1086981116254",
        displayPhoneNumber: "+55 86 98111-6254", // Número digitado
        accessToken: "EAAG_TEST_TOKEN",
        verifyToken: "token_xyz",
        graphApiVersion: "v21.0",
        status: "CONFIGURED",
        whatsappEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Mock da Meta retornando um número diferente (ex: número da matriz ou outro)
      const originalFetch = global.fetch;
      global.fetch = async (url: any) => {
        if (String(url).includes("graph.facebook.com")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              verified_name: "Outra Empresa",
              display_phone_number: "+55 11 99999-8888", // Número diferente!
              quality_rating: "GREEN",
            }),
          } as any;
        }
        return originalFetch(url);
      };

      try {
        const validation = await whatsAppVault.validateMetaConnection(tenantA);
        expect(validation.success).toBe(false);
        expect(validation.status).toBe("ERROR");
        expect(validation.error).toContain("Configuração inconsistente");

        // FAIL CLOSED: Não pode estar operacional
        expect(whatsAppVault.isWhatsAppOperational(tenantA)).toBe(false);
        expect(whatsAppVault.getOperationalWhatsAppNumber(tenantA)).toBeNull();
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("Rejeição da Meta (Token Falso/Inválido): deve marcar ERROR e registrar mensagem segura (Seção 18 e 19)", async () => {
      whatsAppVault.saveConfig(tenantA, {
        id: "waba-a",
        tenantId: tenantA,
        wabaId: "123",
        phoneNumberId: "456",
        displayPhoneNumber: "+55 86 98111-6254",
        accessToken: "EAAG_TOKEN_EXPIRADO",
        verifyToken: "token_xyz",
        graphApiVersion: "v21.0",
        status: "CONFIGURED",
        whatsappEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const originalFetch = global.fetch;
      global.fetch = async () => ({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            message: "Error validating access token: Session has expired.",
            type: "OAuthException",
            code: 190,
          },
        }),
      } as any);

      try {
        const validation = await whatsAppVault.validateMetaConnection(tenantA);
        expect(validation.success).toBe(false);
        expect(validation.status).toBe("ERROR");
        expect(validation.error).toContain("Error validating access token");

        const config = whatsAppVault.getConfig(tenantA, tenantA);
        expect(config?.status).toBe("ERROR");
        expect(config?.lastValidationError).toContain("Error validating access token");
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("Isolamento Multi-Tenant Estrito (Seção 33): Tenant C sem WhatsApp NUNCA recebe número do Tenant A ou B", () => {
      // Tenant A
      whatsAppVault.saveConfig(tenantA, {
        id: "waba-a",
        tenantId: tenantA,
        wabaId: "123",
        phoneNumberId: "111",
        displayPhoneNumber: "+55 86 98111-6254",
        accessToken: "token_a",
        verifyToken: "vt_a",
        graphApiVersion: "v21.0",
        status: "CONFIGURED",
        whatsappEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      whatsAppVault.updateStatus(tenantA, "CONNECTED");

      // Tenant B
      whatsAppVault.saveConfig(tenantB, {
        id: "waba-b",
        tenantId: tenantB,
        wabaId: "456",
        phoneNumberId: "222",
        displayPhoneNumber: "+55 11 91234-5678",
        accessToken: "token_b",
        verifyToken: "vt_b",
        graphApiVersion: "v21.0",
        status: "CONFIGURED",
        whatsappEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      whatsAppVault.updateStatus(tenantB, "CONNECTED");

      // Tenant C não tem config
      expect(whatsAppVault.getOperationalWhatsAppNumber(tenantA)).toBe("5586981116254");
      expect(whatsAppVault.getOperationalWhatsAppNumber(tenantB)).toBe("5511912345678");
      expect(whatsAppVault.getOperationalWhatsAppNumber(tenantC)).toBeNull(); // NUNCA cai para A ou B
      expect(whatsAppVault.isWhatsAppOperational(tenantC)).toBe(false);
    });

    it("Desativação Manual (Seção 32): Desmarcar whatsappEnabled desativa o canal operacional mantendo credenciais", () => {
      whatsAppVault.saveConfig(tenantA, {
        id: "waba-a",
        tenantId: tenantA,
        wabaId: "123",
        phoneNumberId: "111",
        displayPhoneNumber: "+55 86 98111-6254",
        accessToken: "token_a",
        verifyToken: "vt_a",
        graphApiVersion: "v21.0",
        status: "CONFIGURED",
        whatsappEnabled: false, // Desabilitado
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      expect(whatsAppVault.isWhatsAppOperational(tenantA)).toBe(false);
      expect(whatsAppVault.getOperationalWhatsAppNumber(tenantA)).toBeNull();
      expect(whatsAppVault.getConfig(tenantA, tenantA)?.status).toBe("DISCONNECTED");
    });

    it("Autonomia do Chat Web (Seção 25): Chat Web funciona independentemente da Meta estar em ERROR ou DISCONNECTED", () => {
      whatsAppVault.saveConfig(tenantA, {
        id: "waba-a",
        tenantId: tenantA,
        wabaId: "123",
        phoneNumberId: "111",
        displayPhoneNumber: "+55 86 98111-6254",
        accessToken: "token_a",
        verifyToken: "vt_a",
        graphApiVersion: "v21.0",
        status: "ERROR",
        whatsappEnabled: true,
        webChatEnabled: true,
        webChatBotEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const channels = whatsAppVault.getChannelSettings(tenantA);
      expect(channels.webChatEnabled).toBe(true);
      expect(channels.webChatBotEnabled).toBe(true);
      expect(channels.whatsappConnected).toBe(false);
      expect(channels.whatsappDisplayNumber).toBeNull();
    });

    it("Direct WhatsApp (Botão Verde): Mesmo sem Meta API online, o número cadastrado aciona o link correto wa.me sem fallback fictício", () => {
      // Estabelecimento cadastra apenas o número (ex: 86981116254 formatado como +55 86 98111-6254) sem Meta API
      whatsAppVault.saveConfig(tenantA, {
        id: "waba-a",
        tenantId: tenantA,
        wabaId: "",
        phoneNumberId: "",
        displayPhoneNumber: "+55 86 98111-6254",
        accessToken: "",
        verifyToken: "vt_a",
        graphApiVersion: "v21.0",
        status: "NOT_CONFIGURED",
        whatsappEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 1. Meta Cloud API continua NÃO conectada
      expect(whatsAppVault.isWhatsAppOperational(tenantA)).toBe(false);
      expect(whatsAppVault.getOperationalWhatsAppNumber(tenantA)).toBeNull();

      // 2. Mas o número direto para wa.me está 100% ativo com o número cadastrado
      const directPhone = whatsAppVault.getDirectWhatsAppNumber(tenantA);
      expect(directPhone).toBe("5586981116254");

      // 3. Os canais expõem hasDirectWhatsApp = true e directWhatsAppNumber correto
      const channels = whatsAppVault.getChannelSettings(tenantA);
      expect(channels.hasDirectWhatsApp).toBe(true);
      expect(channels.directWhatsAppNumber).toBe("5586981116254");

      // 4. Garante que nunca retorna o número fictício de fallback antigo (5511999998888)
      expect(directPhone).not.toBe("5511999998888");
      expect(directPhone).not.toContain("999998888");
    });
  });
});
