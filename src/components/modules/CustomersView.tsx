import React, { useState, useMemo } from "react";
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Star,
  TrendingUp,
  Calendar,
  Cake,
  Award,
  AlertTriangle,
  UserCheck,
  UserX,
  Share2,
  Sliders,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { CustomerItem, BusinessSettings } from "@/routes/index";
import type { LoyaltySettings, LoyaltyTierConfig } from "@/lib/loyalty/loyalty.service";

interface CustomersViewProps {
  customers: CustomerItem[];
  onOpenNewCustomerModal: () => void;
  businessSettings: BusinessSettings;
  loyaltySettings?: LoyaltySettings;
  loyaltyTiers?: LoyaltyTierConfig[];
  onOpenBookingForCustomer?: (cust: CustomerItem) => void;
  onOpenAdjustPointsModal?: (cust: CustomerItem) => void;
}

export function CustomersView({
  customers,
  onOpenNewCustomerModal,
  businessSettings,
  loyaltySettings,
  loyaltyTiers,
  onOpenBookingForCustomer,
  onOpenAdjustPointsModal,
}: CustomersViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSegmentFilter, setSelectedSegmentFilter] = useState<string>("ALL");

  // Helper para verificar se aniversaria hoje ou na semana atual
  const checkBirthdayStatus = (birthDateStr?: string) => {
    if (!birthDateStr) return { isToday: false, isThisWeek: false, formatted: null };
    try {
      const parts = birthDateStr.split("-");
      if (parts.length < 3) return { isToday: false, isThisWeek: false, formatted: birthDateStr };
      const month = parseInt(parts[1] || "0", 10);
      const day = parseInt(parts[2] || "0", 10);

      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();

      const isToday = month === currentMonth && day === currentDay;

      // Verifica se cai na mesma semana (janela de 7 dias)
      const thisYearBday = new Date(now.getFullYear(), month - 1, day);
      const diffDays = Math.round((thisYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isThisWeek = isToday || (diffDays >= -3 && diffDays <= 4);

      return {
        isToday,
        isThisWeek,
        formatted: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`,
      };
    } catch {
      return { isToday: false, isThisWeek: false, formatted: birthDateStr };
    }
  };

  // Contagens dos segmentos de relacionamento (CRM)
  const segmentStats = useMemo(() => {
    const total = customers.length;
    let novos = 0;
    let recorrentes = 0;
    let vips = 0;
    let emRisco = 0;
    let inativos = 0;
    let bdayWeek = 0;

    customers.forEach((c) => {
      const seg = c.crmSegment || (c.tag === "VIP" ? "VIP" : c.tag === "Recorrente" ? "RECORRENTE" : "NOVO");
      if (seg === "VIP") vips++;
      else if (seg === "RECORRENTE") recorrentes++;
      else if (seg === "EM_RISCO") emRisco++;
      else if (seg === "INATIVO") inativos++;
      else novos++;

      const bday = checkBirthdayStatus(c.birthDate);
      if (bday.isThisWeek) bdayWeek++;
    });

    return { total, novos, recorrentes, vips, emRisco, inativos, bdayWeek };
  }, [customers]);

  // Lista filtrada
  const filtered = useMemo(() => {
    let list = customers;

    if (selectedSegmentFilter !== "ALL") {
      if (selectedSegmentFilter === "BDAY_WEEK") {
        list = list.filter((c) => checkBirthdayStatus(c.birthDate).isThisWeek);
      } else {
        list = list.filter((c) => {
          const seg = c.crmSegment || (c.tag === "VIP" ? "VIP" : c.tag === "Recorrente" ? "RECORRENTE" : "NOVO");
          return seg === selectedSegmentFilter;
        });
      }
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.cpf.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.referralCode && c.referralCode.toLowerCase().includes(q))
    );
  }, [customers, searchQuery, selectedSegmentFilter]);

  // Gerador de mensagem personalizada do WhatsApp (wa.me)
  const buildWhatsAppLink = (cust: CustomerItem) => {
    const cleanPhone = cust.phone.replace(/\D/g, "");
    const firstName = cust.name.split(" ")[0];
    const bday = checkBirthdayStatus(cust.birthDate);

    let text = "";
    if (bday.isToday) {
      text = `Olá, ${firstName}! 🎉 Parabéns pelo seu aniversário! A equipe da ${businessSettings.name} deseja muitas felicidades e saúde! Preparamos uma condição super especial para você comemorar aqui conosco. Vamos agendar seu horário?`;
    } else if (bday.isThisWeek) {
      text = `Olá, ${firstName}! 🎂 Ficamos sabendo que seu aniversário está chegando! Que tal vir dar aquele talento no visual aqui na ${businessSettings.name}? Preparamos um benefício exclusivo para você!`;
    } else if (cust.crmSegment === "EM_RISCO" || cust.crmSegment === "INATIVO") {
      text = `Olá, ${firstName}! Sentimos sua falta aqui na ${businessSettings.name}! Já faz um tempo desde sua última visita. Que tal reservar um horário essa semana para manter o estilo impecável?`;
    } else if (cust.crmSegment === "VIP") {
      text = `Olá, ${firstName}! Tudo bem? Passando para agradecer sua preferência como cliente VIP na ${businessSettings.name}. Você já tem ${cust.loyaltyPoints} pontos acumulados para resgate!`;
    } else {
      text = `Olá, ${firstName}! Tudo bem? Passando para saber quando será seu próximo horário aqui na ${businessSettings.name}.`;
    }

    return `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  // Cores dos Níveis
  const getTierBadgeStyle = (tier?: string) => {
    switch (tier) {
      case "BLACK":
        return "bg-black text-white border-zinc-700 shadow-xs";
      case "OURO":
        return "bg-amber-500/20 text-amber-400 border-amber-500/40";
      case "PRATA":
        return "bg-slate-300/20 text-slate-300 border-slate-400/30";
      default:
        return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="h-6 w-6 text-primary" />
            Central de Relacionamento & CRM
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Segmentação inteligente, fidelidade integrada, acompanhamento de aniversariantes e contato direto via WhatsApp.
          </p>
        </div>
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 cursor-pointer font-semibold h-9 px-4 shadow-md shadow-primary/20"
          onClick={onOpenNewCustomerModal}
        >
          <UserPlus className="h-4 w-4" />
          <span>Novo Cliente</span>
        </Button>
      </div>

      {/* Cards de Segmentação CRM & Inteligência de Relacionamento */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <button
          onClick={() => setSelectedSegmentFilter("ALL")}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedSegmentFilter === "ALL"
              ? "bg-primary/15 border-primary shadow-sm"
              : "bg-card border-hairline hover:bg-muted/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Todos</span>
            <Users className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-lg font-black font-sans text-foreground block mt-1">{segmentStats.total}</span>
        </button>

        <button
          onClick={() => setSelectedSegmentFilter("VIP")}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedSegmentFilter === "VIP"
              ? "bg-amber-500/20 border-amber-500 shadow-sm"
              : "bg-card border-hairline hover:bg-muted/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase">VIP</span>
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <span className="text-lg font-black font-sans text-foreground block mt-1">{segmentStats.vips}</span>
        </button>

        <button
          onClick={() => setSelectedSegmentFilter("RECORRENTE")}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedSegmentFilter === "RECORRENTE"
              ? "bg-emerald-500/20 border-emerald-500 shadow-sm"
              : "bg-card border-hairline hover:bg-muted/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase">Recorrentes</span>
            <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <span className="text-lg font-black font-sans text-foreground block mt-1">{segmentStats.recorrentes}</span>
        </button>

        <button
          onClick={() => setSelectedSegmentFilter("NOVO")}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedSegmentFilter === "NOVO"
              ? "bg-blue-500/20 border-blue-500 shadow-sm"
              : "bg-card border-hairline hover:bg-muted/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-400 uppercase">Novos</span>
            <Star className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <span className="text-lg font-black font-sans text-foreground block mt-1">{segmentStats.novos}</span>
        </button>

        <button
          onClick={() => setSelectedSegmentFilter("EM_RISCO")}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedSegmentFilter === "EM_RISCO"
              ? "bg-amber-600/20 border-amber-600 shadow-sm"
              : "bg-card border-hairline hover:bg-muted/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-500 uppercase">Em Risco</span>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <span className="text-lg font-black font-sans text-foreground block mt-1">{segmentStats.emRisco}</span>
        </button>

        <button
          onClick={() => setSelectedSegmentFilter("INATIVO")}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedSegmentFilter === "INATIVO"
              ? "bg-rose-500/20 border-rose-500 shadow-sm"
              : "bg-card border-hairline hover:bg-muted/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-400 uppercase">Inativos</span>
            <UserX className="h-3.5 w-3.5 text-rose-400" />
          </div>
          <span className="text-lg font-black font-sans text-foreground block mt-1">{segmentStats.inativos}</span>
        </button>

        <button
          onClick={() => setSelectedSegmentFilter("BDAY_WEEK")}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedSegmentFilter === "BDAY_WEEK"
              ? "bg-pink-500/25 border-pink-500 shadow-sm ring-1 ring-pink-500/40"
              : "bg-card border-hairline hover:bg-muted/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-pink-400 uppercase">Aniversários</span>
            <Cake className="h-3.5 w-3.5 text-pink-400" />
          </div>
          <span className="text-lg font-black font-sans text-foreground block mt-1 flex items-center gap-1">
            {segmentStats.bdayWeek}
            {segmentStats.bdayWeek > 0 && (
              <span className="text-[9px] px-1 py-0.2 rounded-full bg-pink-500/20 text-pink-300 font-normal">
                semana
              </span>
            )}
          </span>
        </button>
      </div>

      {/* Barra de Busca e Filtro Ativo */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone, e-mail, CPF ou código de indicação..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-xs bg-card border-hairline"
          />
        </div>

        {selectedSegmentFilter !== "ALL" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedSegmentFilter("ALL")}
            className="h-10 text-xs border-hairline text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
          >
            Limpar Filtro ({selectedSegmentFilter})
          </Button>
        )}
      </div>

      {/* Listagem de Clientes */}
      <Card className="border-hairline bg-card rounded-2xl shadow-md overflow-hidden">
        <CardContent className="p-0">
          <div className="divide-y divide-hairline">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-xs space-y-2">
                <Users className="h-8 w-8 mx-auto opacity-30" />
                <p>Nenhum cliente encontrado com os critérios de busca.</p>
              </div>
            ) : (
              filtered.map((cust) => {
                const bday = checkBirthdayStatus(cust.birthDate);
                const tierStyle = getTierBadgeStyle(cust.loyaltyTier);

                return (
                  <div
                    key={cust.id}
                    className="p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:bg-muted/15 transition-colors"
                  >
                    {/* Dados Básicos e Badges */}
                    <div className="flex items-start gap-3.5">
                      <div className="h-11 w-11 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-base shrink-0 mt-0.5">
                        {cust.name.charAt(0)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-foreground">{cust.name}</span>

                          {/* Segmento CRM */}
                          <Badge
                            variant="secondary"
                            className="text-[10px] py-0.2 px-2 font-bold uppercase"
                          >
                            {cust.crmSegment || cust.tag}
                          </Badge>

                          {/* Nível de Fidelidade */}
                          <Badge
                            variant="outline"
                            className={`text-[10px] py-0.2 px-2 font-bold uppercase ${tierStyle}`}
                          >
                            <Award className="h-3 w-3 mr-1" />
                            {cust.loyaltyTier || "BRONZE"}
                          </Badge>

                          {/* Destaque Aniversariante */}
                          {bday.isToday && (
                            <Badge className="bg-pink-500 text-white font-black text-[10px] py-0.2 px-2 animate-pulse">
                              🎂 ANIVERSARIANTE HOJE!
                            </Badge>
                          )}
                          {!bday.isToday && bday.isThisWeek && (
                            <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/30 text-[10px] py-0.2 px-2">
                              🎂 Aniversário esta semana ({bday.formatted})
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                          WhatsApp: <strong className="text-foreground">{cust.phone}</strong> • CPF: {cust.cpf} • {cust.email}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                          {bday.formatted && !bday.isToday && !bday.isThisWeek && (
                            <span className="flex items-center gap-1">
                              <Cake className="h-3 w-3 text-muted-foreground" />
                              Niver: {bday.formatted}
                            </span>
                          )}

                          {cust.referralCode && (
                            <span className="flex items-center gap-1 font-mono text-[10px] bg-muted/40 px-1.5 py-0.5 rounded border border-hairline/60">
                              <Share2 className="h-3 w-3 text-primary" />
                              Código: <strong className="text-foreground">{cust.referralCode}</strong>
                            </span>
                          )}

                          {cust.preferredBarberName && (
                            <span>
                              Barbeiro favorito: <strong className="text-foreground">{cust.preferredBarberName}</strong>
                            </span>
                          )}
                        </div>

                        {cust.notes && (
                          <p className="text-[11px] text-muted-foreground/90 italic bg-muted/25 px-2 py-0.5 rounded border border-hairline/40 max-w-xl">
                            Obs: {cust.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Indicadores Numéricos & Ações */}
                    <div className="flex flex-wrap items-center gap-3 text-xs self-end lg:self-auto">
                      {/* Pontos de Fidelidade */}
                      <div className="bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-xl text-center min-w-[70px]">
                        <span className="text-[10px] text-primary/80 font-bold block uppercase flex items-center justify-center gap-1">
                          <Star className="h-3 w-3 text-primary fill-primary" /> Saldo
                        </span>
                        <span className="font-mono font-black text-primary text-sm">
                          {cust.loyaltyPoints ?? 0} <span className="text-[10px] font-normal">pts</span>
                        </span>
                      </div>

                      {/* Visitas */}
                      <div className="bg-muted/30 px-2.5 py-1.5 rounded-xl border border-hairline text-center min-w-[55px]">
                        <span className="text-muted-foreground text-[10px] block">Visitas</span>
                        <span className="font-mono font-bold text-foreground text-xs">{cust.visits}</span>
                      </div>

                      {/* Total Gasto */}
                      <div className="bg-muted/30 px-2.5 py-1.5 rounded-xl border border-hairline text-center min-w-[70px]">
                        <span className="text-muted-foreground text-[10px] block">Total Gasto</span>
                        <span className="font-mono font-bold text-foreground text-xs">
                          R$ {cust.spent.toFixed(2)}
                        </span>
                      </div>

                      {/* Botão de Agendamento Rápido */}
                      {onOpenBookingForCustomer && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenBookingForCustomer(cust)}
                          className="h-9 text-xs border-hairline hover:bg-muted cursor-pointer"
                          title="Agendar horário para este cliente"
                        >
                          <Calendar className="h-3.5 w-3.5 mr-1 text-primary" />
                          <span>Agendar</span>
                        </Button>
                      )}

                      {/* Botão Ajustar Pontos Manualmente */}
                      {onOpenAdjustPointsModal && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onOpenAdjustPointsModal(cust)}
                          className="h-9 px-2 text-muted-foreground hover:text-foreground text-xs"
                          title="Ajuste manual de pontos"
                        >
                          <Sliders className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {/* Ação WhatsApp Direto com Template Inteligente */}
                      <a
                        href={buildWhatsAppLink(cust)}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-xs ${
                          bday.isToday || bday.isThisWeek
                            ? "bg-pink-500 text-white hover:bg-pink-600 border border-pink-400"
                            : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
                        }`}
                        title="Abrir WhatsApp com template inteligente"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>{bday.isToday ? "Parabenizar" : "WhatsApp"}</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
