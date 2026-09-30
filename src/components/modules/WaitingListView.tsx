import React, { useState } from "react";
import {
  Clock,
  Plus,
  User,
  Scissors,
  CheckCircle,
  AlertCircle,
  Phone,
  Trash2,
  CalendarCheck,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface WaitingClient {
  id: string;
  customerName: string;
  phone: string;
  preferredBarber: string;
  desiredService: string;
  notes: string;
  arrivalTime: string;
  priority: "NORMAL" | "VIP" | "ENCAIXE_URGENTE";
}

interface WaitingListViewProps {
  onEncaixarNaAgenda: (client: WaitingClient) => void;
  barbers: string[];
  services: string[];
}

export function WaitingListView({ onEncaixarNaAgenda, barbers, services }: WaitingListViewProps) {
  const [waitingList, setWaitingList] = useState<WaitingClient[]>([
    {
      id: "w1",
      customerName: "Felipe Nogueira",
      phone: "(11) 98765-4321",
      preferredBarber: "Gabriel Silva",
      desiredService: "Corte Degradê",
      notes: "Aguardando vaga caso alguém desmarque entre 14:00 e 16:00.",
      arrivalTime: "13:45",
      priority: "VIP",
    },
    {
      id: "w2",
      customerName: "Renato Silveira",
      phone: "(11) 97654-3210",
      preferredBarber: "Lucas Ferreira",
      desiredService: "Barboterapia",
      notes: "Está na recepção tomando café.",
      arrivalTime: "14:10",
      priority: "ENCAIXE_URGENTE",
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [barber, setBarber] = useState(barbers[0] || "Gabriel Silva");
  const [service, setService] = useState(services[0] || "Corte Degradê");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<"NORMAL" | "VIP" | "ENCAIXE_URGENTE">("NORMAL");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem: WaitingClient = {
      id: `w-${Date.now()}`,
      customerName: name.trim(),
      phone: phone.trim() || "(11) 90000-0000",
      preferredBarber: barber,
      desiredService: service,
      notes: notes.trim(),
      arrivalTime: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      priority,
    };

    setWaitingList((prev) => [newItem, ...prev]);
    setIsModalOpen(false);
    setName("");
    setPhone("");
    setNotes("");
  };

  const handleRemove = (id: string) => {
    setWaitingList((prev) => prev.filter((w) => w.id !== id));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Clock className="h-6 w-6 text-primary" />
            Fila de Espera & Encaixes Rápidos
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerencie clientes aguardando cancelamentos ou disponibilidade imediata para encaixe na agenda.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-md shadow-primary/25 cursor-pointer h-9 px-4 gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Adicionar à Fila</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {waitingList.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-card border border-hairline rounded-2xl text-muted-foreground text-xs">
            Nenhum cliente na fila de espera no momento.
          </div>
        ) : (
          waitingList.map((client) => (
            <Card key={client.id} className="bg-card border-hairline rounded-2xl shadow-sm hover:shadow-md transition-all">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-xs font-mono font-bold text-foreground">Chegada: {client.arrivalTime}</span>
                </div>

                <Badge
                  className={`text-[9px] font-bold uppercase py-0.5 px-2 ${
                    client.priority === "ENCAIXE_URGENTE"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"
                      : client.priority === "VIP"
                      ? "bg-[#8b5cf6]/20 text-[#a78bfa] border border-[#8b5cf6]/30"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {client.priority.replace("_", " ")}
                </Badge>
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-3">
                <div>
                  <div className="text-sm font-bold text-foreground">{client.customerName}</div>
                  <div className="text-xs text-muted-foreground font-mono flex items-center gap-1.5 mt-0.5">
                    <Phone className="h-3 w-3 text-primary" />
                    <span>{client.phone}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-muted/20 border border-hairline/60 text-xs space-y-1">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Profissional:</span>
                    <strong className="text-foreground">{client.preferredBarber}</strong>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Serviço:</span>
                    <span className="text-[#a78bfa] font-medium">{client.desiredService}</span>
                  </div>
                  {client.notes && (
                    <div className="text-[11px] text-muted-foreground pt-1 border-t border-hairline/40 italic">
                      "{client.notes}"
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => {
                      onEncaixarNaAgenda(client);
                      handleRemove(client.id);
                    }}
                    className="flex-1 h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer"
                  >
                    <CalendarCheck className="h-3.5 w-3.5 mr-1.5" />
                    Encaixar na Agenda
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemove(client.id)}
                    className="h-8 text-xs border-hairline text-muted-foreground hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal Adicionar à Fila */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-card border border-hairline rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Adicionar à Fila de Espera
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Nome do Cliente:</label>
                <Input
                  required
                  placeholder="Nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-muted/30 border-hairline h-8 text-xs"
                />
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">WhatsApp / Telefone:</label>
                <Input
                  placeholder="(11) 98888-7777"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-muted/30 border-hairline h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Barbeiro Preferido:</label>
                  <select
                    value={barber}
                    onChange={(e) => setBarber(e.target.value)}
                    className="w-full bg-muted/30 border border-hairline rounded-lg h-8 px-2 text-xs text-foreground cursor-pointer"
                  >
                    {barbers.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Serviço Desejado:</label>
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full bg-muted/30 border border-hairline rounded-lg h-8 px-2 text-xs text-foreground cursor-pointer"
                  >
                    {services.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Prioridade:</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-muted/30 border border-hairline rounded-lg h-8 px-2 text-xs text-foreground cursor-pointer"
                >
                  <option value="NORMAL">Normal (Ordem de chegada)</option>
                  <option value="VIP">Cliente VIP / Assinante</option>
                  <option value="ENCAIXE_URGENTE">Urgente / Presente no lounge</option>
                </select>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Observações / Janela de Horário:</label>
                <Input
                  placeholder="Ex: Pode aguardar até 15:30 ou ser atendido por outro"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-muted/30 border-hairline h-8 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="h-8 text-xs">
                  Cancelar
                </Button>
                <Button type="submit" className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
                  Salvar na Fila
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
