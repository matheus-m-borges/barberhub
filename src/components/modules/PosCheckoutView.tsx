import React, { useState, useMemo } from "react";
import {
  CreditCard,
  QrCode,
  DollarSign,
  Search,
  Barcode,
  ScanBarcode,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  User,
  UserCheck,
  Scissors,
  Package,
  Percent,
  Check,
  Receipt,
  FileText,
  AlertTriangle,
  ChevronRight,
  Filter,
  Star,
  Gift,
  Award,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ProductItem, ServiceItem, CustomerItem, EmployeeItem } from "@/routes/index";
import type { RoleSlug } from "@/lib/auth/auth.types";
import {
  calculatePointsForSale,
  getTierMultiplier,
  type LoyaltySettings,
  type LoyaltyTierConfig,
  type LoyaltyRedemptionRecord,
} from "@/lib/loyalty/loyalty.service";

export interface AttendanceItem {
  id: string;
  code: string;
  time: string;
  customerName: string;
  customerId?: string | undefined;
  customerPhone?: string | undefined;
  barberName: string;
  employeeId?: string | undefined;
  origin?: string | undefined;
  status:
    | "AGENDADO"
    | "CONFIRMADO"
    | "AGUARDANDO"
    | "EM_ATENDIMENTO"
    | "FINALIZADO"
    | "CONCLUIDO"
    | "CANCELADO"
    | "NAO_COMPARECEU";
  services: Array<{ id: string; name: string; price: number }>;
  products: Array<{ id: string; name: string; price: number; qty: number }>;
  discount: number;
  total: number;
  paymentMethod?: string | undefined;
  notes?: string | undefined;
}

interface PosCheckoutViewProps {
  attendances: AttendanceItem[];
  currentAttendanceId: string | null;
  onSelectAttendance: (id: string) => void;
  onUpdateAttendanceStatus: (id: string, status: AttendanceItem["status"]) => void;
  onOpenQuickAttendanceModal: () => void;
  products: ProductItem[];
  services: ServiceItem[];
  customers: CustomerItem[];
  employees: EmployeeItem[];
  loyaltySettings?: LoyaltySettings;
  loyaltyTiers?: LoyaltyTierConfig[];
  loyaltyRedemptions?: LoyaltyRedemptionRecord[];
  onFinalizeSale: (saleData: {
    attendanceId: string | null;
    customerId?: string | undefined;
    customerName: string;
    barberName: string;
    items: Array<{ name: string; price: number; qty: number; type: "SERVICE" | "PRODUCT" }>;
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: string;
    payments: Array<{ method: string; amount: number }>;
    appliedRedemptionId?: string | undefined;
  }) => void;
  currentUserRole?: RoleSlug;
}

