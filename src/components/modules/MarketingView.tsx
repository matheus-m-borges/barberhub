import React, { useState } from "react";
import {
  Send,
  Phone,
  Gift,
  Clock,
  Sparkles,
  UserCheck,
  AlertTriangle,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function MarketingView() {
  const [selectedSegment, setSelectedSegment] = useState<
    "INATIVOS" | "ANIVERSARIANTES" | "VIP" | "PLANOS_VENCENDO"
  >("INATIVOS");

  const [messageTemplates, setMessageTemplates] = useState({
    INATIVOS: "Olá {nome}! Notamos que faz um tempo que você não cuida do seu visual na BarberHub Studio. Que tal agendar seu horário essa semana e garantir um café especial por nossa conta?",
    ANIVERSARIANTES: "Parabéns pelo seu aniversário, {nome}! A equipe da BarberHub Studio preparou um desconto especial de 15% no seu próximo corte este mês. Vamos comemorar?",
    VIP: "Olá {nome}! Como nosso cliente VIP, estamos liberando horários exclusivos de fim de semana na cadeira do seu barbeiro favorito. Deseja reservar seu corte?",
    PLANOS_VENCENDO: "Olá {nome}! Seu ciclo de benefícios do plano na BarberHub vence em breve. Renove agora para não perder seus créditos acumulados de corte!",
  });

  const clientsBySegment = {
    INATIVOS: [
      { name: "Thiago Barbosa", phone: "(11) 98888-2233", daysInactive: 52, lastService: "Corte Degradê" },
      { name: "Marcelo Dantas", phone: "(11) 97777-3344", daysInactive: 68, lastService: "Combo Cabelo + Barba" },
      { name: "Bruno Rezende", phone: "(11) 96666-4455", daysInactive: 46, lastService: "Corte Degradê" },
    ],
    ANIVERSARIANTES: [
      { name: "Rafael Bittencourt", phone: "(11) 96666-3333", birthDate: "Hoje (30 de Setembro)" },
      { name: "Guilherme Siqueira", phone: "(11) 97777-2222", birthDate: "04 de Outubro" },
    ],
    VIP: [
      { name: "Carlos Eduardo Santos", phone: "(11) 98888-1111", visits: 14, spent: "R$ 890,00" },
      { name: "Matthew Wilson", phone: "(11) 98888-7777", visits: 11, spent: "R$ 670,00" },
    ],
    PLANOS_VENCENDO: [
      { name: "Guilherme Siqueira", phone: "(11) 97777-2222", plan: "Club Fade & Style", expires: "em 3 dias" },
    ],
  };

  const currentList = clientsBySegment[selectedSegment] || [];

  const handleOpenWhatsApp = (clientName: string, phone: string) => {
    const rawMsg = messageTemplates[selectedSegment];
    const personalized = rawMsg.replace("{nome}", clientName);
    const cleanPhone = phone.replace(/\D/g, "");
    const encoded = encodeURIComponent(personalized);
    window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, "_blank");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Send className="h-6 w-6 text-primary" />
            Marketing, Retenção & Relacionamento (wa.me)
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Segmentação inteligente de clientes para recuperação de inativos e pós-venda via link universal oficial do WhatsApp.
          </p>
        </div>
      </div>

      {/* Segmentos de Campanha */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { id: "INATIVOS" as const, label: "Clientes Inativos (45+ dias)", count: 3, icon: Clock, color: "text-amber-400" },
          { id: "ANIVERSARIANTES" as const, label: "Aniversariantes", count: 2, icon: Gift, color: "text-purple-400" },
          { id: "VIP" as const, label: "Clientes VIPs", count: 2, icon: Sparkles, color: "text-primary" },
          { id: "PLANOS_VENCENDO" as const, label: "Planos Vencendo", count: 1, icon: AlertTriangle, color: "text-blue-400" },
        ].map((s) => {
          const Icon = s.icon;
          const isActive = selectedSegment === s.id;
          return (
            <Card
              key={s.id}
              onClick={() => setSelectedSegment(s.id)}
              className={`p-4 cursor-pointer transition-all rounded-2xl border ${
                isActive ? "border-primary bg-primary/10 shadow-sm" : "border-hairline bg-card hover:bg-muted/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${s.color}`}>
                  {s.label}
                </span>
                <Icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <span className="text-xl font-bold font-mono text-foreground mt-2 block">
                {s.count} clientes
              </span>
            </Card>
          );
        })}
      </div>

      {/* Editor do Template de Mensagem do WhatsApp */}
      <Card className="border-hairline bg-card shadow-xs rounded-2xl p-4 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-foreground flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4 text-primary" />
            Mensagem Padrão do WhatsApp para este Segmento
          </span>
          <span className="text-[10px] text-muted-foreground">Tag disponível: &#123;nome&#125;</span>
        </div>
        <textarea
          rows={2}
          value={messageTemplates[selectedSegment]}
          onChange={(e) =>
            setMessageTemplates((prev) => ({ ...prev, [selectedSegment]: e.target.value }))
          }
          className="w-full p-2.5 rounded-xl border border-hairline bg-muted/20 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </Card>

      {/* Lista de Clientes do Segmento */}
      <Card className="border-hairline bg-card rounded-2xl shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-hairline">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Clientes Selecionados para Contato Individual
          </span>
        </div>

        <div className="divide-y divide-hairline">
          {currentList.map((c: any, idx) => (
            <div
              key={idx}
              className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-muted/15 transition-colors"
            >
              <div>
                <h4 className="text-xs font-bold text-foreground">{c.name}</h4>
                <p className="text-[11px] text-muted-foreground font-mono">{c.phone}</p>
                {c.daysInactive && (
                  <span className="text-[10px] text-amber-400 font-semibold block mt-0.5">
                    Sem visitas há {c.daysInactive} dias • Último serviço: {c.lastService}
                  </span>
                )}
                {c.birthDate && (
                  <span className="text-[10px] text-purple-400 font-semibold block mt-0.5">
                    Data de Aniversário: {c.birthDate}
                  </span>
                )}
                {c.visits && (
                  <span className="text-[10px] text-primary font-semibold block mt-0.5">
                    {c.visits} atendimentos realizados • Total: {c.spent}
                  </span>
                )}
              </div>

              <Button
                size="sm"
                onClick={() => handleOpenWhatsApp(c.name, c.phone)}
                className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer px-3 shadow-xs"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Enviar no WhatsApp</span>
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
