import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar,
  Clock,
  User,
  Scissors,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Phone,
  Sparkles,
  Search,
  Plus,
  X,
  ShieldCheck,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import {
  getUnifiedAvailability,
  validateAndAssignAppointmentSlot,
  toDateStringYYYYMMDD,
  type UnifiedSlot,
  type ServiceDefinition,
  type EmployeeDefinition,
} from "@/lib/appointments/availability.service";
import type { BusinessSettings, CustomerItem, EmployeeItem, ServiceItem } from "@/routes/index";

export type BookingOrigin =
  | "SITE"
  | "BOT"
  | "PORTAL_CLIENTE"
  | "RECEPCAO"
  | "TELEFONE"
  | "WHATSAPP_MANUAL"
  | "ENCAIXE";

export interface BookingSubmissionData {
  customerName: string;
  customerPhone: string;
  customerId?: string | undefined;
  barberName: string;
  employeeId?: string | undefined;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  date: string; // "YYYY-MM-DD"
  timeSlot: string; // "14:00 - 14:40"
  startTimeIso: string;
  endTimeIso: string;
  origin: BookingOrigin;
  notes?: string | undefined;
  isFitting?: boolean | undefined;
}

export interface WaitingListSubmissionData {
  customerName: string;
  customerPhone: string;
  customerId?: string | undefined;
  serviceId: string;
  preferredDate: string;
  preferredPeriod: "MANHA" | "TARDE" | "NOITE" | "QUALQUER";
  preferredBarberName?: string | undefined;
  employeeId?: string | undefined;
  notes?: string | undefined;
}

export interface UnifiedBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "PUBLIC" | "INTERNAL" | undefined;
  initialOrigin?: BookingOrigin | undefined;
  initialServiceId?: string | undefined;
  initialEmployeeId?: string | undefined;
  prefilledCustomer?: { name: string; phone: string; id?: string | undefined } | undefined;
  businessSettings: BusinessSettings;
  services: ServiceItem[];
  employees: EmployeeItem[];
  customers: CustomerItem[];
  existingAppointments: any[];
  onConfirmBooking: (data: BookingSubmissionData) => void;
  onAddToWaitingList?: ((data: WaitingListSubmissionData) => void) | undefined;
}