export function PosCheckoutView({
  attendances,
  currentAttendanceId,
  onSelectAttendance,
  onUpdateAttendanceStatus,
  onOpenQuickAttendanceModal,
  products,
  services,
  customers,
  employees,
  loyaltySettings,
  loyaltyTiers,
  loyaltyRedemptions,
  onFinalizeSale,
  currentUserRole,
}: PosCheckoutViewProps) {
  // Limite estrito de desconto por perfil (Regra RBAC)
  const maxDiscountPercent = useMemo(() => {
    if (!currentUserRole) return 100;
    if (currentUserRole === "PROPRIETARIO" || currentUserRole === "ADMINISTRADOR") return 100;
    if (currentUserRole === "GERENTE") return 25;
    return 10; // CAIXA, BARBEIRO, etc.
  }, [currentUserRole]);

  // Filtros da Coluna Esquerda (Atendimentos do Dia)
  const [attendanceFilter, setAttendanceFilter] = useState<
    "TODOS" | "AGUARDANDO" | "EM_ATENDIMENTO" | "FINALIZADOS" | "PENDENTES"
  >("TODOS");

  // Atendimento ativo carregado na comanda da direita
  const activeAttendance = useMemo(() => {
    return attendances.find((a) => a.id === currentAttendanceId) || null;
  }, [attendances, currentAttendanceId]);

  // Itens da Comanda Atual
  const [comandaServices, setComandaServices] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [comandaProducts, setComandaProducts] = useState<Array<{ id: string; name: string; price: number; qty: number }>>([]);
  const [comandaCustomer, setComandaCustomer] = useState<string>("Cliente Balcão");
  const [comandaBarber, setComandaBarber] = useState<string>("Gabriel Silva");
  const [comandaDiscountPercent, setComandaDiscountPercent] = useState<number>(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("PIX");
  const [isSplitPayment, setIsSplitPayment] = useState<boolean>(false);
  const [splitPix, setSplitPix] = useState<string>("0.00");
  const [splitCash, setSplitCash] = useState<string>("0.00");
  const [cashGiven, setCashGiven] = useState<string>("");
  const [receiptSuccess, setReceiptSuccess] = useState<boolean>(false);

  // Busca rápida de código de barras no PDV
  const [barcodeQuery, setBarcodeQuery] = useState<string>("");

  // Cliente Ativo na Comanda
  const activeCustomer = useMemo(() => {
    if (activeAttendance?.customerId) {
      const byId = customers.find((c) => c.id === activeAttendance.customerId);
      if (byId) return byId;
    }
    return customers.find((c) => c.name.toLowerCase() === comandaCustomer.toLowerCase()) || null;
  }, [customers, activeAttendance, comandaCustomer]);

  // Benefício de Recompensa Aplicado na Comanda
  const [appliedRedemptionId, setAppliedRedemptionId] = useState<string | null>(null);

  // Recompensas disponíveis para o cliente ativo
  const customerRedemptions = useMemo(() => {
    if (!activeCustomer || !loyaltyRedemptions) return [];
    return loyaltyRedemptions.filter(
      (r) => r.customerId === activeCustomer.id && r.status === "DISPONIVEL"
    );
  }, [activeCustomer, loyaltyRedemptions]);

  // Quando o atendimento selecionado mudar, sincroniza a comanda
  React.useEffect(() => {
    if (activeAttendance) {
      setComandaServices(activeAttendance.services);
      setComandaProducts(activeAttendance.products);
      setComandaCustomer(activeAttendance.customerName);
      setComandaBarber(activeAttendance.barberName);
      setComandaDiscountPercent(activeAttendance.discount || 0);
      setAppliedRedemptionId(null);
      setReceiptSuccess(false);
    }
  }, [activeAttendance]);

  // Filtro de Atendimentos do Dia
  const filteredAttendances = useMemo(() => {
    return attendances.filter((a) => {
      if (attendanceFilter === "TODOS") return true;
      if (attendanceFilter === "AGUARDANDO") return a.status === "AGUARDANDO";
      if (attendanceFilter === "EM_ATENDIMENTO") return a.status === "EM_ATENDIMENTO";
      if (attendanceFilter === "FINALIZADOS") return a.status === "FINALIZADO";
      if (attendanceFilter === "PENDENTES") return a.status === "AGENDADO" || a.status === "AGUARDANDO";
      return true;
    });
  }, [attendances, attendanceFilter]);

  // Cálculos da Comanda
  const subtotalServices = comandaServices.reduce((acc, s) => acc + s.price, 0);
  const subtotalProducts = comandaProducts.reduce((acc, p) => acc + p.price * p.qty, 0);
  const totalSubtotal = Number((subtotalServices + subtotalProducts).toFixed(2));
  const discountVal = Number(((totalSubtotal * comandaDiscountPercent) / 100).toFixed(2));
  const grandTotal = Number(Math.max(0, totalSubtotal - discountVal).toFixed(2));

  // Previsão de Pontos calculada deterministicamente pelo motor de fidelidade
  const pointsPreview = useMemo(() => {
    if (!activeCustomer || !loyaltySettings) return 0;
    const items = [
      ...comandaServices.map((s) => ({ type: "SERVICE" as const, price: s.price, qty: 1 })),
      ...comandaProducts.map((p) => ({ type: "PRODUCT" as const, price: p.price, qty: p.qty })),
    ];
    const calc = calculatePointsForSale({
      items,
      settings: loyaltySettings,
      tierMultiplier: getTierMultiplier(activeCustomer.loyaltyTier, loyaltyTiers || []),
    });
    return calc.pointsToEarn;
  }, [activeCustomer, comandaServices, comandaProducts, loyaltySettings, loyaltyTiers]);

  // Cálculo de troco
  const cashGivenNum = parseFloat(cashGiven) || 0;
  const changeDue = selectedPaymentMethod === "DINHEIRO" && cashGivenNum > grandTotal
    ? Number((cashGivenNum - grandTotal).toFixed(2))
    : 0;

  // Ações na Comanda
  const handleAddProductToComanda = (prod: ProductItem) => {
    setComandaProducts((prev) => {
      const exists = prev.find((p) => p.id === prod.id);
      if (exists) {
        return prev.map((p) => (p.id === prod.id ? { ...p, qty: p.qty + 1 } : p));
      }
      return [...prev, { id: prod.id, name: prod.name, price: prod.sale, qty: 1 }];
    });
    setReceiptSuccess(false);
  };

  const handleDecreaseProduct = (prodId: string) => {
    setComandaProducts((prev) => {
      const found = prev.find((p) => p.id === prodId);
      if (!found) return prev;
      if (found.qty <= 1) {
        return prev.filter((p) => p.id !== prodId);
      }
      return prev.map((p) => (p.id === prodId ? { ...p, qty: p.qty - 1 } : p));
    });
    setReceiptSuccess(false);
  };

  const handleAddServiceToComanda = (srv: ServiceItem) => {
    setComandaServices((prev) => [...prev, { id: srv.id, name: srv.name, price: srv.price }]);
    setReceiptSuccess(false);
  };

  const handleRemoveProduct = (prodId: string) => {
    setComandaProducts((prev) => prev.filter((p) => p.id !== prodId));
  };

  const handleRemoveService = (index: number) => {
    setComandaServices((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = barcodeQuery.trim().toLowerCase();
    if (!q) return;

    const found = products.find(
      (p) =>
        p.status === "ACTIVE" &&
        (p.barcode === q || p.sku.toLowerCase() === q || p.name.toLowerCase().includes(q))
    );

    if (found) {
      handleAddProductToComanda(found);
      setBarcodeQuery("");
    }
  };

  const handleProcessCheckout = () => {
    if (totalSubtotal <= 0) return;

    const paymentsList = isSplitPayment
      ? [
          { method: "PIX", amount: parseFloat(splitPix) || 0 },
          { method: "DINHEIRO", amount: parseFloat(splitCash) || 0 },
        ]
      : [{ method: selectedPaymentMethod, amount: grandTotal }];

    const itemsList = [
      ...comandaServices.map((s) => ({ name: s.name, price: s.price, qty: 1, type: "SERVICE" as const })),
      ...comandaProducts.map((p) => ({ name: p.name, price: p.price, qty: p.qty, type: "PRODUCT" as const })),
    ];

    onFinalizeSale({
      attendanceId: currentAttendanceId,
      customerId: activeCustomer?.id,
      customerName: comandaCustomer,
      barberName: comandaBarber,
      items: itemsList,
      subtotal: totalSubtotal,
      discount: discountVal,
      total: grandTotal,
      paymentMethod: isSplitPayment ? "DIVIDIDO (PIX + DINHEIRO)" : selectedPaymentMethod,
      payments: paymentsList,
      appliedRedemptionId: appliedRedemptionId || undefined,
    });

    setReceiptSuccess(true);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Topo do Módulo PDV */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <CreditCard className="h-6 w-6 text-primary" />
            Frente de Caixa & Recepção Integrada
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Centro de atendimento: comanda em tempo real, atendimentos do dia e pagamentos.
          </p>
        </div>

        {/* Botão + NOVO ATENDIMENTO (Sem Agendamento) */}
        <Button
          onClick={onOpenQuickAttendanceModal}
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-md shadow-primary/25 cursor-pointer h-9 px-4 gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>+ Novo Atendimento (Balcão)</span>
        </Button>
      </div>

      {/* Grid Principal Dividido: Lado Esquerdo = Atendimentos do Dia | Lado Direito = Comanda Atual */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LADO ESQUERDO (Col 5 de 12): ATENDIMENTOS DO DIA                         */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="bg-card border-hairline shadow-md rounded-2xl">
            <CardHeader className="pb-3 border-b border-hairline">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">Atendimentos do Dia</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">Fila e recepção em tempo real</CardDescription>
                </div>
                <Badge variant="outline" className="border-primary/30 text-primary text-xs font-mono">
                  {filteredAttendances.length} registros
                </Badge>
              </div>

              {/* Filtros da Lista */}
              <div className="flex flex-wrap gap-1 pt-3 text-[11px]">
                {(["TODOS", "AGUARDANDO", "EM_ATENDIMENTO", "FINALIZADOS", "PENDENTES"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setAttendanceFilter(filter)}
                    className={`px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer ${
                      attendanceFilter === filter
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    {filter === "TODOS"
                      ? "Todos"
                      : filter === "AGUARDANDO"
                      ? "Aguardando"
                      : filter === "EM_ATENDIMENTO"
                      ? "Na Cadeira"
                      : filter === "FINALIZADOS"
                      ? "Finalizados"
                      : "Pendentes"}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-3 space-y-2.5 max-h-[620px] overflow-y-auto">
              {filteredAttendances.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs">
                  Nenhum atendimento nesta categoria.
                </div>
              ) : (
                filteredAttendances.map((item) => {
                  const isSelected = item.id === currentAttendanceId;
                  const isCompleted = item.status === "FINALIZADO";
                  const inChair = item.status === "EM_ATENDIMENTO";
                  const isWaiting = item.status === "AGUARDANDO";

                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectAttendance(item.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                        isSelected
                          ? "bg-primary/10 border-primary shadow-sm"
                          : "bg-muted/20 border-hairline hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-muted-foreground">{item.code}</span>
                          <span className="text-xs font-bold text-foreground">{item.customerName}</span>
                        </div>

                        {/* Status Badge */}
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-bold py-0.5 px-2 ${
                            isCompleted
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : inChair
                              ? "bg-primary/20 text-primary border-primary/40 animate-pulse"
                              : isWaiting
                              ? "bg-[#8b5cf6]/20 text-[#a78bfa] border-[#8b5cf6]/40"
                              : "bg-muted text-muted-foreground border-hairline"
                          }`}
                        >
                          {item.status.replace("_", " ")}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2 truncate">
                          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>{item.time}</span>
                          <span>•</span>
                          <span className="truncate">Barbeiro: <strong className="text-foreground">{item.barberName}</strong></span>
                        </div>

                        <span className="font-bold text-foreground text-sm font-sans shrink-0">
                          {item.total > 0 ? (
                            `R$ ${item.total.toFixed(2)}`
                          ) : (
                            <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full font-medium">
                              Em Aberto
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Ações de Status Rápido */}
                      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-hairline/60">
                        {item.status === "AGENDADO" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateAttendanceStatus(item.id, "AGUARDANDO");
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#8b5cf6]/20 text-[#a78bfa] hover:bg-[#8b5cf6] hover:text-white transition-colors"
                          >
                            Check-in
                          </button>
                        )}
                        {item.status === "AGUARDANDO" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateAttendanceStatus(item.id, "EM_ATENDIMENTO");
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                          >
                            Iniciar Atendimento
                          </button>
                        )}
                        {item.status === "EM_ATENDIMENTO" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectAttendance(item.id);
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors"
                          >
                            Abrir Comanda &gt;
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* LADO DIREITO (Col 7 de 12): COMANDA & FECHAMENTO DO ATENDIMENTO ATUAL    */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="bg-card border-hairline shadow-lg rounded-2xl">
            <CardHeader className="pb-3 border-b border-hairline flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg font-bold text-foreground">
                    Comanda Operacional
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span>Cliente: <strong className="text-foreground">{comandaCustomer}</strong></span>
                  <span>•</span>
                  <span>Profissional:</span>
                  <select
                    value={comandaBarber}
                    onChange={(e) => setComandaBarber(e.target.value)}
                    className="bg-muted/40 border border-hairline rounded px-1.5 py-0.5 text-xs text-foreground font-semibold cursor-pointer"
                  >
                    {employees.filter((e) => e.role === "BARBEIRO" && e.status === "ACTIVE").map((e) => (
                      <option key={e.id} value={e.name}>{e.name}</option>
                    ))}
                  </select>
                </CardDescription>
              </div>

              {receiptSuccess && (
                <Badge className="bg-emerald-500 text-white font-bold text-xs py-1 px-3">
                  <Check className="h-3.5 w-3.5 mr-1" /> Venda Concluída
                </Badge>
              )}
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-5">
              {/* Painel de Fidelidade & Benefícios do Cliente Ativo */}
              {activeCustomer && (
                <div className="bg-muted/20 border border-hairline rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 text-primary fill-primary" />
                      {activeCustomer.loyaltyPoints ?? 0} pts
                    </span>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase border-amber-500/40 text-amber-400">
                      <Award className="h-3 w-3 mr-1" />
                      {activeCustomer.loyaltyTier || "BRONZE"}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] font-bold uppercase">
                      {activeCustomer.crmSegment || activeCustomer.tag}
                    </Badge>
                  </div>

                  {/* Benefícios e Recompensas Prontas para Resgate */}
                  {customerRedemptions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                        <Gift className="h-3.5 w-3.5" />
                        {customerRedemptions.length} benefício(s) disponível(is)!
                      </span>
                      {customerRedemptions.map((red) => {
                        const isApplied = appliedRedemptionId === red.id;
                        return (
                          <button
                            key={red.id}
                            type="button"
                            onClick={() => {
                              if (isApplied) {
                                setAppliedRedemptionId(null);
                                setComandaDiscountPercent(0);
                              } else {
                                setAppliedRedemptionId(red.id);
                                setComandaDiscountPercent(100);
                              }
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition-all ${
                              isApplied
                                ? "bg-emerald-500 text-white border-emerald-400"
                                : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                            }`}
                          >
                            {isApplied ? "✓ Recompensa Aplicada (100% OFF)" : `Aplicar: ${red.rewardName}`}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Leitor Rápido de Código de Barras / SKU ou Dropdown de Produtos */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <form onSubmit={handleBarcodeSubmit} className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                      <ScanBarcode className="absolute left-3 top-2.5 h-4 w-4 text-primary" />
                      <Input
                        placeholder="Bipe código de barras ou busque nome do produto..."
                        value={barcodeQuery}
                        onChange={(e) => setBarcodeQuery(e.target.value)}
                        className="pl-9 bg-muted/30 border-hairline text-xs h-9"
                      />
                    </div>
                    <Button type="submit" size="sm" className="h-9 px-3 bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs cursor-pointer">
                      Buscar
                    </Button>
                  </form>

                  {/* Seletor Dropdown de Produto do Estoque */}
                  <select
                    onChange={(e) => {
                      const found = products.find((p) => p.id === e.target.value);
                      if (found) {
                        handleAddProductToComanda(found);
                        e.target.value = "";
                      }
                    }}
                    defaultValue=""
                    className="h-9 px-2.5 bg-muted/30 border border-hairline rounded-lg text-xs text-foreground cursor-pointer sm:w-56"
                  >
                    <option value="" disabled>+ Adicionar Produto...</option>
                    {products.filter((p) => p.status === "ACTIVE").map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — R$ {p.sale.toFixed(2)} (Est: {p.stock})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Botões de Adição Rápida de Produtos em Destaque no PDV */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Package className="h-3.5 w-3.5 text-primary" />
                      Produtos Rápidos (Bebidas, Pomadas)
                    </span>
                    <span className="text-[10px] text-primary">1 clique para lançar</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {products.filter((p) => p.isQuickPos).slice(0, 4).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddProductToComanda(p)}
                        className="p-2 rounded-xl bg-muted/20 hover:bg-primary/10 border border-hairline hover:border-primary text-left transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <span className="text-[11px] font-bold text-foreground line-clamp-1">{p.name}</span>
                        <div className="flex items-center justify-between mt-1 text-[10px]">
                          <span className="font-semibold text-primary">R$ {p.sale.toFixed(2)}</span>
                          <span className="text-muted-foreground font-mono">Est: {p.stock}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Seletor de Serviços para Adicionar na Comanda */}
              <div className="space-y-2 pt-2 border-t border-hairline">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Scissors className="h-3.5 w-3.5 text-primary" />
                    <span>Lançar Serviços na Comanda:</span>
                  </span>
                  <select
                    onChange={(e) => {
                      const s = services.find((x) => x.id === e.target.value);
                      if (s) {
                        handleAddServiceToComanda(s);
                        e.target.value = "";
                      }
                    }}
                    defaultValue=""
                    className="h-8 px-2 bg-muted/30 border border-hairline rounded-lg text-xs text-foreground cursor-pointer sm:w-64"
                  >
                    <option value="" disabled>+ Selecionar outro serviço do catálogo...</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — R$ {s.price.toFixed(2)} ({s.duration})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleAddServiceToComanda(s)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-muted/30 hover:bg-muted border border-hairline text-foreground cursor-pointer transition-colors"
                    >
                      + {s.name} (R$ {s.price.toFixed(0)})
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabela dos Itens Lançados na Comanda */}
              <div className="rounded-xl border border-hairline overflow-hidden">
                <div className="bg-muted/40 px-3 py-2 text-[11px] font-bold text-muted-foreground grid grid-cols-12 gap-2">
                  <span className="col-span-5">Item / Descrição</span>
                  <span className="col-span-2 text-center">Tipo</span>
                  <span className="col-span-2 text-center">Qtd</span>
                  <span className="col-span-2 text-right">Valor</span>
                  <span className="col-span-1 text-center">✕</span>
                </div>

                <div className="divide-y divide-hairline max-h-56 overflow-y-auto">
                  {comandaServices.length === 0 && comandaProducts.length === 0 ? (
                    <div className="p-6 text-center bg-primary/5 space-y-1.5">
                      <Receipt className="h-6 w-6 text-primary mx-auto opacity-75" />
                      <div className="text-xs font-bold text-foreground">Comanda em Aberto (Sem itens ainda)</div>
                      <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                        Adicione os serviços realizados e produtos consumidos nos botões acima para fechar a conta do cliente.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Serviços */}
                      {comandaServices.map((srv, idx) => (
                        <div key={`srv-${idx}`} className="px-3 py-2 text-xs grid grid-cols-12 gap-2 items-center hover:bg-muted/10">
                          <span className="col-span-5 font-semibold text-foreground truncate">{srv.name}</span>
                          <span className="col-span-2 text-center">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#8b5cf6]/20 text-[#a78bfa]">
                              SERVIÇO
                            </span>
                          </span>
                          <span className="col-span-2 text-center font-mono text-muted-foreground">1x</span>
                          <span className="col-span-2 text-right font-mono font-bold text-foreground">
                            R$ {srv.price.toFixed(2)}
                          </span>
                          <button
                            onClick={() => handleRemoveService(idx)}
                            className="col-span-1 text-muted-foreground hover:text-red-400 text-center cursor-pointer"
                            title="Remover serviço"
                          >
                            ✕
                          </button>
                        </div>
                      ))}

                      {/* Produtos */}
                      {comandaProducts.map((prod) => (
                        <div key={`prod-${prod.id}`} className="px-3 py-2 text-xs grid grid-cols-12 gap-2 items-center hover:bg-muted/10">
                          <span className="col-span-5 font-semibold text-foreground truncate">
                            {prod.name}
                          </span>
                          <span className="col-span-2 text-center">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/20 text-primary">
                              PRODUTO
                            </span>
                          </span>
                          <div className="col-span-2 flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDecreaseProduct(prod.id)}
                              className="h-4.5 w-4.5 rounded bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center text-xs font-bold cursor-pointer"
                              title="Diminuir quantidade"
                            >
                              -
                            </button>
                            <span className="font-mono text-xs font-bold px-0.5">{prod.qty}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const p = products.find((x) => x.id === prod.id);
                                if (p) handleAddProductToComanda(p);
                              }}
                              className="h-4.5 w-4.5 rounded bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center text-xs font-bold cursor-pointer"
                              title="Aumentar quantidade"
                            >
                              +
                            </button>
                          </div>
                          <span className="col-span-2 text-right font-mono font-bold text-foreground">
                            R$ {(prod.price * prod.qty).toFixed(2)}
                          </span>
                          <button
                            onClick={() => handleRemoveProduct(prod.id)}
                            className="col-span-1 text-muted-foreground hover:text-red-400 text-center cursor-pointer"
                            title="Remover produto"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Bloco de Totais, Desconto e Formas de Pagamento */}
              <div className="pt-4 border-t border-hairline space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-muted/20 p-3.5 rounded-xl border border-hairline">
                  {/* Desconto */}
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Desconto (%):</span>
                    <Input
                      type="number"
                      min="0"
                      max={maxDiscountPercent}
                      value={comandaDiscountPercent}
                      onChange={(e) =>
                        setComandaDiscountPercent(
                          Math.min(maxDiscountPercent, Math.max(0, parseInt(e.target.value) || 0))
                        )
                      }
                      className="w-16 h-8 text-center text-xs font-bold bg-background border-hairline"
                    />
                    {maxDiscountPercent < 100 && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        (Máx {maxDiscountPercent}%)
                      </span>
                    )}
                    {discountVal > 0 && (
                      <span className="text-xs text-red-400 font-mono font-bold">- R$ {discountVal.toFixed(2)}</span>
                    )}
                  </div>

                  {/* Valor Total */}
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground block">Total a Pagar</span>
                    <span className="text-2xl font-black text-foreground font-sans text-primary">
                      R$ {grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Métodos de Pagamento */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">Forma de Pagamento</span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={isSplitPayment}
                        onChange={(e) => setIsSplitPayment(e.target.checked)}
                        className="rounded border-hairline"
                      />
                      <span>Dividir Pagamento (PIX + Dinheiro)</span>
                    </label>
                  </div>

                  {!isSplitPayment ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "PIX", label: "PIX QrCode", icon: QrCode },
                        { id: "CARTAO_CREDITO", label: "Crédito", icon: CreditCard },
                        { id: "CARTAO_DEBITO", label: "Débito", icon: CreditCard },
                        { id: "DINHEIRO", label: "Dinheiro", icon: DollarSign },
                      ].map((method) => {
                        const Icon = method.icon;
                        const isSelected = selectedPaymentMethod === method.id;
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setSelectedPaymentMethod(method.id)}
                            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-muted/20 border-hairline text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{method.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Pagamento Dividido */
                    <div className="p-3 rounded-xl bg-muted/30 border border-hairline grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[11px] text-muted-foreground block mb-1">Valor no PIX (R$):</label>
                        <Input
                          type="number"
                          value={splitPix}
                          onChange={(e) => setSplitPix(e.target.value)}
                          className="h-8 text-xs font-mono font-bold bg-background border-hairline"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground block mb-1">Valor em Dinheiro (R$):</label>
                        <Input
                          type="number"
                          value={splitCash}
                          onChange={(e) => setSplitCash(e.target.value)}
                          className="h-8 text-xs font-mono font-bold bg-background border-hairline"
                        />
                      </div>
                    </div>
                  )}

                  {/* Campo de Troco para Dinheiro */}
                  {selectedPaymentMethod === "DINHEIRO" && !isSplitPayment && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-hairline text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Valor Recebido (R$):</span>
                        <Input
                          type="number"
                          placeholder="Ex: 100"
                          value={cashGiven}
                          onChange={(e) => setCashGiven(e.target.value)}
                          className="w-24 h-8 text-xs font-mono font-bold bg-background border-hairline"
                        />
                      </div>
                      {changeDue > 0 && (
                        <div className="text-right">
                          <span className="text-muted-foreground text-[11px] block">Troco do Cliente:</span>
                          <span className="text-emerald-400 font-bold font-mono text-sm">
                            R$ {changeDue.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Previsão de Pontos da Venda */}
                {activeCustomer && (
                  <div className="bg-primary/10 border border-primary/25 rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Star className="h-4 w-4 text-primary fill-primary" />
                      Previsão de Fidelidade ({activeCustomer.loyaltyTier}):
                    </span>
                    <span className="font-mono font-bold text-primary">
                      +{pointsPreview} pontos após pagamento confirmado
                    </span>
                  </div>
                )}

                {/* Botão de Finalização da Venda */}
                <Button
                  onClick={handleProcessCheckout}
                  disabled={totalSubtotal <= 0}
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/30 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Receber e Finalizar Venda (R$ {grandTotal.toFixed(2)})
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
