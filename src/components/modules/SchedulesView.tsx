import React, { useState } from "react";
import {
  CalendarCheck,
  Clock,
  User,
  Plus,
  Save,
  CheckCircle,
  AlertCircle,
  Coffee,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { EmployeeItem } from "@/routes/index";

interface SchedulesViewProps {
  employees: EmployeeItem[];
  onShowToast: (msg: string) => void;
}

interface DaySchedule {
  dayName: string;
  isWorkday: boolean;
  start: string;
  end: string;
  lunchStart: string;
  lunchEnd: string;
}

export function SchedulesView({ employees, onShowToast }: SchedulesViewProps) {
  const barbers = employees.filter((e) => e.role === "BARBEIRO" || e.role === "RECEPCIONISTA");
  const [selectedEmpId, setSelectedEmpId] = useState<string>(barbers[0]?.id || "emp-1");

  const [schedules, setSchedules] = useState<Record<string, DaySchedule[]>>({
    "emp-1": [
      { dayName: "Segunda-feira", isWorkday: true, start: "09:00", end: "19:00", lunchStart: "12:30", lunchEnd: "13:30" },
      { dayName: "Terça-feira", isWorkday: true, start: "09:00", end: "19:00", lunchStart: "12:30", lunchEnd: "13:30" },
      { dayName: "Quarta-feira", isWorkday: true, start: "09:00", end: "19:00", lunchStart: "12:30", lunchEnd: "13:30" },
      { dayName: "Quinta-feira", isWorkday: true, start: "09:00", end: "19:00", lunchStart: "12:30", lunchEnd: "13:30" },
      { dayName: "Sexta-feira", isWorkday: true, start: "08:30", end: "20:00", lunchStart: "12:00", lunchEnd: "13:00" },
      { dayName: "Sábado", isWorkday: true, start: "08:00", end: "18:00", lunchStart: "12:00", lunchEnd: "13:00" },
      { dayName: "Domingo", isWorkday: false, start: "09:00", end: "14:00", lunchStart: "12:00", lunchEnd: "13:00" },
    ],
  });

  const currentSchedule = schedules[selectedEmpId] || [
    { dayName: "Segunda-feira", isWorkday: true, start: "09:00", end: "19:00", lunchStart: "12:30", lunchEnd: "13:30" },
    { dayName: "Terça-feira", isWorkday: true, start: "09:00", end: "19:00", lunchStart: "12:30", lunchEnd: "13:30" },
    { dayName: "Quarta-feira", isWorkday: true, start: "09:00", end: "19:00", lunchStart: "12:30", lunchEnd: "13:30" },
    { dayName: "Quinta-feira", isWorkday: true, start: "09:00", end: "19:00", lunchStart: "12:30", lunchEnd: "13:30" },
    { dayName: "Sexta-feira", isWorkday: true, start: "08:30", end: "20:00", lunchStart: "12:00", lunchEnd: "13:00" },
    { dayName: "Sábado", isWorkday: true, start: "08:00", end: "18:00", lunchStart: "12:00", lunchEnd: "13:00" },
    { dayName: "Domingo", isWorkday: false, start: "09:00", end: "14:00", lunchStart: "12:00", lunchEnd: "13:00" },
  ];

  const handleToggleWorkday = (index: number) => {
    const target = currentSchedule[index];
    if (!target) return;
    const updated: DaySchedule[] = currentSchedule.map((item, idx) =>
      idx === index ? { ...item, isWorkday: !item.isWorkday } : item
    );
    setSchedules((prev) => ({ ...prev, [selectedEmpId]: updated }));
  };

  const handleTimeChange = (index: number, field: keyof DaySchedule, value: string) => {
    const target = currentSchedule[index];
    if (!target) return;
    const updated: DaySchedule[] = currentSchedule.map((item, idx) =>
      idx === index ? { ...item, [field]: value } : item
    );
    setSchedules((prev) => ({ ...prev, [selectedEmpId]: updated }));
  };

  const handleSave = () => {
    onShowToast("Escala semanal atualizada e sincronizada com a Agenda!");
  };

  const selectedCollab = employees.find((e) => e.id === selectedEmpId) || employees[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <CalendarCheck className="h-6 w-6 text-primary" />
            Escalas de Trabalho, Jornada & Folgas
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Defina horários de expediente, intervalos de almoço e dias de folga que alimentam o motor de disponibilidade.
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleSave}
          className="h-9 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-md shadow-primary/25 cursor-pointer px-4"
        >
          <Save className="h-4 w-4" />
          <span>Salvar Escala</span>
        </Button>
      </div>

      {/* Seletor de Colaborador */}
      <div className="flex items-center gap-3 bg-card p-3 rounded-2xl border border-hairline shadow-xs">
        <span className="text-xs font-semibold text-muted-foreground">Colaborador:</span>
        <div className="flex flex-wrap gap-2">
          {barbers.map((emp) => (
            <button
              key={emp.id}
              onClick={() => setSelectedEmpId(emp.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedEmpId === emp.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 border border-hairline text-muted-foreground hover:text-foreground"
              }`}
            >
              {emp.name} ({emp.role})
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Grade Semanal */}
      <Card className="border-hairline bg-card rounded-2xl shadow-xs overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b border-hairline">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Grade Semanal — {selectedCollab?.name}
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/30 border-b border-hairline text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Dia da Semana</th>
                <th className="py-3 px-4 text-center">Trabalha?</th>
                <th className="py-3 px-4">Entrada</th>
                <th className="py-3 px-4">Início Intervalo</th>
                <th className="py-3 px-4">Fim Intervalo</th>
                <th className="py-3 px-4">Saída</th>
                <th className="py-3 px-4 text-right">Status do Dia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {currentSchedule.map((day, idx) => (
                <tr key={day.dayName} className={`transition-colors ${day.isWorkday ? "hover:bg-muted/20" : "bg-muted/10 opacity-60"}`}>
                  <td className="py-3 px-4 font-bold text-foreground">{day.dayName}</td>
                  <td className="py-3 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={day.isWorkday}
                      onChange={() => handleToggleWorkday(idx)}
                      className="h-4 w-4 rounded accent-primary cursor-pointer"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="time"
                      disabled={!day.isWorkday}
                      value={day.start}
                      onChange={(e) => handleTimeChange(idx, "start", e.target.value)}
                      className="h-7 px-2 rounded-lg border border-hairline bg-card text-foreground font-mono text-xs disabled:opacity-40"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="time"
                      disabled={!day.isWorkday}
                      value={day.lunchStart}
                      onChange={(e) => handleTimeChange(idx, "lunchStart", e.target.value)}
                      className="h-7 px-2 rounded-lg border border-hairline bg-card text-foreground font-mono text-xs disabled:opacity-40"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="time"
                      disabled={!day.isWorkday}
                      value={day.lunchEnd}
                      onChange={(e) => handleTimeChange(idx, "lunchEnd", e.target.value)}
                      className="h-7 px-2 rounded-lg border border-hairline bg-card text-foreground font-mono text-xs disabled:opacity-40"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="time"
                      disabled={!day.isWorkday}
                      value={day.end}
                      onChange={(e) => handleTimeChange(idx, "end", e.target.value)}
                      className="h-7 px-2 rounded-lg border border-hairline bg-card text-foreground font-mono text-xs disabled:opacity-40"
                    />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold ${
                        day.isWorkday
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border-muted-foreground/30 bg-muted text-muted-foreground"
                      }`}
                    >
                      {day.isWorkday ? "DISPONÍVEL" : "FOLGA"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
