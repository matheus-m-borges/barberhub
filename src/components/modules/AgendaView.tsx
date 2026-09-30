import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  Scissors,
  Check,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Ban,
  CalendarPlus,
  Phone,
  MessageSquare,
  Search,
  LayoutGrid,
  Columns,
  CalendarDays,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { AttendanceItem } from "./PosCheckoutView";
import type { EmployeeItem, ServiceItem } from "@/routes/index";
import { generateWhatsAppConfirmationLink } from "@/lib/whatsapp";

interface AgendaViewProps {
  attendances: AttendanceItem[];
  employees: EmployeeItem[];
  services: ServiceItem[];
  onOpenNewAppointmentModal: () => void;
  onCheckInToPos: (attendanceId: string) => void;
  onAdvanceStatus: (attendanceId: string) => void;
  onUpdateStatus?: (attendanceId: string, status: AttendanceItem["status"]) => void;
  onReschedule?: (attendanceId: string, newTime: string, newBarber: string) => void;
  onAddAppointment?: (appointment: AttendanceItem) => void;
  onShowToast?: (msg: string) => void;
}

export function AgendaView({
  attendances,
  employees,
  services,
  onOpenNewAppointmentModal,
  onCheckInToPos,
  onAdvanceStatus,
  onUpdateStatus,
  onReschedule,
  onAddAppointment,
  onShowToast,
}: AgendaViewProps) {
  // Visualização: Colunas por Cadeira (COLUMNS), Lista/Cards (CARDS), Semana (WEEK)
  const [viewMode, setViewMode] = useState<"COLUMNS" | "CARDS" | "WEEK">("COLUMNS");
  const [selectedBarber, setSelectedBarber] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);

  // Modal interno de agendamento rápido / slot
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [slotBarber, setSlotBarber] = useState("");
  const [slotTime, setSlotTime] = useState("");
  const [slotClientName, setSlotClientName] = useState("");
  const [slotClientPhone, setSlotClientPhone] = useState("");
  const [slotServiceId, setSlotServiceId] = useState("");
  const [isFitting, setIsFitting] = useState(false);

  // Modal de reagendamento
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<AttendanceItem | null>(null);
  const [newRescheduleTime, setNewRescheduleTime] = useState("15:00");
  const [newRescheduleBarber, setNewRescheduleBarber] = useState("");

  const dateOptions = [
    { label: "Hoje (30 de Setembro)", value: "2026-09-30" },
    { label: "Amanhã (01 de Outubro)", value: "2026-10-01" },
    { label: "Sexta-feira (02 de Outubro)", value: "2026-10-02" },
    { label: "Sábado (03 de Outubro)", value: "2026-10-03" },
  ];

  const currentDateLabel = dateOptions[selectedDateIndex]?.label ?? "Hoje";

  const barbers = useMemo(() => {
    return employees.filter((e) => (e.role === "BARBEIRO" || e.role === "GERENTE") && e.status === "ACTIVE");
  }, [employees]);

  // Lista padrão de horários das 08:30 às 19:30
  const timeSlots = useMemo(() => {
    return [
      "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
      "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00",
      "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00",
    ];
  }, []);

  // Filtro inteligente para a visão de cards
  const filteredAppointments = useMemo(() => {
    return attendances.filter((a) => {
      // Filtro por barbeiro
      if (selectedBarber !== "ALL" && a.barberName !== selectedBarber) {
        return false;
      }
      // Filtro por status
      if (statusFilter !== "ALL" && a.status !== statusFilter) {
        return false;
      }
      // Busca textual por nome do cliente ou telefone
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = a.customerName.toLowerCase().includes(term);
        const matchPhone = (a.customerPhone || "").includes(term);
        const matchCode = (a.code || "").toLowerCase().includes(term);
        if (!matchName && !matchPhone && !matchCode) return false;
      }
      return true;
    });
  }, [attendances, selectedBarber, statusFilter, searchTerm]);

  // Métricas do dia da agenda
  const agendaMetrics = useMemo(() => {
    const total = attendances.length;
    const completed = attendances.filter((a) => a.status === "FINALIZADO" || a.status === "CONCLUIDO").length;
    const inProgress = attendances.filter((a) => a.status === "EM_ATENDIMENTO").length;
    const waiting = attendances.filter((a) => a.status === "AGUARDANDO").length;
    const scheduled = attendances.filter((a) => a.status === "AGENDADO" || a.status === "CONFIRMADO").length;
    const noShow = attendances.filter((a) => a.status === "NAO_COMPARECEU").length;
    const canceled = attendances.filter((a) => a.status === "CANCELADO").length;

    // Capacidade estimada (slots x número de barbeiros)
    const capacity = timeSlots.length * Math.max(1, barbers.length);
    const activeAppointments = total - canceled;
    const occupancyRate = capacity > 0 ? Math.min(100, Math.round((activeAppointments / capacity) * 100)) : 0;

    return { total, completed, inProgress, waiting, scheduled, noShow, canceled, occupancyRate, capacity };
  }, [attendances, timeSlots.length, barbers.length]);

  const handleOpenSlotModal = (barber: string, time: string) => {
    setSlotBarber(barber);
    setSlotTime(time);
    setSlotClientName("");
    setSlotClientPhone("");
    setSlotServiceId(services[0]?.id || "");
    setIsFitting(false);
    setSlotModalOpen(true);
  };

  const handleConfirmSlotBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotClientName.trim()) return;

    const srv = services.find((s) => s.id === slotServiceId) || services[0] || {
      id: "srv-default",
      name: "Corte Tradicional",
      price: 45,
      duration: 35,
      category: "Cabelo",
    };

    const newApt: AttendanceItem = {
      id: `apt-${Date.now()}`,
      code: `#BH-${Math.floor(10000 + Math.random() * 90000)}`,
      time: slotTime,
      customerName: slotClientName.trim(),
      customerPhone: slotClientPhone.trim() || "(11) 99999-0000",
      barberName: slotBarber,
      status: "AGENDADO",
      services: [{ id: srv.id, name: srv.name, price: srv.price }],
      products: [],
      discount: 0,
      total: srv.price,
    };

    if (onAddAppointment) {
      onAddAppointment(newApt);
    } else {
      onAdvanceStatus(newApt.id);
    }

    setSlotModalOpen(false);
    if (onShowToast) {
      onShowToast(`Horário ${slotTime} agendado para ${slotClientName} com ${slotBarber}!`);
    }
  };

  const handleOpenReschedule = (apt: AttendanceItem) => {
    setRescheduleTarget(apt);
    setNewRescheduleTime(apt.time.includes(":") ? apt.time : "14:00");
    setNewRescheduleBarber(apt.barberName);
    setRescheduleModalOpen(true);
  };

  const handleSaveReschedule = () => {
    if (!rescheduleTarget) return;
    if (onReschedule) {
      onReschedule(rescheduleTarget.id, newRescheduleTime, newRescheduleBarber);
    } else if (onUpdateStatus) {
      onUpdateStatus(rescheduleTarget.id, "AGENDADO");
    }
    setRescheduleModalOpen(false);
    if (onShowToast) {
      onShowToast(`Agendamento de ${rescheduleTarget.customerName} reagendado para ${newRescheduleTime} com ${newRescheduleBarber}!`);
    }
  };

  const handleMarkNoShow = (apt: AttendanceItem) => {
    if (confirm(`Confirmar que ${apt.customerName} NÃO compareceu ao agendamento de ${apt.time}?`)) {
      if (onUpdateStatus) {
        onUpdateStatus(apt.id, "NAO_COMPARECEU");
      }
      if (onShowToast) {
        onShowToast(`Falta (No-Show) registrada para ${apt.customerName}.`);
      }
    }
  };

  const handleCancelApt = (apt: AttendanceItem) => {
    if (confirm(`Deseja cancelar o agendamento de ${apt.customerName}? O horário será liberado na agenda.`)) {
      if (onUpdateStatus) {
        onUpdateStatus(apt.id, "CANCELADO");
      }
      if (onShowToast) {
        onShowToast(`Agendamento de ${apt.customerName} cancelado.`);
      }
    }
  };

  const handleSendWhatsAppReminder = (apt: AttendanceItem) => {
    const srvName = apt.services.map((s) => s.name).join(", ") || "Atendimento";
    const link = generateWhatsAppConfirmationLink({
      customerName: apt.customerName,
      customerPhone: apt.customerPhone || "11999990000",
      shopName: "BarberHub Pro",
      serviceName: srvName,
      barberName: apt.barberName,
      formattedDate: "Hoje",
      formattedTime: apt.time,
    });
    window.open(link, "_blank");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Cabeçalho da Agenda */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <CalendarIcon className="h-6 w-6 text-primary" />
            Agenda Operacional & Grade de Cadeiras
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestão determinística de slots, múltiplas cadeiras, encaixes imediatos e check-in direto no caixa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={onOpenNewAppointmentModal}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-md shadow-primary/25 cursor-pointer h-9 px-4 gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Agendamento</span>
          </Button>
        </div>
      </div>

      {/* 2. Barra de Métricas Rápidas do Dia */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-card border border-hairline p-3 rounded-2xl">
          <div className="text-[11px] text-muted-foreground font-medium">Ocupação Hoje</div>
          <div className="text-lg font-bold text-foreground mt-0.5 flex items-baseline gap-1.5">
            <span className="font-mono">{agendaMetrics.occupancyRate}%</span>
            <span className="text-[10px] text-muted-foreground">({agendaMetrics.total}/{agendaMetrics.capacity})</span>
          </div>
          <div className="w-full bg-muted/40 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${agendaMetrics.occupancyRate}%` }}
            />
          </div>
        </div>

        <div className="bg-card border border-hairline p-3 rounded-2xl">
          <div className="text-[11px] text-muted-foreground font-medium">Agendados</div>
          <div className="text-lg font-bold text-[#38bdf8] font-mono mt-0.5">
            {agendaMetrics.scheduled}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">Aguardam horário</div>
        </div>

        <div className="bg-card border border-hairline p-3 rounded-2xl">
          <div className="text-[11px] text-muted-foreground font-medium">Na Recepção</div>
          <div className="text-lg font-bold text-[#a78bfa] font-mono mt-0.5">
            {agendaMetrics.waiting}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">Prontos para cortar</div>
        </div>

        <div className="bg-card border border-hairline p-3 rounded-2xl">
          <div className="text-[11px] text-muted-foreground font-medium">Na Cadeira</div>
          <div className="text-lg font-bold text-primary font-mono mt-0.5">
            {agendaMetrics.inProgress}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">Em atendimento</div>
        </div>

        <div className="bg-card border border-hairline p-3 rounded-2xl">
          <div className="text-[11px] text-muted-foreground font-medium">Concluídos</div>
          <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
            {agendaMetrics.completed}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">Finalizados e pagos</div>
        </div>

        <div className="bg-card border border-hairline p-3 rounded-2xl">
          <div className="text-[11px] text-muted-foreground font-medium">No-Shows / Canc.</div>
          <div className="text-lg font-bold text-rose-400 font-mono mt-0.5">
            {agendaMetrics.noShow + agendaMetrics.canceled}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">{agendaMetrics.noShow} faltas / {agendaMetrics.canceled} canc.</div>
        </div>
      </div>

      {/* 3. Controles da Agenda (Data, Filtro Cadeira, Modo de Exibição) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-hairline shadow-sm">
        {/* Navegação de Data */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDateIndex((prev) => Math.max(0, prev - 1))}
            disabled={selectedDateIndex === 0}
            className="h-8 w-8 rounded-lg border border-hairline bg-muted/30 hover:bg-muted disabled:opacity-40 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-bold text-foreground px-2 flex items-center gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5 text-primary" />
            {currentDateLabel}
          </span>
          <button
            onClick={() => setSelectedDateIndex((prev) => Math.min(dateOptions.length - 1, prev + 1))}
            disabled={selectedDateIndex === dateOptions.length - 1}
            className="h-8 w-8 rounded-lg border border-hairline bg-muted/30 hover:bg-muted disabled:opacity-40 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente, tel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 w-44 pl-8 text-xs bg-muted/30 border-hairline"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            <select
              value={selectedBarber}
              onChange={(e) => setSelectedBarber(e.target.value)}
              className="bg-muted/40 border border-hairline text-foreground rounded-lg px-2.5 py-1 text-xs cursor-pointer focus:outline-hidden h-8"
            >
              <option value="ALL">Todas as Cadeiras</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Alternador de Visualização */}
          <div className="flex items-center rounded-full bg-muted/40 p-1 border border-hairline text-xs">
            <button
              onClick={() => setViewMode("COLUMNS")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === "COLUMNS"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Columns className="h-3 w-3" />
              <span>Cadeiras</span>
            </button>
            <button
              onClick={() => setViewMode("CARDS")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === "CARDS"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-3 w-3" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode("WEEK")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === "WEEK"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarDays className="h-3 w-3" />
              <span>Semana</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. VISÃO A: GRADE MULTI-CADEIRAS (COLUNAS POR BARBEIRO)                   */}
      {/* ========================================================================= */}
      {viewMode === "COLUMNS" && (
        <div className="bg-card border border-hairline rounded-2xl p-4 shadow-sm overflow-x-auto">
          {barbers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-xs space-y-2">
              <Scissors className="h-8 w-8 mx-auto opacity-30" />
              <p className="font-semibold text-foreground">Nenhum profissional cadastrado na agenda</p>
              <p>Cadastre os membros da equipe no módulo Colaboradores para exibir a grade horária.</p>
            </div>
          ) : (
            <div className="min-w-[760px]">
            {/* Cabeçalho das Colunas por Barbeiro */}
            <div className="grid grid-cols-[80px_repeat(auto-fit,minmax(200px,1fr))] gap-3 pb-3 border-b border-hairline">
              <div className="text-xs font-bold text-muted-foreground uppercase flex items-center">
                Horário
              </div>
              {(selectedBarber === "ALL" ? barbers : barbers.filter((b) => b.name === selectedBarber)).map((b) => {
                const countForBarber = attendances.filter(
                  (a) => a.barberName === b.name && a.status !== "CANCELADO"
                ).length;
                return (
                  <div key={b.id} className="bg-muted/30 p-2.5 rounded-xl border border-hairline/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                          {b.name.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-foreground truncate">{b.name}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {countForBarber} clientes
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Linhas da Grade de Horários */}
            <div className="divide-y divide-hairline/40">
              {timeSlots.map((time) => {
                const displayedBarbers = selectedBarber === "ALL" ? barbers : barbers.filter((b) => b.name === selectedBarber);

                return (
                  <div key={time} className="grid grid-cols-[80px_repeat(auto-fit,minmax(200px,1fr))] gap-3 py-2 items-center">
                    {/* Coluna do Horário */}
                    <div className="text-xs font-mono font-bold text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-primary/70" />
                      {time}
                    </div>

                    {/* Células por Barbeiro */}
                    {displayedBarbers.map((barber) => {
                      // Procura agendamento deste barbeiro neste horário aproximado
                      const apt = attendances.find(
                        (a) => a.barberName === barber.name && a.time.startsWith(time)
                      );

                      if (!apt) {
                        return (
                          <div
                            key={barber.id}
                            onClick={() => handleOpenSlotModal(barber.name, time)}
                            className="h-14 rounded-xl border border-dashed border-hairline/60 bg-muted/5 hover:bg-primary/5 hover:border-primary/40 transition-all flex items-center justify-center group cursor-pointer"
                          >
                            <span className="text-[11px] text-muted-foreground/60 group-hover:text-primary font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus className="h-3 w-3" />
                              Agendar {time}
                            </span>
                          </div>
                        );
                      }

                      const isFinished = apt.status === "FINALIZADO" || apt.status === "CONCLUIDO";
                      const inChair = apt.status === "EM_ATENDIMENTO";
                      const isWaiting = apt.status === "AGUARDANDO";
                      const isCanceled = apt.status === "CANCELADO";
                      const isNoShow = apt.status === "NAO_COMPARECEU";

                      return (
                        <div
                          key={barber.id}
                          className={`min-h-[56px] p-2 rounded-xl border transition-all shadow-xs ${
                            inChair
                              ? "border-primary bg-primary/10 shadow-primary/10"
                              : isWaiting
                              ? "border-[#8b5cf6]/50 bg-[#8b5cf6]/10"
                              : isFinished
                              ? "border-hairline bg-muted/15 opacity-70"
                              : isCanceled || isNoShow
                              ? "border-rose-500/20 bg-rose-500/5 opacity-60"
                              : "border-hairline bg-card hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-foreground truncate">
                                  {apt.customerName}
                                </span>
                                {apt.time.includes("Encaixe") && (
                                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[9px] px-1 py-0">
                                    Encaixe
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {apt.services.map((s) => s.name).join(", ") || "Corte Tradicional"} • R$ {apt.total.toFixed(2)}
                              </div>
                            </div>

                            <Badge
                              variant="outline"
                              className={`text-[9px] font-bold shrink-0 ${
                                inChair
                                  ? "bg-primary text-primary-foreground border-transparent animate-pulse"
                                  : isWaiting
                                  ? "bg-[#8b5cf6]/20 text-[#a78bfa] border-[#8b5cf6]/40"
                                  : isFinished
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : isCanceled || isNoShow
                                  ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {apt.status === "EM_ATENDIMENTO"
                                ? "NA CADEIRA"
                                : apt.status === "AGUARDANDO"
                                ? "RECEPCIONADO"
                                : apt.status}
                            </Badge>
                          </div>

                          {/* Ações inline no slot */}
                          <div className="flex items-center justify-between gap-1 pt-1.5 mt-1 border-t border-hairline/30 text-[10px]">
                            <div className="flex items-center gap-1">
                              {apt.status === "AGENDADO" && (
                                <button
                                  onClick={() => onAdvanceStatus(apt.id)}
                                  className="text-primary hover:underline font-bold cursor-pointer"
                                >
                                  Recepcionar
                                </button>
                              )}
                              {apt.status === "AGUARDANDO" && (
                                <button
                                  onClick={() => onAdvanceStatus(apt.id)}
                                  className="text-primary hover:underline font-bold cursor-pointer"
                                >
                                  Iniciar
                                </button>
                              )}
                              {apt.status === "EM_ATENDIMENTO" && (
                                <button
                                  onClick={() => onCheckInToPos(apt.id)}
                                  className="text-emerald-400 hover:underline font-bold cursor-pointer"
                                >
                                  Ir ao Caixa
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <button
                                onClick={() => handleSendWhatsAppReminder(apt)}
                                title="Enviar lembrete via WhatsApp"
                                className="hover:text-emerald-400 cursor-pointer"
                              >
                                <MessageSquare className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleOpenReschedule(apt)}
                                title="Reagendar horário"
                                className="hover:text-primary cursor-pointer"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. VISÃO B: CARDS DETALHADOS & FILTROS POR STATUS                        */}
      {/* ========================================================================= */}
      {viewMode === "CARDS" && (
        <div className="space-y-4">
          {/* Abas Rápidas de Status */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: "Todos os Status" },
              { id: "AGENDADO", label: "Agendados" },
              { id: "AGUARDANDO", label: "Aguardando" },
              { id: "EM_ATENDIMENTO", label: "Em Atendimento" },
              { id: "FINALIZADO", label: "Finalizados" },
              { id: "NAO_COMPARECEU", label: "Faltas" },
              { id: "CANCELADO", label: "Cancelados" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all ${
                  statusFilter === st.id
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground border border-hairline"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAppointments.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-card border border-hairline rounded-2xl text-muted-foreground text-xs">
                Nenhum agendamento encontrado para o filtro selecionado.
              </div>
            ) : (
              filteredAppointments.map((apt) => {
                const isFinished = apt.status === "FINALIZADO" || apt.status === "CONCLUIDO";
                const inChair = apt.status === "EM_ATENDIMENTO";
                const isWaiting = apt.status === "AGUARDANDO";
                const isScheduled = apt.status === "AGENDADO" || apt.status === "CONFIRMADO";
                const isNoShow = apt.status === "NAO_COMPARECEU";
                const isCanceled = apt.status === "CANCELADO";

                return (
                  <Card
                    key={apt.id}
                    className={`border rounded-2xl shadow-sm transition-all hover:shadow-md ${
                      inChair
                        ? "border-primary bg-primary/5"
                        : isWaiting
                        ? "border-[#8b5cf6]/40 bg-[#8b5cf6]/5"
                        : isFinished
                        ? "border-hairline bg-muted/10 opacity-75"
                        : isCanceled || isNoShow
                        ? "border-rose-500/20 bg-rose-500/5 opacity-70"
                        : "border-hairline bg-card"
                    }`}
                  >
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold font-mono text-foreground">{apt.time}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">({apt.code})</span>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold uppercase py-0.5 px-2 ${
                          isFinished
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : inChair
                            ? "bg-primary/20 text-primary border-primary/40 animate-pulse"
                            : isWaiting
                            ? "bg-[#8b5cf6]/20 text-[#a78bfa] border-[#8b5cf6]/40"
                            : isNoShow || isCanceled
                            ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                            : "bg-muted text-muted-foreground border-hairline"
                        }`}
                      >
                        {apt.status.replace("_", " ")}
                      </Badge>
                    </CardHeader>

                    <CardContent className="p-4 pt-2 space-y-3">
                      {/* Dados do Cliente */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-muted/60 text-foreground flex items-center justify-center font-bold text-xs shrink-0">
                            {apt.customerName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground truncate">{apt.customerName}</div>
                            <div className="text-[11px] text-muted-foreground truncate font-mono">
                              {apt.customerPhone || "(11) 98888-0000"}
                            </div>
                          </div>
                        </div>

                        {/* WhatsApp Lembrete Oficial */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSendWhatsAppReminder(apt)}
                          title="Enviar lembrete pelo WhatsApp (wa.me)"
                          className="h-7 px-2 text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer gap-1"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>WhatsApp</span>
                        </Button>
                      </div>

                      {/* Informações de Serviço e Profissional */}
                      <div className="p-2.5 rounded-xl bg-muted/20 border border-hairline/60 space-y-1 text-xs">
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span>Profissional:</span>
                          <strong className="text-foreground">{apt.barberName}</strong>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span>Serviços:</span>
                          <span className="text-[#a78bfa] font-medium truncate max-w-[160px]">
                            {apt.services.map((s) => s.name).join(", ") || "Corte Tradicional"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground pt-1 border-t border-hairline/40">
                          <span>Valor Estimado:</span>
                          <span className="text-foreground font-bold font-mono">R$ {apt.total.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Ações Integradas com o Ciclo Operacional */}
                      <div className="space-y-1.5 pt-1">
                        {isScheduled && (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              onClick={() => onAdvanceStatus(apt.id)}
                              className="h-8 text-xs font-bold bg-[#8b5cf6] hover:bg-[#8b5cf6]/90 text-white cursor-pointer shadow-xs"
                            >
                              <UserCheck className="h-3.5 w-3.5 mr-1" />
                              Chegou (Aguardando)
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => onCheckInToPos(apt.id)}
                              className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs"
                            >
                              <Scissors className="h-3.5 w-3.5 mr-1" />
                              Ir para a Cadeira
                            </Button>
                          </div>
                        )}

                        {isWaiting && (
                          <Button
                            size="sm"
                            onClick={() => onAdvanceStatus(apt.id)}
                            className="w-full h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-sm"
                          >
                            <Scissors className="h-3.5 w-3.5 mr-1.5" />
                            Iniciar Atendimento na Cadeira
                          </Button>
                        )}

                        {inChair && (
                          <Button
                            size="sm"
                            onClick={() => onCheckInToPos(apt.id)}
                            className="w-full h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-sm"
                          >
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                            Finalizar & Cobrar no Caixa
                          </Button>
                        )}

                        {/* Ações secundárias (Reagendar, No-Show, Cancelar) */}
                        <div className="flex items-center justify-between text-[11px] pt-1 text-muted-foreground">
                          <button
                            onClick={() => handleOpenReschedule(apt)}
                            className="hover:text-primary cursor-pointer flex items-center gap-1"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Reagendar
                          </button>

                          {isScheduled && (
                            <>
                              <button
                                onClick={() => handleMarkNoShow(apt)}
                                className="hover:text-rose-400 cursor-pointer flex items-center gap-1"
                              >
                                <Ban className="h-3 w-3" />
                                No-Show
                              </button>
                              <button
                                onClick={() => handleCancelApt(apt)}
                                className="hover:text-rose-400 cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. VISÃO C: RESUMO SEMANAL                                                */}
      {/* ========================================================================= */}
      {viewMode === "WEEK" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
          {[
            { day: "Segunda-feira", date: "28/09", count: 12, revenue: 640 },
            { day: "Terça-feira", date: "29/09", count: 15, revenue: 780 },
            { day: "Quarta-feira", date: "30/09 (Hoje)", count: attendances.length, revenue: attendances.reduce((acc, a) => acc + a.total, 0) },
            { day: "Quinta-feira", date: "01/10", count: 18, revenue: 920 },
            { day: "Sexta-feira", date: "02/10", count: 24, revenue: 1450 },
            { day: "Sábado", date: "03/10", count: 32, revenue: 2100 },
            { day: "Domingo", date: "04/10", count: 0, revenue: 0 },
          ].map((w, idx) => (
            <Card key={idx} className="border border-hairline bg-card rounded-2xl shadow-xs">
              <CardHeader className="p-3 pb-2 border-b border-hairline/50">
                <span className="text-[11px] font-bold text-foreground">{w.day}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{w.date}</span>
              </CardHeader>
              <CardContent className="p-3 space-y-2 text-xs">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Agendamentos:</span>
                  <span className="font-bold text-foreground font-mono">{w.count}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Projeção:</span>
                  <span className="font-bold text-emerald-400 font-mono">R$ {w.revenue.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL AGENDAMENTO RÁPIDO NO SLOT                                          */}
      {/* ========================================================================= */}
      {slotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-hairline rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <CalendarPlus className="h-5 w-5 text-primary" />
                  Agendar Horário • {slotTime}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Profissional: <strong className="text-foreground">{slotBarber}</strong>
                </p>
              </div>
              <button
                onClick={() => setSlotModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmSlotBooking} className="space-y-3.5 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Nome do Cliente:</label>
                <Input
                  required
                  placeholder="Ex: Carlos Eduardo"
                  value={slotClientName}
                  onChange={(e) => setSlotClientName(e.target.value)}
                  className="bg-muted/30 border-hairline h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Telefone WhatsApp:</label>
                <Input
                  placeholder="(11) 98888-0000"
                  value={slotClientPhone}
                  onChange={(e) => setSlotClientPhone(e.target.value)}
                  className="bg-muted/30 border-hairline h-9 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Serviço Desejado:</label>
                <select
                  value={slotServiceId}
                  onChange={(e) => setSlotServiceId(e.target.value)}
                  className="w-full h-9 bg-muted/40 border border-hairline rounded-lg px-3 text-xs text-foreground focus:outline-hidden"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} • {s.duration} min • R$ {s.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-fitting"
                  checked={isFitting}
                  onChange={(e) => setIsFitting(e.target.checked)}
                  className="rounded border-hairline text-primary focus:ring-0 cursor-pointer"
                />
                <label htmlFor="chk-fitting" className="text-muted-foreground cursor-pointer text-xs">
                  Marcar como Encaixe de Emergência (sobreposição permitida)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-hairline">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSlotModalOpen(false)}
                  className="h-9 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                >
                  Confirmar Agendamento
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE REAGENDAMENTO                                                    */}
      {/* ========================================================================= */}
      {rescheduleModalOpen && rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-hairline rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-primary" />
                  Reagendar Atendimento
                </h3>
                <p className="text-xs text-muted-foreground">
                  Cliente: <strong className="text-foreground">{rescheduleTarget.customerName}</strong>
                </p>
              </div>
              <button
                onClick={() => setRescheduleModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Novo Profissional:</label>
                <select
                  value={newRescheduleBarber}
                  onChange={(e) => setNewRescheduleBarber(e.target.value)}
                  className="w-full h-9 bg-muted/40 border border-hairline rounded-lg px-3 text-xs text-foreground focus:outline-hidden"
                >
                  {barbers.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Novo Horário:</label>
                <select
                  value={newRescheduleTime}
                  onChange={(e) => setNewRescheduleTime(e.target.value)}
                  className="w-full h-9 bg-muted/40 border border-hairline rounded-lg px-3 text-xs text-foreground focus:outline-hidden"
                >
                  {timeSlots.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-muted/20 border border-hairline rounded-xl text-[11px] text-muted-foreground">
                Ao salvar, o horário anterior será liberado no motor de disponibilidade e o cliente poderá ser notificado via WhatsApp com o novo horário.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-hairline">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRescheduleModalOpen(false)}
                  className="h-9 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveReschedule}
                  className="h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                >
                  Salvar Reagendamento
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
