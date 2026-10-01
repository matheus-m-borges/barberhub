import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Clock,
  ArrowUpRight,
  Scissors,
  Star,
  ChevronRight,
  Cake,
  Gift,
  AlertTriangle,
  Plus,
  UserPlus,
  CheckCircle2,
  CalendarPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AttendanceItem } from "./PosCheckoutView";
import type { EmployeeItem, CustomerItem, ServiceItem } from "@/routes/index";

interface DashboardViewProps {
  onNavigateToAgenda: () => void;
  onNavigateToPos: (appointmentId?: string) => void;
  onNavigateToEmployees: () => void;
  onQuickCheckIn: (appointmentId: string) => void;
  unitName?: string;
  onNavigateToCustomers?: (filter?: string) => void;
  onNavigateToLoyalty?: (subtab?: string) => void;
  attendances?: AttendanceItem[];
  employees?: EmployeeItem[];
  customers?: CustomerItem[];
  services?: ServiceItem[];
  salesTotal?: number;
  commissionsTotal?: number;
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
  unitName = "Minha Barbearia",
  onNavigateToCustomers,
  onNavigateToLoyalty,
  attendances = [],
  employees = [],
  customers = [],
  services = [],
  salesTotal = 0,
  commissionsTotal = 0,
  loyaltySummary = {
    birthdaysWeek: 0,
    atRiskCustomers: 0,
    redemptionsCount: 0,
    circulatingPoints: 0,
  },
}: DashboardViewProps) {
  const [revenuePeriod, setRevenuePeriod] = useState<"week" | "month" | "6month" | "year">("month");
  const [distributionPeriod, setDistributionPeriod] = useState<"week" | "month">("month");

  // Métricas Reais Derivadas dos Atendimentos e Vendas do Sistema
  const finalizedAttendances = useMemo(
    () => attendances.filter((a) => a.status === "FINALIZADO"),
    [attendances]
  );

  const todaySales = useMemo(() => {
    return finalizedAttendances.reduce((acc, a) => acc + (a.total || 0), 0);
  }, [finalizedAttendances]);

  const todayCompletedCount = finalizedAttendances.length;

  const ticketMedio = useMemo(() => {
    if (todayCompletedCount === 0) return 0;
    return Number((todaySales / todayCompletedCount).toFixed(2));
  }, [todaySales, todayCompletedCount]);

  const activeBarbers = useMemo(() => {
    return employees.filter((e) => e.role === "BARBEIRO" && e.status === "ACTIVE");
  }, [employees]);

  // Taxa de ocupação calculada com base na agenda real (8 slots por barbeiro no dia)
  const occupancyRate = useMemo(() => {
    const totalSlots = Math.max(1, activeBarbers.length * 8);
    const activeApts = attendances.filter((a) => a.status !== "CANCELADO").length;
    return Math.min(100, Math.round((activeApts / totalSlots) * 100));
  }, [activeBarbers, attendances]);

  // Atendimentos do Dia (somente registros reais)
  const todayAppointments = useMemo(() => {
    return attendances.filter((a) => a.status !== "CANCELADO");
  }, [attendances]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Sub-bar de Contexto do Estabelecimento */}
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
            className="h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-card px-3 text-xs cursor-pointer"
          >
            Agenda Geral
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onNavigateToPos()}
            className="h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-card px-3 text-xs cursor-pointer"
          >
            Frente de Caixa
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onNavigateToEmployees}
            className="h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-card px-3 text-xs cursor-pointer"
          >
            Equipe & Escala
          </Button>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-muted-foreground bg-card border border-hairline px-3 py-1.5 rounded-full">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Barbearia: <strong className="text-foreground">{unitName}</strong></span>
        </div>
      </div>

      {/* Cards de Inteligência de Relacionamento & Fidelidade */}
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

      {/* Linha de KPIs Rápidos Calculados em Tempo Real */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-card border-hairline shadow-sm">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Faturamento Hoje</span>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
                R$ {todaySales.toFixed(2)}
              </span>
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center">
                {todayCompletedCount > 0 ? `${todayCompletedCount} vendas` : "0 vendas"}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1">
              {todayCompletedCount > 0 ? `${todayCompletedCount} atendimentos concluídos hoje` : "Nenhum atendimento finalizado hoje"}
            </span>
          </CardContent>
        </Card>

        <Card className="bg-card border-hairline shadow-sm">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Faturamento Acumulado</span>
              <TrendingUp className="h-4 w-4 text-[#8b5cf6]" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
                R$ {salesTotal.toFixed(2)}
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground">
                Total PDV
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1">
              Comissões geradas: R$ {commissionsTotal.toFixed(2)}
            </span>
          </CardContent>
        </Card>

        <Card className="bg-card border-hairline shadow-sm">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Ticket Médio</span>
              <Scissors className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
                R$ {ticketMedio.toFixed(2)}
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground">
                Por comanda
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1">
              Baseado no histórico de compras finalizadas
            </span>
          </CardContent>
        </Card>

        <Card className="bg-card border-hairline shadow-sm">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Taxa de Ocupação</span>
              <Calendar className="h-4 w-4 text-[#8b5cf6]" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
                {occupancyRate}%
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {activeBarbers.length} {activeBarbers.length === 1 ? "cadeira" : "cadeiras"}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1">
              {todayAppointments.length} agendamentos registrados
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Grid Principal: Faturamento + Equipe */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CARD 1: RELATÓRIO DE FATURAMENTO */}
        <Card className="lg:col-span-7 bg-card border-hairline shadow-md rounded-2xl flex flex-col">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg font-bold text-foreground">Relatório de Faturamento</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Evolução de receitas e vendas da barbearia</CardDescription>
            </div>

            <div className="flex items-center rounded-full bg-muted/40 p-1 border border-hairline text-[11px]">
              {(["week", "month", "6month", "year"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setRevenuePeriod(p)}
                  className={`px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer ${
                    revenuePeriod === p
                      ? "bg-foreground text-background shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p === "week" ? "Semana" : p === "month" ? "Mês" : p === "6month" ? "6 Meses" : "Ano"}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="pt-4 flex-1 flex flex-col justify-between">
            {salesTotal === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3 bg-muted/10 rounded-2xl border border-dashed border-hairline my-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/30 text-muted-foreground">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Nenhuma venda registrada ainda</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    À medida que novos atendimentos forem realizados e baixados no Caixa, o gráfico financeiro consolidado será gerado automaticamente.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => onNavigateToPos()}
                  className="h-8 text-xs font-semibold bg-primary text-primary-foreground cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Abrir Frente de Caixa
                </Button>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-hairline">
                  <div>
                    <span className="text-xs text-muted-foreground block">Receita Bruta Total</span>
                    <strong className="text-2xl font-bold font-sans text-foreground">
                      R$ {salesTotal.toFixed(2)}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground block">Comissões a Repassar</span>
                    <strong className="text-base font-bold font-mono text-emerald-400">
                      R$ {commissionsTotal.toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-hairline">
              <span>Status financeiro: <strong className="text-foreground">Operação Oficial</strong></span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Dados auditados
              </span>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: COLABORADORES DA BARBEARIA */}
        <Card className="lg:col-span-5 bg-card border-hairline shadow-md rounded-2xl flex flex-col">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg font-bold text-foreground">Equipe da Barbearia</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Profissionais e escalas cadastradas</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onNavigateToEmployees}
              className="h-8 text-xs border-hairline cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1 text-primary" />
              Equipe
            </Button>
          </CardHeader>

          <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-3">
            {employees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-3 bg-muted/10 rounded-2xl border border-dashed border-hairline my-2 flex-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/30 text-muted-foreground">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Nenhum colaborador cadastrado</h4>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1">
                    Cadastre os barbeiros e recepcionistas da barbearia para habilitar escalas e comissões.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={onNavigateToEmployees}
                  className="h-8 text-xs font-semibold bg-primary text-primary-foreground cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Cadastrar Colaborador
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {employees.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-hairline"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-xs">
                        {emp.name.charAt(0)}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-xs text-foreground">{emp.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {emp.role} • {emp.commissionRate}% comissão
                        </span>
                      </div>
                    </div>

                    <Badge
                      className={`text-[9px] font-bold ${
                        emp.status === "ACTIVE"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {emp.status === "ACTIVE" ? "ATIVO" : "INATIVO"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToEmployees}
              className="w-full text-xs border-hairline hover:bg-muted/50 cursor-pointer mt-2"
            >
              Gerenciar Equipe & Comissões
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Linha Inferior: Atendimentos de Hoje */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-12 bg-card border-hairline shadow-md rounded-2xl">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-bold text-foreground">Atendimentos Registrados Hoje</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Fluxo em tempo real da agenda e fila de espera</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onNavigateToAgenda}
              className="h-8 text-xs border-hairline cursor-pointer"
            >
              <CalendarPlus className="h-3.5 w-3.5 mr-1 text-primary" />
              Abrir Agenda Completa
            </Button>
          </CardHeader>

          <CardContent className="pt-2">
            {todayAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3 bg-muted/10 rounded-2xl border border-dashed border-hairline">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/30 text-muted-foreground">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Nenhum atendimento agendado para hoje</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    Inicie um novo agendamento ou abra uma comanda rápida pelo atalho F2.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={onNavigateToAgenda}
                  className="h-8 text-xs font-semibold bg-primary text-primary-foreground cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Novo Agendamento na Agenda
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {todayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-hairline hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center text-xs font-bold shrink-0">
                        {apt.customerName.charAt(0)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-xs text-foreground truncate">{apt.customerName}</span>
                        <span className="text-[10px] text-muted-foreground font-mono truncate">
                          {apt.time} • {apt.barberName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {apt.status}
                      </Badge>

                      {apt.status !== "FINALIZADO" && (
                        <button
                          onClick={() => onQuickCheckIn(apt.id)}
                          className="h-7 px-2 text-[10px] font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                          title="Fazer Check-in no Caixa"
                        >
                          Check-in
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
