import React, { useState } from "react";
import {
  Pipette,
  Scissors,
  Plus,
  AlertTriangle,
  Package,
  Layers,
  Sparkles,
  RefreshCw,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import type { ServiceItem } from "@/routes/index";

export interface SupplyItem {
  id: string;
  name: string;
  category: string;
  unit: string; // "un", "ml", "g", "cx"
  stock: number;
  minStock: number;
  costPerUnit: number;
  isLow: boolean;
}

export interface ServiceConsumable {
  serviceId: string;
  serviceName: string;
  items: Array<{ supplyId: string; supplyName: string; quantity: number; unit: string; cost: number }>;
  totalConsumableCost: number;
}

interface SuppliesViewProps {
  services: ServiceItem[];
  onShowToast: (msg: string) => void;
}

export function SuppliesView({ services, onShowToast }: SuppliesViewProps) {
  const [activeTab, setActiveTab] = useState<"INSUMOS" | "FICHAS">("INSUMOS");
  const [search, setSearch] = useState("");

  const [supplies, setSupplies] = useState<SupplyItem[]>([
    { id: "sup-1", name: "Lâminas Descartáveis Feather (Caixa c/ 100)", category: "Higiene / Corte", unit: "un", stock: 240, minStock: 50, costPerUnit: 0.35, isLow: false },
    { id: "sup-2", name: "Golas Higiênicas Descartáveis (Rolo)", category: "Higiene", unit: "un", stock: 85, minStock: 30, costPerUnit: 0.20, isLow: false },
    { id: "sup-3", name: "Óleo Essencial Pré-Barba 500ml", category: "Barboterapia", unit: "ml", stock: 120, minStock: 150, costPerUnit: 0.12, isLow: true },
    { id: "sup-4", name: "Toalhas Descartáveis Térmicas 30x40", category: "Barboterapia", unit: "un", stock: 45, minStock: 60, costPerUnit: 0.80, isLow: true },
    { id: "sup-5", name: "Talco Antisséptico Barba 200g", category: "Finalização", unit: "g", stock: 350, minStock: 100, costPerUnit: 0.05, isLow: false },
  ]);

  const [fichas, setFichas] = useState<ServiceConsumable[]>([
    {
      serviceId: "srv-2",
      serviceName: "Barboterapia com Toalha Quente",
      items: [
        { supplyId: "sup-1", supplyName: "Lâmina Descartável", quantity: 1, unit: "un", cost: 0.35 },
        { supplyId: "sup-3", supplyName: "Óleo Essencial Pré-Barba", quantity: 5, unit: "ml", cost: 0.60 },
        { supplyId: "sup-4", supplyName: "Toalha Térmica", quantity: 1, unit: "un", cost: 0.80 },
      ],
      totalConsumableCost: 1.75,
    },
    {
      serviceId: "srv-1",
      serviceName: "Corte Degradê / Fade Pro",
      items: [
        { supplyId: "sup-1", supplyName: "Lâmina Acabamento", quantity: 1, unit: "un", cost: 0.35 },
        { supplyId: "sup-2", supplyName: "Gola Higiênica", quantity: 1, unit: "un", cost: 0.20 },
      ],
      totalConsumableCost: 0.55,
    },
  ]);

  const adjustStock = (id: string, delta: number) => {
    setSupplies((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const newStock = Math.max(0, s.stock + delta);
        return { ...s, stock: newStock, isLow: newStock <= s.minStock };
      })
    );
    onShowToast("Estoque do insumo ajustado.");
  };

  const filtered = supplies.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Pipette className="h-6 w-6 text-primary" />
            Insumos de Consumo & Ficha Técnica
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Materiais de bancada consumidos durante os serviços (lâminas, óleos, toalhas) com baixa automática na finalização.
          </p>
        </div>

        {/* Abas */}
        <div className="flex items-center rounded-xl bg-card border border-hairline p-1 text-xs">
          <button
            onClick={() => setActiveTab("INSUMOS")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === "INSUMOS" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground"
            }`}
          >
            Insumos de Bancada ({supplies.length})
          </button>
          <button
            onClick={() => setActiveTab("FICHAS")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === "FICHAS" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground"
            }`}
          >
            Ficha Técnica por Serviço ({fichas.length})
          </button>
        </div>
      </div>

      {activeTab === "INSUMOS" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-hairline shadow-xs">
            <div className="w-full sm:w-72">
              <SearchInput value={search} onValueChange={setSearch} placeholder="Buscar insumo..." />
            </div>
            <Button
              size="sm"
              onClick={() => onShowToast("Cadastrar novo insumo...")}
              className="h-9 gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-4 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Insumo</span>
            </Button>
          </div>

          <Card className="border-hairline bg-card rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/30 border-b border-hairline text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Insumo</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4 text-center">Unidade</th>
                    <th className="py-3 px-4 text-right">Custo / Un</th>
                    <th className="py-3 px-4 text-center">Estoque Atual</th>
                    <th className="py-3 px-4 text-center">Mínimo</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ajuste Rápido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-bold text-foreground">{s.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{s.category}</td>
                      <td className="py-3 px-4 text-center font-mono text-muted-foreground">{s.unit}</td>
                      <td className="py-3 px-4 text-right font-mono text-foreground">
                        R$ {s.costPerUnit.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-foreground">
                        {s.stock} {s.unit}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-muted-foreground">{s.minStock}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-bold ${
                            s.isLow
                              ? "border-destructive/40 bg-destructive/10 text-destructive animate-pulse"
                              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          {s.isLow ? "CRÍTICO" : "NORMAL"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => adjustStock(s.id, -1)}
                            className="h-6 w-6 rounded border border-hairline bg-muted/30 text-muted-foreground hover:text-foreground flex items-center justify-center font-bold text-xs cursor-pointer"
                            title="Baixar 1"
                          >
                            -
                          </button>
                          <button
                            onClick={() => adjustStock(s.id, 10)}
                            className="h-6 px-1.5 rounded border border-hairline bg-muted/30 text-muted-foreground hover:text-foreground flex items-center justify-center font-semibold text-[10px] cursor-pointer"
                            title="Entrada de 10"
                          >
                            +10
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "FICHAS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fichas.map((f) => (
            <Card key={f.serviceId} className="border-hairline bg-card shadow-xs rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-start border-b border-hairline pb-2.5">
                <div>
                  <h4 className="text-sm font-bold text-foreground">{f.serviceName}</h4>
                  <span className="text-[10px] text-muted-foreground">Insumos deduzidos ao finalizar o corte</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block">Custo de Insumos</span>
                  <span className="text-sm font-bold font-mono text-primary">R$ {f.totalConsumableCost.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                {f.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-hairline/40 text-muted-foreground">
                    <span>
                      {item.quantity} {item.unit} • {item.supplyName}
                    </span>
                    <span className="font-mono text-foreground font-semibold">R$ {item.cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
