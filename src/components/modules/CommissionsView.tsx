import React, { useState, useMemo } from "react";
import {
  Percent,
  DollarSign,
  User,
  CheckCircle,
  Clock,
  Ban,
  Filter,
  Download,
  Search,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import type { EmployeeItem } from "@/routes/index";

export interface CommissionEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  saleCode: string;
  customerName: string;
  itemDescription: string;
  itemType: "SERVICE" | "PRODUCT";
  itemPrice: number;
  ratePercent: number;
  amount: number;
  status: "PENDING" | "PAID" | "CANCELED";
  createdAt: string;
  paidAt?: string | null;
}

interface CommissionsViewProps {
  employees: EmployeeItem[];
  onShowToast: (msg: string) => void;
}

export function CommissionsView({ employees, onShowToast }: CommissionsViewProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const [commissions, setCommissions] = useState<CommissionEntry[]>([]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return commissions.filter((c) => {
      const matchEmp = selectedEmployee === "ALL" || c.employeeId === selectedEmployee;
      const matchStat = selectedStatus === "ALL" || c.status === selectedStatus;
      const matchQ =
        !q ||
        c.employeeName.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.saleCode.toLowerCase().includes(q) ||
        c.itemDescription.toLowerCase().includes(q);
      return matchEmp && matchStat && matchQ;
    });
  }, [commissions, selectedEmployee, selectedStatus, search]);

  const totalGenerated = useMemo(() => commissions.reduce((s, c) => s + c.amount, 0), [commissions]);
  const totalPending = useMemo(
    () => commissions.filter((c) => c.status === "PENDING").reduce((s, c) => s + c.amount, 0),
    [commissions]
  );
  const totalPaid = useMemo(
    () => commissions.filter((c) => c.status === "PAID").reduce((s, c) => s + c.amount, 0),
    [commissions]
  );

  const handlePay = (id: string) => {
    setCommissions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "PAID", paidAt: "Hoje às " + new Date().toLocaleTimeString().slice(0, 5) } : c))
    );
    onShowToast("Comissão liquidada com sucesso.");
  };

  const handleCancel = (id: string) => {
    setCommissions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "CANCELED" } : c))
    );
    onShowToast("Comissão estornada.");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Percent className="h-6 w-6 text-primary" />
            Extrato & Liquidação de Comissões
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Controle transparente de repasses por serviços e vendas de produtos com cálculo auditável e estornos automáticos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 border-hairline text-xs font-semibold cursor-pointer"
            onClick={() => onShowToast("Relatório de comissões exportado em CSV/PDF.")}
          >
            <Download className="h-4 w-4" />
            <span>Exportar Espelho</span>
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-hairline bg-card shadow-xs rounded-2xl p-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Total Gerado no Período
          </span>
          <span className="text-2xl font-bold text-foreground font-mono mt-1 block">
            R$ {totalGenerated.toFixed(2)}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            {commissions.length} lançamentos de comissão
          </span>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5 shadow-xs rounded-2xl p-4">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
            Pendente de Repasse
          </span>
          <span className="text-2xl font-bold text-amber-300 font-mono mt-1 block">
            R$ {totalPending.toFixed(2)}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Aguardando fechamento da folha ou Pix semanal
          </span>
        </Card>

        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-xs rounded-2xl p-4">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
            Total Já Liquidado
          </span>
          <span className="text-2xl font-bold text-emerald-400 font-mono mt-1 block">
            R$ {totalPaid.toFixed(2)}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Repasses efetuados e comprovados
          </span>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-hairline shadow-xs">
        <div className="w-full sm:w-72">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar por colaborador, cliente ou venda..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Profissional:</span>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="bg-muted/40 border border-hairline text-foreground rounded-lg px-2.5 py-1 text-xs cursor-pointer focus:outline-hidden"
            >
              <option value="ALL">Todos os Barbeiros</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-muted/40 border border-hairline text-foreground rounded-lg px-2.5 py-1 text-xs cursor-pointer focus:outline-hidden"
            >
              <option value="ALL">Todos os Status</option>
              <option value="PENDING">Pendentes</option>
              <option value="PAID">Liquidadas / Pagas</option>
              <option value="CANCELED">Canceladas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Comissões */}
      <Card className="border-hairline bg-card rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/30 border-b border-hairline text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-4">Item & Venda</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4 text-right">Valor Item</th>
                <th className="py-3 px-4 text-center">Taxa</th>
                <th className="py-3 px-4 text-right">Comissão</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    Nenhum registro de comissão localizado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-bold text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-[10px]">
                          {item.employeeName.charAt(0)}
                        </div>
                        <span>{item.employeeName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-foreground block">{item.itemDescription}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{item.saleCode}</span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{item.customerName}</td>
                    <td className="py-3 px-4 text-right font-mono text-foreground">
                      R$ {item.itemPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-primary">
                      {item.ratePercent}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      R$ {item.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-bold ${
                          item.status === "PAID"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : item.status === "PENDING"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                            : "border-destructive/30 bg-destructive/10 text-destructive"
                        }`}
                      >
                        {item.status === "PAID" ? "PAGA" : item.status === "PENDING" ? "PENDENTE" : "ESTORNADA"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.status === "PENDING" && (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => handlePay(item.id)}
                            className="h-7 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer px-2.5"
                          >
                            Pagar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancel(item.id)}
                            className="h-7 text-[10px] text-destructive hover:bg-destructive/10 cursor-pointer px-2"
                          >
                            Estornar
                          </Button>
                        </div>
                      )}
                      {item.status === "PAID" && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {item.paidAt || "Liquidada"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
