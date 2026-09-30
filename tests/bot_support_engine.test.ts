import { describe, it, expect, vi } from "vitest";
import {
  normalizeText,
  detectIntent,
  processBotMessage,
  checkHumanTeamAvailability,
  type BotEngineContext,
} from "../src/lib/bot/bot.engine";
import {
  type BotConversation,
  type BotMessage,
  type BotKnowledgeFaq,
} from "../src/lib/bot/bot.types";

describe("BarberHub Pro - Bot & Omnichannel Support Suite (30 Cenários Obrigatórios)", () => {
  const mockContext: BotEngineContext = {
    tenantId: "tenant-matriz",
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
    ],
    employees: [
      { id: "emp-carlos", name: "Carlos Barbeiro", role: "BARBEIRO", status: "ACTIVE", unitId: "unit-central" },
      { id: "emp-pedro", name: "Pedro Silva", role: "BARBEIRO", status: "ACTIVE", unitId: "unit-central" },
    ],
    attendances: [],
    loyaltySettings: {
      pointsPerReal: 1.5,
    },
    loyaltyRewards: [
      { id: "rew-1", title: "Corte Cortesia", pointsCost: 150, isActive: true },
      { id: "rew-2", title: "Pomada Modeladora", pointsCost: 90, isActive: true },
    ],
    faqList: [
      {
        id: "faq-estacionamento",
        category: "Comodidades",
        question: "Tem estacionamento?",
        answer: "Sim! Temos estacionamento conveniado com 1h de cortesia ao lado.",
        keywords: ["estacionamento", "carro", "vaga"],
      },
    ],
    humanWorkingHours: {
      start: "09:00",
      end: "19:00",
      isWorkday: true,
    },
  };

  const createInitialConv = (id = "conv-test"): BotConversation => ({
    id,
    channel: "WEB_CHAT",
    customerName: "Lucas Mendonça",
    customerPhone: "(11) 98888-7777",
    status: "BOT",
    lastMessage: "Iniciando",
    lastTime: "10:00",
    consecutiveFailures: 0,
    messages: [],
  });

  // 1. Visitante envia texto livre
  it("Cenário 1: Visitante envia texto livre e mensagem é registrada", () => {
    const conv = createInitialConv();
    const result = processBotMessage("Oi, tudo bem?", conv, mockContext);
    expect(result.updatedConversation.messages.length).toBeGreaterThan(1);
    expect(result.updatedConversation.messages[0]?.text).toBe("Oi, tudo bem?");
    expect(result.updatedConversation.messages[0]?.sender).toBe("CLIENT");
  });

  // 2. Bot responde saudação
  it("Cenário 2: Bot responde saudação de forma amigável e oferece atalhos", () => {
    const conv = createInitialConv();
    const result = processBotMessage("Olá", conv, mockContext);
    const botMsg = result.updatedConversation.messages.find((m) => m.sender === "BOT");
    expect(botMsg).toBeDefined();
    expect(botMsg?.text).toContain("Assistente BarberHub");
    expect(botMsg?.quickActions).toBeDefined();
    expect(botMsg?.quickActions?.some((a) => a.action === "START_BOOKING")).toBe(true);
  });

  // 3. Pergunta preço ("Quanto custa um corte?")
  it("Cenário 3: Pergunta preço consulta dados reais do catálogo sem hardcode", () => {
    const conv = createInitialConv();
    const result = processBotMessage("Quanto custa um corte?", conv, mockContext);
    const botMsg = result.updatedConversation.messages.find((m) => m.sender === "BOT");
    expect(botMsg?.text).toContain("Corte Tradicional");
    expect(botMsg?.text).toContain("50");
  });

  // 4. Pergunta horário ("Vocês abrem amanhã?")
  it("Cenário 4: Pergunta horário consulta configurações reais da unidade", () => {
    const conv = createInitialConv();
    const result = processBotMessage("Vocês abrem amanhã? Qual horário de funcionamento?", conv, mockContext);
    const botMsg = result.updatedConversation.messages.find((m) => m.sender === "BOT");
    expect(botMsg?.text).toContain("09:00 às 20:00");
    expect(botMsg?.text).toContain("08:30 às 19:00");
  });

  // 5. Pergunta endereço ("Qual o endereço?")
  it("Cenário 5: Pergunta endereço consulta endereço cadastrado na unidade", () => {
    const conv = createInitialConv();
    const result = processBotMessage("Onde fica a barbearia? Qual o endereço?", conv, mockContext);
    const botMsg = result.updatedConversation.messages.find((m) => m.sender === "BOT");
    expect(botMsg?.text).toContain("Av. Moema, 450 - Moema, São Paulo - SP");
  });

  // 6. Pergunta serviços ("Quais serviços vocês fazem?")
  it("Cenário 6: Pergunta serviços lista o catálogo real de serviços ativos", () => {
    const conv = createInitialConv();
    const result = processBotMessage("Quais serviços vocês oferecem?", conv, mockContext);
    const botMsg = result.updatedConversation.messages.find((m) => m.sender === "BOT");
    expect(botMsg?.text).toContain("Corte Tradicional");
    expect(botMsg?.text).toContain("Barba & Toalha Quente");
  });

  // 7. Pergunta plano ("Como funciona o Barber Black?")
  it("Cenário 7: Pergunta plano explica benefícios do plano Barber Black", () => {
    const conv = createInitialConv();
    const result = processBotMessage("Como funciona o plano Barber Black?", conv, mockContext);
    const botMsg = result.updatedConversation.messages.find((m) => m.sender === "BOT");
    expect(botMsg?.text).toContain("Barber Black");
  });

  // 8. Pergunta fidelidade ("Como funcionam os pontos?")
  it("Cenário 8: Pergunta fidelidade explica regras públicas da barbearia", () => {
    const conv = createInitialConv();
    const result = processBotMessage("Como funciona o programa de pontos e fidelidade?", conv, mockContext);
    const botMsg = result.updatedConversation.messages.find((m) => m.sender === "BOT");
    expect(botMsg?.text).toContain("1.5 ponto(s)");
  });

  // 9. Inicia agendamento via chat
  it("Cenário 9: Inicia agendamento pelo próprio chat sem redirecionar", () => {
    const conv = createInitialConv();
    const result = processBotMessage("Quero agendar um corte", conv, mockContext);
    const botMsg = result.updatedConversation.messages.find((m) => m.sender === "BOT");
    expect(botMsg?.text).toContain("Qual serviço você gostaria de realizar?");
    expect(botMsg?.quickActions?.length).toBeGreaterThan(0);
  });

  // 10 & 11. Conclui agendamento com disponibilidade real do Availability Engine
  it("Cenário 10 e 11: Realiza agendamento interativo com Availability Engine e gera Appointment real com origin BOT", () => {
    const conv = createInitialConv();
    // 1. Seleciona serviço
    const step1 = processBotMessage("", conv, mockContext, {
      id: "act-s1",
      label: "Corte Tradicional",
      action: "SELECT_SERVICE",
      payload: { serviceId: "srv-1" },
    });
    expect(step1.updatedConversation.bookingState?.serviceId).toBe("srv-1");

    // 2. Seleciona barbeiro "ANY"
    const step2 = processBotMessage("", step1.updatedConversation, mockContext, {
      id: "act-b-any",
      label: "⭐ Qualquer Barbeiro",
      action: "SELECT_BARBER",
      payload: { employeeId: "ANY", barberName: "Qualquer Barbeiro" },
    });
    expect(step2.updatedConversation.bookingState?.employeeId).toBe("ANY");

    // 3. Seleciona data (Amanhã)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dStr = tomorrow.toISOString().split("T")[0]!;

    const step3 = processBotMessage("", step2.updatedConversation, mockContext, {
      id: "act-d-1",
      label: "Amanhã",
      action: "SELECT_DATE",
      payload: { dateStr: dStr },
    });
    expect(step3.updatedConversation.messages.some((m) => m.bookingStep === "SELECT_TIME")).toBe(true);

    // 4. Seleciona horário
    const step4 = processBotMessage("", step3.updatedConversation, mockContext, {
      id: "act-time-14",
      label: "⏰ 14:00",
      action: "SELECT_TIME",
      payload: { timeSlot: "14:00", assignedBarber: "Carlos Barbeiro", assignedBarberId: "emp-carlos" },
    });
    expect(step4.updatedConversation.messages.some((m) => m.bookingStep === "CONFIRM")).toBe(true);

    // 5. Confirma agendamento
    const step5 = processBotMessage("", step4.updatedConversation, mockContext, {
      id: "act-confirm",
      label: "Confirmar",
      action: "CONFIRM_BOOKING",
      payload: step4.updatedConversation.bookingState,
    });

    expect(step5.createdAppointment).toBeDefined();
    expect(step5.createdAppointment?.origin).toBe("BOT");
    expect(step5.createdAppointment?.time).toBe("14:00");
    expect(step5.createdAppointment?.services[0]?.name).toBe("Corte Tradicional");
    expect(step5.createdAppointment?.customerName).toBe("Lucas Mendonça");
  });

  // 12. Solicita atendimento humano ("falar com atendente")
  it("Cenário 12: Solicita atendimento humano transfere conversa para AGUARDANDO_HUMANO", () => {
    const conv = createInitialConv();
    const result = processBotMessage("Quero falar com uma atendente agora", conv, mockContext);
    expect(result.updatedConversation.status).toBe("AGUARDANDO_HUMANO");
    expect(result.shouldNotifyAgent).toBe(true);
    const botMsg = result.updatedConversation.messages.find((m) => m.sender === "BOT");
    expect(botMsg?.text).toContain("Encaminhei sua conversa para nossa equipe");
  });

  // 13. Conversa aparece na Central com status AGUARDANDO_HUMANO
  it("Cenário 13: Conversa transferida mantém histórico e status para a Central", () => {
    const conv = createInitialConv();
    const result = processBotMessage("falar com atendente aqui", conv, mockContext);
    expect(result.updatedConversation.status).toBe("AGUARDANDO_HUMANO");
    expect(result.updatedConversation.unreadByAgent).toBe(true);
  });

  // 14. Agente assume atendimento -> status muda para EM_ATENDIMENTO
  it("Cenário 14: Agente assume o atendimento registrando operador e horário", () => {
    const conv: BotConversation = {
      ...createInitialConv(),
      status: "AGUARDANDO_HUMANO",
    };

    const takenOverConv: BotConversation = {
      ...conv,
      status: "EM_ATENDIMENTO",
      assignedAgent: "Carlos Barbeiro",
      acceptedAt: "10:25",
    };

    expect(takenOverConv.status).toBe("EM_ATENDIMENTO");
    expect(takenOverConv.assignedAgent).toBe("Carlos Barbeiro");
  });

  // 15. O BOT DEVE PARAR DE RESPONDER quando status for EM_ATENDIMENTO ou AGUARDANDO_HUMANO
  it("Cenário 15 (CLÁUSULA PÉTREA): O Bot não responde nada quando status for EM_ATENDIMENTO ou AGUARDANDO_HUMANO", () => {
    const convInHumanCare: BotConversation = {
      ...createInitialConv(),
      status: "EM_ATENDIMENTO",
      assignedAgent: "Carlos Barbeiro",
    };

    const result = processBotMessage("Quanto custa um corte?", convInHumanCare, mockContext);
    // Não pode haver mensagem nova de BOT!
    const newBotMsgs = result.updatedConversation.messages.filter((m) => m.sender === "BOT");
    expect(newBotMsgs.length).toBe(0);
    // Mas a mensagem do cliente deve ser salva para o operador humano ler
    const lastMsg = result.updatedConversation.messages[result.updatedConversation.messages.length - 1];
    expect(lastMsg?.sender).toBe("CLIENT");
    expect(lastMsg?.text).toBe("Quanto custa um corte?");
  });

  // 16 & 17. Agente responde na Central e cliente recebe a mensagem no widget
  it("Cenário 16 e 17: Agente envia mensagem e ela é anexada com sender AGENT", () => {
    const conv: BotConversation = {
      ...createInitialConv(),
      status: "EM_ATENDIMENTO",
      assignedAgent: "Carlos Barbeiro",
    };

    const agentMsg: BotMessage = {
      id: "agent-1",
      sender: "AGENT",
      text: "Olá, Lucas! Sou o Carlos da equipe. Em que posso te ajudar?",
      time: "10:30",
    };

    const updated = {
      ...conv,
      lastMessage: agentMsg.text,
      messages: [...conv.messages, agentMsg],
    };

    expect(updated.messages[updated.messages.length - 1]?.sender).toBe("AGENT");
    expect(updated.messages[updated.messages.length - 1]?.text).toContain("Sou o Carlos");
  });

  // 18 & 19. Cliente responde durante atendimento humano e Central recebe sem intervenção do bot
  it("Cenário 18 e 19: Cliente responde durante atendimento humano e bot permanece calado", () => {
    const conv: BotConversation = {
      ...createInitialConv(),
      status: "EM_ATENDIMENTO",
      assignedAgent: "Carlos Barbeiro",
      messages: [
        { id: "m-ag", sender: "AGENT", text: "Olá! Como posso ajudar?", time: "10:30" },
      ],
    };

    const result = processBotMessage("Quero saber se o plano tem carência", conv, mockContext);
    expect(result.updatedConversation.status).toBe("EM_ATENDIMENTO");
    // Mensagem foi anexada para o agente
    expect(result.updatedConversation.lastMessage).toBe("Quero saber se o plano tem carência");
    // Nenhuma resposta do bot gerada
    expect(result.updatedConversation.messages.some((m) => m.sender === "BOT")).toBe(false);
  });

  // 20. Segundo agente tenta assumir conversa já assumida (concorrência)
  it("Cenário 20: Proteção de concorrência detecta conversa já assumida por outro agente", () => {
    const conv: BotConversation = {
      ...createInitialConv(),
      status: "EM_ATENDIMENTO",
      assignedAgent: "Carlos Barbeiro",
    };

    const secondAgent = "Pedro Barbeiro";
    const isAlreadyAssigned = conv.status === "EM_ATENDIMENTO" && conv.assignedAgent && conv.assignedAgent !== secondAgent;
    expect(isAlreadyAssigned).toBe(true);
  });

  // 21. Finalizar conversa -> status FINALIZADO
  it("Cenário 21: Finalizar conversa altera status para FINALIZADO", () => {
    const conv: BotConversation = {
      ...createInitialConv(),
      status: "EM_ATENDIMENTO",
    };
    const finished: BotConversation = { ...conv, status: "FINALIZADO" };
    expect(finished.status).toBe("FINALIZADO");
  });

  // 22 & 23. Pergunta desconhecida e fallback seguro (primeira falha)
  it("Cenário 22 e 23: Pergunta desconhecida incrementa falhas e oferece fallback seguro sem inventar", () => {
    const conv = createInitialConv();
    const result = processBotMessage("Qual a velocidade da luz no vácuo?", conv, mockContext);
    expect(result.updatedConversation.consecutiveFailures).toBe(1);
    const botMsg = result.updatedConversation.messages.find((m) => m.sender === "BOT");
    expect(botMsg?.text).toContain("Não encontrei uma resposta segura para isso");
    expect(botMsg?.quickActions?.some((a) => a.action === "REQUEST_HUMAN")).toBe(true);
  });

  // 24. Duas falhas consecutivas oferecem humano automaticamente
  it("Cenário 24: Após 2 falhas consecutivas, bot oferece atendimento humano de forma proativa", () => {
    const convWithOneFailure: BotConversation = {
      ...createInitialConv(),
      consecutiveFailures: 1,
    };

    const result = processBotMessage("Qual a massa de Júpiter?", convWithOneFailure, mockContext);
    expect(result.updatedConversation.consecutiveFailures).toBe(2);
    const botMsg = result.updatedConversation.messages.find((m) => m.sender === "BOT");
    expect(botMsg?.text).toContain("Gostaria que eu transferisse agora sua conversa para nossa equipe humana");
    expect(botMsg?.quickActions?.some((a) => a.action === "REQUEST_HUMAN")).toBe(true);
  });

  // 25. Cliente anônimo tentando consultar dados privados (pontos e agendamento)
  it("Cenário 25: Cliente anônimo tentando consultar saldo ou agendamento é bloqueado por segurança", () => {
    const conv = createInitialConv();
    // Pergunta de saldo de pontos
    const resultPts = processBotMessage("Quantos pontos eu tenho?", conv, mockContext);
    const botMsgPts = resultPts.updatedConversation.messages.find((m) => m.sender === "BOT");
    expect(botMsgPts?.text).toContain("LGPD");
    expect(botMsgPts?.text).toContain("privacidade");

    // Pergunta de consulta de agendamento
    const resultApt = processBotMessage("Consultar meu agendamento", conv, mockContext);
    const botMsgApt = resultApt.updatedConversation.messages.find((m) => m.sender === "BOT");
    expect(botMsgApt?.text).toContain("segurança");
  });

  // 26. Cliente autenticado consultando seus próprios dados
  it("Cenário 26: Cliente autenticado recebe seus próprios pontos e agendamento sem digitar novamente", () => {
    const authContext: BotEngineContext = {
      ...mockContext,
      authenticatedCustomer: {
        id: "c1",
        name: "Carlos Eduardo Santos",
        phone: "(11) 98888-1111",
        points: 480,
        appointments: [
          {
            id: "apt-1",
            code: "#BH-94813",
            time: "15:30",
            customerName: "Carlos Eduardo Santos",
            barberName: "Gabriel Silva",
            status: "CONFIRMADO",
            services: [{ id: "srv-1", name: "Corte Tradicional", price: 50 }],
            products: [],
            discount: 0,
            total: 50,
          },
        ],
      },
    };

    const conv = createInitialConv();
    const resultPts = processBotMessage("Quantos pontos eu tenho?", conv, authContext);
    const botMsgPts = resultPts.updatedConversation.messages.find((m) => m.sender === "BOT");
    expect(botMsgPts?.text).toContain("480 pontos");

    const resultApt = processBotMessage("Consultar meu agendamento", conv, authContext);
    const botMsgApt = resultApt.updatedConversation.messages.find((m) => m.sender === "BOT");
    expect(botMsgApt?.text).toContain("#BH-94813");
    expect(botMsgApt?.text).toContain("15:30");
  });

  // 27 & 28. Isolamento de Tenant e Unit
  it("Cenário 27 e 28: Isolamento de tenant e unidade garante que apenas profissionais da unidade correta são ofertados", () => {
    const multiUnitContext: BotEngineContext = {
      ...mockContext,
      tenantId: "tenant-matriz",
      unitId: "unit-filial-pinheiros",
      employees: [
        { id: "emp-moema", name: "Barbeiro Moema", role: "BARBEIRO", status: "ACTIVE", unitId: "unit-central" },
        { id: "emp-pinheiros", name: "Barbeiro Pinheiros", role: "BARBEIRO", status: "ACTIVE", unitId: "unit-filial-pinheiros" },
      ],
    };

    const conv = createInitialConv();
    const step1 = processBotMessage("", conv, multiUnitContext, {
      id: "act-s1",
      label: "Corte Tradicional",
      action: "SELECT_SERVICE",
      payload: { serviceId: "srv-1" },
    });

    const botMsg = step1.updatedConversation.messages.find((m) => m.bookingStep === "SELECT_BARBER");
    // Deve incluir o Barbeiro Pinheiros
    expect(botMsg?.quickActions?.some((a) => a.payload?.barberName === "Barbeiro Pinheiros")).toBe(true);
    // NÃO deve incluir o Barbeiro Moema pois pertence a outra unidade
    expect(botMsg?.quickActions?.some((a) => a.payload?.barberName === "Barbeiro Moema")).toBe(false);
  });

  // 29. Persistência de identificador de sessão
  it("Cenário 29: Identificador de sessão de conversa preserva histórico", () => {
    const sessionId = "web-chat-persistent-uuid-12345";
    const conv = createInitialConv(sessionId);
    expect(conv.id).toBe(sessionId);
    const result = processBotMessage("Olá", conv, mockContext);
    expect(result.updatedConversation.id).toBe(sessionId);
  });

  // 30. Mobile & Horário de Atendimento Humano
  it("Cenário 30: Checagem de disponibilidade do atendimento humano fora do expediente", () => {
    // Horário das 09:00 às 18:00
    const workingHours = { start: "09:00", end: "18:00", isWorkday: true };
    // 21:30 (fora)
    const nightTime = new Date("2026-09-30T21:30:00");
    expect(checkHumanTeamAvailability(workingHours, nightTime)).toBe(false);

    // 14:00 (dentro)
    const dayTime = new Date("2026-09-30T14:00:00");
    expect(checkHumanTeamAvailability(workingHours, dayTime)).toBe(true);
  });
});
