import React, { useState, useMemo } from "react";
import {
  ConciergeBell,
  Clock,
  UserCheck,
  Scissors,
  CreditCard,
  CheckCircle2,
  Plus,
  Search,
  AlertCircle,
  Phone,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import type { AttendanceItem } from "./PosCheckoutView";
import type { EmployeeItem } from "@/routes/index";

interface ReceptionViewProps {
  attendances: AttendanceItem[];
  employees: EmployeeItem[];
  onQuickCheckIn: (id: string) => void;
  onAdvanceStatus: (id: string) => void;
  onNavigateToPos: (id: string) => void;
  onOpenQuickAttendanceModal: () => void;
  onOpenNewAppointmentModal: () => void;
}

export function ReceptionView({
  attendances,
  employees,
  onQuickCheckIn,
  onAdvanceStatus,
  onNavigateToPos,
  onOpenQuickAttendanceModal,
  onOpenNewAppointmentModal,
}: ReceptionViewProps) {
  const [search, setSearch] = useState("");
  const [selectedBarber, setSelectedBarber] = useState("ALL");

  const barbers = useMemo(() => {
    return employees.filter((e) => e.role === "BARBEIRO" && e.status === "ACTIVE");
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return attendances.filter((a) => {
      const matchBarber = selectedBarber === "ALL" || a.barberName === selectedBarber;
      const matchSearch =
        !q ||
        a.customerName.toLowerCase().includes(q) ||
        (a.customerPhone && a.customerPhone.includes(q)) ||
        a.code.toLowerCase().includes(q);
      return matchBarber && matchSearch;
    });
  }, [attendances, search, selectedBarber]);

  // Colunas da Recepção
  const proximos = filtered.filter((a) => a.status === "AGENDADO" || a.status === "CONFIRMADO");
  const aguardando = filtered.filter((a) => a.status === "AGUARDANDO");
  const emAtendimento = filtered.filter((a) => a.status === "EM_ATENDIMENTO");
  const finalizados = filtered.filter((a) => a.status === "FINALIZADO" || a.status === "CONCLUIDO");

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Recepção */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <ConciergeBell className="h-6 w-6 text-primary" />
            Recepção & Painel Operacional do Dia
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fluxo contínuo de recepção: check-in, chamadas de cadeira, fila de espera física e envio direto ao caixa.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={onOpenNewAppointmentModal}
            variant="outline"
            className="h-9 gap-1.5 border-hairline text-xs font-semibold cursor-pointer"
          >
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>Agendar Horário</span>
          </Button>
          <Button
            size="sm"
            onClick={onOpenQuickAttendanceModal}
            className="h-9 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-md shadow-primary/25 cursor-pointer px-4"
          >
            <Plus className="h-4 w-4" />
            <span>+ Novo Atendimento (F2)</span>
          </Button>
        </div>
      </div>

      {/* Controles de Filtro e Indicadores Rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border border-hairline bg-card flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider block">Próximos</span>
            <span className="text-xl font-bold text-foreground font-mono">{proximos.length}</span>
          </div>
          <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs">
            <Clock className="h-4 w-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-purple-500/30 bg-purple-500/5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-purple-400 font-semibold uppercase tracking-wider block">Na Recepção</span>
            <span className="text-xl font-bold text-purple-300 font-mono">{aguardando.length}</span>
          </div>
          <div className="h-8 w-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs">
            <UserCheck className="h-4 w-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-primary/30 bg-primary/5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-primary font-semibold uppercase tracking-wider block">Nas Cadeiras</span>
            <span className="text-xl font-bold text-primary font-mono">{emAtendimento.length}</span>
          </div>
          <div className="h-8 w-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
            <Scissors className="h-4 w-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider block">Concluídos Hoje</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">{finalizados.length}</span>
          </div>
          <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-hairline shadow-xs">
        <div className="w-full sm:w-72">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar por cliente, telefone ou comanda..."
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground font-medium shrink-0">Cadeira:</span>
          <select
            value={selectedBarber}
            onChange={(e) => setSelectedBarber(e.target.value)}
            className="bg-muted/40 border border-hairline text-foreground rounded-lg px-2.5 py-1 text-xs cursor-pointer focus:outline-hidden"
          >
            <option value="ALL">Todas as Cadeiras</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid de 4 Colunas Operacionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* COLUNA 1: PRÓXIMOS AGENDADOS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Próximos ({proximos.length})
              </h3>
            </div>
          </div>

          <div className="space-y-2.5 min-h-[300px]">
            {proximos.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-hairline text-center text-xs text-muted-foreground">
                Nenhum agendamento futuro para hoje.
              </div>
            ) : (
              proximos.map((apt) => (
                <Card key={apt.id} className="border-hairline bg-card shadow-xs rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {apt.time}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">{apt.code}</span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-foreground">{apt.customerName}</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Profissional: <strong className="text-foreground">{apt.barberName}</strong>
                    </p>
                    <p className="text-[11px] text-primary truncate">
                      {apt.services.length > 0 ? apt.services.map((s) => s.name).join(", ") : "Comanda em aberto"}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-hairline flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onAdvanceStatus(apt.id)}
                      className="w-full h-7.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                    >
                      <UserCheck className="h-3 w-3 mr-1" />
                      Cliente Chegou
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* COLUNA 2: AGUARDANDO NA RECEPÇÃO */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Aguardando ({aguardando.length})
              </h3>
            </div>
          </div>

          <div className="space-y-2.5 min-h-[300px]">
            {aguardando.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-hairline text-center text-xs text-muted-foreground">
                Recepção vazia no momento.
              </div>
            ) : (
              aguardando.map((apt) => (
                <Card key={apt.id} className="border-purple-500/30 bg-purple-500/5 shadow-xs rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant="outline" className="text-[10px] font-bold bg-purple-500/20 text-purple-300 border-purple-500/40">
                      Na Recepção
                    </Badge>
                    <span className="font-mono text-xs font-bold text-purple-300">{apt.time}</span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-foreground">{apt.customerName}</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Cadeira: <strong className="text-foreground">{apt.barberName}</strong>
                    </p>
                    <p className="text-[11px] text-primary truncate">
                      {apt.services.length > 0 ? apt.services.map((s) => s.name).join(", ") : "Comanda em aberto"}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-hairline/60 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onAdvanceStatus(apt.id)}
                      className="w-full h-7.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs"
                    >
                      <Scissors className="h-3 w-3 mr-1" />
                      Chamar p/ Cadeira
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* COLUNA 3: EM ATENDIMENTO */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Em Atendimento ({emAtendimento.length})
              </h3>
            </div>
          </div>

          <div className="space-y-2.5 min-h-[300px]">
            {emAtendimento.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-hairline text-center text-xs text-muted-foreground">
                Nenhum cliente em atendimento no momento.
              </div>
            ) : (
              emAtendimento.map((apt) => (
                <Card key={apt.id} className="border-primary/40 bg-primary/5 shadow-xs rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant="outline" className="text-[10px] font-bold bg-primary/20 text-primary border-primary/40 animate-pulse">
                      Na Cadeira
                    </Badge>
                    <span className="font-mono text-xs font-bold text-primary">R$ {apt.total.toFixed(2)}</span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-foreground">{apt.customerName}</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Barbeiro: <strong className="text-foreground">{apt.barberName}</strong>
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {apt.services.length > 0 ? apt.services.map((s) => s.name).join(", ") : "Comanda em aberto"}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-hairline/60 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onNavigateToPos(apt.id)}
                      className="w-full h-7.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      Abrir Comanda no PDV
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* COLUNA 4: FINALIZADOS / CONCLUÍDOS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Finalizados ({finalizados.length})
              </h3>
            </div>
          </div>

          <div className="space-y-2.5 min-h-[300px]">
            {finalizados.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-hairline text-center text-xs text-muted-foreground">
                Nenhum atendimento concluído hoje ainda.
              </div>
            ) : (
              finalizados.map((apt) => (
                <Card key={apt.id} className="border-hairline bg-card/60 shadow-xs rounded-2xl p-3.5 space-y-2 opacity-85">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">Pago & Liberado</span>
                    <span className="font-mono text-xs font-bold text-foreground">R$ {apt.total.toFixed(2)}</span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-foreground">{apt.customerName}</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Atendido por <strong className="text-foreground">{apt.barberName}</strong>
                    </p>
                  </div>

                  <div className="text-[10px] text-muted-foreground/80 font-mono">
                    Comanda: {apt.code}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
