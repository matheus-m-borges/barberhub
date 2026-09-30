import React, { useState, useMemo } from "react";
import {
  Scissors,
  Clock,
  Calendar,
  DollarSign,
  TrendingUp,
  Target,
  UserCheck,
  Star,
  CheckCircle,
  Phone,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AttendanceItem } from "./PosCheckoutView";
import type { EmployeeItem } from "@/routes/index";

interface BarberPortalViewProps {
  currentBarberName: string;
  attendances: AttendanceItem[];
  employees: EmployeeItem[];
  onAdvanceStatus: (id: string) => void;
  onNavigateToPos: (id: string) => void;
}

export function BarberPortalView({
  currentBarberName,
  attendances,
  employees,
  onAdvanceStatus,
  onNavigateToPos,
}: BarberPortalViewProps) {
  const [subTab, setSubTab] = useState<"MEU_DIA" | "AGENDA" | "COMISSOES" | "METAS">("MEU_DIA");

  // Colaborador atual
  const employeeData = useMemo(() => {
    return employees.find((e) => e.name.toLowerCase().includes(currentBarberName.toLowerCase())) || employees[0];
  }, [employees, currentBarberName]);

  // Atendimentos do barbeiro
  const barberAppointments = useMemo(() => {
    return attendances.filter((a) =>
      a.barberName.toLowerCase().includes(currentBarberName.toLowerCase()) ||
      currentBarberName.toLowerCase().includes(a.barberName.toLowerCase())
    );
  }, [attendances, currentBarberName]);

  // Próximo cliente
  const nextClient = barberAppointments.find(
    (a) => a.status === "AGENDADO" || a.status === "AGUARDANDO" || a.status === "EM_ATENDIMENTO"
  );

  // Cálculos de comissão
  const finishedToday = barberAppointments.filter((a) => a.status === "FINALIZADO");
  const todayServicesTotal = finishedToday.reduce((sum, a) => sum + a.total, 0);
  const commRate = employeeData?.commissionRate || 50;
  const estimatedCommissionToday = Number(((todayServicesTotal * commRate) / 100).toFixed(2));

  // Metas do Barbeiro
  const dailyGoal = 8; // 8 atendimentos
  const completedCount = finishedToday.length;
  const goalPercent = Math.min(100, Math.round((completedCount / dailyGoal) * 100));

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
      {/* Header do Barbeiro */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <span className="text-[11px] font-bold text-primary uppercase tracking-widest block">
            BarberHub Profissional
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Olá, {currentBarberName} 💈
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sua visão simplificada de atendimentos, comissões em tempo real e metas do dia.
          </p>
        </div>

        {/* Chave Pix e Taxa */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs font-mono py-1 px-3">
            Comissão: {commRate}%
          </Badge>
          <Badge variant="outline" className="border-hairline bg-muted/30 text-xs font-mono py-1 px-3">
            Pix: {employeeData?.pixKey || "Não cadastrado"}
          </Badge>
        </div>
      </div>

      {/* CARD DESTAQUE: PRÓXIMO CLIENTE */}
      {nextClient ? (
        <Card className="border-primary/50 bg-gradient-to-br from-card via-card to-primary/10 shadow-lg rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge
                  className={`text-[10px] font-bold ${
                    nextClient.status === "EM_ATENDIMENTO"
                      ? "bg-primary text-primary-foreground animate-pulse"
                      : nextClient.status === "AGUARDANDO"
                      ? "bg-purple-600 text-white"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {nextClient.status === "EM_ATENDIMENTO"
                    ? "NA CADEIRA AGORA"
                    : nextClient.status === "AGUARDANDO"
                    ? "CHEGOU / NA RECEPÇÃO"
                    : "PRÓXIMO HORÁRIO"}
                </Badge>
                <span className="text-xs font-mono font-bold text-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 text-primary" />
                  {nextClient.time}
                </span>
              </div>
              <h2 className="text-lg font-bold text-foreground">{nextClient.customerName}</h2>
              <p className="text-xs text-muted-foreground">
                Serviço: <strong className="text-primary">{nextClient.services.length > 0 ? nextClient.services.map((s) => s.name).join(", ") : "Comanda em aberto (definir no fechamento)"}</strong>
              </p>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              {nextClient.status === "AGUARDANDO" && (
                <Button
                  onClick={() => onAdvanceStatus(nextClient.id)}
                  size="sm"
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-9 px-4 cursor-pointer shadow-md shadow-primary/25"
                >
                  <Scissors className="h-4 w-4 mr-1.5" />
                  Chamar para Cadeira
                </Button>
              )}

              {nextClient.status === "EM_ATENDIMENTO" && (
                <Button
                  onClick={() => onNavigateToPos(nextClient.id)}
                  size="sm"
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 px-4 cursor-pointer shadow-md shadow-emerald-600/25"
                >
                  <DollarSign className="h-4 w-4 mr-1.5" />
                  Finalizar & Abrir Comanda
                </Button>
              )}

              {nextClient.status === "AGENDADO" && (
                <Button
                  onClick={() => onAdvanceStatus(nextClient.id)}
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto border-hairline text-xs font-semibold h-9 px-4 cursor-pointer hover:bg-muted"
                >
                  Confirmar Presença
                </Button>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border-hairline bg-card shadow-xs rounded-2xl p-5 text-center text-xs text-muted-foreground">
          Nenhum agendamento pendente no momento. Você está livre para descanso ou atendimento de balcão!
        </Card>
      )}

      {/* Mini-Dashboard de Produtividade & Comissão */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border border-hairline bg-card shadow-xs">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Atendimentos Hoje</span>
          <span className="text-xl font-bold text-foreground font-mono mt-1 block">
            {completedCount} / {barberAppointments.length}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl border border-primary/30 bg-primary/5 shadow-xs">
          <span className="text-[10px] text-primary font-semibold uppercase tracking-wider block">Comissão Estimada Hoje</span>
          <span className="text-xl font-bold text-primary font-mono mt-1 block">
            R$ {estimatedCommissionToday.toFixed(2)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 shadow-xs">
          <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block">Meta Diária ({goalPercent}%)</span>
          <div className="w-full bg-muted/40 h-2 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: `${goalPercent}%` }} />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-hairline bg-card shadow-xs">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Avaliação Média</span>
          <div className="flex items-center gap-1 text-amber-400 font-bold text-base mt-1">
            <Star className="h-4 w-4 fill-amber-400" />
            <span>4.9</span>
            <span className="text-[11px] text-muted-foreground font-normal">(48 avaliações)</span>
          </div>
        </div>
      </div>

      {/* Sub-Navegação da Área do Barbeiro */}
      <div className="flex items-center rounded-xl bg-card border border-hairline p-1 text-xs gap-1">
        {[
          { id: "MEU_DIA" as const, label: "Meu Dia & Atendimentos" },
          { id: "COMISSOES" as const, label: "Minhas Comissões" },
          { id: "METAS" as const, label: "Metas & Produtividade" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              subTab === tab.id
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTEÚDO DAS SUB-ABAS */}
      {subTab === "MEU_DIA" && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
            Todos os Seus Clientes de Hoje
          </h3>
          <div className="space-y-2.5">
            {barberAppointments.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-hairline text-center text-xs text-muted-foreground">
                Nenhum atendimento atribuído à sua cadeira hoje.
              </div>
            ) : (
              barberAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-3.5 rounded-2xl border border-hairline bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0">
                      {apt.customerName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{apt.customerName}</span>
                        <Badge
                          variant="outline"
                          className="text-[9px] font-bold py-0.2 px-1.5"
                        >
                          {apt.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {apt.time} • {apt.services.length > 0 ? apt.services.map((s) => s.name).join(", ") : "Comanda em aberto"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="font-mono text-xs font-bold text-foreground">
                      R$ {apt.total.toFixed(2)}
                    </span>
                    {apt.status === "EM_ATENDIMENTO" ? (
                      <Button
                        size="sm"
                        onClick={() => onNavigateToPos(apt.id)}
                        className="h-7 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer px-3"
                      >
                        Comanda PDV
                      </Button>
                    ) : apt.status === "AGUARDANDO" ? (
                      <Button
                        size="sm"
                        onClick={() => onAdvanceStatus(apt.id)}
                        className="h-7 text-[11px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer px-3"
                      >
                        Atender
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {subTab === "COMISSOES" && (
        <Card className="border-hairline bg-card shadow-xs rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-hairline pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Extrato de Comissões</h3>
              <p className="text-xs text-muted-foreground">Comissões apuradas automaticamente sobre serviços concluídos.</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Total a Receber</span>
              <span className="text-lg font-bold text-primary font-mono">R$ {estimatedCommissionToday.toFixed(2)}</span>
            </div>
          </div>

          <div className="divide-y divide-hairline text-xs">
            {finishedToday.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground">Nenhuma comissão finalizada hoje ainda.</p>
            ) : (
              finishedToday.map((apt) => {
                const comm = Number(((apt.total * commRate) / 100).toFixed(2));
                return (
                  <div key={apt.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-foreground block">{apt.customerName}</span>
                      <span className="text-[11px] text-muted-foreground">{apt.services.length > 0 ? apt.services.map((s) => s.name).join(", ") : "Comanda em aberto"}</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-emerald-400 font-bold block">+ R$ {comm.toFixed(2)}</span>
                      <span className="text-[10px] text-muted-foreground">({commRate}% de R$ {apt.total.toFixed(2)})</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}

      {subTab === "METAS" && (
        <Card className="border-hairline bg-card shadow-xs rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Metas Individuais de Desempenho</h3>
            <p className="text-xs text-muted-foreground">Acompanhe seu ritmo de atendimentos e ticket médio.</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-muted/20 border border-hairline space-y-2">
              <div className="flex justify-between font-semibold">
                <span className="text-foreground">Meta de Atendimentos do Dia</span>
                <span className="text-primary font-mono">{completedCount} de {dailyGoal}</span>
              </div>
              <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${goalPercent}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground">Faltam {Math.max(0, dailyGoal - completedCount)} cortes para atingir o bônus diário.</p>
            </div>

            <div className="p-4 rounded-xl bg-muted/20 border border-hairline space-y-2">
              <div className="flex justify-between font-semibold">
                <span className="text-foreground">Venda de Produtos Adicionais (Pomadas/Óleos)</span>
                <span className="text-emerald-400 font-mono">2 de 4</span>
              </div>
              <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: "50%" }} />
              </div>
              <p className="text-[11px] text-muted-foreground">Dica: ofereça a pomada modeladora no alinhamento da barba.</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
