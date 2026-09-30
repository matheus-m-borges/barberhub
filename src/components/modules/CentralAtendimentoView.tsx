import React, { useState, useMemo } from "react";
import {
  MessageSquare,
  Bot,
  User,
  Phone,
  CheckCircle,
  Calendar,
  Send,
  UserCheck,
  Clock,
  Sparkles,
  ExternalLink,
  Search,
  Filter,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import type { BotConversation, BotMessage } from "@/lib/bot/bot.types";

import { isWithin24hWindow } from "@/lib/whatsapp/whatsapp-adapter.service";

export type BotChatMessage = BotMessage;
export type ChatConversation = BotConversation;

interface CentralAtendimentoViewProps {
  conversations?: BotConversation[];
  activeAgentName?: string;
  onTakeOver?: (id: string, agentName: string) => void;
  onSendReply?: (id: string, text: string) => void;
  onFinish?: (id: string) => void;
  onOpenNewAppointmentModal: (prefill?: { name: string; phone: string; customerId?: string | undefined }) => void;
  onShowToast: (msg: string) => void;
}

export function CentralAtendimentoView({
  conversations: externalConversations,
  activeAgentName = "Carlos Barbeiro",
  onTakeOver: externalOnTakeOver,
  onSendReply: externalOnSendReply,
  onFinish: externalOnFinish,
  onOpenNewAppointmentModal,
  onShowToast,
}: CentralAtendimentoViewProps) {
  // Estado local de fallback caso não seja fornecido por props
  const [internalConversations, setInternalConversations] = useState<BotConversation[]>([
    {
      id: "conv-1",
      channel: "WEB_CHAT",
      customerName: "Lucas Mendonça",
      customerPhone: "(11) 98765-9988",
      lastMessage: "Quero tirar uma dúvida sobre o plano Barber Black com alguém.",
      lastTime: "10:14",
      status: "AGUARDANDO_HUMANO",
      consecutiveFailures: 0,
      messages: [
        { id: "m1", sender: "BOT", text: "Olá! Seja bem-vindo à BarberHub Studio. Como posso te ajudar hoje?", time: "10:12" },
        { id: "m2", sender: "CLIENT", text: "Gostaria de falar com uma atendente sobre planos.", time: "10:13" },
        { id: "m3", sender: "BOT", text: "Entendido! Estou transferindo seu atendimento para nossa recepção agora mesmo. Aguarde um instante.", time: "10:13" },
        { id: "m4", sender: "CLIENT", text: "Quero tirar uma dúvida sobre o plano Barber Black com alguém.", time: "10:14" },
      ],
    },
    {
      id: "conv-2",
      channel: "WEB_CHAT",
      customerName: "Felipe Nogueira",
      customerPhone: "(11) 98765-4321",
      lastMessage: "Agendamento confirmado para Hoje às 15:30.",
      lastTime: "09:50",
      status: "BOT",
      consecutiveFailures: 0,
      messages: [
        { id: "m21", sender: "BOT", text: "Olá! Deseja agendar um horário com qual barbeiro?", time: "09:48" },
        { id: "m22", sender: "CLIENT", text: "Com o Gabriel Silva às 15:30", time: "09:49" },
        { id: "m23", sender: "BOT", text: "Horário verificado e reservado com sucesso no sistema! Código: #BH-19842", time: "09:50" },
      ],
    },
  ]);

  const conversations = externalConversations || internalConversations;

  const [activeConvId, setActiveConvId] = useState<string>("conv-1");
  const [replyText, setReplyText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "AGUARDANDO_HUMANO" | "EM_ATENDIMENTO" | "BOT" | "FINALIZADO" | "WHATSAPP_OFFICIAL">("ALL");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Garantir que a conversa ativa existe
  const activeConv = useMemo(() => {
    return conversations.find((c) => c.id === activeConvId) || conversations[0];
  }, [conversations, activeConvId]);

  // Contagem de conversas aguardando humano
  const waitingCount = useMemo(() => {
    return conversations.filter((c) => c.status === "AGUARDANDO_HUMANO").length;
  }, [conversations]);

  // Filtragem
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (statusFilter === "WHATSAPP_OFFICIAL") {
        if (c.channel !== "WHATSAPP_OFFICIAL") return false;
      } else if (statusFilter !== "ALL" && c.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.customerName.toLowerCase().includes(q);
        const matchesPhone = c.customerPhone.includes(q);
        const matchesMsg = c.lastMessage.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesMsg) return false;
      }
      return true;
    });
  }, [conversations, statusFilter, searchQuery]);

  const handleTakeOver = (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;

    // Proteção de concorrência (Section 42 & Teste 20):
    // Se outro atendente já assumiu a conversa
    if (conv.status === "EM_ATENDIMENTO" && conv.assignedAgent && conv.assignedAgent !== activeAgentName) {
      onShowToast(`Atenção: Esta conversa já foi assumida por ${conv.assignedAgent}.`);
      return;
    }

    if (externalOnTakeOver) {
      externalOnTakeOver(id, activeAgentName);
    } else {
      setInternalConversations((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                status: "EM_ATENDIMENTO",
                assignedAgent: activeAgentName,
                acceptedAt: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
              }
            : c
        )
      );
    }
    onShowToast(`Você assumiu o atendimento de ${conv.customerName}! O Bot foi silenciado.`);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConv) return;

    const trimmed = replyText.trim();

    if (externalOnSendReply) {
      externalOnSendReply(activeConv.id, trimmed);
    } else {
      const newMsg: BotMessage = {
        id: `m-${Date.now()}`,
        sender: "AGENT",
        text: trimmed,
        time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        timestamp: Date.now(),
        deliveryStatus: activeConv.channel === "WHATSAPP_OFFICIAL" ? "sent" : undefined,
      };

      setInternalConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? {
                ...c,
                lastMessage: newMsg.text,
                lastTime: newMsg.time,
                status: "EM_ATENDIMENTO",
                assignedAgent: c.assignedAgent || activeAgentName,
                messages: [...c.messages, newMsg],
              }
            : c
        )
      );
    }

    setReplyText("");
  };

  const handleFinish = (id: string) => {
    if (externalOnFinish) {
      externalOnFinish(id);
    } else {
      setInternalConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "FINALIZADO" } : c))
      );
    }
    onShowToast("Atendimento finalizado com sucesso.");
  };

  const isWindowActive = activeConv?.channel === "WHATSAPP_OFFICIAL"
    ? isWithin24hWindow(activeConv.lastCustomerMessageTimestamp)
    : true;

  const whatsappCount = useMemo(() => {
    return conversations.filter((c) => c.channel === "WHATSAPP_OFFICIAL").length;
  }, [conversations]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <MessageSquare className="h-6 w-6 text-primary" />
            Central de Atendimento Omnichannel & Bot Handoff
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitore interações do Bot do site público e do WhatsApp Cloud API Oficial. Assuma conversas em tempo real quando o cliente solicitar atendimento humano.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {waitingCount > 0 && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 px-3 py-1 font-bold animate-pulse text-xs">
              🔔 {waitingCount} {waitingCount === 1 ? "conversa aguardando" : "conversas aguardando"}
            </Badge>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 text-xs border-hairline"
            title={soundEnabled ? "Avisos sonoros ativados" : "Avisos sonoros desativados"}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-primary mr-1" /> : <VolumeX className="h-3.5 w-3.5 text-muted-foreground mr-1" />}
            {soundEnabled ? "Som Ativo" : "Silenciado"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[640px]">
        {/* Coluna Esquerda: Lista de Conversas (5 colunas) */}
        <Card className="lg:col-span-5 border-hairline bg-card rounded-2xl shadow-xs flex flex-col overflow-hidden">
          {/* Barra de Filtro e Busca */}
          <div className="p-3 border-b border-hairline space-y-2.5 bg-muted/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Fila ({filteredConversations.length})
              </span>
              <div className="flex gap-1 text-[10px] flex-wrap justify-end">
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                    statusFilter === "ALL" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setStatusFilter("AGUARDANDO_HUMANO")}
                  className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                    statusFilter === "AGUARDANDO_HUMANO" ? "bg-amber-500 text-black font-bold" : "text-amber-400 hover:bg-amber-500/10"
                  }`}
                >
                  Aguardando ({waitingCount})
                </button>
                <button
                  onClick={() => setStatusFilter("EM_ATENDIMENTO")}
                  className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                    statusFilter === "EM_ATENDIMENTO" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  Em Atendimento
                </button>
                <button
                  onClick={() => setStatusFilter("WHATSAPP_OFFICIAL")}
                  className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                    statusFilter === "WHATSAPP_OFFICIAL" ? "bg-emerald-600 text-white font-bold" : "text-emerald-400 hover:bg-emerald-500/10"
                  }`}
                >
                  WhatsApp ({whatsappCount})
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por cliente, telefone ou texto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-hairline bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Lista de Conversas */}
          <div className="flex-1 overflow-y-auto divide-y divide-hairline">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Nenhuma conversa encontrada com os filtros selecionados.
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isActive = activeConv && c.id === activeConv.id;
                const isWaitingHuman = c.status === "AGUARDANDO_HUMANO";
                const isUnderHuman = c.status === "EM_ATENDIMENTO";
                const isWhatsApp = c.channel === "WHATSAPP_OFFICIAL";

                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveConvId(c.id)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isActive ? "bg-primary/10 border-l-4 border-primary" : "hover:bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground">{c.customerName}</span>
                        {c.unreadByAgent && (
                          <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">{c.lastTime}</span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{c.lastMessage}</p>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-bold ${
                            isWaitingHuman
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-400 animate-pulse"
                              : isUnderHuman
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : c.status === "BOT"
                              ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                              : "border-muted text-muted-foreground"
                          }`}
                        >
                          {c.status.replace("_", " ")}
                        </Badge>

                        <Badge
                          variant="outline"
                          className={`text-[8px] font-bold ${
                            isWhatsApp
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                              : "border-hairline text-muted-foreground"
                          }`}
                        >
                          {isWhatsApp ? "🟢 WhatsApp Oficial" : (c.channel || "WEB CHAT")}
                        </Badge>
                      </div>

                      <span className="text-[10px] text-muted-foreground font-mono">{c.customerPhone}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Coluna Direita: Janela de Chat e Ações (7 colunas) */}
        {activeConv ? (
          <Card className="lg:col-span-7 border-hairline bg-card rounded-2xl shadow-xs flex flex-col overflow-hidden">
            {/* Topbar da Conversa */}
            <div className="p-3.5 border-b border-hairline flex flex-wrap items-center justify-between gap-2 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs ${
                  activeConv.channel === "WHATSAPP_OFFICIAL"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-primary/10 text-primary border border-primary/20"
                }`}>
                  {activeConv.customerName ? activeConv.customerName.charAt(0) : "C"}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-bold text-foreground">{activeConv.customerName}</h3>
                    {activeConv.channel === "WHATSAPP_OFFICIAL" && (
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px] font-semibold">
                        WhatsApp Oficial
                      </Badge>
                    )}
                    {activeConv.assignedAgent && (
                      <span className="text-[10px] text-primary font-medium">
                        (Atendido por: {activeConv.assignedAgent})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-mono">{activeConv.customerPhone}</span>
                    {activeConv.channel === "WHATSAPP_OFFICIAL" && (
                      isWindowActive ? (
                        <span className="text-[9px] text-emerald-400 flex items-center gap-1 font-medium">
                          ● Janela 24h Meta ativa
                        </span>
                      ) : (
                        <span className="text-[9px] text-amber-400 flex items-center gap-1 font-medium" title="Após 24h sem resposta do cliente, a Meta exige template pré-aprovado">
                          ⚠️ Janela 24h expirada
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {activeConv.status === "AGUARDANDO_HUMANO" && (
                  <Button
                    size="sm"
                    onClick={() => handleTakeOver(activeConv.id)}
                    className="h-7 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs"
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-1" />
                    Assumir Atendimento
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onOpenNewAppointmentModal({
                      name: activeConv.customerName,
                      phone: activeConv.customerPhone,
                      customerId: activeConv.customerId,
                    })
                  }
                  className="h-7 text-xs border-hairline cursor-pointer"
                  title="Criar agendamento vinculando este cliente"
                >
                  <Calendar className="h-3.5 w-3.5 mr-1 text-primary" />
                  Criar Agendamento
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const clean = (activeConv.customerPhone || "").replace(/\D/g, "");
                    window.open(`https://wa.me/55${clean}?text=Olá%20${encodeURIComponent(activeConv.customerName)}!`, "_blank");
                  }}
                  className="h-7 text-xs border-hairline cursor-pointer hover:text-emerald-400"
                  title="Abrir conversa no WhatsApp wa.me"
                >
                  <Phone className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                  Abrir WhatsApp
                </Button>

                {activeConv.status !== "FINALIZADO" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFinish(activeConv.id)}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Finalizar
                  </Button>
                )}
              </div>
            </div>

            {/* Histórico de Mensagens */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-card/60">
              {activeConv.messages.map((m) => {
                const isClient = m.sender === "CLIENT";
                const isBot = m.sender === "BOT";
                const isAgent = m.sender === "AGENT";

                // Delivery tick renderer for agent / bot outbound messages
                const renderDeliveryStatus = () => {
                  if (isClient || !m.deliveryStatus) return null;
                  switch (m.deliveryStatus) {
                    case "read":
                      return <span className="text-cyan-400 font-bold ml-1" title="Lida pelo cliente">✓✓</span>;
                    case "delivered":
                      return <span className="text-muted-foreground ml-1" title="Entregue">✓✓</span>;
                    case "sent":
                      return <span className="text-muted-foreground ml-1" title="Enviada">✓</span>;
                    case "failed":
                      return <span className="text-rose-400 ml-1 font-bold" title="Falha no envio">⚠️</span>;
                    default:
                      return null;
                  }
                };

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isClient ? "items-start" : "items-end"}`}
                  >
                    <span className="text-[10px] text-muted-foreground px-1 mb-0.5 font-mono flex items-center">
                      {isBot ? "🤖 Assistente BarberHub" : isClient ? activeConv.customerName : `👤 ${activeConv.assignedAgent || "Atendente Humano"}`} • {m.time}
                      {renderDeliveryStatus()}
                    </span>
                    <div
                      className={`max-w-md p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                        isClient
                          ? "bg-muted/40 border border-hairline text-foreground rounded-tl-xs"
                          : isBot
                          ? "bg-blue-600/15 border border-blue-500/30 text-blue-200 rounded-tr-xs"
                          : "bg-primary text-primary-foreground font-medium rounded-tr-xs shadow-md shadow-primary/20"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{m.text}</div>

                      {/* Exibir Ações Rápidas se houver */}
                      {m.quickActions && m.quickActions.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-hairline/40 flex flex-wrap gap-1">
                          {m.quickActions.map((qa) => (
                            <span
                              key={qa.id}
                              className="text-[9px] px-2 py-0.5 rounded-md border border-hairline/60 bg-black/20 text-muted-foreground"
                            >
                              {qa.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input de Resposta Humana */}
            <form onSubmit={handleSendReply} className="p-3 border-t border-hairline flex flex-col gap-2 bg-muted/10">
              {activeConv.channel === "WHATSAPP_OFFICIAL" && !isWindowActive && (
                <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                  ⚠️ <strong>Janela de Atendimento Expirada:</strong> Mais de 24 horas se passaram desde a última mensagem do cliente. A Meta pode rejeitar mensagens de texto livre sem um template pré-aprovado.
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={
                    activeConv.status === "EM_ATENDIMENTO"
                      ? `Responder para ${activeConv.customerName} via ${activeConv.channel === "WHATSAPP_OFFICIAL" ? "WhatsApp Oficial" : "Web Chat"}...`
                      : "Assuma o atendimento ou digite para responder ao cliente..."
                  }
                  className="flex-1 h-9 px-3 rounded-xl border border-hairline bg-card text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
                <Button type="submit" size="sm" className="h-9 px-4 bg-primary text-primary-foreground font-semibold text-xs cursor-pointer">
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Enviar
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <div className="lg:col-span-7 border-hairline bg-card rounded-2xl flex items-center justify-center p-8 text-xs text-muted-foreground">
            Selecione uma conversa para visualizar o atendimento.
          </div>
        )}
      </div>
    </div>
  );
}
