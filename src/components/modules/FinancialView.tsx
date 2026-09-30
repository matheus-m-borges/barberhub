import React, { useState } from "react";
import {
  TrendingUp,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  Calendar,
  Plus,
  CheckCircle,
  Clock,
  Filter,
  PieChart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface FinancialViewProps {
  salesTotal: number;
  commissionsTotal: number;
  initialSubTab?: "DRE" | "PAYABLES" | "RECEIVABLES";
}

export function FinancialView({ salesTotal, commissionsTotal, initialSubTab = "DRE" }: FinancialViewProps) {
  const [subTab, setSubTab] = useState<"DRE" | "PAYABLES" | "RECEIVABLES">(initialSubTab);

  // Contas a Pagar
  const [payables, setPayables] = useState<Array<{ id: string; description: string; category: string; value: number; due: string; status: string }>>([]);

  // Contas a Receber
  const [receivables, setReceivables] = useState<Array<{ id: string; description: string; customer: string; value: number; due: string; status: string }>>([]);

  // Cálculos do DRE (derivados das vendas reais registradas no PDV)
  const grossServices = Number((salesTotal * 0.7).toFixed(2));
  const grossProducts = Number((salesTotal * 0.3).toFixed(2));
  const grossRevenue = salesTotal;
  const taxes = Number((grossRevenue * 0.06).toFixed(2));
  const netRevenue = grossRevenue - taxes;
  const cmv = Number((grossProducts * 0.35).toFixed(2));
  const barberCommissions = commissionsTotal;
  const grossProfit = Math.max(0, netRevenue - cmv - barberCommissions);
  const fixedExpenses = 0.0;
  const variableExpenses = 0.0;
  const operatingProfit = grossProfit - fixedExpenses - variableExpenses;

  const togglePayableStatus = (id: string) => {
    setPayables((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: p.status === "PENDENTE" ? "PAGO" : "PENDENTE" } : p
      )
    );
  };

  const toggleReceivableStatus = (id: string) => {
    setReceivables((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: r.status === "PENDENTE" ? "RECEBIDO" : "PENDENTE" } : r
      )
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <TrendingUp className="h-6 w-6 text-primary" />
            Gestão Financeira & DRE Gerencial
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Demonstrativo de resultado do exercício, fluxo de caixa, contas a pagar e a receber.
          </p>
        </div>

        {/* Sub-abas do Financeiro */}
        <div className="flex items-center rounded-full bg-muted/40 p-1 border border-hairline text-xs">
          <button
            onClick={() => setSubTab("DRE")}
            className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
              subTab === "DRE" ? "bg-primary text-primary-foreground font-semibold shadow-xs" : "text-muted-foreground"
            }`}
          >
            DRE Gerencial
          </button>
          <button
            onClick={() => setSubTab("PAYABLES")}
            className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
              subTab === "PAYABLES" ? "bg-primary text-primary-foreground font-semibold shadow-xs" : "text-muted-foreground"
            }`}
          >
            Contas a Pagar
          </button>
          <button
            onClick={() => setSubTab("RECEIVABLES")}
            className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
              subTab === "RECEIVABLES" ? "bg-primary text-primary-foreground font-semibold shadow-xs" : "text-muted-foreground"
            }`}
          >
            Contas a Receber
          </button>
        </div>
      </div>

      {/* Visão DRE */}
      {subTab === "DRE" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Card className="lg:col-span-8 bg-card border-hairline shadow-md rounded-2xl">
            <CardHeader className="pb-3 border-b border-hairline">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Demonstrativo de Resultado do Mês (DRE)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Estrutura contábil gerencial com detalhamento de receitas, custos operacionais e margem líquida.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-3 text-xs">
              {/* (+) Receita Bruta */}
              <div className="flex justify-between items-center py-1.5 font-bold text-sm text-foreground">
                <span>(+) RECEITA OPERACIONAL BRUTA</span>
                <span className="font-mono text-emerald-400">R$ {grossRevenue.toFixed(2)}</span>
              </div>
              <div className="pl-4 space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Receitas de Serviços de Barbearia:</span>
                  <span className="font-mono">R$ {grossServices.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Receitas de Venda de Produtos no PDV:</span>
                  <span className="font-mono">R$ {grossProducts.toFixed(2)}</span>
                </div>
              </div>

              {/* (-) Impostos */}
              <div className="flex justify-between items-center py-1.5 text-muted-foreground border-t border-hairline/60">
                <span>(-) Deduções de Receita e Impostos (Simples 6%):</span>
                <span className="font-mono text-red-400">- R$ {taxes.toFixed(2)}</span>
              </div>

              {/* (=) Receita Líquida */}
              <div className="flex justify-between items-center py-1.5 font-bold text-foreground bg-muted/20 px-3 rounded-lg">
                <span>(=) RECEITA OPERACIONAL LÍQUIDA</span>
                <span className="font-mono">R$ {netRevenue.toFixed(2)}</span>
              </div>

              {/* (-) Custos Diretos */}
              <div className="flex justify-between items-center py-1.5 text-muted-foreground">
                <span>(-) Custo de Mercadorias Vendidas (CMV):</span>
                <span className="font-mono text-red-400">- R$ {cmv.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 text-muted-foreground">
                <span>(-) Repasses e Comissões de Barbeiros:</span>
                <span className="font-mono text-red-400">- R$ {barberCommissions.toFixed(2)}</span>
              </div>

              {/* (=) Lucro Bruto */}
              <div className="flex justify-between items-center py-1.5 font-bold text-foreground bg-muted/20 px-3 rounded-lg">
                <span>(=) LUCRO BRUTO OPERACIONAL</span>
                <span className="font-mono text-[#a78bfa]">R$ {grossProfit.toFixed(2)}</span>
              </div>

              {/* (-) Despesas Operacionais */}
              <div className="flex justify-between items-center py-1.5 text-muted-foreground">
                <span>(-) Despesas Administrativas e Ocupação (Aluguel, Água, Luz):</span>
                <span className="font-mono text-red-400">- R$ {fixedExpenses.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 text-muted-foreground">
                <span>(-) Despesas Comerciais e Insumos Descartáveis:</span>
                <span className="font-mono text-red-400">- R$ {variableExpenses.toFixed(2)}</span>
              </div>

              {/* (=) Lucro Líquido Final */}
              <div className="flex justify-between items-center py-3 font-black text-base text-foreground bg-primary/10 border border-primary/30 px-4 rounded-xl mt-4">
                <span className="text-primary font-bold">(=) LUCRO LÍQUIDO FINAL DO EXERCÍCIO</span>
                <span className="font-mono text-xl text-emerald-400">R$ {operatingProfit.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Cards de Métricas e Margem */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="bg-card border-hairline shadow-md rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground">Margem de Lucro Líquida</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-3xl font-black text-emerald-400 font-sans">
                  {((operatingProfit / grossRevenue) * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Excelente rentabilidade. O padrão de mercado para barbearias de alto padrão varia entre 25% e 35%.
                </p>
                <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "38%" }} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-hairline shadow-md rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground">Comissões da Equipe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Total Repassado:</span>
                  <span className="font-bold text-foreground font-mono">R$ {barberCommissions.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Impacto sobre o Faturamento:</span>
                  <span className="font-bold text-primary font-mono">
                    {((barberCommissions / grossRevenue) * 100).toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Contas a Pagar */}
      {subTab === "PAYABLES" && (
        <Card className="bg-card border-hairline shadow-md rounded-2xl">
          <CardHeader className="pb-3 border-b border-hairline">
            <CardTitle className="text-base font-bold text-foreground">Contas a Pagar</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Despesas com fornecedores, aluguel, energia e insumos operacionais.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-hairline text-xs">
              {payables.map((item) => (
                <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20">
                  <div>
                    <span className="font-bold text-sm text-foreground block">{item.description}</span>
                    <span className="text-[11px] text-muted-foreground">
                      Categoria: {item.category} • Vencimento: {item.due}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-sm text-foreground">
                      R$ {item.value.toFixed(2)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => togglePayableStatus(item.id)}
                      className={`h-7 px-3 text-xs font-bold ${
                        item.status === "PAGO"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "border-hairline text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {item.status === "PAGO" ? "Pago ✓" : "Marcar como Pago"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contas a Receber */}
      {subTab === "RECEIVABLES" && (
        <Card className="bg-card border-hairline shadow-md rounded-2xl">
          <CardHeader className="pb-3 border-b border-hairline">
            <CardTitle className="text-base font-bold text-foreground">Contas a Receber</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Mensalidades de planos de assinatura e vendas parceladas.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-hairline text-xs">
              {receivables.map((item) => (
                <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20">
                  <div>
                    <span className="font-bold text-sm text-foreground block">{item.description}</span>
                    <span className="text-[11px] text-muted-foreground">
                      Cliente: {item.customer} • Vencimento: {item.due}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-sm text-emerald-400">
                      R$ {item.value.toFixed(2)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleReceivableStatus(item.id)}
                      className={`h-7 px-3 text-xs font-bold ${
                        item.status === "RECEBIDO"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "border-hairline text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {item.status === "RECEBIDO" ? "Recebido ✓" : "Registrar Recebimento"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