function formatTimeHHmm(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

// Máscara brasileira para telefone: (XX) XXXXX-XXXX
function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function UnifiedBookingModal({
  isOpen,
  onClose,
  mode = "PUBLIC",
  initialOrigin = "SITE",
  initialServiceId,
  initialEmployeeId,
  prefilledCustomer,
  businessSettings,
  services,
  employees,
  customers,
  existingAppointments,
  onConfirmBooking,
  onAddToWaitingList,
}: UnifiedBookingModalProps) {
  if (!isOpen) return null;

  // Passos do Fluxo Progressivo:
  // 1: Identificação (Telefone / Nome)
  // 2: Serviço
  // 3: Data
  // 4: Profissional & Horário
  // 5: Confirmação
  const [step, setStep] = useState<number>(1);

  // Dados do Agendamento em Construção
  const [phone, setPhone] = useState(prefilledCustomer?.phone ? applyPhoneMask(prefilledCustomer.phone) : "");
  const [name, setName] = useState(prefilledCustomer?.name || "");
  const [recognizedCustomer, setRecognizedCustomer] = useState<{ id: string; firstName: string } | null>(null);

  // Busca interna de cliente (apenas modo INTERNAL)
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(prefilledCustomer?.id || null);

  // Seleções
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    initialServiceId || services[0]?.id || ""
  );
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return toDateStringYYYYMMDD(new Date());
  });
  const [selectedBarberId, setSelectedBarberId] = useState<string>(
    initialEmployeeId || "ANY"
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [internalOrigin, setInternalOrigin] = useState<BookingOrigin>(initialOrigin);
  const [internalNotes, setInternalNotes] = useState<string>("");

  // Estados de Transição e Concorrência
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [concurrencyError, setConcurrencyError] = useState<string | null>(null);
  const [successBookingCode, setSuccessBookingCode] = useState<string | null>(null);
  const [showWaitingListForm, setShowWaitingListForm] = useState(false);
  const [waitingListSuccess, setWaitingListSuccess] = useState(false);

  // Reconhecimento Seguro por Telefone (sem expor banco para terceiros)
  useEffect(() => {
    const rawDigits = phone.replace(/\D/g, "");
    if (rawDigits.length >= 10) {
      const found = customers.find((c) => c.phone.replace(/\D/g, "").includes(rawDigits));
      if (found) {
        const firstName = found.name.split(" ")[0] || found.name;
        setRecognizedCustomer({ id: found.id, firstName });
        if (!name) setName(found.name);
      } else {
        setRecognizedCustomer(null);
      }
    } else {
      setRecognizedCustomer(null);
    }
  }, [phone, customers]);

  // Serviço Selecionado Atualmente
  const currentService = useMemo(() => {
    return services.find((s) => s.id === selectedServiceId) || services[0];
  }, [services, selectedServiceId]);

  // Barbeiros Ativos Elegíveis
  const activeBarbers = useMemo(() => {
    return employees.filter(
      (e) => (e.role === "BARBEIRO" || (e as any).position === "BARBEIRO") && (e.status === "ACTIVE" || !e.status)
    );
  }, [employees]);

  // Consulta ao Motor de Disponibilidade Unificado
  const availabilityData = useMemo(() => {
    if (!currentService) return null;

    const servDefs: ServiceDefinition[] = services.map((s) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      duration: s.duration,
      durationMinutes: typeof s.duration === "number" ? s.duration : parseInt(String(s.duration).replace(/\D/g, ""), 10) || 35,
      isActive: true,
    }));

    const empDefs: EmployeeDefinition[] = activeBarbers.map((b) => ({
      id: b.id,
      name: b.name,
      role: b.role,
      position: (b as any).position || b.role,
      status: b.status,
    }));

    // Formatar agendamentos existentes para o motor
    const mappedApts = existingAppointments.map((apt) => {
      const start = apt.startTimeIso ? new Date(apt.startTimeIso) : new Date(`${selectedDate}T14:00:00`);
      const end = apt.endTimeIso ? new Date(apt.endTimeIso) : new Date(start.getTime() + 40 * 60000);
      return {
        id: apt.id,
        startTime: start,
        endTime: end,
        status: apt.status || "AGENDADO",
        employeeId: apt.employeeId,
        barberName: apt.barberName,
      };
    });

    return getUnifiedAvailability({
      tenantId: "tenant-default",
      serviceId: currentService.id,
      date: selectedDate,
      preferredBarberId: selectedBarberId === "ANY" ? null : selectedBarberId,
      services: servDefs,
      employees: empDefs,
      businessSettings: {
        weekdayOpeningTime: businessSettings.weekdayOpeningTime || "09:00",
        weekdayClosingTime: businessSettings.weekdayClosingTime || "19:00",
        intervalMinutes: businessSettings.intervalMinutes || 30,
        appointmentBufferMinutes: businessSettings.bufferMinutes || 0,
      },
      existingAppointments: mappedApts,
      minAdvanceMinutes: mode === "INTERNAL" ? 0 : 30,
      now: new Date(),
    });
  }, [currentService, services, activeBarbers, existingAppointments, selectedDate, selectedBarberId, businessSettings, mode]);

  // Avançar Datas Rápidas
  const handleSelectQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setSelectedDate(toDateStringYYYYMMDD(d));
    setSelectedTimeSlot(null);
    setConcurrencyError(null);
  };

  // Submissão do Agendamento com Proteção Atômica Contra Double-Booking
  const handleConfirmBooking = () => {
    if (isSubmitting || !selectedTimeSlot || !currentService) return;

    setIsSubmitting(true);
    setConcurrencyError(null);

    try {
      // 1. Revalidação Atômica no Motor de Disponibilidade
      const validation = validateAndAssignAppointmentSlot({
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        serviceDurationMinutes: availabilityData?.serviceDurationMinutes || 40,
        preferredBarberId: selectedBarberId === "ANY" ? null : selectedBarberId,
        eligibleBarbers: activeBarbers.map((b) => ({ id: b.id, name: b.name, role: "BARBEIRO" })),
        existingAppointments: existingAppointments.map((apt) => ({
          startTime: apt.startTimeIso ? new Date(apt.startTimeIso) : new Date(`${selectedDate}T${selectedTimeSlot}:00`),
          endTime: apt.endTimeIso ? new Date(apt.endTimeIso) : new Date(new Date(`${selectedDate}T${selectedTimeSlot}:00`).getTime() + 40 * 60000),
          status: apt.status || "AGENDADO",
          employeeId: apt.employeeId,
          barberName: apt.barberName,
        })),
      });

      if (!validation.success || !validation.assignedBarber || !validation.startTime || !validation.endTime) {
        setConcurrencyError(
          validation.reason ||
            "Este horário acabou de ser ocupado. Por favor, escolha outro horário disponível na lista."
        );
        setIsSubmitting(false);
        setSelectedTimeSlot(null);
        return;
      }

      // 2. Montar objeto definitivo e registrar
      const finalClientName = name.trim() || (recognizedCustomer ? recognizedCustomer.firstName : "Cliente Balcão");
      const finalClientPhone = phone.trim() || "(11) 90000-0000";
      const startFormatted = formatTimeHHmm(validation.startTime);
      const endFormatted = formatTimeHHmm(validation.endTime);

      const submission: BookingSubmissionData = {
        customerName: finalClientName,
        customerPhone: finalClientPhone,
        customerId: selectedCustomerId || recognizedCustomer?.id,
        barberName: validation.assignedBarber.name,
        employeeId: validation.assignedBarber.id,
        serviceId: currentService.id,
        serviceName: currentService.name,
        servicePrice: currentService.price,
        serviceDuration: availabilityData?.serviceDurationMinutes || 40,
        date: selectedDate,
        timeSlot: `${startFormatted} - ${endFormatted}`,
        startTimeIso: validation.startTime.toISOString(),
        endTimeIso: validation.endTime.toISOString(),
        origin: mode === "INTERNAL" ? internalOrigin : initialOrigin,
        notes: internalNotes.trim() || undefined,
        isFitting: internalOrigin === "ENCAIXE",
      };

      onConfirmBooking(submission);
      setSuccessBookingCode(`#BH-${Math.floor(10000 + Math.random() * 90000)}`);
      setIsSubmitting(false);
    } catch (err: any) {
      setConcurrencyError(err.message || "Erro inesperado ao processar agendamento.");
      setIsSubmitting(false);
    }
  };

  // Submissão na Lista de Espera
  const handleJoinWaitingList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddToWaitingList || !currentService) return;

    onAddToWaitingList({
      customerName: name.trim() || "Cliente Interessado",
      customerPhone: phone.trim() || "(11) 90000-0000",
      customerId: selectedCustomerId || recognizedCustomer?.id,
      serviceId: currentService.id,
      preferredDate: selectedDate,
      preferredPeriod: "QUALQUER",
      preferredBarberName: selectedBarberId !== "ANY" ? employees.find((e) => e.id === selectedBarberId)?.name : undefined,
      employeeId: selectedBarberId !== "ANY" ? selectedBarberId : undefined,
      notes: "Adicionado via solicitação online por falta de vagas na data.",
    });

    setWaitingListSuccess(true);
  };

  // Tela de Sucesso
  if (successBookingCode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
        <div className="w-full max-w-md bg-card border border-hairline rounded-3xl shadow-2xl p-6 text-center space-y-4 animate-in fade-in zoom-in-95">
          <div className="h-16 w-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle className="h-8 w-8" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold text-primary block">{successBookingCode}</span>
            <h3 className="text-xl font-black text-foreground mt-1">Agendamento Confirmado!</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Seu horário está garantido e já consta na agenda de atendimento da barbearia.
            </p>
          </div>

          <div className="bg-muted/30 border border-hairline rounded-2xl p-3.5 text-xs text-left space-y-1.5 font-sans">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente:</span>
              <strong className="text-foreground">{name || (recognizedCustomer ? recognizedCustomer.firstName : "Cliente")}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Serviço:</span>
              <strong className="text-foreground">{currentService?.name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data & Horário:</span>
              <strong className="text-primary">{selectedDate} às {selectedTimeSlot}</strong>
            </div>
          </div>

          <Button
            onClick={onClose}
            className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl cursor-pointer"
          >
            Concluir & Fechar
          </Button>
        </div>
      </div>
    );
  }

  // Helpers de Navegação dos Passos
  const canAdvanceStep = (): boolean => {
    if (step === 1) {
      if (mode === "INTERNAL") return true;
      const rawDigits = phone.replace(/\D/g, "");
      return rawDigits.length >= 10 && (recognizedCustomer !== null || name.trim().length >= 2);
    }
    if (step === 2) return Boolean(selectedServiceId);
    if (step === 3) return Boolean(selectedDate);
    if (step === 4) return Boolean(selectedTimeSlot);
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-card border border-hairline rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 max-h-[92vh]">
        {/* Header Superior com Progresso */}
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {mode === "INTERNAL" ? "Agendamento da Recepção" : "Agendar Horário Online"}
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Passo {step} de 5 • {step === 1 ? "Identificação" : step === 2 ? "Serviço" : step === 3 ? "Data" : step === 4 ? "Horário" : "Confirmação"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 cursor-pointer">
            ✕
          </button>
        </div>

        {/* Barra de Progresso Progressiva */}
        <div className="w-full bg-muted/40 h-1">
          <div
            className="bg-primary h-1 transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* Corpo Interativo do Modal */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* ============================================================== */}
          {/* PASSO 1: IDENTIFICAÇÃO SEGURA (Telefone com máscara brasileira) */}
          {/* ============================================================== */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>Qual é o seu telefone para contato?</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Utilizamos seu número apenas para confirmar seu horário e avisar quando sua cadeira estiver pronta.
                </p>
              </div>

              {mode === "INTERNAL" ? (
                /* Modo Interno Recepção: Permite buscar no CRM ou cadastrar rápido */
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Localizar Cliente no CRM (Nome, Telefone ou CPF):
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Digite nome ou telefone do cliente..."
                        value={internalSearchQuery}
                        onChange={(e) => setInternalSearchQuery(e.target.value)}
                        className="pl-9 bg-muted/30 border-hairline text-xs h-9"
                      />
                    </div>
                  </div>

                  {internalSearchQuery.trim().length >= 2 && (
                    <div className="max-h-36 overflow-y-auto border border-hairline rounded-xl divide-y divide-hairline bg-card">
                      {customers
                        .filter(
                          (c) =>
                            c.name.toLowerCase().includes(internalSearchQuery.toLowerCase()) ||
                            c.phone.includes(internalSearchQuery)
                        )
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              setName(c.name);
                              setPhone(applyPhoneMask(c.phone));
                              setInternalSearchQuery("");
                            }}
                            className="w-full p-2.5 text-left text-xs hover:bg-muted/40 flex justify-between items-center cursor-pointer"
                          >
                            <span className="font-semibold text-foreground">{c.name}</span>
                            <span className="text-muted-foreground font-mono">{c.phone}</span>
                          </button>
                        ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Nome do Cliente:</label>
                      <Input
                        placeholder="Nome Completo"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-8 text-xs bg-muted/30 border-hairline"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Telefone WhatsApp:</label>
                      <Input
                        placeholder="(11) 98888-0000"
                        value={phone}
                        onChange={(e) => setPhone(applyPhoneMask(e.target.value))}
                        className="h-8 text-xs bg-muted/30 border-hairline font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Canal de Origem:</label>
                    <select
                      value={internalOrigin}
                      onChange={(e) => setInternalOrigin(e.target.value as BookingOrigin)}
                      className="w-full h-8 px-2 bg-muted/30 border border-hairline rounded-lg text-xs text-foreground cursor-pointer"
                    >
                      <option value="RECEPCAO">Recepção / Balcão</option>
                      <option value="WHATSAPP_MANUAL">WhatsApp Manual (Atendente)</option>
                      <option value="TELEFONE">Ligação Telefônica</option>
                      <option value="ENCAIXE">Encaixe Imediato</option>
                    </select>
                  </div>
                </div>
              ) : (
                /* Modo Público / Site / Bot */
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                      Número do WhatsApp:
                    </label>
                    <Input
                      placeholder="(11) 98888-0000"
                      value={phone}
                      onChange={(e) => setPhone(applyPhoneMask(e.target.value))}
                      className="h-11 text-sm bg-muted/30 border-hairline font-mono font-semibold"
                      autoFocus
                    />
                  </div>

                  {recognizedCustomer ? (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
                      <div>
                        <strong>Olá, {recognizedCustomer.firstName}!</strong>
                        <span className="block text-[11px] text-emerald-400/80">
                          Identificamos seu cadastro de cliente. Vamos selecionar seu horário.
                        </span>
                      </div>
                    </div>
                  ) : phone.replace(/\D/g, "").length >= 10 ? (
                    <div className="space-y-1.5 animate-in fade-in">
                      <label className="text-xs font-semibold text-muted-foreground block">
                        Como gostaria de ser chamado(a)?
                      </label>
                      <Input
                        placeholder="Ex: João da Silva"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-10 text-xs bg-muted/30 border-hairline"
                      />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* PASSO 2: SELEÇÃO DE SERVIÇO COM DURAÇÃO E PREÇO REAIS         */}
          {/* ============================================================== */}
          {step === 2 && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                  <Scissors className="h-4 w-4 text-primary" />
                  <span>O que você gostaria de fazer?</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Selecione o serviço para calcularmos a duração exata da sua sessão.
                </p>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {services.map((srv) => {
                  const isSelected = srv.id === selectedServiceId;
                  return (
                    <div
                      key={srv.id}
                      onClick={() => setSelectedServiceId(srv.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-primary/10 border-primary ring-1 ring-primary/40 shadow-xs"
                          : "bg-muted/20 border-hairline hover:bg-muted/40"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-foreground">{srv.name}</h4>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3 text-primary" />
                          <span>Duração média: {srv.duration}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-sm font-bold text-primary block">
                          R$ {srv.price.toFixed(2)}
                        </span>
                        {isSelected && (
                          <Badge className="bg-primary text-primary-foreground text-[9px] py-0 px-1.5">
                            Selecionado
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* PASSO 3: DATA (Calendário Amigável com Dias Válidos)          */}
          {/* ============================================================== */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>Que dia você gostaria de vir?</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Atendimento de {businessSettings.weekdayOpeningTime} às {businessSettings.weekdayClosingTime}.
                </p>
              </div>

              {/* Botões de Acesso Rápido de Data */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Hoje", days: 0 },
                  { label: "Amanhã", days: 1 },
                  { label: "Depois de Amanhã", days: 2 },
                ].map((item) => {
                  const targetDate = new Date();
                  targetDate.setDate(targetDate.getDate() + item.days);
                  const str = toDateStringYYYYMMDD(targetDate);
                  const isSelected = selectedDate === str;

                  return (
                    <button
                      key={item.days}
                      type="button"
                      onClick={() => handleSelectQuickDate(item.days)}
                      className={`py-2 px-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-bold shadow-xs border-primary"
                          : "bg-muted/20 border-hairline text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="text-xs block font-semibold">{item.label}</span>
                      <span className="text-[10px] opacity-80 font-mono">
                        {targetDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Ou escolha outra data no calendário:
                </label>
                <Input
                  type="date"
                  value={selectedDate}
                  min={toDateStringYYYYMMDD(new Date())}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTimeSlot(null);
                    setConcurrencyError(null);
                  }}
                  className="bg-muted/30 border-hairline h-10 text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* PASSO 4: PREFERÊNCIA DE PROFISSIONAL & HORÁRIOS DISPONÍVEIS    */}
          {/* ============================================================== */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">
                  Você tem preferência por algum profissional?
                </h3>
                {/* Seletor de Barbeiro */}
                <div className="flex gap-2 overflow-x-auto pb-1 pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBarberId("ANY");
                      setSelectedTimeSlot(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl border shrink-0 cursor-pointer transition-all ${
                      selectedBarberId === "ANY"
                        ? "bg-primary text-primary-foreground font-bold border-primary shadow-xs"
                        : "bg-muted/20 border-hairline text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    ⭐ Sem preferência (Mais rápido)
                  </button>

                  {activeBarbers.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setSelectedBarberId(b.id);
                        setSelectedTimeSlot(null);
                      }}
                      className={`px-3 py-1.5 rounded-xl border shrink-0 cursor-pointer transition-all ${
                        selectedBarberId === b.id
                          ? "bg-primary text-primary-foreground font-bold border-primary shadow-xs"
                          : "bg-muted/20 border-hairline text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conflito de Concorrência */}
              {concurrencyError && (
                <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{concurrencyError}</span>
                </div>
              )}

              {/* Grid de Horários Disponíveis Calculados pelo Motor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">Horários Livres ({selectedDate}):</span>
                  {availabilityData && (
                    <span className="text-[11px] text-primary font-mono font-semibold">
                      {availabilityData.slots.length} horários encontrados
                    </span>
                  )}
                </div>

                {availabilityData?.hasAvailableSlots ? (
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {(["MANHA", "TARDE", "NOITE"] as const).map((period) => {
                      const periodSlots = availabilityData.slotsByPeriod[period];
                      if (periodSlots.length === 0) return null;

                      return (
                        <div key={period} className="space-y-1.5">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                            {period === "MANHA" ? "☀️ Manhã" : period === "TARDE" ? "🌤️ Tarde" : "🌙 Noite"}
                          </span>
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                            {periodSlots.map((slot: UnifiedSlot) => {
                              const isSelected = selectedTimeSlot === slot.formattedTime;
                              return (
                                <button
                                  key={slot.formattedTime}
                                  type="button"
                                  onClick={() => setSelectedTimeSlot(slot.formattedTime)}
                                  className={`py-2 px-1 rounded-xl text-center font-mono text-xs font-bold cursor-pointer transition-all border ${
                                    isSelected
                                      ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/40 scale-105"
                                      : "bg-muted/20 hover:bg-muted border-hairline text-foreground"
                                  }`}
                                >
                                  {slot.formattedTime}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Sem Horários Disponíveis: Sugestões e Lista de Espera */
                  <div className="p-4 rounded-2xl bg-muted/20 border border-hairline text-center space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Não encontramos horários livres para esta data com o critério escolhido.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-2">
                      {availabilityData?.nextAvailableDate && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDate(availabilityData.nextAvailableDate!);
                            setSelectedTimeSlot(null);
                          }}
                          className="h-8 text-xs border-primary/30 text-primary cursor-pointer"
                        >
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          Ver Próximo Dia ({availabilityData.nextAvailableDate})
                        </Button>
                      )}

                      <Button
                        size="sm"
                        onClick={() => setShowWaitingListForm(true)}
                        className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                      >
                        Entrar na Lista de Espera
                      </Button>
                    </div>

                    {showWaitingListForm && (
                      <form onSubmit={handleJoinWaitingList} className="pt-3 border-t border-hairline space-y-2 text-left animate-in fade-in">
                        <span className="text-[11px] font-bold text-foreground block">
                          Ser avisado se abrir desistência neste dia:
                        </span>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Seu WhatsApp"
                            value={phone}
                            onChange={(e) => setPhone(applyPhoneMask(e.target.value))}
                            className="h-8 text-xs bg-background border-hairline font-mono"
                          />
                          <Button type="submit" size="sm" className="h-8 text-xs bg-primary text-primary-foreground shrink-0">
                            Confirmar Fila
                          </Button>
                        </div>
                        {waitingListSuccess && (
                          <span className="text-[11px] text-emerald-400 font-semibold block">
                            ✓ Você está na fila! Avisaremos assim que surgir vaga.
                          </span>
                        )}
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* PASSO 5: CONFIRMAÇÃO DO AGENDAMENTO COM REVALIDAÇÃO FINAL     */}
          {/* ============================================================== */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Confirme os dados do agendamento</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Revise o resumo antes de reservar a vaga na barbearia.
                </p>
              </div>

              <Card className="border-hairline bg-muted/20 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-hairline pb-2">
                  <span className="text-muted-foreground">Cliente:</span>
                  <strong className="text-foreground">
                    {name || (recognizedCustomer ? recognizedCustomer.firstName : "Cliente")} ({phone})
                  </strong>
                </div>

                <div className="flex justify-between items-center border-b border-hairline pb-2">
                  <span className="text-muted-foreground">Serviço:</span>
                  <div className="text-right">
                    <strong className="text-foreground block">{currentService?.name}</strong>
                    <span className="text-[10px] text-muted-foreground">Duração: {availabilityData?.serviceDurationMinutes} min</span>
                  </div>
                </div>

                <div className="flex justify-between items-center border-b border-hairline pb-2">
                  <span className="text-muted-foreground">Data & Horário:</span>
                  <strong className="text-primary font-mono text-sm">
                    {selectedDate} às {selectedTimeSlot}
                  </strong>
                </div>

                <div className="flex justify-between items-center border-b border-hairline pb-2">
                  <span className="text-muted-foreground">Profissional:</span>
                  <strong className="text-foreground">
                    {selectedBarberId === "ANY"
                      ? "Distribuição Automática Inteligente"
                      : employees.find((e) => e.id === selectedBarberId)?.name || "Barbeiro"}
                  </strong>
                </div>

                <div className="flex justify-between items-center pt-1 text-sm">
                  <span className="font-bold text-foreground">Valor a pagar no local:</span>
                  <strong className="font-bold text-primary font-mono text-base">
                    R$ {currentService?.price.toFixed(2)}
                  </strong>
                </div>
              </Card>

              {mode === "INTERNAL" && (
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Observações Internas (Opcional):
                  </label>
                  <Input
                    placeholder="Ex: Cliente prefere toalha morna, primeira vez, etc."
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    className="h-8 text-xs bg-muted/30 border-hairline"
                  />
                </div>
              )}

              <p className="text-[11px] text-muted-foreground text-center">
                Ao clicar em Confirmar, seu horário é alocado imediatamente no sistema operacional da barbearia.
              </p>
            </div>
          )}
        </div>

        {/* Rodapé com Botões de Navegação Anterior / Próximo / Confirmar */}
        <div className="px-5 py-3.5 border-t border-hairline bg-muted/20 flex justify-between items-center">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setStep((s) => Math.max(1, s - 1));
                setConcurrencyError(null);
              }}
              className="h-8 text-xs border-hairline cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Voltar
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancelar
            </Button>
          )}

          {step < 5 ? (
            <Button
              type="button"
              size="sm"
              disabled={!canAdvanceStep()}
              onClick={() => setStep((s) => Math.min(5, s + 1))}
              className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground px-4 cursor-pointer disabled:opacity-50"
            >
              <span>Continuar</span>
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting || !selectedTimeSlot}
              onClick={handleConfirmBooking}
              className="h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground px-5 cursor-pointer shadow-md shadow-primary/25 disabled:opacity-50"
            >
              {isSubmitting ? "Alocando Horário..." : "Confirmar Agendamento"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
