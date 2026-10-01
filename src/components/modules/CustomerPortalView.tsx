import React, { useState, useMemo } from "react";
import {
  User,
  Calendar,
  Sparkles,
  Award,
  Clock,
  RotateCcw,
  CheckCircle,
  Scissors,
  ArrowRight,
  Star,
  Gift,
  History,
  TrendingUp,
  Tag,
  Check,
  AlertCircle,
  Share2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CustomerItem } from "@/routes/index";
import {
  DEFAULT_LOYALTY_TIERS,
  type LoyaltySettings,
  type LoyaltyTierConfig,
  type LoyaltyRewardItem,
  type LoyaltyLedgerEntry,
  type LoyaltyRedemptionRecord,
} from "@/lib/loyalty/loyalty.service";

interface CustomerPortalViewProps {
  onOpenBookingModal: (options?: { serviceId?: string | undefined; employeeId?: string | undefined; prefillCustomer?: boolean | undefined } | undefined) => void;
  onCancelAppointment?: ((aptCode: string) => void) | undefined;
  onBackToErp: () => void;
  customer?: CustomerItem | undefined;
  loyaltySettings?: LoyaltySettings | undefined;
  loyaltyTiers?: LoyaltyTierConfig[] | undefined;
  loyaltyRewards?: LoyaltyRewardItem[] | undefined;
  loyaltyLedger?: LoyaltyLedgerEntry[] | undefined;
  loyaltyRedemptions?: LoyaltyRedemptionRecord[] | undefined;
  onRedeemReward?: ((rewardId: string, customerId?: string | undefined) => void) | undefined;
}

