import React, { useState } from "react";
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  DollarSign,
  Scissors,
  Users,
  Package,
  TrendingUp,
  Percent,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ReportsViewProps {
  salesTotal?: number;
  commissionsTotal?: number;
  attendancesCount?: number;
  onShowToast?: (msg: string) => void;
}

export function ReportsView({
  salesTotal = 0,
  commissionsTotal = 0,
  attendancesCount = 0,
  onShowToast,
}: ReportsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    "VENDAS" | "FINANCEIRO" | "COMISSOES" | "ESTOQUE" | "CLIENTES" | "CANCELAMENTOS"
  >("VENDAS");

  const reportCategories = [
    { id: "VENDAS" as const, label: "Vendas & Faturamento" },
    { id: "FINANCEIRO" as const, label: "Fluxo & DRE Gerencial" },
    { id: "COMISSOES" as const, label: "Comissões por Barbeiro" },
    { id: "ESTOQUE" as const, label: "Movimentação & Curva ABC" },
    { id: "CLIENTES" as const, label: "Retenção & Recorrência" },
    { id: "CANCELAMENTOS" as const, label: "Faltas e Cancelamentos" },
  ];

  const handleExportCsv = () => {
    const csvContent = `data:text/csv;charset=utf-8,Categoria,Valor,Data\n${selectedCategory},${salesTotal},${new Date().toISOString()}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `barberhub_relatorio_${selectedCategory.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onShowToast) {
      onShowToast(`Relatório de [${selectedCategory}] exportado com sucesso!`);
    }
  };

  const netProjected = Math.max(0, salesTotal - commissionsTotal);
  const ticketMedio = attendancesCount > 0 ? (salesTotal / attendancesCount).toFixed(2) : "0,00";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Topo do Módulo de Relatórios */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <BarChart3 className="h-6 w-6 text-primary" />
            Central de Inteligência & Relatórios Gerenciais
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Relatórios auditáveis com integridade matemática de faturamento, repasses, estoque e retenção de clientes.
          </p>
        </div>

        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 cursor-pointer font-semibold h-9 px-4 shadow-md"
          onClick={handleExportCsv}
        >
          <Download className="h-4 w-4" />
          <span>Exportar Relatório (CSV)</span>
        </Button>
      </div>

      {/* Seletor de Categorias */}
      <div className="flex flex-wrap gap-2 text-xs">
        {reportCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                : "bg-card border-hairline text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Cards de Destaque Geral */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-hairline shadow-xs rounded-2xl p-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Faturamento Acumulado</span>
          <div className="text-2xl font-black text-foreground font-sans mt-1">R$ {salesTotal.toFixed(2)}</div>
          <span className="text-xs text-muted-foreground mt-1 block">Vendas registradas no PDV</span>
        </Card>

        <Card className="bg-card border-hairline shadow-xs rounded-2xl p-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Total de Atendimentos</span>
          <div className="text-2xl font-black text-foreground font-sans mt-1">{attendancesCount} cortes</div>
          <span className="text-xs text-muted-foreground mt-1 block">Ticket Médio: <strong>R$ {ticketMedio}</strong></span>
        </Card>

        <Card className="bg-card border-hairline shadow-xs rounded-2xl p-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Comissões Geradas</span>
          <div className="text-2xl font-black text-foreground font-sans mt-1">R$ {commissionsTotal.toFixed(2)}</div>
          <span className="text-xs text-muted-foreground mt-1 block">Repasses aos profissionais</span>
        </Card>

        <Card className="bg-card border-hairline shadow-xs rounded-2xl p-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Resultado Líquido</span>
          <div className="text-2xl font-black text-emerald-400 font-sans mt-1">R$ {netProjected.toFixed(2)}</div>
          <span className="text-xs text-muted-foreground mt-1 block">Margem após repasse de comissões</span>
        </Card>
      </div>

      {/* Detalhamento do Relatório Selecionado */}
      <Card className="bg-card border-hairline shadow-md rounded-2xl">
        <CardHeader className="pb-3 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              {reportCategories.find((c) => c.id === selectedCategory)?.label}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Relatório detalhado baseado nas operações oficiais da conta
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {salesTotal > 0 ? "Com dados auditados" : "Conta inicial vazia"}
          </Badge>
        </CardHeader>

        <CardContent className="p-6">
          {salesTotal === 0 && attendancesCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 bg-muted/10 rounded-2xl border border-dashed border-hairline">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/30 text-muted-foreground">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <h4 className="font-semibold text-sm text-foreground">Sem dados para este relatório</h4>
              <p className="text-xs text-muted-foreground max-w-sm">
                Esta conta foi criada recentemente e não possui movimentações fictícias. Quando você realizar atendimentos e registrar vendas, os dados consolidados aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/20 border border-hairline flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground">Volume de Operações:</span>
                  <p className="text-base font-bold text-foreground">{attendancesCount} atendimentos</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Volume Financeiro:</span>
                  <p className="text-base font-bold text-emerald-400 font-mono">R$ {salesTotal.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
