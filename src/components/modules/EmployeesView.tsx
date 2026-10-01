import React, { useState } from "react";
import {
  Briefcase,
  Users,
  Plus,
  Percent,
  CheckCircle,
  Phone,
  DollarSign,
  UserPlus,
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

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4 bg-muted/10 rounded-2xl border border-dashed border-hairline">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/30 text-muted-foreground">
            <Users className="h-7 w-7" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">Nenhum colaborador encontrado</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              {roleFilter !== "ALL"
                ? `Nenhum membro da equipe cadastrado com o cargo [${roleFilter}].`
                : "Cadastre os membros da sua equipe para habilitar comissões e escalas na agenda."}
            </p>
          </div>
          <Button
            onClick={onOpenNewEmployeeModal}
            className="h-9 text-xs font-semibold bg-primary text-primary-foreground cursor-pointer shadow-md"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Cadastrar Novo Colaborador
          </Button>
        </div>
      ) : (
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
                    {emp.status === "ACTIVE" ? "ATIVO" : "INATIVO"}
                  </Badge>
                </CardHeader>

                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>{emp.phone || "Não informado"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>PIX: <strong className="font-mono text-foreground">{emp.pixKey || "Não cadastrada"}</strong></span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-hairline space-y-1.5">
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
      )}
    </div>
  );
}
