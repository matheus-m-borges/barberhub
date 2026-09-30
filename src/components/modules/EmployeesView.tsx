import React, { useState } from "react";
import {
  Briefcase,
  Users,
  Plus,
  Percent,
  Star,
  CheckCircle,
  CalendarCheck,
  TrendingUp,
  Phone,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { EmployeeItem } from "@/routes/index";

interface EmployeesViewProps {
  employees: EmployeeItem[];
  onOpenNewEmployeeModal: () => void;
  onToggleEmployeeStatus: (id: string) => void;
}

export function EmployeesView({
  employees,
  onOpenNewEmployeeModal,
  onToggleEmployeeStatus,
}: EmployeesViewProps) {
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  const filtered = employees.filter((e) => {
    if (roleFilter === "ALL") return true;
    return e.role === roleFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Briefcase className="h-6 w-6 text-primary" />
            Equipe, Colaboradores & Escalas
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestão de profissionais de corte, recepcionistas, comissões individuais e chaves PIX de repasse.
          </p>
        </div>
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 cursor-pointer font-semibold h-9 px-4"
          onClick={onOpenNewEmployeeModal}
        >
          <Plus className="h-4 w-4" />
          <span>Novo Colaborador</span>
        </Button>
      </div>

      {/* Filtros de Cargo */}
      <div className="flex flex-wrap gap-2 text-xs">
        {["ALL", "BARBEIRO", "RECEPCIONISTA", "GERENTE", "CAIXA", "ESTOQUISTA"].map((role) => (
          <button
            key={role}
            onClick={() => setRoleFilter(role)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              roleFilter === role
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-card border-hairline text-muted-foreground hover:text-foreground"
            }`}
          >
            {role === "ALL" ? "Todos os Cargos" : role}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((emp) => {
          const isBarber = emp.role === "BARBEIRO";
          return (
            <Card key={emp.id} className="bg-card border-hairline shadow-md rounded-2xl overflow-hidden flex flex-col justify-between">
              <CardHeader className="p-4 pb-2 border-b border-hairline flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-sm">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{emp.name}</h3>
                    <Badge variant="outline" className="text-[10px] bg-[#8b5cf6]/10 text-[#a78bfa] border-[#8b5cf6]/30 font-bold mt-0.5">
                      {emp.role}
                    </Badge>
                  </div>
                </div>

                <Badge
                  className={`text-[10px] font-bold ${
                    emp.status === "ACTIVE"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {emp.status === "ACTIVE" ? "Ativo" : "Inativo"}
                </Badge>
              </CardHeader>

              <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between text-xs">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Telefone:</span>
                    <strong className="text-foreground">{emp.phone}</strong>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Chave PIX:</span>
                    <span className="font-mono text-foreground font-semibold">{emp.pixKey}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Salário Fixo:</span>
                    <span className="font-mono text-foreground font-semibold">
                      {emp.salary > 0 ? `R$ ${emp.salary.toFixed(2)}` : "Sem Fixo (Comissionado)"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground pt-1 border-t border-hairline">
                    <span>Comissão sobre Serviços:</span>
                    <span className="text-primary font-bold text-sm font-mono">{emp.commissionRate}%</span>
                  </div>
                </div>

                {/* Métricas do Barbeiro se for barbeiro */}
                {isBarber && (
                  <div className="mt-3 p-3 rounded-xl bg-muted/20 border border-hairline space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Desempenho no Mês:</span>
                    <div className="grid grid-cols-2 gap-2 text-center pt-1">
                      <div className="bg-card p-1.5 rounded-lg border border-hairline">
                        <span className="text-[10px] text-muted-foreground block">Atendimentos</span>
                        <strong className="text-foreground text-xs font-mono">125</strong>
                      </div>
                      <div className="bg-card p-1.5 rounded-lg border border-hairline">
                        <span className="text-[10px] text-muted-foreground block">Comissão Prevista</span>
                        <strong className="text-emerald-400 text-xs font-mono">R$ 2.450,00</strong>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-hairline flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onToggleEmployeeStatus(emp.id)}
                    className="w-full text-xs font-bold border-hairline hover:bg-muted/50 cursor-pointer"
                  >
                    {emp.status === "ACTIVE" ? "Desativar Colaborador" : "Ativar Colaborador"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
