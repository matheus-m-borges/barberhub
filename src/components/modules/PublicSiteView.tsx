import React, { useState, useRef, useEffect } from "react";
import {
  Scissors,
  Calendar,
  Phone,
  Clock,
  MapPin,
  Sparkles,
  Bot,
  MessageSquare,
  CheckCircle,
  X,
  Send,
  Star,
  User,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { BusinessSettings, EmployeeItem, ServiceItem } from "@/routes/index";
import type { BotConversation, BotMessage, BotQuickAction } from "@/lib/bot/bot.types";
import { whatsAppVault } from "@/lib/whatsapp/whatsapp-vault.service";

interface PublicSiteViewProps {
  businessSettings: BusinessSettings;
  services: ServiceItem[];
  employees: EmployeeItem[];
  onOpenBookingModal: (options?: { serviceId?: string | undefined; employeeId?: string | undefined } | undefined) => void;
  onBackToErp: () => void;
  botConversation?: BotConversation | undefined;
  onSendBotMessage?: ((text: string, quickAction?: BotQuickAction) => void) | undefined;
}

export function PublicSiteView({
  businessSettings,
  services,
  employees,
  onOpenBookingModal,
  onBackToErp,
  botConversation,
  onSendBotMessage,
}: PublicSiteViewProps) {
  const [isBotOpen, setIsBotOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fonte Única de Verdade de Canais (Cofre Seguro por Tenant)
  const tenantId = "tenant-default";
  const [channelSettings, setChannelSettings] = useState(() => whatsAppVault.getChannelSettings(tenantId));

  // Assinatura reativa: reflete alterações no cofre instantaneamente sem reload ou Shift+F5
  useEffect(() => {
    const unsubscribe = whatsAppVault.subscribe((updatedTenantId) => {
      if (updatedTenantId === tenantId) {
        setChannelSettings(whatsAppVault.getChannelSettings(tenantId));
      }
    });
    return unsubscribe;
  }, [tenantId]);

  // Número para o link direto do WhatsApp (wa.me)
  // Mesmo sem Meta Cloud API conectada, se o estabelecimento cadastrou o número no cofre,
  // usamos este número legítimo. Se não cadastrou, FAIL CLOSED (sem fallback fictício).
  const targetWhatsAppNumber = channelSettings.directWhatsAppNumber || channelSettings.whatsappDisplayNumber;
  const hasWhatsAppNumber = Boolean(targetWhatsAppNumber);

  // Fallback de conversa local se não fornecida por props
  const [localConversation, setLocalConversation] = useState<BotConversation>(() => ({
    id: "web-chat-default",
    channel: "WEB_CHAT",
    customerName: "Visitante Web",
    customerPhone: "(11) 99999-0000",
    status: "BOT",
    lastMessage: "Olá! Como posso ajudar?",
    lastTime: "12:00",
    consecutiveFailures: 0,
    messages: [
      {
        id: "init-1",
        sender: "BOT",
        text: `Olá! 👋 Sou o Assistente BarberHub da **${businessSettings.name}**.\n\nPosso ajudar com agendamentos, serviços, horários, planos e outras informações da barbearia.\nComo posso te ajudar?`,
        time: "12:00",
        quickActions: [
          { id: "act-1", label: "📅 Agendar Horário", action: "START_BOOKING", variant: "primary" },
          { id: "act-2", label: "🔎 Consultar Agendamento", action: "TRIGGER_INTENT", payload: "CONSULTAR_AGENDAMENTO" },
          { id: "act-3", label: "👤 Falar com Atendente", action: "REQUEST_HUMAN" },
          ...(hasWhatsAppNumber
            ? [{ id: "act-4", label: "🟢 Prefiro WhatsApp", action: "OPEN_WHATSAPP" as const, variant: "whatsapp" as const }]
            : []),
        ],
      },
    ],
  }));

  const activeConversation = botConversation || localConversation;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isBotOpen) {
      scrollToBottom();
    }
  }, [activeConversation.messages, isBotOpen]);

  // Abre WhatsApp diretamente com o número configurado no cofre (mesmo que a Meta API esteja offline)
  const handleOpenWhatsApp = () => {
    const targetNumber = targetWhatsAppNumber;
    if (!targetNumber) {
      return; // FAIL CLOSED: Se nenhum número estiver configurado, não abre fallback
    }
    const text = encodeURIComponent(
      `Olá! Vim pelo site da ${businessSettings.name} e gostaria de agendar um horário.`
    );
    window.open(`https://wa.me/${targetNumber}?text=${text}`, "_blank");
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const trimmed = inputText.trim();
    setInputText("");

    if (onSendBotMessage) {
      onSendBotMessage(trimmed);
    } else {
      // Local fallback
      const userMsg: BotMessage = {
        id: `usr-${Date.now()}`,
        sender: "CLIENT",
        text: trimmed,
        time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      };

      const replyMsg: BotMessage = {
        id: `bot-${Date.now() + 1}`,
        sender: "BOT",
        text: "Mensagem recebida pelo assistente. Conecte ao painel para fluxo completo.",
        time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      };

      setLocalConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, userMsg, replyMsg],
      }));
    }
  };

  const handleQuickActionClick = (action: BotQuickAction) => {
    if (action.action === "OPEN_WHATSAPP") {
      handleOpenWhatsApp();
      if (onSendBotMessage) {
        onSendBotMessage(action.label, action);
      }
      return;
    }

    if (onSendBotMessage) {
      onSendBotMessage(action.label, action);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 relative">
      {/* Top Banner de Retorno ao ERP */}
      <div className="bg-primary/10 border-b border-primary/20 py-2 px-4 flex justify-between items-center text-xs">
        <span className="text-primary font-semibold">
          Visualização do Site Público do Estabelecimento (Acessível pelos seus clientes)
        </span>
        <Button size="sm" variant="outline" onClick={onBackToErp} className="h-7 text-xs border-primary/30">
          Voltar ao Painel ERP
        </Button>
      </div>

      {/* Hero Section */}
      <div className="relative py-16 px-6 lg:px-12 bg-linear-to-b from-card to-background border-b border-hairline">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <Badge variant="outline" className="text-primary border-primary/40 bg-primary/10 px-3 py-1 font-bold">
            ✨ Barbearia Premium & Estética Masculina
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
            {businessSettings.name}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Tradição, estilo e cuidado impecável. Agende seu atendimento em poucos cliques ou tire dúvidas com nosso assistente em tempo real.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <Button
              size="lg"
              onClick={() => onOpenBookingModal({ employeeId: "ANY" })}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 cursor-pointer h-11 px-6 rounded-xl"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Agendar Horário Online
            </Button>
            {hasWhatsAppNumber && (
              <Button
                size="lg"
                variant="outline"
                onClick={handleOpenWhatsApp}
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer h-11 px-6 rounded-xl font-bold"
              >
                <Phone className="h-4 w-4 mr-2 text-emerald-400" />
                WhatsApp Oficial
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Serviços em Destaque */}
      <section className="py-12 px-6 max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-hairline pb-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Serviços Mais Procurados</h2>
            <p className="text-xs text-muted-foreground">Valores transparentes e profissionais altamente qualificados</p>
          </div>
          <Badge variant="outline" className="border-hairline text-xs font-mono">
            {services.length} serviços disponíveis
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {services.map((s) => (
            <Card key={s.id} className="p-4 border-hairline bg-card/60 hover:border-primary/50 transition-all rounded-xl">
              <div className="flex justify-between items-start">
                <span className="font-bold text-sm text-foreground">{s.name}</span>
                <span className="font-bold text-sm text-primary font-mono">R$ {s.price}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {s.duration || "35 min"}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenBookingModal({ serviceId: s.id, employeeId: "ANY" })}
                className="w-full mt-4 h-8 text-xs border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground font-semibold cursor-pointer"
              >
                Agendar Este
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* Informações da Unidade */}
      <section className="py-8 px-6 max-w-4xl mx-auto border-t border-hairline">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-card/40 p-6 rounded-2xl border border-hairline">
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Onde Estamos
            </h3>
            <p className="text-xs text-muted-foreground">{businessSettings.address}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
              <Phone className="h-3 w-3 text-primary" />
              {businessSettings.phone}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Horário de Atendimento
            </h3>
            <p className="text-xs text-muted-foreground">
              Segunda a Sexta: {businessSettings.weekdayOpeningTime || "09:00"} às {businessSettings.weekdayClosingTime || "19:00"}
            </p>
            <p className="text-xs text-muted-foreground">
              Sábados: {(businessSettings as any).saturdayOpeningTime || "08:30"} às {(businessSettings as any).saturdayClosingTime || "18:00"}
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* BOT BARBERHUB — ATENDIMENTO CONVERSACIONAL REAL (WEB CHAT) */}
      {/* ========================================================= */}
      {channelSettings.webChatEnabled && (
        <div className="fixed bottom-6 right-6 z-50">
          {!isBotOpen ? (
            <button
              onClick={() => setIsBotOpen(true)}
              className="flex items-center gap-2.5 rounded-full bg-primary text-primary-foreground px-5 py-3.5 shadow-2xl font-bold text-xs cursor-pointer hover:bg-primary/90 hover:scale-105 transition-all shadow-primary/30"
            >
              <Bot className="h-5 w-5" />
              <div className="flex flex-col text-left">
                <span>Assistente BarberHub</span>
                <span className="text-[10px] text-primary-foreground/80 font-normal">Online • Resposta imediata</span>
              </div>
              {activeConversation.status === "EM_ATENDIMENTO" && (
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>
          ) : (
            <div className="w-84 sm:w-96 rounded-2xl border border-hairline bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col h-[520px]">
              {/* Header Bot */}
              <div className="p-3.5 bg-primary text-primary-foreground flex justify-between items-center shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-black/20 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs flex items-center gap-1.5">
                      Assistente BarberHub
                      {activeConversation.status === "EM_ATENDIMENTO" ? (
                        <span className="text-[9px] bg-emerald-500/90 text-white px-1.5 py-0.2 rounded-full font-bold">
                          Humano
                        </span>
                      ) : activeConversation.status === "AGUARDANDO_HUMANO" ? (
                        <span className="text-[9px] bg-amber-400 text-black px-1.5 py-0.2 rounded-full font-bold">
                          Fila
                        </span>
                      ) : (
                        <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.2 rounded-full font-normal">
                          Bot
                        </span>
                      )}
                    </h4>
                    <span className="text-[10px] text-primary-foreground/80 block">
                      {activeConversation.status === "EM_ATENDIMENTO"
                        ? `Conectado com ${activeConversation.assignedAgent || "Recepção"}`
                        : activeConversation.status === "AGUARDANDO_HUMANO"
                        ? "Aguardando atendente disponível..."
                        : "Online • Resposta imediata"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsBotOpen(false)}
                  className="text-primary-foreground/80 hover:text-white cursor-pointer p-1 rounded-md hover:bg-black/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Corpo do Chat / Stream de Mensagens */}
              <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs bg-card/60">
                {activeConversation.messages.map((m) => {
                  const isClient = m.sender === "CLIENT";
                  const isBot = m.sender === "BOT";
                  const isAgent = m.sender === "AGENT";

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isClient ? "items-end" : "items-start"}`}
                    >
                      <span className="text-[9px] text-muted-foreground px-1 mb-0.5 font-mono">
                        {isClient
                          ? "Você"
                          : isBot
                          ? "🤖 Assistente BarberHub"
                          : `👤 ${activeConversation.assignedAgent || "Atendente Humano"}`}{" "}
                        • {m.time}
                      </span>

                      <div
                        className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-xs whitespace-pre-wrap ${
                          isClient
                            ? "bg-primary text-primary-foreground font-medium rounded-tr-xs shadow-md shadow-primary/20"
                            : isAgent
                            ? "bg-emerald-600/20 border border-emerald-500/40 text-foreground rounded-tl-xs font-medium"
                            : "bg-muted/40 border border-hairline text-foreground rounded-tl-xs"
                        }`}
                      >
                        {m.text}

                        {/* Exibição de Resumo de Agendamento */}
                        {m.cardData && (
                          <div className="mt-2.5 p-2.5 rounded-xl border border-primary/30 bg-primary/10 space-y-1 text-xs font-normal">
                            <div className="font-bold text-primary flex items-center gap-1">
                              <Sparkles className="h-3 w-3" /> Detalhes da Reserva
                            </div>
                            <div>• <strong>Serviço:</strong> {m.cardData.service}</div>
                            <div>• <strong>Barbeiro:</strong> {m.cardData.barber}</div>
                            <div>• <strong>Data:</strong> {m.cardData.date} às {m.cardData.time}</div>
                            <div>• <strong>Valor:</strong> {m.cardData.price}</div>
                          </div>
                        )}

                        {/* Ações Rápidas / Botões de Atalho */}
                        {m.quickActions && m.quickActions.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-hairline/60 flex flex-col gap-1.5">
                            {m.quickActions.map((qa) => {
                              const isWhatsApp = qa.variant === "whatsapp";
                              const isPrimary = qa.variant === "primary";

                              return (
                                <button
                                  key={qa.id}
                                  onClick={() => handleQuickActionClick(qa)}
                                  className={`w-full py-1.5 px-2.5 rounded-xl text-left font-semibold text-xs transition-all cursor-pointer flex items-center justify-between ${
                                    isWhatsApp
                                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                                      : isPrimary
                                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                                      : "bg-muted/30 border border-hairline text-foreground hover:border-primary/50 hover:bg-primary/10"
                                  }`}
                                >
                                  <span>{qa.label}</span>
                                  <span className="text-[10px] opacity-70">›</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Rodapé: Input com Enter e Botão Enviar */}
              <form onSubmit={handleSendMessage} className="p-2.5 border-t border-hairline flex gap-1.5 bg-muted/10">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    activeConversation.status === "EM_ATENDIMENTO"
                      ? "Conversando com atendente humano..."
                      : "Digite sua mensagem..."
                  }
                  className="flex-1 h-9 px-3 rounded-xl border border-hairline bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!inputText.trim()}
                  className="h-9 px-3.5 bg-primary text-primary-foreground font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Enviar
                </Button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
