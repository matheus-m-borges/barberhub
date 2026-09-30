import React, { useState } from "react";
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Scissors,
  Star,
  MoreVertical,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Filter,
  Sparkles,
  Cake,
  Gift,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DashboardViewProps {
  onNavigateToAgenda: () => void;
  onNavigateToPos: (appointmentId?: string) => void;
  onNavigateToEmployees: () => void;
  onQuickCheckIn: (appointmentId: string) => void;
  unitName?: string;
  onNavigateToCustomers?: (filter?: string) => void;
  onNavigateToLoyalty?: (subtab?: string) => void;
  loyaltySummary?: {
    birthdaysWeek: number;
    atRiskCustomers: number;
    redemptionsCount: number;
    circulatingPoints: number;
  };
}

export function DashboardView({
  onNavigateToAgenda,
  onNavigateToPos,
  onNavigateToEmployees,
  onQuickCheckIn,
  unitName = "Matriz — Centro",
  onNavigateToCustomers,
  onNavigateToLoyalty,
  loyaltySummary = {
    birthdaysWeek: 2,
    atRiskCustomers: 1,
    redemptionsCount: 3,
    circulatingPoints: 1250,
  },
}: DashboardViewProps) {
  const [revenuePeriod, setRevenuePeriod] = useState<"week" | "month" | "6month" | "year">("month");
  const [employeePeriod, setEmployeePeriod] = useState<"week" | "month" | "6month" | "year">("month");
  const [distributionPeriod, setDistributionPeriod] = useState<"week" | "month" | "6month" | "year">("month");

  // Dados das Barras do Relatório de Faturamento (espelhando a referência do print)
  const revenueBars = [
    { label: "01 Set", expensesHeight: 28, profitHeight: 45, value: null },
    { label: "05 Set", expensesHeight: 35, profitHeight: 52, value: null },
    { label: "10 Set", expensesHeight: 42, profitHeight: 68, value: "R$ 15.5k" },
    { label: "15 Set", expensesHeight: 25, profitHeight: 40, value: null },
    { label: "20 Set", expensesHeight: 50, profitHeight: 75, value: "R$ 18.2k" },
    { label: "25 Set", expensesHeight: 32, profitHeight: 48, value: null },
    { label: "30 Set", expensesHeight: 38, profitHeight: 60, value: "R$ 12.8k" },
  ];

  // Top Colaboradores (exatamente como na imagem de referência)
  const topEmployees = [
    {
      id: "emp-1",
      name: "Mike Miller",
      role: "Barbeiro Master",
      rating: "5.0",
      stars: 5,
      clientsCount: 125,
      avatar: "M",
    },
    {
      id: "emp-2",
      name: "Tim Vander",
      role: "Barbeiro",
      rating: "5.0",
      stars: 5,
      clientsCount: 104,
      avatar: "T",
    },
    {
      id: "emp-3",
      name: "Emma Doe",
      role: "Colorista & Visagista",
      rating: "4.5",
      stars: 4,
      clientsCount: 100,
      avatar: "E",
    },
    {
      id: "emp-4",
      name: "Emily Johnson",
      role: "Especialista Barba",
      rating: "4.0",
      stars: 4,
      clientsCount: 98,
      avatar: "E",
    },
  ];

  // Top Performers com barras de produtividade segmentadas (estilo equalizador do print)
  const topPerformers = [
    {
      id: "tp-1",
      name: "Mike Miller",
      role: "Barbeiro Master",
      productivity: 100,
      filledBlocks: 20,
      totalBlocks: 20,
    },
    {
      id: "tp-2",
      name: "Tim Vander",
      role: "Barbeiro",
      productivity: 85,
      filledBlocks: 17,
      totalBlocks: 20,
    },
  ];

  // Atendimentos do Dia (estilo print da referência)
  const todayAppointments = [
    {
      id: "apt-1",
      clientName: "Matthew Wilson",
      clientEmail: "m.wilson@email.com",
      serviceName: "Corte Degradê",
      serviceType: "haircut", // violet
      time: "10:30",
      status: "AGENDADO",
    },
    {
      id: "apt-2",
      clientName: "Olivia Brown",
      clientEmail: "olivia.brown@email.com",
      serviceName: "Coloração & Barba",
      serviceType: "color", // orange
      time: "11:30",
      status: "AGUARDANDO",
    },
    {
      id: "apt-3",
      clientName: "James Miller",
      clientEmail: "james.miller@email.com",
      serviceName: "Barba Terapia VIP",
      serviceType: "beard", // white/slate
      time: "14:15",
      status: "EM_ATENDIMENTO",
    },
    {
      id: "apt-4",
      clientName: "Emily Davis",
      clientEmail: "emily.davis@email.com",
      serviceName: "Corte Tradicional",
      serviceType: "haircut", // violet
      time: "15:45",
      status: "AGENDADO",
    },
    {
      id: "apt-5",
      clientName: "Lucas Alcantara",
      clientEmail: "lucas.alc@email.com",
      serviceName: "Combo Cabelo + Barba",
      serviceType: "color", // orange
      time: "17:00",
      status: "AGENDADO",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Sub-bar de Contexto da Unidade (inspirado na barra superior do print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Button
            size="sm"
            variant="default"
            className="h-8 rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium px-4 text-xs"
          >
            Dashboard Executivo
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onNavigateToAgenda}
            className="h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-card px-3 text-xs"
          >
            Agenda Geral
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onNavigateToPos()}
            className="h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-card px-3 text-xs"
          >
            Frente de Caixa
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onNavigateToEmployees}
            className="h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-card px-3 text-xs"
          >
            Equipe & Escala
          </Button>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-muted-foreground bg-card border border-hairline px-3 py-1.5 rounded-full">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Unidade: <strong className="text-foreground">{unitName}</strong></span>
        </div>
      </div>

      {/* Cards de Inteligência de Relacionamento & Fidelidade (Requisito 97) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigateToCustomers && onNavigateToCustomers("BDAY_WEEK")}
          className="p-3 rounded-2xl border border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 text-left transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-pink-400">
            <span className="text-[10px] font-bold uppercase">Aniversários da Semana</span>
            <Cake className="h-4 w-4" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black font-sans text-pink-300">
              {loyaltySummary.birthdaysWeek}
            </span>
            <span className="text-[10px] text-pink-400/80 font-medium">Ver clientes &gt;</span>
          </div>
        </button>

        <button
          onClick={() => onNavigateToCustomers && onNavigateToCustomers("EM_RISCO")}
          className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-left transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[10px] font-bold uppercase">Clientes em Risco</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black font-sans text-amber-300">
              {loyaltySummary.atRiskCustomers}
            </span>
            <span className="text-[10px] text-amber-400/80 font-medium">Recuperar &gt;</span>
          </div>
        </button>

        <button
          onClick={() => onNavigateToLoyalty && onNavigateToLoyalty("REWARDS")}
          className="p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-left transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[10px] font-bold uppercase">Resgates Realizados</span>
            <Gift className="h-4 w-4" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black font-sans text-emerald-300">
              {loyaltySummary.redemptionsCount}
            </span>
            <span className="text-[10px] text-emerald-400/80 font-medium">Catálogo &gt;</span>
          </div>
        </button>

        <button
          onClick={() => onNavigateToLoyalty && onNavigateToLoyalty("LEDGER")}
          className="p-3 rounded-2xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-left transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-primary">
            <span className="text-[10px] font-bold uppercase">Pontos em Circulação</span>
            <Star className="h-4 w-4 fill-primary" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black font-sans text-foreground">
              {loyaltySummary.circulatingPoints}
            </span>
            <span className="text-[10px] text-primary/80 font-medium">Extrato &gt;</span>
          </div>
        </button>
      </div>

      {/* Linha de KPIs Rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-card border-hairline shadow-sm hover:border-hairline/80 transition-all">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Faturamento Hoje</span>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
                R$ 1.840,00
              </span>
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center">
                +14% <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1">24 atendimentos computados</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-hairline shadow-sm hover:border-hairline/80 transition-all">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Faturamento Mensal</span>
              <TrendingUp className="h-4 w-4 text-[#8b5cf6]" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
                R$ 38.450,00
              </span>
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center">
                +22% <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1">Meta de R$ 45.000 atingida em 85%</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-hairline shadow-sm hover:border-hairline/80 transition-all">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Ticket Médio</span>
              <Scissors className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
                R$ 76,50
              </span>
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center">
                +8% <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1">Impulsionado por venda casada e barboterapia</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-hairline shadow-sm hover:border-hairline/80 transition-all">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Taxa de Ocupação</span>
              <Calendar className="h-4 w-4 text-[#8b5cf6]" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
                88%
              </span>
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center">
                Alta <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1">4 cadeiras operando em capacidade máxima</span>
          </CardContent>
        </Card>
      </div>

      {/* Grid Principal do CRM: Revenue Report + Top Employees (Conforme a imagem de referência) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CARD 1: REVENUE REPORT (Coluna 7 de 12) */}
        <Card className="lg:col-span-7 bg-card border-hairline shadow-md rounded-2xl flex flex-col">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg font-bold text-foreground">Relatório de Faturamento</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Comparativo de despesas x lucro líquido</CardDescription>
            </div>

            {/* Filtro temporal de período */}
            <div className="flex items-center rounded-full bg-muted/40 p-1 border border-hairline text-[11px]">
              {(["week", "month", "6month", "year"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setRevenuePeriod(p)}
                  className={`px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer ${
                    revenuePeriod === p
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p === "week" ? "Semana" : p === "month" ? "Mês" : p === "6month" ? "6 Meses" : "Ano"}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="pt-4 flex-1 flex flex-col justify-between">
            {/* Legenda das cores (Laranja = Despesas, Roxo/Violeta = Lucro Líquido) */}
            <div className="flex items-center gap-5 text-xs mb-6">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
                <span className="text-muted-foreground">Despesas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#8b5cf6]" />
                <span className="text-foreground font-medium">Lucro Líquido</span>
              </div>
            </div>

            {/* Área do Gráfico com Barras Arredondadas (estilo print da referência) */}
            <div className="flex items-end justify-between gap-3 h-52 sm:h-60 pt-6 pb-2 px-2 border-b border-hairline/60">
              {revenueBars.map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip flutuante com valor de destaque */}
                  {bar.value && (
                    <div className="absolute -top-7 z-10 rounded-md bg-secondary/95 border border-hairline px-2 py-0.5 text-[10px] font-bold text-foreground shadow-md whitespace-nowrap animate-bounce">
                      {bar.value}
                    </div>
                  )}

                  {/* Cápsula arredondada que segura o empilhamento */}
                  <div className="w-full max-w-[34px] sm:max-w-[42px] h-44 rounded-2xl bg-muted/20 flex flex-col justify-end p-1 overflow-hidden transition-all group-hover:bg-muted/40">
                    {/* Parte Superior: Lucro Líquido (Violeta) */}
                    <div
                      style={{ height: `${bar.profitHeight}%` }}
                      className="w-full bg-[#8b5cf6] rounded-t-xl transition-all duration-500 shadow-xs"
                      title={`Lucro: ${bar.profitHeight}%`}
                    />
                    {/* Parte Inferior: Despesas (Laranja) */}
                    <div
                      style={{ height: `${bar.expensesHeight}%` }}
                      className="w-full bg-[#f97316] rounded-b-xl mt-1 transition-all duration-500 shadow-xs"
                      title={`Despesas: ${bar.expensesHeight}%`}
                    />
                  </div>

                  <span className="text-[10px] text-muted-foreground font-mono mt-1">
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Resumo do rodapé do card */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 mt-2">
              <span>Média diária de faturamento: <strong className="text-foreground">R$ 1.280,00</strong></span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                Lucro operacional: 64%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: TOP EMPLOYEES (Coluna 5 de 12) */}
        <Card className="lg:col-span-5 bg-card border-hairline shadow-md rounded-2xl flex flex-col">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg font-bold text-foreground">Top Colaboradores</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Avaliações e volume de clientes</CardDescription>
            </div>

            {/* Filtro do Top Colaboradores */}
            <div className="flex items-center rounded-full bg-muted/40 p-1 border border-hairline text-[11px]">
              {(["week", "month", "6month", "year"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setEmployeePeriod(p)}
                  className={`px-2 py-0.5 rounded-full font-medium transition-all cursor-pointer ${
                    employeePeriod === p
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p === "week" ? "Sem" : p === "month" ? "Mês" : p === "6month" ? "6M" : "Ano"}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-3">
            <div className="space-y-3">
              {topEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors border border-transparent hover:border-hairline"
                >
                  {/* Foto/Avatar + Nome + Badge */}
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/30 flex items-center justify-center font-bold text-sm">
                      {emp.avatar}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs text-foreground">{emp.name}</span>
                      <span className="inline-block px-1.5 py-0.5 text-[9px] font-medium bg-[#8b5cf6]/15 text-[#a78bfa] rounded-md border border-[#8b5cf6]/20 w-fit mt-0.5">
                        {emp.role}
                      </span>
                    </div>
                  </div>

                  {/* Estrelas + Contagem de Clientes */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-foreground">{emp.rating}</span>
                      <div className="flex text-[#f97316]">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i < emp.stars ? "fill-[#f97316]" : "text-muted-foreground/30"}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg bg-card border border-hairline px-2.5 py-1 text-[11px] font-semibold text-foreground">
                      {emp.clientsCount} <span className="text-muted-foreground text-[10px]">Clientes</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToEmployees}
              className="w-full text-xs border-hairline hover:bg-muted/50 cursor-pointer mt-2"
            >
              Ver Detalhes da Equipe & Comissões
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Linha Inferior do CRM: Top Performers + Distribuição de Serviços + Atendimentos de Hoje */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* CARD 3: TOP PERFORMERS (Medidor de Produtividade Segmentado em Blocos Laranjas) */}
        <Card className="md:col-span-4 bg-card border-hairline shadow-md rounded-2xl flex flex-col justify-between">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-bold text-foreground">Top Performers</CardTitle>
            <button
              onClick={onNavigateToEmployees}
              className="text-xs text-primary hover:underline font-medium cursor-pointer"
            >
              Ver todos
            </button>
          </CardHeader>

          <CardContent className="space-y-6 pt-1">
            {topPerformers.map((performer) => (
              <div key={performer.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30 flex items-center justify-center font-bold text-xs">
                      {performer.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">{performer.name}</div>
                      <div className="text-[10px] text-muted-foreground">{performer.role}</div>
                    </div>
                  </div>

                  <button
                    onClick={onNavigateToEmployees}
                    className="h-7 w-7 rounded-full bg-muted/40 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Medidor Segmentado em Blocos Horizontais (estilo bateria/equalizador do print de referência) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Produtividade:</span>
                    <span className="font-bold text-foreground">{performer.productivity}%</span>
                  </div>

                  <div className="flex gap-1 h-3 py-0.5">
                    {Array.from({ length: performer.totalBlocks }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`flex-1 rounded-[1.5px] transition-all ${
                          idx < performer.filledBlocks
                            ? "bg-[#f97316] shadow-xs"
                            : "bg-muted/40"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-hairline/60 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Metas operacionais:</span>
              <span className="text-emerald-400 font-semibold">100% cumpridas no mês</span>
            </div>
          </CardContent>
        </Card>

        {/* CARD 4: DISTRIBUIÇÃO DE SERVIÇOS (Gráfico Donut) */}
        <Card className="md:col-span-4 bg-card border-hairline shadow-md rounded-2xl flex flex-col justify-between">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-bold text-foreground">Mix de Serviços</CardTitle>
            <div className="flex items-center rounded-full bg-muted/40 p-0.5 border border-hairline text-[10px]">
              {(["week", "month"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setDistributionPeriod(p)}
                  className={`px-2 py-0.5 rounded-full font-medium transition-all cursor-pointer ${
                    distributionPeriod === p
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground"
                  }`}
                >
                  {p === "week" ? "Sem" : "Mês"}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="pt-2 flex flex-col items-center justify-center space-y-4">
            {/* Visualização de Círculo / Donut Proporcional */}
            <div className="relative flex items-center justify-center my-2">
              {/* Círculo Principal Estilizado */}
              <div className="h-36 w-36 rounded-full border-[12px] border-t-[#8b5cf6] border-r-[#f97316] border-b-white border-l-slate-600/50 flex flex-col items-center justify-center shadow-lg">
                <span className="text-2xl font-black text-foreground">46%</span>
                <span className="text-[10px] text-muted-foreground uppercase font-mono">Cortes</span>
              </div>
            </div>

            {/* Legenda com percentuais do print */}
            <div className="grid grid-cols-2 gap-2.5 w-full text-xs pt-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#8b5cf6]" />
                <span className="text-muted-foreground text-[11px]">46% Degradê & Fade</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
                <span className="text-muted-foreground text-[11px]">32% Barba Terapia</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-white" />
                <span className="text-muted-foreground text-[11px]">18% Tratamentos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                <span className="text-muted-foreground text-[11px]">4% Outros</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 5: ATENDIMENTOS DE HOJE (Lista de Agendamentos Operacionais com Check-in) */}
        <Card className="md:col-span-4 bg-card border-hairline shadow-md rounded-2xl flex flex-col justify-between">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-bold text-foreground">Atendimentos de Hoje</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Fila e próximos agendados</CardDescription>
            </div>
            <button
              onClick={onNavigateToAgenda}
              className="text-xs text-primary hover:underline font-medium cursor-pointer"
            >
              Ver agenda
            </button>
          </CardHeader>

          <CardContent className="pt-2 space-y-2.5 flex-1">
            {todayAppointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between p-2 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors border border-transparent hover:border-hairline"
              >
                {/* Cliente */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-muted/60 text-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                    {apt.clientName.charAt(0)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-xs text-foreground truncate">{apt.clientName}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{apt.clientEmail}</span>
                  </div>
                </div>

                {/* Badge do Serviço + Horário + Ação de Check-in */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 text-[9px] font-semibold rounded-full ${
                      apt.serviceType === "haircut"
                        ? "bg-[#8b5cf6]/20 text-[#a78bfa] border border-[#8b5cf6]/30"
                        : apt.serviceType === "color"
                        ? "bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {apt.serviceName}
                  </span>

                  <span className="text-[11px] font-mono font-bold text-foreground">
                    {apt.time}
                  </span>

                  <button
                    onClick={() => onQuickCheckIn(apt.id)}
                    className="h-6 px-1.5 text-[10px] font-bold rounded bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                    title="Fazer Check-in e abrir no Caixa"
                  >
                    Check-in
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
