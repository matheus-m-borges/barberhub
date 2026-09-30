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
  ArrowDownRight,
  Clock,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ReportsView() {
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
          onClick={() => alert(`Relatório de [${selectedCategory}] exportado com sucesso em formato CSV!`)}
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
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Faturamento do Mês</span>
          <div className="text-2xl font-black text-foreground font-sans mt-1">R$ 38.450,00</div>
          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-1">
            <ArrowUpRight className="h-3.5 w-3.5" /> +14.2% em relação a agosto
          </span>
        </Card>

        <Card className="bg-card border-hairline shadow-xs rounded-2xl p-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Total de Atendimentos</span>
          <div className="text-2xl font-black text-foreground font-sans mt-1">682 cortes</div>
          <span className="text-xs text-muted-foreground mt-1 block">Ticket Médio: <strong>R$ 56,38</strong></span>
        </Card>

        <Card className="bg-card border-hairline shadow-xs rounded-2xl p-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Taxa de Comparecimento</span>
          <div className="text-2xl font-black text-foreground font-sans mt-1">96.8%</div>
          <span className="text-xs text-emerald-400 font-semibold block mt-1">Apenas 3.2% de faltas (No-Show)</span>
        </Card>

        <Card className="bg-card border-hairline shadow-xs rounded-2xl p-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Lucro Líquido Projetado</span>
          <div className="text-2xl font-black text-emerald-400 font-sans mt-1">R$ 14.730,00</div>
          <span className="text-xs text-muted-foreground mt-1 block">Margem Líquida: <strong>38.3%</strong></span>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 1. RELATÓRIO DE VENDAS & FATURAMENTO                                     */}
      {/* ========================================================================= */}
      {selectedCategory === "VENDAS" && (
        <Card className="bg-card border-hairline shadow-md rounded-2xl">
          <CardHeader className="pb-3 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-foreground">Extrato Consolidado de Vendas (PDV & Serviços)</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Demonstração de faturamento por serviço, produto e método de pagamento.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs">
              482 Vendas Concluídas
            </Badge>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-muted/20 rounded-xl border border-hairline">
                <span className="text-[11px] text-muted-foreground block">Vendas em PIX</span>
                <strong className="text-base font-bold text-foreground">R$ 21.150,00</strong>
                <span className="text-[10px] text-muted-foreground block font-mono">55.0% do volume</span>
              </div>
              <div className="p-3 bg-muted/20 rounded-xl border border-hairline">
                <span className="text-[11px] text-muted-foreground block">Cartão de Crédito</span>
                <strong className="text-base font-bold text-foreground">R$ 10.380,00</strong>
                <span className="text-[10px] text-muted-foreground block font-mono">27.0% do volume</span>
              </div>
              <div className="p-3 bg-muted/20 rounded-xl border border-hairline">
                <span className="text-[11px] text-muted-foreground block">Cartão de Débito</span>
                <strong className="text-base font-bold text-foreground">R$ 4.610,00</strong>
                <span className="text-[10px] text-muted-foreground block font-mono">12.0% do volume</span>
              </div>
              <div className="p-3 bg-muted/20 rounded-xl border border-hairline">
                <span className="text-[11px] text-muted-foreground block">Dinheiro em Espécie</span>
                <strong className="text-base font-bold text-foreground">R$ 2.310,00</strong>
                <span className="text-[10px] text-muted-foreground block font-mono">6.0% do volume</span>
              </div>
            </div>

            {/* Tabela de Vendas Recentes */}
            <div className="overflow-x-auto border border-hairline rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-muted/30 border-b border-hairline text-muted-foreground">
                    <th className="p-3 font-semibold">Comanda / Código</th>
                    <th className="p-3 font-semibold">Data / Hora</th>
                    <th className="p-3 font-semibold">Cliente</th>
                    <th className="p-3 font-semibold">Profissional</th>
                    <th className="p-3 font-semibold">Forma de Pagto</th>
                    <th className="p-3 font-semibold text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {[
                    { code: "#BH-91024", time: "Hoje às 10:14", client: "Carlos Eduardo Santos", barber: "Gabriel Silva", method: "PIX", val: 95.0 },
                    { code: "#BH-91023", time: "Hoje às 09:40", client: "Thiago Barbosa", barber: "Lucas Ferreira", method: "CARTÃO CRÉDITO", val: 50.0 },
                    { code: "#BH-91022", time: "Hoje às 09:12", client: "Marcelo Dantas", barber: "Gabriel Silva", method: "DIVIDIDO (PIX + DINHEIRO)", val: 120.0 },
                    { code: "#BH-91021", time: "Hoje às 08:35", client: "Rafael Bittencourt", barber: "Gabriel Silva", method: "PIX", val: 65.0 },
                    { code: "#BH-91020", time: "Ontem às 19:20", client: "Guilherme Siqueira", barber: "Lucas Ferreira", method: "DINHEIRO", val: 45.0 },
                  ].map((v) => (
                    <tr key={v.code} className="hover:bg-muted/15 transition-colors">
                      <td className="p-3 font-bold text-primary font-mono">{v.code}</td>
                      <td className="p-3 font-mono text-muted-foreground">{v.time}</td>
                      <td className="p-3 font-semibold text-foreground">{v.client}</td>
                      <td className="p-3 text-muted-foreground">{v.barber}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="border-hairline text-[10px] font-mono">
                          {v.method}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        R$ {v.val.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 2. RELATÓRIO FINANCEIRO & DRE                                            */}
      {/* ========================================================================= */}
      {selectedCategory === "FINANCEIRO" && (
        <Card className="bg-card border-hairline shadow-md rounded-2xl">
          <CardHeader className="pb-3 border-b border-hairline">
            <CardTitle className="text-base font-bold text-foreground">DRE — Demonstração do Resultado do Exercício</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Apuração contábil e gerencial do mês de Setembro/2026.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3 text-xs">
            <div className="space-y-2 max-w-2xl border border-hairline rounded-xl p-4 bg-muted/10 font-mono">
              <div className="flex justify-between font-bold text-foreground text-sm border-b border-hairline/60 pb-2">
                <span>(+) RECEITA BRUTA OPERACIONAL</span>
                <span className="text-primary">R$ 38.450,00</span>
              </div>
              <div className="flex justify-between pl-4 text-muted-foreground">
                <span>• Serviços Prestados (Corte, Barba, Combos)</span>
                <span>R$ 28.400,00</span>
              </div>
              <div className="flex justify-between pl-4 text-muted-foreground">
                <span>• Revenda de Produtos (Pomadas, Óleos)</span>
                <span>R$ 10.050,00</span>
              </div>

              <div className="flex justify-between font-semibold text-rose-400 pt-2 border-t border-hairline/40">
                <span>(-) Impostos e Deduções (Simples Nacional ~6%)</span>
                <span>- R$ 2.307,00</span>
              </div>

              <div className="flex justify-between font-bold text-foreground border-t border-hairline/60 pt-2">
                <span>(=) RECEITA OPERACIONAL LÍQUIDA</span>
                <span>R$ 36.143,00</span>
              </div>

              <div className="flex justify-between text-rose-400 pl-4">
                <span>(-) CMV (Custo dos Produtos Vendidos)</span>
                <span>- R$ 3.800,00</span>
              </div>
              <div className="flex justify-between text-rose-400 pl-4">
                <span>(-) Comissões dos Barbeiros</span>
                <span>- R$ 14.200,00</span>
              </div>

              <div className="flex justify-between font-bold text-foreground border-t border-hairline/60 pt-2">
                <span>(=) MARGEM DE CONTRIBUIÇÃO BRUTA</span>
                <span>R$ 18.143,00 (50.2%)</span>
              </div>

              <div className="flex justify-between text-rose-400 pl-4">
                <span>(-) Despesas Fixas (Aluguel, Luz, Internet, Software)</span>
                <span>- R$ 4.500,00</span>
              </div>

              <div className="flex justify-between font-black text-emerald-400 text-base border-t-2 border-hairline pt-3 mt-2">
                <span>(=) RESULTADO LÍQUIDO DO MÊS (LUCRO)</span>
                <span>R$ 13.643,00</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 3. RELATÓRIO DE COMISSÕES POR BARBEIRO                                    */}
      {/* ========================================================================= */}
      {selectedCategory === "COMISSOES" && (
        <Card className="bg-card border-hairline shadow-md rounded-2xl">
          <CardHeader className="pb-3 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-foreground">Repasses & Comissões por Profissional</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Apuração individual do faturamento gerado e valor líquido a repassar.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => alert("Relatório de comissões exportado!")} className="h-8 text-xs font-bold bg-primary text-primary-foreground">
              Liquidar com Comprovante
            </Button>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="overflow-x-auto border border-hairline rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-muted/30 border-b border-hairline text-muted-foreground">
                    <th className="p-3 font-semibold">Profissional</th>
                    <th className="p-3 font-semibold">Cargo</th>
                    <th className="p-3 font-semibold">Atendimentos</th>
                    <th className="p-3 font-semibold">Faturamento Bruto</th>
                    <th className="p-3 font-semibold">Taxa Média</th>
                    <th className="p-3 font-semibold text-right">Comissão Devida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {[
                    { name: "Gabriel Silva", role: "BARBEIRO SÊNIOR", count: 245, revenue: 14200.0, rate: "50%", due: 7100.0 },
                    { name: "Lucas Ferreira", role: "BARBEIRO", count: 182, revenue: 9800.0, rate: "50%", due: 4900.0 },
                    { name: "Matheus Borges", role: "MASTER BARBER", count: 115, revenue: 8400.0, rate: "60%", due: 5040.0 },
                    { name: "Bianca Soares", role: "RECEPCIONISTA", count: 140, revenue: 6000.0, rate: "5%", due: 300.0 },
                  ].map((b) => (
                    <tr key={b.name} className="hover:bg-muted/15 transition-colors">
                      <td className="p-3 font-bold text-foreground">{b.name}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="border-hairline text-[10px]">
                          {b.role}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">{b.count} clientes</td>
                      <td className="p-3 font-mono font-bold text-foreground">R$ {b.revenue.toFixed(2)}</td>
                      <td className="p-3 font-mono text-primary font-semibold">{b.rate}</td>
                      <td className="p-3 text-right font-mono font-black text-emerald-400 text-sm">
                        R$ {b.due.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 4. MOVIMENTAÇÃO DE ESTOQUE & CURVA ABC                                   */}
      {/* ========================================================================= */}
      {selectedCategory === "ESTOQUE" && (
        <Card className="bg-card border-hairline shadow-md rounded-2xl">
          <CardHeader className="pb-3 border-b border-hairline">
            <CardTitle className="text-base font-bold text-foreground">Curva ABC de Produtos & Giro de Insumos</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Produtos mais vendidos no PDV e materiais consumidos nas bancadas.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="overflow-x-auto border border-hairline rounded-xl text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted/30 border-b border-hairline text-muted-foreground">
                    <th className="p-3 font-semibold">Produto / Insumo</th>
                    <th className="p-3 font-semibold">Classificação</th>
                    <th className="p-3 font-semibold">Estoque Físico</th>
                    <th className="p-3 font-semibold">Giro Mensal</th>
                    <th className="p-3 font-semibold">Custo Médio</th>
                    <th className="p-3 font-semibold text-right">Margem de Lucro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {[
                    { name: "Pomada Matte BarberHub 100g", abc: "Classe A (Alto Giro)", stock: 14, min: 5, sold: 68, cost: 18.0, sale: 50.0 },
                    { name: "Óleo para Barba Wood & Spice 30ml", abc: "Classe A", stock: 8, min: 4, sold: 42, cost: 14.0, sale: 40.0 },
                    { name: "Shampoo Anticaspa Tea Tree 250ml", abc: "Classe B", stock: 12, min: 3, sold: 26, cost: 16.0, sale: 38.0 },
                    { name: "Lâminas Descartáveis Feather (Insumo)", abc: "Insumo Bancada", stock: 240, min: 50, sold: 580, cost: 0.35, sale: 0.0 },
                    { name: "Balm Modelador Efeito Brilho 60g", abc: "Classe C", stock: 4, min: 5, sold: 9, cost: 15.0, sale: 35.0 },
                  ].map((p) => {
                    const isLow = p.stock <= p.min;
                    const margin = p.sale > 0 ? (((p.sale - p.cost) / p.sale) * 100).toFixed(0) : "N/A";

                    return (
                      <tr key={p.name} className="hover:bg-muted/15 transition-colors">
                        <td className="p-3 font-bold text-foreground">
                          {p.name}
                          {isLow && (
                            <span className="text-[10px] text-rose-400 font-semibold block">⚠️ Estoque Baixo</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="border-hairline text-[10px]">
                            {p.abc}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono font-bold text-foreground">{p.stock} un</td>
                        <td className="p-3 font-mono text-muted-foreground">{p.sold} saídas</td>
                        <td className="p-3 font-mono text-muted-foreground">R$ {p.cost.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          {margin !== "N/A" ? `${margin}%` : "Consumo"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 5. RELATÓRIO DE CLIENTES & RETENÇÃO                                      */}
      {/* ========================================================================= */}
      {selectedCategory === "CLIENTES" && (
        <Card className="bg-card border-hairline shadow-md rounded-2xl">
          <CardHeader className="pb-3 border-b border-hairline">
            <CardTitle className="text-base font-bold text-foreground">Métricas de Retenção & Fidelização (CRM)</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Comportamento de retorno, LTV (Life-Time Value) e clientes fiéis.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/20 rounded-xl border border-hairline text-center">
                <span className="text-xs text-muted-foreground block">Taxa de Retenção Geral</span>
                <strong className="text-2xl font-bold text-foreground mt-1 block">84.2%</strong>
                <span className="text-[11px] text-emerald-400 font-semibold">Clientes que retornam em até 30 dias</span>
              </div>
              <div className="p-4 bg-muted/20 rounded-xl border border-hairline text-center">
                <span className="text-xs text-muted-foreground block">Frequência Média de Retorno</span>
                <strong className="text-2xl font-bold text-foreground mt-1 block">19 dias</strong>
                <span className="text-[11px] text-muted-foreground">Intervalo médio entre cortes</span>
              </div>
              <div className="p-4 bg-muted/20 rounded-xl border border-hairline text-center">
                <span className="text-xs text-muted-foreground block">LTV Médio do Cliente</span>
                <strong className="text-2xl font-bold text-primary mt-1 block">R$ 680,00</strong>
                <span className="text-[11px] text-muted-foreground">Valor acumulado por cliente fidelizado</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 6. RELATÓRIO DE FALTAS & CANCELAMENTOS                                    */}
      {/* ========================================================================= */}
      {selectedCategory === "CANCELAMENTOS" && (
        <Card className="bg-card border-hairline shadow-md rounded-2xl">
          <CardHeader className="pb-3 border-b border-hairline">
            <CardTitle className="text-base font-bold text-foreground">Absenteísmo & Cancelamentos</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Taxa de faltas (No-Show), cancelamentos antecipados e impacto dos lembretes via WhatsApp oficial.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/20 rounded-xl border border-hairline text-center">
                <span className="text-xs text-muted-foreground block">Total de Agendamentos no Mês</span>
                <strong className="text-2xl font-bold text-foreground mt-1 block">710</strong>
                <span className="text-[11px] text-muted-foreground">Slots ocupados no motor</span>
              </div>
              <div className="p-4 bg-muted/20 rounded-xl border border-hairline text-center">
                <span className="text-xs text-muted-foreground block">Faltas (No-Show) Registradas</span>
                <strong className="text-2xl font-bold text-rose-400 mt-1 block">14 (1.9%)</strong>
                <span className="text-[11px] text-emerald-400 font-semibold">Baixo índice de faltas</span>
              </div>
              <div className="p-4 bg-muted/20 rounded-xl border border-hairline text-center">
                <span className="text-xs text-muted-foreground block">Cancelados com Antecedência</span>
                <strong className="text-2xl font-bold text-amber-400 mt-1 block">18 (2.5%)</strong>
                <span className="text-[11px] text-muted-foreground">Slots liberados e reocupados</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-hairline bg-card flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="font-bold text-foreground text-sm block">Impacto Positivo dos Lembretes WhatsApp (wa.me)</span>
                <span className="text-xs text-muted-foreground mt-0.5 block">
                  A confirmação de horário pelo cliente reduziu as faltas na barbearia de 12.8% para apenas 1.9% este mês.
                </span>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs py-1 px-3">
                Economia Estimada: R$ 4.800,00
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