export function CustomerPortalView({
  onOpenBookingModal,
  onCancelAppointment,
  onBackToErp,
  customer = {
    id: "c-guest",
    name: "Cliente",
    phone: "",
    cpf: "",
    email: "",
    visits: 0,
    spent: 0.0,
    avg: 0.0,
    tag: "Novo",
    crmSegment: "NOVO" as const,
    loyaltyPoints: 0,
    lifetimePoints: 0,
    loyaltyTier: "BRONZE" as const,
    notes: "",
  },
  loyaltySettings,
  loyaltyTiers = DEFAULT_LOYALTY_TIERS,
  loyaltyRewards = [],
  loyaltyLedger = [],
  loyaltyRedemptions = [],
  onRedeemReward,
}: CustomerPortalViewProps) {
  const [activeTab, setActiveTab] = useState<"HOME" | "POINTS" | "PLAN" | "HISTORY">("HOME");
  const [isAppointmentCanceled, setIsAppointmentCanceled] = useState(false);
  const [redeemFeedback, setRedeemFeedback] = useState<string | null>(null);

  // Extrato filtrado para este cliente
  const customerLedger = useMemo(() => {
    return loyaltyLedger.filter((entry) => entry.customerId === customer.id);
  }, [loyaltyLedger, customer.id]);

  // Benefícios resgatados deste cliente
  const customerRedemptions = useMemo(() => {
    return loyaltyRedemptions.filter((r) => r.customerId === customer.id);
  }, [loyaltyRedemptions, customer.id]);

  // Cálculo da régua de progresso para o próximo nível
  const tierProgress = useMemo(() => {
    const currentTierName = customer.loyaltyTier || "BRONZE";
    const currentLifetime = customer.lifetimePoints || 0;

    const currentTierIdx = loyaltyTiers.findIndex((t) => t.name === currentTierName);
    const nextTier = currentTierIdx >= 0 && currentTierIdx < loyaltyTiers.length - 1
      ? loyaltyTiers[currentTierIdx + 1]
      : null;

    if (!nextTier) {
      return {
        nextTierName: null,
        pointsNeeded: 0,
        percentage: 100,
      };
    }

    const currentTierMin = loyaltyTiers[currentTierIdx]?.minLifetimePoints || 0;
    const nextTierMin = nextTier.minLifetimePoints;
    const span = Math.max(1, nextTierMin - currentTierMin);
    const progressInSpan = Math.max(0, currentLifetime - currentTierMin);
    const percentage = Math.min(100, Math.round((progressInSpan / span) * 100));
    const pointsNeeded = Math.max(0, nextTierMin - currentLifetime);

    return {
      nextTierName: nextTier.name,
      pointsNeeded,
      percentage,
    };
  }, [customer, loyaltyTiers]);

  const handleCancel = () => {
    if (confirm("Deseja realmente cancelar este agendamento? O horário será liberado para outros clientes.")) {
      setIsAppointmentCanceled(true);
      if (onCancelAppointment) {
        onCancelAppointment("#BH-94812");
      }
    }
  };

  const handleRedeemClick = (reward: LoyaltyRewardItem) => {
    const cost = reward.pointsRequired || reward.pointsCost || 0;
    if (customer.loyaltyPoints < cost) {
      alert(`Saldo insuficiente! Você tem ${customer.loyaltyPoints} pontos e precisa de ${cost} pontos.`);
      return;
    }

    if (onRedeemReward) {
      onRedeemReward(reward.id, customer.id);
      setRedeemFeedback(`Recompensa "${reward.name}" resgatada com sucesso! O benefício já está disponível na sua conta para uso na barbearia.`);
      setTimeout(() => setRedeemFeedback(null), 6000);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Top Banner de Retorno ao ERP */}
      <div className="bg-primary/10 border-b border-primary/20 py-2 px-4 flex justify-between items-center text-xs">
        <span className="text-primary font-semibold flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Portal do Cliente BarberHub (Área Exclusiva)
        </span>
        <Button size="sm" variant="outline" onClick={onBackToErp} className="h-7 text-xs border-primary/30 cursor-pointer">
          Voltar ao Painel ERP
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header do Cliente */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-hairline pb-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-base">
              {customer.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">{customer.name}</h1>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[10px] font-bold">
                  <Award className="h-3 w-3 mr-1" />
                  {customer.loyaltyTier}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cliente {customer.crmSegment || customer.tag} • {customer.visits} visitas • Código Indicação: <strong className="text-primary font-mono">{customer.referralCode}</strong>
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => onOpenBookingModal({ prefillCustomer: true })}
            className="h-9 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-4 cursor-pointer shadow-md shadow-primary/25"
          >
            <Calendar className="h-4 w-4" />
            <span>Agendar Horário</span>
          </Button>
        </div>

        {/* Mensagem de Feedback de Resgate */}
        {redeemFeedback && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{redeemFeedback}</span>
          </div>
        )}

        {/* Abas de Navegação Interna do Portal */}
        <div className="flex items-center gap-1 border-b border-hairline pb-2 text-xs">
          {[
            { id: "HOME", label: "Visão Geral", icon: User },
            { id: "POINTS", label: "Meus Pontos & Recompensas", icon: Star },
            { id: "PLAN", label: "Meu Clube / Plano", icon: Sparkles },
            { id: "HISTORY", label: "Histórico de Visitas", icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* ABA: HOME / VISÃO GERAL                                                  */}
        {/* ========================================================================= */}
        {activeTab === "HOME" && (
          <div className="space-y-6">
            {/* PRÓXIMO AGENDAMENTO ATIVO */}
            {!isAppointmentCanceled ? (
              <Card className="border-primary/40 bg-gradient-to-br from-card via-card to-primary/10 shadow-lg rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <Badge className="bg-primary text-primary-foreground text-xs font-bold">
                    Próximo Agendamento Confirmado
                  </Badge>
                  <span className="text-xs font-mono font-bold text-primary">#BH-94812</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-foreground">Corte Degradê / Fade Pro</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span>Hoje às 14:30 - 15:10</span>
                      <span>•</span>
                      <span>Barbeiro: <strong className="text-foreground">Gabriel Silva</strong></span>
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenBookingModal({ serviceId: "srv-1", prefillCustomer: true })}
                      className="h-8 text-xs border-hairline hover:bg-muted cursor-pointer"
                    >
                      Remarcar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancel}
                      className="h-8 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex justify-between items-center">
                <span>Seu agendamento #BH-94812 foi cancelado e o horário foi liberado.</span>
                <Button
                  size="sm"
                  onClick={() => onOpenBookingModal({ prefillCustomer: true })}
                  className="h-7 text-xs bg-primary text-primary-foreground"
                >
                  Agendar Outro Horário
                </Button>
              </div>
            )}

            {/* CARDS DE SALDO: PLANO & PONTOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-hairline bg-card shadow-xs rounded-2xl p-5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Meu Clube de Assinatura
                  </span>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                    ATIVO
                  </Badge>
                </div>
                <h4 className="text-base font-bold text-foreground">Barber Black VIP</h4>
                <div className="pt-2 flex items-center justify-between text-xs border-t border-hairline">
                  <span className="text-muted-foreground">Créditos de corte restantes:</span>
                  <strong className="text-primary font-mono text-sm">2 cortes / mês</strong>
                </div>
              </Card>

              <Card className="border-hairline bg-card shadow-xs rounded-2xl p-5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                    Meus Pontos de Fidelidade
                  </span>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {customer.loyaltyPoints} Pts
                  </span>
                </div>
                <h4 className="text-xs text-muted-foreground">
                  Nível: <strong className="text-foreground">{customer.loyaltyTier}</strong> (1.25x no PDV)
                </h4>
                <div className="pt-2 flex items-center justify-between text-xs border-t border-hairline">
                  <span className="text-foreground font-semibold">Resgatar cortes e produtos</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("POINTS")}
                    className="h-7 text-[10px] border-hairline text-primary"
                  >
                    Ver Catálogo
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: MEUS PONTOS & RECOMPENSAS (REQUISITOS 62-65)                          */}
        {/* ========================================================================= */}
        {activeTab === "POINTS" && (
          <div className="space-y-6">
            {/* CARD DE DESTAQUE: SALDO + NÍVEL + PROGRESSO */}
            <Card className="border-hairline bg-card rounded-2xl p-5 space-y-4 shadow-md">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-hairline pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Saldo Disponível para Resgate
                  </span>
                  <span className="text-3xl font-black font-sans text-primary block mt-0.5">
                    {customer.loyaltyPoints} <span className="text-sm font-normal text-muted-foreground">pontos</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-muted/30 px-3 py-1.5 rounded-xl border border-hairline text-center">
                    <span className="text-[10px] text-muted-foreground block">Nível Atual</span>
                    <span className="font-bold text-amber-400 text-xs flex items-center gap-1">
                      <Award className="h-3.5 w-3.5" /> {customer.loyaltyTier}
                    </span>
                  </div>

                  <div className="bg-muted/30 px-3 py-1.5 rounded-xl border border-hairline text-center">
                    <span className="text-[10px] text-muted-foreground block">Total Acumulado</span>
                    <span className="font-mono font-bold text-foreground text-xs">{customer.lifetimePoints} pts</span>
                  </div>
                </div>
              </div>

              {/* Barra de Progresso do Nível */}
              {tierProgress.nextTierName && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">
                      Progresso para <strong className="text-foreground">{tierProgress.nextTierName}</strong>:
                    </span>
                    <span className="font-mono text-primary font-bold">
                      Faltam {tierProgress.pointsNeeded} pontos ({tierProgress.percentage}%)
                    </span>
                  </div>

                  {/* Barra Visual */}
                  <div className="w-full bg-muted/40 h-2.5 rounded-full overflow-hidden border border-hairline">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${tierProgress.percentage}%` }}
                    />
                  </div>
                </div>
              )}
            </Card>

            {/* MEUS BENEFÍCIOS JÁ RESGATADOS */}
            {customerRedemptions.length > 0 && (
              <Card className="border-hairline bg-card rounded-2xl p-5 space-y-3">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Gift className="h-4 w-4 text-emerald-400" /> Meus Benefícios Disponíveis para Uso
                </h3>
                <div className="divide-y divide-hairline text-xs">
                  {customerRedemptions.map((red) => (
                    <div key={red.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-foreground block">{red.rewardName}</span>
                        <span className="text-[11px] text-muted-foreground">
                          Resgatado em {red.redeemedAt} • {red.pointsSpent || red.pointsBurned || 0} pts gastos
                        </span>
                      </div>

                      <Badge
                        className={
                          red.status === "DISPONIVEL"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold"
                            : "bg-muted text-muted-foreground border-hairline text-[10px]"
                        }
                      >
                        {red.status === "DISPONIVEL" ? "PRONTO PARA USO NO CAIXA" : "UTILIZADO"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* CATÁLOGO DE RECOMPENSAS PARA RESGATE */}
            <Card className="border-hairline bg-card rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="font-bold text-base text-foreground">Catálogo de Recompensas</h3>
                <p className="text-xs text-muted-foreground">
                  Escolha uma recompensa para resgatar agora com seus pontos. O benefício fica salvo na sua conta.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {loyaltyRewards.map((rew) => {
                  const cost = rew.pointsRequired || rew.pointsCost || 0;
                  const canRedeem = customer.loyaltyPoints >= cost;
                  return (
                    <div
                      key={rew.id}
                      className="p-4 rounded-xl border border-hairline bg-muted/20 flex flex-col justify-between"
                    >
                      <div>
                        <Badge variant="outline" className="text-[9px] border-hairline text-muted-foreground mb-1.5 uppercase">
                          {rew.category || rew.rewardType || rew.type}
                        </Badge>
                        <h4 className="font-bold text-sm text-foreground">{rew.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rew.description}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between">
                        <span className="font-mono font-black text-primary text-sm">{cost} pts</span>
                        <Button
                          size="sm"
                          disabled={!canRedeem}
                          onClick={() => handleRedeemClick(rew)}
                          className={`h-7 text-xs font-bold cursor-pointer ${
                            canRedeem
                              ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                              : "bg-muted text-muted-foreground opacity-50"
                          }`}
                        >
                          {canRedeem ? "Resgatar" : "Faltam Pts"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* EXTRATO PESSOAL DO CLIENTE */}
            <Card className="border-hairline bg-card rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Meu Extrato de Pontos
              </h3>

              <div className="divide-y divide-hairline text-xs">
                {customerLedger.length === 0 ? (
                  <p className="text-center py-6 text-muted-foreground text-xs">
                    Nenhuma movimentação de pontos registrada ainda.
                  </p>
                ) : (
                  customerLedger.map((entry) => (
                    <div key={entry.id} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-foreground block">{entry.reason || entry.description || "Movimentação de Fidelidade"}</span>
                        <span className="text-[11px] text-muted-foreground">{entry.createdAt}</span>
                      </div>
                      <span
                        className={`font-mono font-bold text-sm ${
                          entry.points > 0 ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {entry.points > 0 ? `+${entry.points}` : entry.points} pts
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: MEU PLANO DE ASSINATURA                                             */}
        {/* ========================================================================= */}
        {activeTab === "PLAN" && (
          <Card className="border-hairline bg-card rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-hairline pb-3">
              <div>
                <h3 className="font-bold text-base text-foreground">Barber Black VIP</h3>
                <p className="text-xs text-muted-foreground">Plano de recorrência mensal ativo.</p>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs">
                ATIVO
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl border border-hairline bg-muted/20">
                <span className="text-muted-foreground block text-[11px]">Cortes Disponíveis no Mês:</span>
                <span className="text-xl font-bold font-sans text-primary">2 cortes restantes</span>
              </div>
              <div className="p-3 rounded-xl border border-hairline bg-muted/20">
                <span className="text-muted-foreground block text-[11px]">Barboterapias Disponíveis:</span>
                <span className="text-xl font-bold font-sans text-foreground">2 barboterapias restantes</span>
              </div>
            </div>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* ABA: HISTÓRICO DE VISITAS COM AÇÃO "AGENDAR NOVAMENTE"                   */}
        {/* ========================================================================= */}
        {activeTab === "HISTORY" && (
          <Card className="border-hairline bg-card rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-foreground">Últimos Atendimentos</h3>
            <div className="divide-y divide-hairline text-xs">
              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-foreground block">Combo Cabelo + Barba VIP</span>
                  <span className="text-[11px] text-muted-foreground">
                    15 de Setembro de 2026 • com Gabriel Silva • R$ 70,00
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => onOpenBookingModal({ serviceId: "srv-3", prefillCustomer: true })}
                  className="h-8 gap-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 text-xs font-semibold cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Agendar Novamente</span>
                </Button>
              </div>

              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-foreground block">Corte Degradê / Fade Pro</span>
                  <span className="text-[11px] text-muted-foreground">
                    28 de Agosto de 2026 • com Gabriel Silva • R$ 45,00
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => onOpenBookingModal({ serviceId: "srv-1", prefillCustomer: true })}
                  className="h-8 gap-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 text-xs font-semibold cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Agendar Novamente</span>
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
