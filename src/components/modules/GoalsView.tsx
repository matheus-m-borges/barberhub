import React, { useState } from "react";
import {
  Target,
  TrendingUp,
  DollarSign,
  Scissors,
  Package,
  Award,
  Plus,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { EmployeeItem } from "@/routes/index";

interface GoalsViewProps {
  employees: EmployeeItem[];
  onShowToast: (msg: string) => void;
}

export function GoalsView({ employees, onShowToast }: GoalsViewProps) {
  const [period, setPeriod] = useState<"MONTH" | "WEEK">("MONTH");

  const companyGoals = [
    {
      title: "Faturamento Total da Barbearia",
      target: 45000,
      current: 31200,
      format: "currency",
      icon: DollarSign,
      color: "primary",
    },
    {
      title: "Volume Total de Atendimentos",
      target: 650,
      current: 485,
      format: "number",
      icon: Scissors,
      color: "blue",
    },
    {
      title: "Venda de Produtos & Insumos",
      target: 12000,
      current: 8900,
      format: "currency",
      icon: Package,
      color: "emerald",
    },
    {
      title: "Ticket Médio Global",
      target: 68.0,
      current: 64.3,
      format: "currency",
      icon: TrendingUp,
      color: "purple",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Target className="h-6 w-6 text-primary" />
            Metas de Faturamento & Desempenho
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Defina e monitore metas operacionais da barbearia e de cada profissional de corte.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-card border border-hairline p-1 text-xs">
            <button
              onClick={() => setPeriod("MONTH")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                period === "MONTH" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground"
              }`}
            >
              Mês Vigente (Setembro)
            </button>
            <button
              onClick={() => setPeriod("WEEK")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                period === "WEEK" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground"
              }`}
            >
              Esta Semana
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Metas da Empresa */}
      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Metas Gerais da Barbearia
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {companyGoals.map((g) => {
            const Icon = g.icon;
            const percent = Math.min(100, Math.round((g.current / g.target) * 100));
            return (
              <Card key={g.title} className="border-hairline bg-card shadow-xs rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground truncate">{g.title}</span>
                  <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>

                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-lg font-bold text-foreground">
                    {g.format === "currency" ? `R$ ${g.current.toLocaleString("pt-BR")}` : g.current}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    meta: {g.format === "currency" ? `R$ ${g.target.toLocaleString("pt-BR")}` : g.target}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="w-full bg-muted/40 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>{percent}% atingido</span>
                    <span>restante: {g.format === "currency" ? `R$ ${(g.target - g.current).toLocaleString("pt-BR")}` : g.target - g.current}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Metas Individuais dos Barbeiros */}
      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Progresso por Profissional
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {employees
            .filter((e) => e.role === "BARBEIRO")
            .map((barber) => {
              const barberCutsTarget = 200;
              const barberCutsDone = barber.id === "emp-1" ? 164 : 142;
              const percent = Math.round((barberCutsDone / barberCutsTarget) * 100);

              return (
                <Card key={barber.id} className="border-hairline bg-card shadow-xs rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs">
                        {barber.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{barber.name}</h4>
                        <span className="text-[10px] text-muted-foreground font-mono">Comissão: {barber.commissionRate}%</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-primary/30 text-primary text-[10px] font-bold">
                      {percent}% da Meta
                    </Badge>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-muted-foreground">Atendimentos no Mês:</span>
                      <span className="font-mono font-bold text-foreground">
                        {barberCutsDone} / {barberCutsTarget} cortes
                      </span>
                    </div>
                    <div className="w-full bg-muted/40 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-hairline flex justify-between items-center text-[11px] text-muted-foreground">
                    <span>Faltam {barberCutsTarget - barberCutsDone} atendimentos para o bônus mensal</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] cursor-pointer text-primary hover:text-primary"
                      onClick={() => onShowToast(`Meta de ${barber.name} ajustada.`)}
                    >
                      Ajustar Meta
                    </Button>
                  </div>
                </Card>
              );
            })}
        </div>
      </div>
    </div>
  );
}
