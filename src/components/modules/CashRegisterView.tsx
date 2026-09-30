import React, { useState } from "react";
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Lock,
  Unlock,
  AlertTriangle,
  FileText,
  DollarSign,
  Plus,
  Minus,
  CheckCircle,
  Clock,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface CashMovement {
  id: string;
  type: "OPENING" | "SALE" | "SUPPLY" | "BLEED" | "CLOSING";
  amount: number;
  reason: string;
  operator: string;
  time: string;
}

interface CashRegisterViewProps {
  cashStatus: "OPEN" | "CLOSED";
  cashBalance: number;
  onOpenCash: (initialAmount: number) => void;
  onCloseCash: (reportedAmount: number) => { expected: number; reported: number; diff: number };
  onBleed: (amount: number, reason: string) => void;
  onSupply: (amount: number, reason: string) => void;
  currentOperator: string;
  movements: CashMovement[];
}

export function CashRegisterView({
  cashStatus,
  cashBalance,
  onOpenCash,
  onCloseCash,
  onBleed,
  onSupply,
  currentOperator,
  movements,
}: CashRegisterViewProps) {
  // Abertura
  const [initialAmountInput, setInitialAmountInput] = useState("150.00");

  // Sangria
  const [bleedAmount, setBleedAmount] = useState("");
  const [bleedReason, setBleedReason] = useState("");

  // Suprimento
  const [supplyAmount, setSupplyAmount] = useState("");
  const [supplyReason, setSupplyReason] = useState("");

  // Fechamento cego
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [reportedClosingAmount, setReportedClosingAmount] = useState("");
  const [closingResult, setClosingResult] = useState<{ expected: number; reported: number; diff: number } | null>(null);

  const handleBleedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(bleedAmount);
    if (isNaN(val) || val <= 0) return;
    if (val > cashBalance) {
      alert("Valor da sangria excede o saldo em dinheiro disponível na gaveta!");
      return;
    }
    onBleed(val, bleedReason.trim() || "Sangria para cofre");
    setBleedAmount("");
    setBleedReason("");
  };

  const handleSupplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(supplyAmount);
    if (isNaN(val) || val <= 0) return;
    onSupply(val, supplyReason.trim() || "Reforço de troco");
    setSupplyAmount("");
    setSupplyReason("");
  };

  const handleExecuteClosing = (e: React.FormEvent) => {
    e.preventDefault();
    const reported = parseFloat(reportedClosingAmount) || 0;
    const res = onCloseCash(reported);
    setClosingResult(res);
  };

  // Cálculos do Caixa
  const totalSupplies = movements
    .filter((m) => m.type === "SUPPLY" || m.type === "OPENING")
    .reduce((sum, m) => sum + m.amount, 0);

  const totalSales = movements
    .filter((m) => m.type === "SALE")
    .reduce((sum, m) => sum + m.amount, 0);

  const totalBleeds = movements
    .filter((m) => m.type === "BLEED")
    .reduce((sum, m) => sum + m.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Wallet className="h-6 w-6 text-primary" />
            Controle de Caixa Diário & Conciliação
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestão da gaveta física: aberturas, sangrias, suprimentos de troco e fechamento com conferência cega.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {cashStatus === "OPEN" ? (
            <Button
              onClick={() => setIsClosingModalOpen(true)}
              variant="outline"
              className="border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-semibold h-9"
            >
              <Lock className="h-4 w-4 mr-1.5" />
              Fechar Caixa do Dia
            </Button>
          ) : (
            <Button
              onClick={() => onOpenCash(parseFloat(initialAmountInput) || 150)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold h-9"
            >
              <Unlock className="h-4 w-4 mr-1.5" />
              Abrir Caixa
            </Button>
          )}
        </div>
      </div>

      {/* Cards de Resumo da Sessão */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-hairline shadow-sm">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Status Atual</span>
              {cashStatus === "OPEN" ? (
                <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px]">
                  ABERTO
                </Badge>
              ) : (
                <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 text-[10px]">
                  FECHADO
                </Badge>
              )}
            </div>
            <div className="text-2xl font-black text-foreground font-sans mt-2">
              R$ {cashBalance.toFixed(2)}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1">Saldo em dinheiro na gaveta</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-hairline shadow-sm">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Vendas Registradas</span>
              <ArrowUpRight className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-sans mt-2">
              R$ {totalSales.toFixed(2)}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1">Total de receitas na sessão</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-hairline shadow-sm">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Suprimentos de Troco</span>
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-primary font-sans mt-2">
              R$ {totalSupplies.toFixed(2)}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1">Aporte inicial e reforços</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-hairline shadow-sm">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Sangrias Realizadas</span>
              <ArrowDownRight className="h-4 w-4 text-red-400" />
            </div>
            <div className="text-2xl font-black text-red-400 font-sans mt-2">
              R$ {totalBleeds.toFixed(2)}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1">Transferências para o cofre</span>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Operações Rápidas (Sangria / Suprimento) + Extrato de Movimentações */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Formulários de Sangria e Suprimento */}
        <div className="lg:col-span-5 space-y-4">
          {/* Caixa de Sangria */}
          <Card className="bg-card border-hairline shadow-md rounded-2xl">
            <CardHeader className="pb-3 border-b border-hairline">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Minus className="h-4 w-4 text-red-400" />
                Registrar Sangria (Retirada para Cofre)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Retira cédulas da gaveta para reduzir risco operacional.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleBleedSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="text-muted-foreground block mb-1">Valor da Sangria (R$):</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 200.00"
                    value={bleedAmount}
                    onChange={(e) => setBleedAmount(e.target.value)}
                    className="bg-muted/30 border-hairline h-8 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Motivo / Destino:</label>
                  <Input
                    placeholder="Ex: Retirada de segurança para o cofre principal"
                    value={bleedReason}
                    onChange={(e) => setBleedReason(e.target.value)}
                    className="bg-muted/30 border-hairline h-8 text-xs"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={cashStatus !== "OPEN"}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs h-8 cursor-pointer"
                >
                  Confirmar Sangria
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Caixa de Suprimento */}
          <Card className="bg-card border-hairline shadow-md rounded-2xl">
            <CardHeader className="pb-3 border-b border-hairline">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-400" />
                Registrar Suprimento (Aporte de Troco)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Adiciona dinheiro ou moedas na gaveta para troco.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSupplySubmit} className="space-y-3 text-xs">
                <div>
                  <label className="text-muted-foreground block mb-1">Valor do Suprimento (R$):</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 50.00"
                    value={supplyAmount}
                    onChange={(e) => setSupplyAmount(e.target.value)}
                    className="bg-muted/30 border-hairline h-8 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Motivo / Origem:</label>
                  <Input
                    placeholder="Ex: Aporte de moedas e cédulas miúdas"
                    value={supplyReason}
                    onChange={(e) => setSupplyReason(e.target.value)}
                    className="bg-muted/30 border-hairline h-8 text-xs"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={cashStatus !== "OPEN"}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 cursor-pointer"
                >
                  Confirmar Suprimento
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Extrato da Sessão */}
        <div className="lg:col-span-7">
          <Card className="bg-card border-hairline shadow-md rounded-2xl">
            <CardHeader className="pb-3 border-b border-hairline flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Extrato de Movimentações da Sessão
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Trilha de auditoria das entradas e saídas do caixa
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono border-hairline">
                Operador: {currentOperator}
              </Badge>
            </CardHeader>

            <CardContent className="p-0">
              <div className="divide-y divide-hairline max-h-[500px] overflow-y-auto">
                {movements.length === 0 ? (
                  <div className="text-center py-12 text-xs text-muted-foreground">
                    Nenhuma movimentação registrada nesta sessão.
                  </div>
                ) : (
                  movements.map((mov) => {
                    const isPositive = mov.type === "OPENING" || mov.type === "SALE" || mov.type === "SUPPLY";
                    return (
                      <div key={mov.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-muted/20">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center font-bold ${
                              isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{mov.reason}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                              <span>{mov.time}</span>
                              <span>•</span>
                              <span>Op: {mov.operator}</span>
                            </div>
                          </div>
                        </div>

                        <div className={`font-mono font-bold text-sm ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                          {isPositive ? "+" : "-"} R$ {mov.amount.toFixed(2)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Fechamento de Caixa com Conferência Cega */}
      {isClosingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-card border border-hairline rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-red-400" />
                <h3 className="font-bold text-base text-foreground">Fechamento Cego de Caixa</h3>
              </div>
              <button
                onClick={() => {
                  setIsClosingModalOpen(false);
                  setClosingResult(null);
                }}
                className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {!closingResult ? (
              <form onSubmit={handleExecuteClosing} className="space-y-4 text-xs">
                <p className="text-muted-foreground leading-relaxed">
                  Para garantir a segurança financeira, conte o dinheiro em espécie presente na gaveta e informe o valor abaixo.
                </p>

                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">
                    Valor Total Contado em Gaveta (R$):
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    required
                    value={reportedClosingAmount}
                    onChange={(e) => setReportedClosingAmount(e.target.value)}
                    className="h-10 text-base font-mono font-bold bg-muted/30 border-hairline text-center"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsClosingModalOpen(false)}
                    className="h-9 text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="h-9 text-xs font-bold bg-red-600 hover:bg-red-500 text-white">
                    Concluir e Apurar Caixa
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-muted/30 border border-hairline space-y-2">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Saldo Esperado pelo Sistema:</span>
                    <strong className="text-foreground font-mono">R$ {closingResult.expected.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Saldo Informado pelo Operador:</span>
                    <strong className="text-foreground font-mono">R$ {closingResult.reported.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-hairline text-sm">
                    <span className="font-bold text-foreground">Diferença Apurada:</span>
                    <span
                      className={`font-mono font-black ${
                        closingResult.diff === 0
                          ? "text-emerald-400"
                          : closingResult.diff > 0
                          ? "text-primary"
                          : "text-red-400"
                      }`}
                    >
                      {closingResult.diff > 0 ? "+ " : ""}R$ {closingResult.diff.toFixed(2)}
                      {closingResult.diff === 0 && " (Caixa Perfeito)"}
                      {closingResult.diff > 0 && " (Sobra)"}
                      {closingResult.diff < 0 && " (Quebra/Falta)"}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setIsClosingModalOpen(false);
                    setClosingResult(null);
                  }}
                  className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs"
                >
                  Fechar Janela
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
