import React, { useState, useMemo } from "react";
import {
  Award,
  Sparkles,
  Gift,
  CheckCircle,
  Plus,
  Users,
  Calendar,
  Clock,
  RefreshCw,
  Tag,
  Star,
  Cake,
  Share2,
  TrendingUp,
  History,
  Sliders,
  DollarSign,
  Search,
  Check,
  Phone,
  AlertCircle,
  Trash2,
  Edit,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { CustomerItem, ServiceItem, ProductItem, BusinessSettings } from "@/routes/index";
import type {
  LoyaltySettings,
  LoyaltyTierConfig,
  LoyaltyRewardItem,
  LoyaltyLedgerEntry,
  LoyaltyRedemptionRecord,
} from "@/lib/loyalty/loyalty.service";

export interface ClubSubscription {
  id: string;
  customerName: string;
  planName: string;
  price: number;
  cutsLeft: number;
  beardsLeft: number;
  validUntil: string;
  status: "ACTIVE" | "CANCELED" | "EXPIRED";
}

interface LoyaltyPlansViewProps {
  onShowToast: (msg: string) => void;
  initialTab?: "LOYALTY" | "PLANS";
  customers?: CustomerItem[];
  loyaltySettings?: LoyaltySettings;
  loyaltyTiers?: LoyaltyTierConfig[];
  loyaltyRewards?: LoyaltyRewardItem[];
  loyaltyLedger?: LoyaltyLedgerEntry[];
  loyaltyRedemptions?: LoyaltyRedemptionRecord[];
  onSaveReward?: (reward: LoyaltyRewardItem) => void;
  onDeleteReward?: (rewardId: string) => void;
  onManualAdjustPoints?: (customerId: string, delta: number, reason: string) => void;
  onRedeemReward?: (rewardId: string, customerId: string) => void;
  onUpdateLoyaltySettings?: (settings: LoyaltySettings) => void;
  onUpdateLoyaltyTiers?: (tiers: LoyaltyTierConfig[]) => void;
  services?: ServiceItem[];
  products?: ProductItem[];
  businessSettings?: BusinessSettings;
}

export function LoyaltyPlansView({
  onShowToast,
  initialTab = "PLANS",
  customers = [],
  loyaltySettings,
  loyaltyTiers = [],
  loyaltyRewards = [],
  loyaltyLedger = [],
  loyaltyRedemptions = [],
  onSaveReward,
  onDeleteReward,
  onManualAdjustPoints,
  onRedeemReward,
  onUpdateLoyaltySettings,
  onUpdateLoyaltyTiers,
  services = [],
  products = [],
  businessSettings,
}: LoyaltyPlansViewProps) {
  const [activeMainTab, setActiveMainTab] = useState<"PLANS" | "LOYALTY">(initialTab);
  const [activeLoyaltySubTab, setActiveLoyaltySubTab] = useState<
    "OVERVIEW" | "REWARDS" | "TIERS" | "LEDGER" | "BIRTHDAYS_REFERRALS" | "ADJUST"
  >("OVERVIEW");

  // Clubes e Assinaturas (recorrentes)
  const [subscriptions, setSubscriptions] = useState<ClubSubscription[]>([
    {
      id: "sub-1",
      customerName: "Carlos Eduardo Santos",
      planName: "Barber Black VIP",
      price: 139.9,
      cutsLeft: 2,
      beardsLeft: 2,
      validUntil: "25/10/2026",
      status: "ACTIVE",
    },
    {
      id: "sub-2",
      customerName: "Guilherme Siqueira",
      planName: "Club Fade & Style",
      price: 99.0,
      cutsLeft: 3,
      beardsLeft: 0,
      validUntil: "18/10/2026",
      status: "ACTIVE",
    },
  ]);

  // Modal / Form de Nova Recompensa
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [rewardFormName, setRewardFormName] = useState("");
  const [rewardFormDesc, setRewardFormDesc] = useState("");
  const [rewardFormPoints, setRewardFormPoints] = useState("100");
  const [rewardFormType, setRewardFormType] = useState<"SERVICO" | "PRODUTO" | "DESCONTO_PERCENTUAL" | "DESCONTO_VALOR" | "BENEFICIO">("SERVICO");
  const [rewardFormCategory, setRewardFormCategory] = useState("Serviço");
  const [rewardFormServiceId, setRewardFormServiceId] = useState<string>("");
  const [rewardFormProductId, setRewardFormProductId] = useState<string>("");

  // Estado do formulário de Ajuste Manual
  const [adjustCustomerId, setAdjustCustomerId] = useState<string>("");
  const [adjustPointsDelta, setAdjustPointsDelta] = useState<string>("50");
  const [adjustType, setAdjustType] = useState<"ADD" | "SUB">("ADD");
  const [adjustReason, setAdjustReason] = useState<string>("");

  // Filtros do Ledger
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState("");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>("ALL");

  // Indicadores Reais do Programa de Fidelidade (Visão Geral)
  const loyaltyMetrics = useMemo(() => {
    let circulatingPoints = 0;
    let earnedPointsMonth = 0;
    let redeemedPoints = 0;
    let redemptionsCount = loyaltyRedemptions.length;
    let participatingCustomers = 0;

    customers.forEach((c) => {
      circulatingPoints += c.loyaltyPoints || 0;
      if ((c.loyaltyPoints || 0) > 0 || (c.lifetimePoints || 0) > 0) {
        participatingCustomers++;
      }
    });

    loyaltyLedger.forEach((entry) => {
      if (entry.type === "EARN" || entry.type === "BONUS" || entry.type === "BIRTHDAY" || entry.type === "REFERRAL") {
        earnedPointsMonth += entry.points;
      }
      if (entry.type === "REDEEM") {
        redeemedPoints += Math.abs(entry.points);
      }
    });

    // Recompensa mais resgatada
    const rewardCountMap: Record<string, number> = {};
    loyaltyRedemptions.forEach((r) => {
      rewardCountMap[r.rewardName] = (rewardCountMap[r.rewardName] || 0) + 1;
    });
    let topReward = "Corte Tradicional Grátis";
    let topCount = 0;
    Object.entries(rewardCountMap).forEach(([name, count]) => {
      if (count > topCount) {
        topReward = name;
        topCount = count;
      }
    });

    return {
      circulatingPoints,
      earnedPointsMonth,
      redeemedPoints,
      redemptionsCount,
      participatingCustomers,
      topReward,
    };
  }, [customers, loyaltyLedger, loyaltyRedemptions]);

  // Manipulador de uso de benefício de plano
  const handleUsePlanBenefit = (subId: string, type: "cut" | "beard") => {
    setSubscriptions((prev) =>
      prev.map((s) => {
        if (s.id !== subId) return s;
        if (type === "cut") {
          if (s.cutsLeft <= 0) {
            onShowToast("Cliente não possui mais cortes restantes no plano!");
            return s;
          }
          onShowToast(`Corte resgatado do plano ${s.planName} para ${s.customerName}.`);
          return { ...s, cutsLeft: s.cutsLeft - 1 };
        } else {
          if (s.beardsLeft <= 0) {
            onShowToast("Cliente não possui mais barbas restantes no plano!");
            return s;
          }
          onShowToast(`Barba resgatada do plano ${s.planName} para ${s.customerName}.`);
          return { ...s, beardsLeft: s.beardsLeft - 1 };
        }
      })
    );
  };

  // Abrir Modal de Edição ou Criação de Recompensa
  const handleOpenRewardModal = (reward?: LoyaltyRewardItem) => {
    if (reward) {
      setEditingRewardId(reward.id);
      setRewardFormName(reward.name);
      setRewardFormDesc(reward.description);
      setRewardFormPoints(String(reward.pointsRequired || reward.pointsCost || 100));
      setRewardFormType((reward.rewardType as any) || (reward.type === "PRODUCT" ? "PRODUTO" : "SERVICO"));
      setRewardFormCategory(reward.category || "Serviço");
      setRewardFormServiceId(reward.serviceId || "");
      setRewardFormProductId(reward.productId || "");
    } else {
      setEditingRewardId(null);
      setRewardFormName("");
      setRewardFormDesc("");
      setRewardFormPoints("100");
      setRewardFormType("SERVICO");
      setRewardFormCategory("Serviço");
      setRewardFormServiceId(services[0]?.id || "");
      setRewardFormProductId("");
    }
    setIsRewardModalOpen(true);
  };

  const handleSaveRewardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardFormName.trim()) return;

    const pointsNum = parseInt(rewardFormPoints, 10) || 50;
    const rewardTypeNormalized =
      rewardFormType === "SERVICO"
        ? "SERVICE"
        : rewardFormType === "PRODUTO"
        ? "PRODUCT"
        : rewardFormType === "DESCONTO_PERCENTUAL"
        ? "DISCOUNT_PERCENT"
        : rewardFormType === "DESCONTO_VALOR"
        ? "DISCOUNT_VALUE"
        : "BENEFIT";

    const rewardItem: LoyaltyRewardItem = {
      id: editingRewardId || `rew-${Date.now()}`,
      tenantId: "tenant-default",
      name: rewardFormName.trim(),
      description: rewardFormDesc.trim(),
      type: rewardTypeNormalized,
      pointsRequired: pointsNum,
      pointsCost: pointsNum,
      rewardType: rewardFormType,
      serviceId: rewardFormType === "SERVICO" ? rewardFormServiceId : undefined,
      productId: rewardFormType === "PRODUTO" ? rewardFormProductId : undefined,
      category: rewardFormCategory,
      currentRedemptionsCount: 0,
      isActive: true,
    };

    if (onSaveReward) {
      onSaveReward(rewardItem);
    }
    setIsRewardModalOpen(false);
    onShowToast(`Recompensa "${rewardItem.name}" salva com sucesso!`);
  };

  const handleExecuteManualAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustCustomerId) {
      onShowToast("Selecione um cliente para o ajuste!");
      return;
    }
    if (!adjustReason.trim()) {
      onShowToast("O motivo do ajuste manual é obrigatório!");
      return;
    }
    const points = parseInt(adjustPointsDelta, 10) || 0;
    if (points <= 0) {
      onShowToast("A quantidade de pontos deve ser maior que zero!");
      return;
    }

    const delta = adjustType === "ADD" ? points : -points;
    if (onManualAdjustPoints) {
      onManualAdjustPoints(adjustCustomerId, delta, adjustReason.trim());
      setAdjustReason("");
      onShowToast(`Ajuste de ${delta > 0 ? "+" : ""}${delta} pontos registrado no ledger.`);
    }
  };

  // Filtragem do Ledger
  const filteredLedger = useMemo(() => {
    return loyaltyLedger.filter((entry) => {
      if (ledgerTypeFilter !== "ALL" && entry.type !== ledgerTypeFilter) return false;
      if (!ledgerSearchQuery.trim()) return true;
      const q = ledgerSearchQuery.toLowerCase();
      const customer = customers.find((c) => c.id === entry.customerId);
      const custName = customer?.name?.toLowerCase() || "";
      return (
        (entry.reason || entry.description || "").toLowerCase().includes(q) ||
        custName.includes(q) ||
        entry.type.toLowerCase().includes(q)
      );
    });
  }, [loyaltyLedger, ledgerTypeFilter, ledgerSearchQuery, customers]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Sparkles className="h-6 w-6 text-primary" />
            Fidelidade & Assinaturas BarberHub
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Motor central de retenção: acúmulo no PDV, níveis de cliente, recompensas, extrato auditável e clubes de recorrência.
          </p>
        </div>

        {/* Chave de Abas Principais: PLANOS vs FIDELIDADE */}
        <div className="flex items-center rounded-full bg-muted/40 p-1 border border-hairline text-xs">
          <button
            onClick={() => setActiveMainTab("PLANS")}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all cursor-pointer ${
              activeMainTab === "PLANS"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Planos & Assinaturas
          </button>
          <button
            onClick={() => setActiveMainTab("LOYALTY")}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all cursor-pointer ${
              activeMainTab === "LOYALTY"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Motor de Fidelidade
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: PLANOS & ASSINATURAS (RECORRÊNCIA / BARBER BLACK)                 */}
      {/* ========================================================================= */}
      {activeMainTab === "PLANS" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card border-hairline shadow-md rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary/20 text-primary border-b border-l border-primary/30 px-3 py-1 rounded-bl-xl text-[10px] font-bold uppercase">
                Mais Vendido
              </div>
              <h3 className="font-bold text-base text-foreground">Barber Black VIP</h3>
              <p className="text-xs text-muted-foreground mt-1">O clube definitivo para o cliente exigente.</p>
              <div className="my-4">
                <span className="text-2xl font-black text-foreground font-sans">R$ 139,90</span>
                <span className="text-xs text-muted-foreground"> /mês</span>
              </div>
              <ul className="text-xs space-y-2 text-muted-foreground mb-4">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-primary" /> 2 cortes de cabelo inclusos
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-primary" /> 2 barboterapias completas
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-primary" /> 1 cerveja artesanal por visita
                </li>
              </ul>
              <Button size="sm" className="w-full text-xs font-bold bg-primary text-primary-foreground">
                Cadastrar Novo Assinante
              </Button>
            </Card>

            <Card className="bg-card border-hairline shadow-md rounded-2xl p-5">
              <h3 className="font-bold text-base text-foreground">Club Fade & Style</h3>
              <p className="text-xs text-muted-foreground mt-1">Para quem mantém o degradê sempre na régua.</p>
              <div className="my-4">
                <span className="text-2xl font-black text-foreground font-sans">R$ 99,00</span>
                <span className="text-xs text-muted-foreground"> /mês</span>
              </div>
              <ul className="text-xs space-y-2 text-muted-foreground mb-4">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-primary" /> 4 cortes degradê ou tesoura
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-primary" /> 10% de desconto em pomadas
                </li>
              </ul>
              <Button size="sm" variant="outline" className="w-full text-xs font-bold border-hairline">
                Cadastrar Novo Assinante
              </Button>
            </Card>
          </div>

          <Card className="bg-card border-hairline shadow-md rounded-2xl">
            <CardHeader className="pb-3 border-b border-hairline">
              <CardTitle className="text-base font-bold text-foreground">Assinaturas Ativas na Barbearia</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Acompanhamento do saldo de créditos e validade de cada cliente assinante.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-hairline text-xs">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20">
                    <div>
                      <span className="font-bold text-sm text-foreground block">{sub.customerName}</span>
                      <span className="text-[11px] text-muted-foreground">
                        Plano: <strong className="text-primary">{sub.planName}</strong> • Validade: {sub.validUntil}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUsePlanBenefit(sub.id, "cut")}
                          className="h-7 text-xs border-hairline"
                        >
                          Usar Corte (Restam {sub.cutsLeft})
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUsePlanBenefit(sub.id, "beard")}
                          className="h-7 text-xs border-hairline"
                        >
                          Usar Barba (Restam {sub.beardsLeft})
                        </Button>
                      </div>

                      <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs">
                        ATIVO
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: MOTOR DE FIDELIDADE (SUB-ABAS: OVERVIEW, RECOMPENSAS, NÍVEIS...)    */}
      {/* ========================================================================= */}
      {activeMainTab === "LOYALTY" && (
        <div className="space-y-5">
          {/* Menu de Sub-Abas da Fidelidade */}
          <div className="flex flex-wrap items-center gap-2 border-b border-hairline pb-3">
            {[
              { id: "OVERVIEW", label: "Visão Geral", icon: TrendingUp },
              { id: "REWARDS", label: "Catálogo de Recompensas", icon: Gift },
              { id: "TIERS", label: "Níveis de Fidelidade", icon: Award },
              { id: "LEDGER", label: "Extrato Contábil / Ledger", icon: History },
              { id: "BIRTHDAYS_REFERRALS", label: "Aniversários & Indicações", icon: Cake },
              { id: "ADJUST", label: "Ajuste Manual Auditado", icon: Sliders },
            ].map((sub) => {
              const Icon = sub.icon;
              const isSelected = activeLoyaltySubTab === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => setActiveLoyaltySubTab(sub.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/30 border border-hairline text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>

          {/* 1. VISÃO GERAL */}
          {activeLoyaltySubTab === "OVERVIEW" && (
            <div className="space-y-5">
              {/* KPIs Reais */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Card className="p-4 bg-card border-hairline rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Pontos em Circulação
                  </span>
                  <span className="text-xl font-black font-sans text-primary block mt-1">
                    {loyaltyMetrics.circulatingPoints.toLocaleString("pt-BR")}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Saldo disponível nos clientes</span>
                </Card>

                <Card className="p-4 bg-card border-hairline rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Gerados este Mês
                  </span>
                  <span className="text-xl font-black font-sans text-emerald-400 block mt-1">
                    +{loyaltyMetrics.earnedPointsMonth.toLocaleString("pt-BR")}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Via vendas e bônus</span>
                </Card>

                <Card className="p-4 bg-card border-hairline rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Pontos Resgatados
                  </span>
                  <span className="text-xl font-black font-sans text-foreground block mt-1">
                    {loyaltyMetrics.redeemedPoints.toLocaleString("pt-BR")}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Convertidos em benefícios</span>
                </Card>

                <Card className="p-4 bg-card border-hairline rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Total de Resgates
                  </span>
                  <span className="text-xl font-black font-sans text-foreground block mt-1">
                    {loyaltyMetrics.redemptionsCount}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Benefícios emitidos</span>
                </Card>

                <Card className="p-4 bg-card border-hairline rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Clientes Ativos
                  </span>
                  <span className="text-xl font-black font-sans text-foreground block mt-1">
                    {loyaltyMetrics.participatingCustomers}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Com saldo ou histórico</span>
                </Card>

                <Card className="p-4 bg-card border-hairline rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Top Recompensa
                  </span>
                  <span className="text-xs font-bold text-primary block mt-1 truncate" title={loyaltyMetrics.topReward}>
                    {loyaltyMetrics.topReward}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Mais preferida</span>
                </Card>
              </div>

              {/* Regra Base Ativa */}
              <Card className="p-4 bg-primary/10 border border-primary/25 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                    <Star className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-bold text-foreground block">
                      Regra de Pontuação Atual: R$ {loyaltySettings?.spendBaseUnit || loyaltySettings?.pointsPerRealAmount || 1} gasto no PDV = {loyaltySettings?.pointsPerBaseUnit || loyaltySettings?.pointsAwarded || 1} ponto(s)
                    </span>
                    <span className="text-muted-foreground">
                      Pontos creditados exclusivamente após pagamento confirmado. Serviços: {loyaltySettings?.servicesEarnPoints ? "SIM" : "NÃO"} • Produtos: {loyaltySettings?.productsEarnPoints ? "SIM" : "NÃO"}.
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="border-primary/40 text-primary uppercase text-[10px] font-bold self-start sm:self-auto">
                  Ativo & Auditado
                </Badge>
              </Card>

              {/* Prévia dos Níveis e Extrato Recente */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-hairline bg-card rounded-2xl p-5 space-y-3">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" /> Níveis de Fidelidade Vigentes
                  </h3>
                  <div className="space-y-2">
                    {loyaltyTiers.map((tier) => (
                      <div key={tier.name} className="p-2.5 rounded-xl border border-hairline flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{tier.name}</span>
                          <span className="text-muted-foreground text-[11px]">
                            ({tier.minLifetimePoints} pts mínimos)
                          </span>
                        </div>
                        <Badge className="bg-muted text-foreground border-hairline font-mono text-[10px]">
                          Multiplicador {tier.multiplier}x
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="border-hairline bg-card rounded-2xl p-5 space-y-3">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" /> Movimentações Recentes do Ledger
                  </h3>
                  <div className="divide-y divide-hairline text-xs">
                    {loyaltyLedger.slice(0, 4).map((entry) => (
                      <div key={entry.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-foreground block">{entry.reason || entry.description || "Transação"}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {entry.createdAt} • Ref: {entry.sourceId || entry.sourceType}
                          </span>
                        </div>
                        <span
                          className={`font-mono font-bold text-xs ${
                            entry.points > 0 ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {entry.points > 0 ? `+${entry.points}` : entry.points} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* 2. CATÁLOGO DE RECOMPENSAS (CRUD COMPLETO) */}
          {activeLoyaltySubTab === "REWARDS" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-foreground">Catálogo de Recompensas</h2>
                  <p className="text-xs text-muted-foreground">
                    Recompensas ativas vinculadas a serviços, produtos do estoque ou benefícios especiais.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleOpenRewardModal()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 gap-1.5 cursor-pointer shadow-md shadow-primary/20"
                >
                  <Plus className="h-4 w-4" /> Nova Recompensa
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {loyaltyRewards.map((rew) => (
                  <Card key={rew.id} className="bg-card border-hairline shadow-md rounded-2xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="text-[10px] border-hairline text-muted-foreground uppercase">
                          {rew.category || rew.rewardType || rew.type}
                        </Badge>
                        <Badge
                          className={`text-[9px] font-bold ${
                            rew.isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {rew.isActive ? "ATIVO" : "INATIVO"}
                        </Badge>
                      </div>

                      <h3 className="font-bold text-sm text-foreground">{rew.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rew.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-hairline space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-primary font-black font-mono text-base">{rew.pointsRequired || rew.pointsCost || 0} pts</span>
                        {rew.serviceId && (
                          <span className="text-[10px] text-muted-foreground">Serviço Vinculado</span>
                        )}
                        {rew.productId && (
                          <span className="text-[10px] text-muted-foreground">Produto Vinculado</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenRewardModal(rew)}
                          className="flex-1 h-7 text-xs border-hairline"
                        >
                          <Edit className="h-3 w-3 mr-1" /> Editar
                        </Button>
                        {onDeleteReward && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDeleteReward(rew.id)}
                            className="h-7 px-2 text-destructive hover:bg-destructive/10"
                            title="Excluir recompensa"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* 3. NÍVEIS DE FIDELIDADE */}
          {activeLoyaltySubTab === "TIERS" && (
            <Card className="border-hairline bg-card rounded-2xl p-5 space-y-4">
              <div>
                <h2 className="text-base font-bold text-foreground">Níveis de Fidelidade Configuráveis</h2>
                <p className="text-xs text-muted-foreground">
                  A pontuação histórica acumulada qualifica o cliente automaticamente. Multiplicadores aumentam a taxa de acúmulo no PDV.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {loyaltyTiers.map((tier, index) => (
                  <div key={tier.name} className="p-4 rounded-xl border border-hairline bg-muted/20 space-y-3">
                    <div className="flex justify-between items-center">
                      <Badge className="bg-primary/20 text-primary border border-primary/30 font-bold uppercase text-xs">
                        {tier.name}
                      </Badge>
                      <span className="text-xs font-mono font-bold text-muted-foreground">Ordem #{tier.order || index + 1}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-muted-foreground text-[11px] block">Pontos Mínimos Acumulados</span>
                      <span className="text-xl font-black font-sans text-foreground">
                        {tier.minLifetimePoints} <span className="text-xs font-normal text-muted-foreground">pts</span>
                      </span>
                    </div>

                    <div className="space-y-1 border-t border-hairline pt-2">
                      <span className="text-muted-foreground text-[11px] block">Multiplicador no PDV</span>
                      <span className="text-sm font-mono font-bold text-emerald-400">
                        {tier.multiplier}x Pontos
                      </span>
                    </div>

                    <div className="text-[11px] text-muted-foreground">
                      Benefícios: {tier.benefits?.join(", ") || "Acesso a recompensas exclusivas"}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 4. EXTRATO CONTÁBIL / LEDGER */}
          {activeLoyaltySubTab === "LEDGER" && (
            <Card className="border-hairline bg-card rounded-2xl overflow-hidden shadow-md">
              <CardHeader className="border-b border-hairline pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Ledger Auditável de Fidelidade
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Registro contábil imutável de todas as concessões, resgates, estornos e bônus.
                  </CardDescription>
                </div>

                {/* Filtros */}
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    placeholder="Filtrar histórico..."
                    value={ledgerSearchQuery}
                    onChange={(e) => setLedgerSearchQuery(e.target.value)}
                    className="h-8 text-xs bg-muted/30 border-hairline w-40"
                  />
                  <select
                    value={ledgerTypeFilter}
                    onChange={(e) => setLedgerTypeFilter(e.target.value)}
                    className="h-8 text-xs bg-muted/30 border border-hairline rounded px-2 text-foreground font-semibold"
                  >
                    <option value="ALL">Todos os Tipos</option>
                    <option value="EARN">EARN (+ Vendas)</option>
                    <option value="REDEEM">REDEEM (- Resgates)</option>
                    <option value="REVERSAL">REVERSAL (- Estornos)</option>
                    <option value="BONUS">BONUS (+ Bônus)</option>
                    <option value="REFERRAL">REFERRAL (+ Indicações)</option>
                    <option value="BIRTHDAY">BIRTHDAY (+ Aniversários)</option>
                    <option value="ADJUST">ADJUST (Ajustes Manuais)</option>
                  </select>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 border-b border-hairline text-muted-foreground uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-3">Data / Hora</th>
                        <th className="p-3">Cliente</th>
                        <th className="p-3">Tipo</th>
                        <th className="p-3">Descrição / Origem</th>
                        <th className="p-3 text-right">Pontos</th>
                        <th className="p-3 text-right">Saldo Resultante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {filteredLedger.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-muted-foreground">
                            Nenhum registro encontrado no ledger.
                          </td>
                        </tr>
                      ) : (
                        filteredLedger.map((entry) => {
                          const customer = customers.find((c) => c.id === entry.customerId);
                          return (
                            <tr key={entry.id} className="hover:bg-muted/15 transition-colors">
                              <td className="p-3 font-mono text-muted-foreground text-[11px] whitespace-nowrap">
                                {entry.createdAt}
                              </td>
                              <td className="p-3 font-bold text-foreground">
                                {customer?.name || entry.customerId}
                              </td>
                              <td className="p-3">
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] font-bold ${
                                    entry.type === "EARN"
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                      : entry.type === "REDEEM"
                                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                      : entry.type === "REVERSAL"
                                      ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                      : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                                  }`}
                                >
                                  {entry.type}
                                </Badge>
                              </td>
                              <td className="p-3 text-muted-foreground">
                                <span className="text-foreground block">{entry.reason || entry.description || "Transação"}</span>
                                {entry.sourceId && (
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    ID: {entry.sourceId} ({entry.sourceType})
                                  </span>
                                )}
                              </td>
                              <td
                                className={`p-3 text-right font-mono font-bold text-sm ${
                                  entry.points > 0 ? "text-emerald-400" : "text-amber-400"
                                }`}
                              >
                                {entry.points > 0 ? `+${entry.points}` : entry.points} pts
                              </td>
                              <td className="p-3 text-right font-mono text-muted-foreground text-xs">
                                {entry.newBalance ?? entry.balanceAfter ?? 0} pts
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 5. ANIVERSÁRIOS & INDICAÇÕES */}
          {activeLoyaltySubTab === "BIRTHDAYS_REFERRALS" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Aniversariantes */}
              <Card className="border-hairline bg-card rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-hairline pb-3">
                  <div>
                    <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                      <Cake className="h-5 w-5 text-pink-400" /> Aniversariantes Próximos
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Bônus de aniversário (+{loyaltySettings?.birthdayBonusPoints || 100} pts) e felicitações via WhatsApp.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {customers
                    .filter((c) => !!c.birthDate)
                    .slice(0, 4)
                    .map((cust) => (
                      <div key={cust.id} className="p-3 rounded-xl border border-hairline flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-foreground block">{cust.name}</span>
                          <span className="text-muted-foreground text-[11px]">
                            Nascimento: {cust.birthDate} • Saldo: {cust.loyaltyPoints} pts
                          </span>
                        </div>

                        <a
                          href={`https://wa.me/55${cust.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                            `Olá, ${cust.name.split(" ")[0]}! 🎉 Parabéns pelo seu aniversário! A equipe da ${businessSettings?.name || "BarberHub"} preparou um benefício especial para você!`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-pink-500/15 text-pink-400 hover:bg-pink-500/25 border border-pink-500/30 font-bold text-xs flex items-center gap-1.5"
                        >
                          <Phone className="h-3 w-3" /> WhatsApp
                        </a>
                      </div>
                    ))}
                </div>
              </Card>

              {/* Programa Indique um Amigo */}
              <Card className="border-hairline bg-card rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-hairline pb-3">
                  <div>
                    <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                      <Share2 className="h-5 w-5 text-primary" /> Programa Indique um Amigo
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Indicador ganha +{loyaltySettings?.referralReferrerPoints || loyaltySettings?.referralBonusReferrer || 100} pts e indicado ganha +{loyaltySettings?.referralReferredPoints || loyaltySettings?.referralBonusReferee || 50} pts no 1º atendimento pago.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {customers
                    .filter((c) => !!c.referralCode)
                    .slice(0, 4)
                    .map((cust) => (
                      <div key={cust.id} className="p-3 rounded-xl border border-hairline flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-foreground block">{cust.name}</span>
                          <span className="text-muted-foreground text-[11px]">
                            Código exclusivo: <strong className="text-primary font-mono">{cust.referralCode}</strong>
                          </span>
                        </div>

                        <Badge className="bg-muted text-foreground border-hairline font-mono text-xs">
                          {cust.visits} visitas
                        </Badge>
                      </div>
                    ))}
                </div>
              </Card>
            </div>
          )}

          {/* 6. AJUSTE MANUAL AUDITADO */}
          {activeLoyaltySubTab === "ADJUST" && (
            <Card className="border-hairline bg-card rounded-2xl p-5 max-w-2xl mx-auto space-y-4">
              <div className="border-b border-hairline pb-3">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-primary" /> Ajuste Manual de Pontos (Auditado)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Modificação de saldo com justificativa obrigatória. Fica registrado no ledger com tipo ADJUST.
                </p>
              </div>

              <form onSubmit={handleExecuteManualAdjust} className="space-y-4 text-xs">
                <div>
                  <label className="text-muted-foreground font-semibold block mb-1">Selecionar Cliente:</label>
                  <select
                    value={adjustCustomerId}
                    onChange={(e) => setAdjustCustomerId(e.target.value)}
                    className="w-full bg-muted/30 border border-hairline rounded-lg p-2.5 text-xs text-foreground font-semibold"
                    required
                  >
                    <option value="">-- Escolha um cliente --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — Saldo Atual: {c.loyaltyPoints} pts ({c.loyaltyTier})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-muted-foreground font-semibold block mb-1">Operação:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAdjustType("ADD")}
                        className={`p-2 rounded-lg border font-bold text-xs cursor-pointer ${
                          adjustType === "ADD"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500"
                            : "bg-muted/30 border-hairline text-muted-foreground"
                        }`}
                      >
                        + Adicionar
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustType("SUB")}
                        className={`p-2 rounded-lg border font-bold text-xs cursor-pointer ${
                          adjustType === "SUB"
                            ? "bg-rose-500/20 text-rose-400 border-rose-500"
                            : "bg-muted/30 border-hairline text-muted-foreground"
                        }`}
                      >
                        - Remover
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-muted-foreground font-semibold block mb-1">Quantidade de Pontos:</label>
                    <Input
                      type="number"
                      min="1"
                      value={adjustPointsDelta}
                      onChange={(e) => setAdjustPointsDelta(e.target.value)}
                      className="bg-muted/30 border-hairline h-9 text-xs font-mono font-bold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-muted-foreground font-semibold block mb-1">
                    Motivo / Justificativa Auditável (Obrigatório):
                  </label>
                  <Input
                    placeholder="Ex: Bonificação cortesia gerência por atraso de atendimento"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="bg-muted/30 border-hairline h-9 text-xs"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-10 shadow-md cursor-pointer"
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  Efetivar Ajuste no Ledger
                </Button>
              </form>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE RECOMPENSA                                   */}
      {/* ========================================================================= */}
      {isRewardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-card border border-hairline rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="font-bold text-base text-foreground">
                {editingRewardId ? "Editar Recompensa" : "Nova Recompensa de Fidelidade"}
              </h3>
              <button
                onClick={() => setIsRewardModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRewardSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Nome da Recompensa:</label>
                <Input
                  required
                  placeholder="Ex: Barboterapia Especial com Toalha Quente"
                  value={rewardFormName}
                  onChange={(e) => setRewardFormName(e.target.value)}
                  className="bg-muted/30 border-hairline h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Descrição Detalhada:</label>
                <Input
                  placeholder="Ex: Válido para qualquer horário com agendamento prévio"
                  value={rewardFormDesc}
                  onChange={(e) => setRewardFormDesc(e.target.value)}
                  className="bg-muted/30 border-hairline h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Custo em Pontos:</label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={rewardFormPoints}
                    onChange={(e) => setRewardFormPoints(e.target.value)}
                    className="bg-muted/30 border-hairline h-9 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Tipo de Recompensa:</label>
                  <select
                    value={rewardFormType}
                    onChange={(e) => setRewardFormType(e.target.value as any)}
                    className="w-full bg-muted/30 border border-hairline rounded px-2.5 h-9 text-xs text-foreground font-semibold"
                  >
                    <option value="SERVICO">Serviço da Barbearia</option>
                    <option value="PRODUTO">Produto do Estoque</option>
                    <option value="BENEFICIO">Benefício Especial / Lounge</option>
                  </select>
                </div>
              </div>

              {rewardFormType === "SERVICO" && (
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Serviço Vinculado:</label>
                  <select
                    value={rewardFormServiceId}
                    onChange={(e) => setRewardFormServiceId(e.target.value)}
                    className="w-full bg-muted/30 border border-hairline rounded px-2.5 h-9 text-xs text-foreground font-semibold"
                  >
                    {services.map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.name} (R$ {srv.price.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {rewardFormType === "PRODUTO" && (
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Produto Vinculado do Estoque:</label>
                  <select
                    value={rewardFormProductId}
                    onChange={(e) => setRewardFormProductId(e.target.value)}
                    className="w-full bg-muted/30 border border-hairline rounded px-2.5 h-9 text-xs text-foreground font-semibold"
                  >
                    {products.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} (Estoque: {prod.stock})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-hairline">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRewardModalOpen(false)}
                  className="h-9 border-hairline text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs"
                >
                  Salvar Recompensa
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
