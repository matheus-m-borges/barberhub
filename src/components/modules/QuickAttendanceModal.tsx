import React, { useState } from "react";
import { Scissors, User, UserCheck, Clock, CheckCircle, Receipt, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CustomerItem, EmployeeItem, ServiceItem } from "@/routes/index";

interface QuickAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: CustomerItem[];
  employees: EmployeeItem[];
  services: ServiceItem[];
  onStartAttendance: (data: {
    customerName: string;
    customerPhone: string;
    barberName: string;
    serviceName?: string;
    servicePrice?: number;
    serviceId?: string;
    isOpenComanda?: boolean;
  }) => void;
}

export function QuickAttendanceModal({
  isOpen,
  onClose,
  customers,
  employees,
  services,
  onStartAttendance,
}: QuickAttendanceModalProps) {
  if (!isOpen) return null;

  const [customerType, setCustomerType] = useState<"EXISTING" | "WALKIN">("WALKIN");
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || "");
  const [walkinName, setWalkinName] = useState("");
  const [walkinPhone, setWalkinPhone] = useState("");
  const [selectedBarber, setSelectedBarber] = useState(
    employees.find((e) => e.role === "BARBEIRO" && e.status === "ACTIVE")?.name || "Gabriel Silva"
  );
  // Modo de atendimento: Em Aberto por padrão (ideal para pequenas barbearias sem pré-atendimento)
  const [mode, setMode] = useState<"OPEN" | "SPECIFIC">("OPEN");
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || "");

  const barbers = employees.filter((e) => e.role === "BARBEIRO" && e.status === "ACTIVE");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let name = walkinName.trim();
    let phone = walkinPhone.trim();

    if (customerType === "EXISTING") {
      const found = customers.find((c) => c.id === selectedCustomerId);
      if (found) {
        name = found.name;
        phone = found.phone;
      }
    }

    if (!name) {
      name = "Cliente Balcão";
      phone = "(11) 90000-0000";
    }

    if (mode === "OPEN") {
      onStartAttendance({
        customerName: name,
        customerPhone: phone,
        barberName: selectedBarber,
        isOpenComanda: true,
      });
    } else {
      const srv = services.find((s) => s.id === selectedServiceId) || services[0];
      onStartAttendance({
        customerName: name,
        customerPhone: phone,
        barberName: selectedBarber,
        serviceName: srv ? srv.name : "Corte Degradê",
        servicePrice: srv ? srv.price : 45.0,
        serviceId: srv ? srv.id : "srv-1",
        isOpenComanda: false,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-card border border-hairline rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-base text-foreground">Novo Atendimento Rápido (Balcão)</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Tipo de Cliente */}
          <div className="flex rounded-lg bg-muted/40 p-1 border border-hairline">
            <button
              type="button"
              onClick={() => setCustomerType("WALKIN")}
              className={`flex-1 py-1.5 rounded-md font-medium text-xs cursor-pointer transition-all ${
                customerType === "WALKIN"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cliente Balcão / Avulso
            </button>
            <button
              type="button"
              onClick={() => setCustomerType("EXISTING")}
              className={`flex-1 py-1.5 rounded-md font-medium text-xs cursor-pointer transition-all ${
                customerType === "EXISTING"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cliente Já Cadastrado
            </button>
          </div>

          {customerType === "WALKIN" ? (
            <div className="space-y-2">
              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Nome do Cliente:</label>
                <Input
                  placeholder="Ex: João da Silva (ou deixe em branco para Balcão)"
                  value={walkinName}
                  onChange={(e) => setWalkinName(e.target.value)}
                  className="bg-muted/30 border-hairline h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Telefone / WhatsApp (Opcional):</label>
                <Input
                  placeholder="(11) 98888-0000"
                  value={walkinPhone}
                  onChange={(e) => setWalkinPhone(e.target.value)}
                  className="bg-muted/30 border-hairline h-8 text-xs"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-muted-foreground block mb-1 font-semibold">Selecione o Cliente:</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-muted/30 border border-hairline rounded-lg h-8 px-2 text-xs text-foreground cursor-pointer"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Barbeiro */}
          <div>
            <label className="text-muted-foreground block mb-1 font-semibold">Profissional / Cadeira:</label>
            <select
              value={selectedBarber}
              onChange={(e) => setSelectedBarber(e.target.value)}
              className="w-full bg-muted/30 border border-hairline rounded-lg h-8 px-2 text-xs text-foreground cursor-pointer"
            >
              {barbers.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name} ({b.role})
                </option>
              ))}
            </select>
          </div>

          {/* Modo de Lançamento: Em Aberto vs Serviço Pré-definido */}
          <div className="space-y-2 pt-1 border-t border-hairline">
            <div className="flex items-center justify-between">
              <label className="text-muted-foreground font-semibold">Modo da Comanda:</label>
              <span className="text-[10px] text-primary font-medium">Ideal para pequenas barbearias</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("OPEN")}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                  mode === "OPEN"
                    ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary/40 shadow-xs"
                    : "bg-muted/30 border-hairline text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                  <Receipt className="h-3.5 w-3.5 text-primary" />
                  <span>Em Aberto (Padrão)</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                  Lançar serviços e produtos no final no Caixa
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode("SPECIFIC")}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                  mode === "SPECIFIC"
                    ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary/40 shadow-xs"
                    : "bg-muted/30 border-hairline text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                  <Scissors className="h-3.5 w-3.5 text-primary" />
                  <span>Serviço Inicial</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                  Definir corte ou barba já na entrada
                </p>
              </button>
            </div>

            {mode === "OPEN" ? (
              <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 text-[11px] text-muted-foreground flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Sem pré-atendimento:</strong> O cliente vai direto para a cadeira. Ao encerrar o atendimento, basta abrir a comanda no Caixa e adicionar os serviços e produtos consumidos.
                </div>
              </div>
            ) : (
              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Selecione o Serviço Inicial:</label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full bg-muted/30 border border-hairline rounded-lg h-8 px-2 text-xs text-foreground cursor-pointer"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — R$ {s.price.toFixed(2)} ({s.duration})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button type="button" variant="outline" onClick={onClose} className="h-8 text-xs cursor-pointer">
              Cancelar
            </Button>
            <Button type="submit" className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer">
              {mode === "OPEN" ? "Iniciar Atendimento (Comanda em Aberto)" : "Iniciar Atendimento & Abrir Comanda"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
