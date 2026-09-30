import React, { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Scissors,
  CheckCircle,
  Plus,
  Clock,
  User,
  Users,
  Building2,
  Lock,
  Smartphone,
  Check,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// Componentes do Layout
import { AppSidebar, type NavTabId } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";

// Componentes Modulares
import { DashboardView } from "@/components/modules/DashboardView";
import { PosCheckoutView, type AttendanceItem } from "@/components/modules/PosCheckoutView";
import { AgendaView } from "@/components/modules/AgendaView";
import { CashRegisterView, type CashMovement } from "@/components/modules/CashRegisterView";
import { CustomersView } from "@/components/modules/CustomersView";
import { StockView } from "@/components/modules/StockView";
import { EmployeesView } from "@/components/modules/EmployeesView";
import { WaitingListView, type WaitingClient } from "@/components/modules/WaitingListView";
import { FinancialView } from "@/components/modules/FinancialView";
import { LoyaltyPlansView } from "@/components/modules/LoyaltyPlansView";
import { ReportsView } from "@/components/modules/ReportsView";
import { SettingsView, type SettingsSubTab } from "@/components/modules/SettingsView";
import { QuickAttendanceModal } from "@/components/modules/QuickAttendanceModal";
import { ReceptionView } from "@/components/modules/ReceptionView";
import { BarberPortalView } from "@/components/modules/BarberPortalView";
import { CommissionsView } from "@/components/modules/CommissionsView";
import { SchedulesView } from "@/components/modules/SchedulesView";
import { GoalsView } from "@/components/modules/GoalsView";
import { PackagesView } from "@/components/modules/PackagesView";
import { SuppliesView } from "@/components/modules/SuppliesView";
import { SuppliersPurchasesView } from "@/components/modules/SuppliersPurchasesView";
import { CentralAtendimentoView } from "@/components/modules/CentralAtendimentoView";
import { MarketingView } from "@/components/modules/MarketingView";
import { ReviewsView } from "@/components/modules/ReviewsView";
import { PublicSiteView } from "@/components/modules/PublicSiteView";
import { CustomerPortalView } from "@/components/modules/CustomerPortalView";
import type { BotConversation, BotMessage, BotQuickAction, BotKnowledgeFaq } from "@/lib/bot/bot.types";
import { processBotMessage, type BotEngineContext } from "@/lib/bot/bot.engine";
import { whatsAppVault } from "@/lib/whatsapp/whatsapp-vault.service";
import {
  buildAttendantWhatsAppOutbound,
  sendWhatsAppCloudMessage,
} from "@/lib/whatsapp/whatsapp-adapter.service";
import {
  UnifiedBookingModal,
  type BookingSubmissionData,
  type WaitingListSubmissionData,
  type BookingOrigin,
} from "@/components/modules/UnifiedBookingModal";
import type { RoleSlug } from "@/lib/auth/auth.types";
import {
  DEFAULT_LOYALTY_SETTINGS,
  DEFAULT_LOYALTY_TIERS,
  calculatePointsForSale,
  processPaymentLoyaltyEarn,
  processSaleReversal,
  redeemRewardWithLedger,
  checkAndApplyBirthdayBonus,
  processReferralReward,
  manualAdjustPoints,
  calculateCrmSegment,
  getTierMultiplier,
  determineLoyaltyTier,
  type LoyaltySettings,
  type LoyaltyLedgerEntry,
  type LoyaltyRewardItem,
  type LoyaltyRedemptionRecord,
  type LoyaltyTierConfig,
  type LoyaltyTierName,
  type CrmSegment,
} from "@/lib/loyalty/loyalty.service";
import { OfficialAuthView, type AuthenticatedUser } from "@/components/auth/OfficialAuthView";
import { UserProfileModal } from "@/components/auth/UserProfileModal";
import { NavorEnvironmentSelectorModal } from "@/components/auth/NavorEnvironmentSelectorModal";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BarberHub Pro — ERP Comercial Integrado para Barbearias" },
      {
        name: "description",
        content: "Sistema completo de gestão comercial para barbearias: agenda, PDV, clientes, estoque, financeiro e auditoria.",
      },
      { property: "og:title", content: "BarberHub Pro ERP" },
      {
        property: "og:description",
        content: "Gestão completa para barbearias de alto padrão.",
      },
    ],
  }),
  component: BarberHubErpApp,
});

// Tipos Principais do ERP BarberHub Pro
export interface ProductItem {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  cost: number;
  sale: number;
  stock: number;
  min: number;
  unit: string;
  isQuickPos: boolean;
  status: "ACTIVE" | "INACTIVE";
}

export interface ServiceItem {
  id: string;
  name: string;
  duration: string;
  price: number;
  commPercent: number;
  commValue: number;
  category?: string;
}

export interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  cpf: string;
  email: string;
  birthDate?: string | undefined;
  visits: number;
  spent: number;
  avg: number;
  tag: string;
  crmSegment: CrmSegment;
  loyaltyPoints: number;
  lifetimePoints: number;
  loyaltyTier: LoyaltyTierName;
  preferredBarberId?: string | undefined;
  preferredBarberName?: string | undefined;
  referralCode?: string | undefined;
  referredByCustomerId?: string | undefined;
  notes: string;
  lastVisitAt?: string | undefined;
}

export interface EmployeeItem {
  id: string;
  name: string;
  role: "BARBEIRO" | "RECEPCIONISTA" | "GERENTE" | "CAIXA" | "ESTOQUISTA";
  phone: string;
  cpf: string;
  salary: number;
  commissionRate: number;
  pixKey: string;
  status: "ACTIVE" | "INACTIVE";
  eligibleForAppointments: boolean;
}

export interface BusinessSettings {
  name: string;
  cnpj: string;
  phone: string;
  address: string;
  weekdayOpeningTime: string;
  weekdayClosingTime: string;
  intervalMinutes: number;
  bufferMinutes: number;
  cancellationGraceMinutes: number;
  enableOnlineBooking: boolean;
}

export function BarberHubErpApp() {
  // Estado de Navegação Principal
  const [activeTab, setActiveTab] = useState<NavTabId | string>("dashboard");
  const [activeSettingsSubTab, setActiveSettingsSubTab] = useState<SettingsSubTab>("settings_business");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Usuário e Sessão Oficial NAVOR
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("barberhub_session_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNavorSelectorOpen, setIsNavorSelectorOpen] = useState(false);

  // Notificação Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  // Modais de Cadastro e Ação
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [bookingModalMode, setBookingModalMode] = useState<"PUBLIC" | "INTERNAL">("INTERNAL");
  const [bookingModalOrigin, setBookingModalOrigin] = useState<BookingOrigin>("SITE");
  const [bookingInitialServiceId, setBookingInitialServiceId] = useState<string | undefined>(undefined);
  const [bookingInitialEmployeeId, setBookingInitialEmployeeId] = useState<string | undefined>(undefined);
  const [bookingPrefilledCustomer, setBookingPrefilledCustomer] = useState<{ name: string; phone: string; id?: string | undefined } | undefined>(undefined);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isNewEmployeeModalOpen, setIsNewEmployeeModalOpen] = useState(false);
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);
  const [isQuickAttendanceModalOpen, setIsQuickAttendanceModalOpen] = useState(false);

  // =========================================================================
  // DADOS DE CONFIGURAÇÕES DA EMPRESA
  // =========================================================================
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    name: "BarberHub Studio",
    cnpj: "",
    phone: "",
    address: "",
    weekdayOpeningTime: "08:00",
    weekdayClosingTime: "20:00",
    intervalMinutes: 30,
    bufferMinutes: 5,
    cancellationGraceMinutes: 120,
    enableOnlineBooking: true,
  });

  // =========================================================================
  // EQUIPE E COLABORADORES
  // =========================================================================
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);

  // Form Novo Colaborador
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeRole, setNewEmployeeRole] = useState<"BARBEIRO" | "RECEPCIONISTA" | "GERENTE" | "CAIXA" | "ESTOQUISTA">("BARBEIRO");
  const [newEmployeePhone, setNewEmployeePhone] = useState("");
  const [newEmployeeCpf, setNewEmployeeCpf] = useState("");
  const [newEmployeeSalary, setNewEmployeeSalary] = useState("0.00");
  const [newEmployeeCommission, setNewEmployeeCommission] = useState("50");
  const [newEmployeePix, setNewEmployeePix] = useState("");

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeName.trim()) return;
    const isBarber = newEmployeeRole === "BARBEIRO";
    const newItem: EmployeeItem = {
      id: `emp-${Date.now()}`,
      name: newEmployeeName.trim(),
      role: newEmployeeRole,
      phone: newEmployeePhone || "(11) 99999-0000",
      cpf: newEmployeeCpf || "000.000.000-00",
      salary: parseFloat(newEmployeeSalary) || 0,
      commissionRate: parseFloat(newEmployeeCommission) || 0,
      pixKey: newEmployeePix.trim() || newEmployeePhone,
      status: "ACTIVE",
      eligibleForAppointments: isBarber,
    };
    setEmployees((prev) => [...prev, newItem]);
    setIsNewEmployeeModalOpen(false);
    setNewEmployeeName("");
    setNewEmployeePhone("");
    setNewEmployeeCpf("");
    setNewEmployeeSalary("0.00");
    setNewEmployeeCommission("50");
    setNewEmployeePix("");
    showToast(`Colaborador ${newItem.name} (${newItem.role}) cadastrado com sucesso!`);
  };

  const toggleEmployeeStatus = (empId: string) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === empId ? { ...e, status: e.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" } : e))
    );
  };

  // =========================================================================
  // CATÁLOGO DE SERVIÇOS
  // =========================================================================
  const [services, setServices] = useState<ServiceItem[]>([]);

  // Form Novo Serviço
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState("30 min");
  const [newServicePrice, setNewServicePrice] = useState("40.00");
  const [newServiceCommission, setNewServiceCommission] = useState("50");

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    const priceNum = parseFloat(newServicePrice) || 0;
    const commNum = parseFloat(newServiceCommission) || 0;
    const newSrv: ServiceItem = {
      id: `srv-${Date.now()}`,
      name: newServiceName.trim(),
      duration: newServiceDuration.trim() || "30 min",
      price: priceNum,
      commPercent: commNum,
      commValue: Number(((priceNum * commNum) / 100).toFixed(2)),
    };
    setServices((prev) => [...prev, newSrv]);
    setIsNewServiceModalOpen(false);
    setNewServiceName("");
    setNewServicePrice("40.00");
    setNewServiceCommission("50");
    showToast(`Serviço "${newSrv.name}" cadastrado com sucesso!`);
  };

  // =========================================================================
  // ESTOQUE & PRODUTOS
  // =========================================================================
  const [products, setProducts] = useState<ProductItem[]>([]);

  // Form Novo Produto
  const [newProdName, setNewProdName] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("Finalizadores");
  const [newProdSku, setNewProdSku] = useState("");
  const [newProdBarcode, setNewProdBarcode] = useState("");
  const [newProdCost, setNewProdCost] = useState("15.00");
  const [newProdSale, setNewProdSale] = useState("40.00");
  const [newProdStock, setNewProdStock] = useState("10");
  const [newProdMin, setNewProdMin] = useState("4");
  const [newProdQuickPos, setNewProdQuickPos] = useState(true);

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;
    const newProd: ProductItem = {
      id: `prod-${Date.now()}`,
      name: newProdName.trim(),
      sku: newProdSku.trim() || `PRD-${Math.floor(100 + Math.random() * 900)}`,
      barcode: newProdBarcode.trim() || `7891000${Math.floor(1000 + Math.random() * 9000)}`,
      category: newProdCategory,
      cost: parseFloat(newProdCost) || 0,
      sale: parseFloat(newProdSale) || 0,
      stock: parseInt(newProdStock, 10) || 0,
      min: parseInt(newProdMin, 10) || 0,
      unit: "UN",
      isQuickPos: newProdQuickPos,
      status: "ACTIVE",
    };
    setProducts((prev) => [newProd, ...prev]);
    setIsNewProductModalOpen(false);
    setNewProdName("");
    setNewProdCost("15.00");
    setNewProdSale("40.00");
    showToast(`Produto "${newProd.name}" cadastrado com sucesso!`);
  };

  const toggleProductQuickPos = (prodId: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === prodId ? { ...p, isQuickPos: !p.isQuickPos } : p))
    );
  };

  const adjustProductStock = (prodId: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === prodId ? { ...p, stock: Math.max(0, p.stock + delta) } : p))
    );
  };

  // =========================================================================
  // CLIENTES (CRM) & MOTOR DE FIDELIDADE INTEGRADO
  // =========================================================================
  const [customers, setCustomers] = useState<CustomerItem[]>([]);

  // MOTOR CENTRAL DE FIDELIDADE (CONFIGURAÇÕES, NÍVEIS, RECOMPENSAS E EXTRATO)
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>(DEFAULT_LOYALTY_SETTINGS);
  const [loyaltyTiers, setLoyaltyTiers] = useState<LoyaltyTierConfig[]>(DEFAULT_LOYALTY_TIERS);
  const [loyaltyRewards, setLoyaltyRewards] = useState<LoyaltyRewardItem[]>([]);
  const [loyaltyLedger, setLoyaltyLedger] = useState<LoyaltyLedgerEntry[]>([]);
  const [loyaltyRedemptions, setLoyaltyRedemptions] = useState<LoyaltyRedemptionRecord[]>([]);

  // Form Novo Cliente
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustCpf, setNewCustCpf] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustBirthDate, setNewCustBirthDate] = useState("");
  const [newCustReferrerCode, setNewCustReferrerCode] = useState("");
  const [newCustNotes, setNewCustNotes] = useState("");
  const [newCustTag, setNewCustTag] = useState("Novo");

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    // Gera código exclusivo de indicação
    const firstWord = newCustName.trim().split(" ")[0] || "CLIENTE";
    const cleanPrefix = firstWord.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) || "CLIENTE";
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const generatedReferralCode = `${cleanPrefix}-${randomSuffix}`;

    // Verifica se foi indicado por outro cliente
    let referrerCustId: string | undefined = undefined;
    if (newCustReferrerCode.trim()) {
      const foundReferrer = customers.find(
        (c) => c.referralCode?.toLowerCase() === newCustReferrerCode.trim().toLowerCase()
      );
      if (foundReferrer) {
        referrerCustId = foundReferrer.id;
      }
    }

    const newCust: CustomerItem = {
      id: `c-${Date.now()}`,
      name: newCustName.trim(),
      phone: newCustPhone.trim() || "(11) 90000-0000",
      cpf: newCustCpf.trim() || "000.000.000-00",
      email: newCustEmail.trim() || "cliente@email.com",
      birthDate: newCustBirthDate.trim() || undefined,
      visits: 0,
      spent: 0.0,
      avg: 0.0,
      tag: newCustTag,
      crmSegment: "NOVO",
      loyaltyPoints: 0,
      lifetimePoints: 0,
      loyaltyTier: "BRONZE",
      referralCode: generatedReferralCode,
      referredByCustomerId: referrerCustId,
      notes: newCustNotes.trim(),
    };

    setCustomers((prev) => [newCust, ...prev]);
    setIsNewCustomerModalOpen(false);
    setNewCustName("");
    setNewCustPhone("");
    setNewCustCpf("");
    setNewCustEmail("");
    setNewCustBirthDate("");
    setNewCustReferrerCode("");
    setNewCustNotes("");
    showToast(`Cliente "${newCust.name}" cadastrado com sucesso! Código: ${generatedReferralCode}`);
  };

  // =========================================================================
  // ATENDIMENTOS & COMANDAS (AGENDA + CAIXA INTEGRADOS)
  // =========================================================================
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [currentAttendanceId, setCurrentAttendanceId] = useState<string | null>(null);

  // =========================================================================
  // CONTROLADORES DO MOTOR UNIFICADO DE AGENDAMENTO (SITE, BOT, PORTAL, RECEPÇÃO)
  // =========================================================================
  const handleOpenInternalBooking = (options?: {
    serviceId?: string | undefined;
    employeeId?: string | undefined;
    origin?: BookingOrigin | undefined;
    prefilledCustomer?: { name: string; phone: string; id?: string | undefined } | undefined;
  } | undefined) => {
    setBookingModalMode("INTERNAL");
    setBookingModalOrigin(options?.origin || "RECEPCAO");
    setBookingInitialServiceId(options?.serviceId);
    setBookingInitialEmployeeId(options?.employeeId);
    setBookingPrefilledCustomer(options?.prefilledCustomer);
    setIsNewAppointmentModalOpen(true);
  };

  const handleOpenPublicBooking = (options?: {
    serviceId?: string | undefined;
    employeeId?: string | undefined;
    origin?: BookingOrigin | undefined;
    prefilledCustomer?: { name: string; phone: string; id?: string | undefined } | undefined;
  } | undefined) => {
    setBookingModalMode("PUBLIC");
    setBookingModalOrigin(options?.origin || "SITE");
    setBookingInitialServiceId(options?.serviceId);
    setBookingInitialEmployeeId(options?.employeeId);
    setBookingPrefilledCustomer(options?.prefilledCustomer);
    setIsNewAppointmentModalOpen(true);
  };

  const handleConfirmUnifiedBooking = (data: BookingSubmissionData) => {
    const newApt: AttendanceItem = {
      id: `apt-${Date.now()}`,
      code: `#BH-${Math.floor(10000 + Math.random() * 90000)}`,
      time: data.timeSlot,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerId: data.customerId,
      barberName: data.barberName,
      employeeId: data.employeeId,
      origin: data.origin,
      status: "AGENDADO",
      services: [{ id: data.serviceId, name: data.serviceName, price: data.servicePrice }],
      products: [],
      discount: 0,
      total: data.servicePrice,
      notes: data.notes,
    };

    setAttendances((prev) => [...prev, newApt]);
    setIsNewAppointmentModalOpen(false);
    showToast(`Agendamento ${newApt.code} para ${newApt.customerName} confirmado para ${data.timeSlot} com ${data.barberName}!`);
  };

  const [waitingList, setWaitingList] = useState<WaitingClient[]>([]);

  const handleAddToWaitingList = (data: WaitingListSubmissionData) => {
    const newWaitClient: WaitingClient = {
      id: `w-${Date.now()}`,
      customerName: data.customerName,
      phone: data.customerPhone,
      desiredService: services.find((s) => s.id === data.serviceId)?.name || "Corte Degradê",
      preferredBarber: data.preferredBarberName || "Qualquer Barbeiro",
      notes: `Aguardando vaga para ${data.preferredDate}. ${data.notes || ""}`.trim(),
      arrivalTime: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      priority: "NORMAL",
    };

    setWaitingList((prev) => [...prev, newWaitClient]);
    showToast(`Cliente ${data.customerName} incluído na lista de espera para ${data.preferredDate}!`);
  };

  // =========================================================================
  // BOT BARBERHUB & CENTRAL DE ATENDIMENTO OMNICHANNEL (SEÇÃO 1-58)
  // =========================================================================
  const [webChatConvId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("barberhub_web_chat_conv_id");
      if (saved) return saved;
      const newId = `web-chat-${Date.now()}`;
      localStorage.setItem("barberhub_web_chat_conv_id", newId);
      return newId;
    } catch {
      return `web-chat-${Date.now()}`;
    }
  });

  const [humanWorkingHours, setHumanWorkingHours] = useState<{ start: string; end: string }>({
    start: "09:00",
    end: "19:00",
  });

  const [faqList, setFaqList] = useState<BotKnowledgeFaq[]>([
    {
      id: "faq-1",
      category: "Comodidades",
      question: "Tem estacionamento?",
      answer: "Sim! Possuímos convênio com estacionamento coberto ao lado da barbearia com 1 hora de cortesia para nossos clientes.",
      keywords: ["estacionamento", "carro", "vaga", "parar"],
    },
    {
      id: "faq-2",
      category: "Comodidades",
      question: "Tem Wi-Fi e bebidas no local?",
      answer: "Sim! Disponibilizamos Wi-Fi de alta velocidade e cortesia de café espresso, água gelada e cerveja artesanal em nosso lounge.",
      keywords: ["wifi", "internet", "cafe", "cerveja", "bebida", "lounge"],
    },
    {
      id: "faq-3",
      category: "Produtos",
      question: "Vocês vendem pomadas e produtos para barba?",
      answer: "Sim! Trabalhamos com linha completa de pomadas matte, óleos hidratantes, balms e shampoos para barba e cabelo.",
      keywords: ["produtos", "pomada", "oleo", "balm", "shampoo", "comprar"],
    },
  ]);

  const [botConversations, setBotConversations] = useState<BotConversation[]>([]);

  const waitingChatCount = botConversations.filter((c) => c.status === "AGUARDANDO_HUMANO").length;

  const handleSendBotMessage = (text: string, quickAction?: BotQuickAction) => {
    setBotConversations((prev) => {
      let conv = prev.find((c) => c.id === webChatConvId || c.id === "web-chat-default");
      if (!conv) {
        conv = {
          id: webChatConvId,
          channel: "WEB_CHAT",
          customerName: "Visitante Web",
          customerPhone: "(11) 99999-0000",
          status: "BOT",
          lastMessage: text,
          lastTime: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          consecutiveFailures: 0,
          messages: [],
        };
      }

      const activeClient = customers[0];
      const authCust =
        activeTab === "customer_portal" && activeClient
          ? {
              id: activeClient.id,
              name: activeClient.name,
              phone: activeClient.phone,
              points: activeClient.loyaltyPoints,
              appointments: attendances.filter(
                (a) => a.customerName === activeClient.name || a.customerId === activeClient.id
              ),
            }
          : null;

      const context: BotEngineContext = {
        tenantId: "tenant-matriz",
        businessSettings,
        services,
        employees,
        attendances,
        loyaltySettings,
        loyaltyRewards: loyaltyRewards.map((r) => ({
          id: r.id,
          title: r.name,
          pointsCost: r.pointsRequired,
          isActive: r.isActive,
        })),
        faqList,
        authenticatedCustomer: authCust,
        humanWorkingHours,
      };

      const result = processBotMessage(text, conv, context, quickAction);

      if (result.createdAppointment) {
        setAttendances((prevApts) => [result.createdAppointment!, ...prevApts]);
        showToast(`Agendamento ${result.createdAppointment.code} confirmado com sucesso via Bot!`);
      }

      if (result.shouldNotifyAgent) {
        showToast("Novo atendimento aguardando operador na Central!");
      }

      const convIdToMatch = conv.id;
      const targetIndex = prev.findIndex((c) => c.id === convIdToMatch);
      if (targetIndex >= 0) {
        const copy = [...prev];
        copy[targetIndex] = result.updatedConversation;
        return copy;
      }
      return [result.updatedConversation, ...prev];
    });
  };

  const handleTakeOverChat = (convId: string, agentName: string) => {
    const timeStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setBotConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              status: "EM_ATENDIMENTO",
              assignedAgent: agentName,
              acceptedAt: timeStr,
              unreadByAgent: false,
            }
          : c
      )
    );
    showToast(`Atendimento assumido por ${agentName}! O Bot foi silenciado.`);
  };

  const handleSendAgentReply = (convId: string, text: string) => {
    const targetConv = botConversations.find((c) => c.id === convId);
    const timeStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const timeMs = Date.now();
    const isWhatsApp = targetConv?.channel === "WHATSAPP_OFFICIAL";

    const newMsg: BotMessage = {
      id: `agent-m-${timeMs}`,
      sender: "AGENT",
      text,
      time: timeStr,
      timestamp: timeMs,
      deliveryStatus: isWhatsApp ? "sent" : undefined,
    };

    setBotConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              lastMessage: text,
              lastTime: timeStr,
              lastTimestamp: timeMs,
              status: "EM_ATENDIMENTO",
              assignedAgent: c.assignedAgent || currentUser.name,
              messages: [...c.messages, newMsg],
            }
          : c
      )
    );

    // Se a conversa for do canal WhatsApp Oficial, despacha via Meta Graph API
    if (isWhatsApp && targetConv) {
      const tenantId = targetConv.tenantId || "tenant-matriz";
      const config = whatsAppVault.getConfig(tenantId, tenantId);
      if (config && whatsAppVault.isWhatsAppOperational(tenantId)) {
        const outbound = buildAttendantWhatsAppOutbound({
          toPhone: targetConv.customerPhone,
          text,
          lastCustomerMessageTimestamp: targetConv.lastCustomerMessageTimestamp,
        });

        if (outbound.payload) {
          sendWhatsAppCloudMessage({ config, payload: outbound.payload }).then((res) => {
            if (!res.success) {
              showToast(`⚠️ Meta WhatsApp: ${res.error || "Erro no envio"}`);
            }
          });
        } else if (outbound.error) {
          showToast(`⚠️ ${outbound.error}`);
        }
      }
    }
  };

  const handleFinishChat = (convId: string) => {
    setBotConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, status: "FINALIZADO" } : c))
    );
    showToast("Conversa finalizada.");
  };

  // =========================================================================
  // CAIXA DIÁRIO & MOVIMENTAÇÕES
  // =========================================================================
  const [cashStatus, setCashStatus] = useState<"OPEN" | "CLOSED">("OPEN");
  const [cashBalance, setCashBalance] = useState<number>(150.0);
  const [salesHistoryTotal, setSalesHistoryTotal] = useState<number>(0);
  const [commissionsTotal, setCommissionsTotal] = useState<number>(0);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([
    {
      id: "mov-1",
      type: "OPENING",
      amount: 150.0,
      reason: "Abertura de caixa com fundo de troco inicial",
      operator: "Matheus (PROPRIETARIO)",
      time: "Hoje às 08:00",
    },
    {
      id: "mov-2",
      type: "SALE",
      amount: 45.0,
      reason: "Venda #BH-94812 em Dinheiro (Matthew Wilson)",
      operator: "Matheus (PROPRIETARIO)",
      time: "Hoje às 09:42",
    },
  ]);

  const handleOpenCash = (initialAmount: number) => {
    setCashStatus("OPEN");
    setCashBalance(initialAmount);
    setCashMovements((prev) => [
      {
        id: `mov-${Date.now()}`,
        type: "OPENING",
        amount: initialAmount,
        reason: "Abertura de caixa com saldo inicial",
        operator: currentUser.name,
        time: "Hoje",
      },
      ...prev,
    ]);
    showToast(`Caixa aberto com sucesso com saldo inicial de R$ ${initialAmount.toFixed(2)}.`);
  };

  const handleCloseCash = (reported: number) => {
    setCashStatus("CLOSED");
    const diff = Number((reported - cashBalance).toFixed(2));
    setCashMovements((prev) => [
      {
        id: `mov-${Date.now()}`,
        type: "CLOSING",
        amount: reported,
        reason: `Fechamento de caixa apurado (Diferença: R$ ${diff.toFixed(2)})`,
        operator: currentUser.name,
        time: "Hoje",
      },
      ...prev,
    ]);
    showToast(`Caixa do dia fechado com sucesso.`);
    return { expected: cashBalance, reported, diff };
  };

  const handleBleed = (amount: number, reason: string) => {
    setCashBalance((prev) => Number((prev - amount).toFixed(2)));
    setCashMovements((prev) => [
      {
        id: `mov-${Date.now()}`,
        type: "BLEED",
        amount,
        reason: `Sangria: ${reason}`,
        operator: currentUser.name,
        time: "Hoje",
      },
      ...prev,
    ]);
    showToast(`Sangria de R$ ${amount.toFixed(2)} registrada com sucesso.`);
  };

  const handleSupply = (amount: number, reason: string) => {
    setCashBalance((prev) => Number((prev + amount).toFixed(2)));
    setCashMovements((prev) => [
      {
        id: `mov-${Date.now()}`,
        type: "SUPPLY",
        amount,
        reason: `Suprimento: ${reason}`,
        operator: currentUser.name,
        time: "Hoje",
      },
      ...prev,
    ]);
    showToast(`Suprimento de R$ ${amount.toFixed(2)} adicionado ao caixa.`);
  };

  // =========================================================================
  // INTEGRAÇÃO PRINCIPAL: FINALIZAÇÃO DE VENDA NO PDV (CAIXA + ESTOQUE + FIDELIDADE)
  // =========================================================================
  const handleFinalizeSale = (saleData: {
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
  }) => {
    // 1. Atualiza atendimento caso vinculado
    if (saleData.attendanceId) {
      setAttendances((prev) =>
        prev.map((a) => (a.id === saleData.attendanceId ? { ...a, status: "FINALIZADO", total: saleData.total } : a))
      );
    }

    // 2. Dá baixa no estoque de produtos comercializados
    saleData.items.forEach((item) => {
      if (item.type === "PRODUCT") {
        setProducts((prev) =>
          prev.map((p) => (p.name === item.name ? { ...p, stock: Math.max(0, p.stock - item.qty) } : p))
        );
      }
    });

    // 3. Atualiza Caixa se houver pagamento em dinheiro
    const cashPayment = saleData.payments.find((p) => p.method === "DINHEIRO");
    if (cashPayment && cashPayment.amount > 0) {
      setCashBalance((prev) => Number((prev + cashPayment.amount).toFixed(2)));
      setCashMovements((prev) => [
        {
          id: `mov-${Date.now()}`,
          type: "SALE",
          amount: cashPayment.amount,
          reason: `Venda ${saleData.customerName} em Dinheiro`,
          operator: currentUser.name,
          time: "Hoje",
        },
        ...prev,
      ]);
    }

    // 4. Calcula comissão estimada para o barbeiro (~50% dos serviços)
    const servicesTotal = saleData.items
      .filter((i) => i.type === "SERVICE")
      .reduce((sum, i) => sum + i.price * i.qty, 0);
    const estimatedComm = Number((servicesTotal * 0.5).toFixed(2));
    setCommissionsTotal((prev) => prev + estimatedComm);
    setSalesHistoryTotal((prev) => prev + saleData.total);

    // 5. MOTOR DE FIDELIDADE (Crédito de pontos estritamente após confirmação do pagamento)
    const matchedCustomer = customers.find(
      (c) =>
        (saleData.customerId && c.id === saleData.customerId) ||
        c.name.toLowerCase() === saleData.customerName.toLowerCase()
    );

    let pointsEarned = 0;
    if (matchedCustomer) {
      const saleId = saleData.attendanceId || `sale-${Date.now()}`;
      const earnResult = processPaymentLoyaltyEarn({
        account: {
          id: matchedCustomer.id,
          tenantId: "tenant-default",
          customerId: matchedCustomer.id,
          customerName: matchedCustomer.name,
          currentPoints: matchedCustomer.loyaltyPoints || 0,
          lifetimePoints: matchedCustomer.lifetimePoints || 0,
          tier: matchedCustomer.loyaltyTier || "BRONZE",
        },
        saleId,
        items: saleData.items.map((i) => ({
          name: i.name,
          price: i.price,
          qty: i.qty || 1,
          type: (i.type === "PRODUCT" ? "PRODUCT" : "SERVICE") as "SERVICE" | "PRODUCT",
        })),
        ledger: loyaltyLedger,
        settings: loyaltySettings,
      });

      if (earnResult.success && earnResult.pointsEarned > 0 && earnResult.ledgerEntry) {
        pointsEarned = earnResult.pointsEarned;
        setLoyaltyLedger((prev) => [earnResult.ledgerEntry!, ...prev]);

        // Atualização contábil consistente do cliente
        const updatedLifetime = (matchedCustomer.lifetimePoints || 0) + earnResult.pointsEarned;
        const updatedPoints = (matchedCustomer.loyaltyPoints || 0) + earnResult.pointsEarned;
        const newTier = determineLoyaltyTier(updatedLifetime, loyaltyTiers);
        const newVisits = matchedCustomer.visits + 1;
        const newSpent = matchedCustomer.spent + saleData.total;
        const newAvg = Number((newSpent / newVisits).toFixed(2));
        const newSegment = calculateCrmSegment({
          visits: newVisits,
          spent: newSpent,
          birthDate: matchedCustomer.birthDate,
          lastVisitAt: new Date().toISOString().split("T")[0],
          settings: loyaltySettings,
        });

        // Se este cliente foi indicado por alguém e é seu primeiro atendimento pago, conceder bônus de indicação
        if (
          matchedCustomer.referredByCustomerId &&
          (matchedCustomer.visits === 0 || matchedCustomer.visits === 1)
        ) {
          const referrerCust = customers.find((c) => c.id === matchedCustomer.referredByCustomerId);
          if (referrerCust) {
            const referralResult = processReferralReward({
              referrerAccount: {
                id: referrerCust.id,
                tenantId: "tenant-default",
                customerId: referrerCust.id,
                customerName: referrerCust.name,
                currentPoints: referrerCust.loyaltyPoints || 0,
                lifetimePoints: referrerCust.lifetimePoints || 0,
                tier: referrerCust.loyaltyTier || "BRONZE",
              },
              referredAccount: {
                id: matchedCustomer.id,
                tenantId: "tenant-default",
                customerId: matchedCustomer.id,
                customerName: matchedCustomer.name,
                currentPoints: updatedPoints,
                lifetimePoints: updatedLifetime,
                tier: newTier,
              },
              firstSaleId: saleId,
              ledger: loyaltyLedger,
              settings: loyaltySettings,
            });

            if (referralResult.success && referralResult.referrerEntry) {
              setLoyaltyLedger((prev) => [
                referralResult.referrerEntry!,
                ...(referralResult.refereeEntry ? [referralResult.refereeEntry] : []),
                ...prev,
              ]);

              // Atualiza saldo do indicador
              const refBonus = referralResult.referrerBonus || 0;
              setCustomers((prev) =>
                prev.map((c) => {
                  if (c.id === referrerCust.id) {
                    const refPts = c.loyaltyPoints + refBonus;
                    const refLife = c.lifetimePoints + refBonus;
                    return {
                      ...c,
                      loyaltyPoints: refPts,
                      lifetimePoints: refLife,
                      loyaltyTier: determineLoyaltyTier(refLife, loyaltyTiers),
                    };
                  }
                  return c;
                })
              );
            }
          }
        }

        setCustomers((prev) =>
          prev.map((c) =>
            c.id === matchedCustomer.id
              ? {
                  ...c,
                  visits: newVisits,
                  spent: newSpent,
                  avg: newAvg,
                  lastVisitAt: new Date().toISOString().split("T")[0],
                  loyaltyPoints: updatedPoints,
                  lifetimePoints: updatedLifetime,
                  loyaltyTier: newTier,
                  crmSegment: newSegment,
                }
              : c
          )
        );
      } else {
        // Atualiza visitas e histórico de consumo
        const newVisits = matchedCustomer.visits + 1;
        const newSpent = matchedCustomer.spent + saleData.total;
        const newAvg = Number((newSpent / newVisits).toFixed(2));
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === matchedCustomer.id
              ? {
                  ...c,
                  visits: newVisits,
                  spent: newSpent,
                  avg: newAvg,
                  lastVisitAt: new Date().toISOString().split("T")[0],
                }
              : c
          )
        );
      }

      // Se havia recompensa aplicada, marcar como utilizada
      if (saleData.appliedRedemptionId) {
        setLoyaltyRedemptions((prev) =>
          prev.map((r) =>
            r.id === saleData.appliedRedemptionId
              ? {
                  ...r,
                  status: "UTILIZADO",
                  usedAt: new Date().toLocaleDateString("pt-BR"),
                  saleId: saleData.attendanceId || undefined,
                }
              : r
          )
        );
      }
    }

    showToast(
      `Venda de R$ ${saleData.total.toFixed(2)} finalizada! ${
        pointsEarned > 0
          ? `+${pointsEarned} pontos de fidelidade creditados.`
          : "Caixa e estoque atualizados com sucesso."
      }`
    );
  };

  // Handlers do Motor de Fidelidade
  const handleRedeemReward = (rewardId: string, customerId?: string) => {
    const custId = customerId || customers[0]?.id;
    const targetCust = customers.find((c) => c.id === custId);
    const targetReward = loyaltyRewards.find((r) => r.id === rewardId);
    if (!targetCust || !targetReward) return;

    try {
      const result = redeemRewardWithLedger({
        account: {
          id: targetCust.id,
          tenantId: "tenant-default",
          customerId: targetCust.id,
          customerName: targetCust.name,
          currentPoints: targetCust.loyaltyPoints || 0,
          lifetimePoints: targetCust.lifetimePoints || 0,
          tier: targetCust.loyaltyTier || "BRONZE",
        },
        customerName: targetCust.name,
        reward: targetReward,
        existingRedemptions: loyaltyRedemptions,
      });

      if (result.success && result.ledgerEntry && result.redemption) {
        setLoyaltyLedger((prev) => [result.ledgerEntry, ...prev]);
        setLoyaltyRedemptions((prev) => [result.redemption, ...prev]);
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === targetCust.id
              ? { ...c, loyaltyPoints: result.updatedAccount.currentPoints }
              : c
          )
        );
        showToast(`Recompensa "${targetReward.name}" resgatada com sucesso!`);
      }
    } catch (err: any) {
      showToast(`Falha no resgate: ${err.message}`);
    }
  };

  const handleManualPointsAdjust = (customerId: string, delta: number, reason: string) => {
    const targetCust = customers.find((c) => c.id === customerId);
    if (!targetCust) return;

    try {
      const result = manualAdjustPoints({
        account: {
          id: targetCust.id,
          tenantId: "tenant-default",
          customerId: targetCust.id,
          customerName: targetCust.name,
          currentPoints: targetCust.loyaltyPoints || 0,
          lifetimePoints: targetCust.lifetimePoints || 0,
          tier: targetCust.loyaltyTier || "BRONZE",
        },
        customerName: targetCust.name,
        pointsDelta: delta,
        reason,
        operatorName: currentUser.name,
      });

      if (result.ledgerEntry) {
        setLoyaltyLedger((prev) => [result.ledgerEntry, ...prev]);
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === targetCust.id
              ? {
                  ...c,
                  loyaltyPoints: result.updatedAccount.currentPoints,
                  lifetimePoints: result.updatedAccount.lifetimePoints,
                  loyaltyTier: result.updatedAccount.tier || "BRONZE",
                }
              : c
          )
        );
        showToast(`Ajuste de ${delta > 0 ? "+" : ""}${delta} pontos registrado no ledger.`);
      }
    } catch (err: any) {
      showToast(`Falha no ajuste: ${err.message}`);
    }
  };

  const handleSaveReward = (reward: LoyaltyRewardItem) => {
    setLoyaltyRewards((prev) => {
      const idx = prev.findIndex((r) => r.id === reward.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = reward;
        return copy;
      }
      return [reward, ...prev];
    });
  };

  const handleDeleteReward = (rewardId: string) => {
    setLoyaltyRewards((prev) => prev.filter((r) => r.id !== rewardId));
    showToast("Recompensa removida do catálogo.");
  };

  // Ação de Check-in rápido direto na Frente de Caixa
  const handleQuickCheckIn = (aptId: string) => {
    setAttendances((prev) =>
      prev.map((a) => (a.id === aptId ? { ...a, status: "EM_ATENDIMENTO" } : a))
    );
    setCurrentAttendanceId(aptId);
    setActiveTab("pos");
    showToast("Check-in realizado! Comanda carregada na Frente de Caixa.");
  };

  const handleAdvanceAttendanceStatus = (aptId: string) => {
    setAttendances((prev) =>
      prev.map((a) => {
        if (a.id !== aptId) return a;
        if (a.status === "AGENDADO" || a.status === "CONFIRMADO") return { ...a, status: "AGUARDANDO" };
        if (a.status === "AGUARDANDO") return { ...a, status: "EM_ATENDIMENTO" };
        if (a.status === "EM_ATENDIMENTO") return { ...a, status: "FINALIZADO" };
        return a;
      })
    );
  };

  const handleUpdateAttendanceStatus = (aptId: string, status: AttendanceItem["status"]) => {
    setAttendances((prev) =>
      prev.map((a) => {
        if (a.id !== aptId) return a;
        return { ...a, status };
      })
    );
  };

  const handleRescheduleAppointment = (aptId: string, newTime: string, newBarber: string) => {
    setAttendances((prev) =>
      prev.map((a) => {
        if (a.id !== aptId) return a;
        return { ...a, time: newTime, barberName: newBarber, status: "AGENDADO" };
      })
    );
  };

  const handleStartQuickAttendance = (data: {
    customerName: string;
    customerPhone: string;
    barberName: string;
    serviceName?: string;
    servicePrice?: number;
    serviceId?: string;
    isOpenComanda?: boolean;
  }) => {
    const hasService = !data.isOpenComanda && !!data.serviceId && !!data.serviceName && (data.servicePrice !== undefined && data.servicePrice > 0);
    const newApt: AttendanceItem = {
      id: `apt-${Date.now()}`,
      code: `#BH-${Math.floor(10000 + Math.random() * 90000)}`,
      time: "Agora (Balcão)",
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      barberName: data.barberName,
      status: "EM_ATENDIMENTO",
      services: hasService && data.serviceId && data.serviceName && data.servicePrice ? [{ id: data.serviceId, name: data.serviceName, price: data.servicePrice }] : [],
      products: [],
      discount: 0,
      total: hasService && data.servicePrice ? data.servicePrice : 0,
    };

    setAttendances((prev) => [newApt, ...prev]);
    setCurrentAttendanceId(newApt.id);
    setActiveTab("pos");
    showToast(
      data.isOpenComanda
        ? `Comanda em aberto iniciada para ${data.customerName} na cadeira de ${data.barberName}!`
        : `Atendimento iniciado na cadeira de ${data.barberName}! Comanda aberta no Caixa.`
    );
  };

  const handleEncaixarWaitingClient = (client: WaitingClient) => {
    const srv = services.find((s) => s.name === client.desiredService) || services[0] || {
      id: "srv-default",
      name: "Corte Tradicional",
      price: 45,
      duration: 35,
      category: "Cabelo",
    };
    const newApt: AttendanceItem = {
      id: `apt-${Date.now()}`,
      code: `#BH-${Math.floor(10000 + Math.random() * 90000)}`,
      time: "Encaixe Imediato",
      customerName: client.customerName,
      customerPhone: client.phone,
      barberName: client.preferredBarber,
      status: "AGUARDANDO",
      services: [{ id: srv.id, name: srv.name, price: srv.price }],
      products: [],
      discount: 0,
      total: srv.price,
    };

    setAttendances((prev) => [newApt, ...prev]);
    showToast(`Cliente ${client.customerName} encaixado na agenda com sucesso!`);
  };

  // Atalho Global do Teclado (F2 = Novo Atendimento)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        setIsQuickAttendanceModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Se o usuário não estiver autenticado, exibe a tela de login oficial NAVOR
  if (!currentUser) {
    return (
      <>
        <OfficialAuthView
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            showToast(`Bem-vindo, ${user.name}! Acesso autorizado como ${user.role}.`);
          }}
          onNavigateNavorPortals={() => setIsNavorSelectorOpen(true)}
        />
        <NavorEnvironmentSelectorModal
          isOpen={isNavorSelectorOpen}
          onClose={() => setIsNavorSelectorOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Toast flutuante de confirmação */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-primary/40 bg-card px-4 py-3 text-sm text-foreground shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-muted-foreground hover:text-foreground ml-2 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sidebar Lateral Profissional Recolhível */}
      <AppSidebar
        currentTab={activeTab}
        onSelectTab={(tabId) => {
          if (tabId.startsWith("settings_")) {
            setActiveSettingsSubTab(tabId as SettingsSubTab);
            setActiveTab("settings");
          } else {
            setActiveTab(tabId);
          }
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        currentUser={currentUser}
        onOpenLoginModal={() => setIsProfileModalOpen(true)}
        waitingChatCount={waitingChatCount}
      />

      {/* Container Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar Limpa */}
        <AppTopbar
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onOpenQuickAttendanceModal={() => setIsQuickAttendanceModalOpen(true)}
          onOpenLoginModal={() => setIsProfileModalOpen(true)}
          onSimulateMobileBooking={() => setActiveTab("booking_mobile")}
          currentUser={currentUser}
          currentUnitName="Matriz — Centro (São Paulo)"
          cashBalance={cashBalance}
        />

        {/* Área de Visualização do Módulo Ativo com Rolagem Independente */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {/* 1. VISÃO GERAL */}
            {activeTab === "dashboard" && (
              <DashboardView
                onNavigateToAgenda={() => setActiveTab("agenda")}
                onNavigateToPos={(id) => {
                  if (id) setCurrentAttendanceId(id);
                  setActiveTab("pos");
                }}
                onNavigateToEmployees={() => setActiveTab("employees")}
                onQuickCheckIn={handleQuickCheckIn}
                unitName="Matriz — Centro"
                onNavigateToCustomers={(filter) => {
                  setActiveTab("customers");
                }}
                onNavigateToLoyalty={(subtab) => {
                  setActiveTab("loyalty");
                }}
                loyaltySummary={{
                  birthdaysWeek: customers.filter((c) => {
                    if (!c.birthDate) return false;
                    const parts = c.birthDate.split("-");
                    if (parts.length < 3) return false;
                    const m = parseInt(parts[1] || "0", 10);
                    const d = parseInt(parts[2] || "0", 10);
                    const now = new Date();
                    const bday = new Date(now.getFullYear(), m - 1, d);
                    const diff = Math.round((bday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return diff >= -3 && diff <= 4;
                  }).length,
                  atRiskCustomers: customers.filter((c) => c.crmSegment === "EM_RISCO").length,
                  redemptionsCount: loyaltyRedemptions.length,
                  circulatingPoints: customers.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0),
                }}
              />
            )}

            {/* 2. ÁREA DO PROFISSIONAL (BARBEIRO) */}
            {activeTab === "barber_today" && (
              <BarberPortalView
                currentBarberName={currentUser.name}
                attendances={attendances}
                employees={employees}
                onAdvanceStatus={handleAdvanceAttendanceStatus}
                onNavigateToPos={(id) => {
                  if (id) setCurrentAttendanceId(id);
                  setActiveTab("pos");
                }}
              />
            )}

            {/* 3. OPERAÇÃO */}
            {activeTab === "agenda" && (
              <AgendaView
                attendances={attendances}
                employees={employees}
                services={services}
                onOpenNewAppointmentModal={() => handleOpenInternalBooking({ origin: "RECEPCAO" })}
                onCheckInToPos={handleQuickCheckIn}
                onAdvanceStatus={handleAdvanceAttendanceStatus}
                onUpdateStatus={handleUpdateAttendanceStatus}
                onReschedule={handleRescheduleAppointment}
                onAddAppointment={(newApt) => setAttendances((prev) => [...prev, newApt])}
                onShowToast={showToast}
              />
            )}

            {activeTab === "recepcao" && (
              <ReceptionView
                attendances={attendances}
                employees={employees}
                onQuickCheckIn={handleQuickCheckIn}
                onAdvanceStatus={handleAdvanceAttendanceStatus}
                onNavigateToPos={(id) => {
                  if (id) setCurrentAttendanceId(id);
                  setActiveTab("pos");
                }}
                onOpenQuickAttendanceModal={() => setIsQuickAttendanceModalOpen(true)}
                onOpenNewAppointmentModal={() => handleOpenInternalBooking({ origin: "RECEPCAO" })}
              />
            )}

            {activeTab === "atendimentos" && (
              <AgendaView
                attendances={attendances}
                employees={employees}
                services={services}
                onOpenNewAppointmentModal={() => handleOpenInternalBooking({ origin: "RECEPCAO" })}
                onCheckInToPos={handleQuickCheckIn}
                onAdvanceStatus={handleAdvanceAttendanceStatus}
                onUpdateStatus={handleUpdateAttendanceStatus}
                onReschedule={handleRescheduleAppointment}
                onAddAppointment={(newApt) => setAttendances((prev) => [...prev, newApt])}
                onShowToast={showToast}
              />
            )}

            {(activeTab === "fila_encaixes" || activeTab === "waiting_list") && (
              <WaitingListView
                onEncaixarNaAgenda={handleEncaixarWaitingClient}
                barbers={employees.filter((e) => e.role === "BARBEIRO").map((b) => b.name)}
                services={services.map((s) => s.name)}
              />
            )}

            {/* 4. CLIENTES */}
            {activeTab === "customers" && (
              <CustomersView
                customers={customers}
                onOpenNewCustomerModal={() => setIsNewCustomerModalOpen(true)}
                businessSettings={businessSettings}
                loyaltySettings={loyaltySettings}
                loyaltyTiers={loyaltyTiers}
                onOpenBookingForCustomer={(c) => {
                  handleOpenInternalBooking({
                    origin: "RECEPCAO",
                    prefilledCustomer: { name: c.name, phone: c.phone, id: c.id },
                  });
                }}
                onOpenAdjustPointsModal={() => {
                  setActiveTab("loyalty");
                }}
              />
            )}

            {activeTab === "plans" && (
              <LoyaltyPlansView
                initialTab="PLANS"
                onShowToast={showToast}
                customers={customers}
                loyaltySettings={loyaltySettings}
                loyaltyTiers={loyaltyTiers}
                loyaltyRewards={loyaltyRewards}
                loyaltyLedger={loyaltyLedger}
                loyaltyRedemptions={loyaltyRedemptions}
                onSaveReward={handleSaveReward}
                onDeleteReward={handleDeleteReward}
                onManualAdjustPoints={handleManualPointsAdjust}
                onRedeemReward={handleRedeemReward}
                onUpdateLoyaltySettings={setLoyaltySettings}
                onUpdateLoyaltyTiers={setLoyaltyTiers}
                services={services}
                products={products}
                businessSettings={businessSettings}
              />
            )}

            {activeTab === "packages" && (
              <PackagesView customers={customers} onShowToast={showToast} />
            )}

            {activeTab === "loyalty" && (
              <LoyaltyPlansView
                initialTab="LOYALTY"
                onShowToast={showToast}
                customers={customers}
                loyaltySettings={loyaltySettings}
                loyaltyTiers={loyaltyTiers}
                loyaltyRewards={loyaltyRewards}
                loyaltyLedger={loyaltyLedger}
                loyaltyRedemptions={loyaltyRedemptions}
                onSaveReward={handleSaveReward}
                onDeleteReward={handleDeleteReward}
                onManualAdjustPoints={handleManualPointsAdjust}
                onRedeemReward={handleRedeemReward}
                onUpdateLoyaltySettings={setLoyaltySettings}
                onUpdateLoyaltyTiers={setLoyaltyTiers}
                services={services}
                products={products}
                businessSettings={businessSettings}
              />
            )}

            {/* 5. EQUIPE */}
            {activeTab === "employees" && (
              <EmployeesView
                employees={employees}
                onOpenNewEmployeeModal={() => setIsNewEmployeeModalOpen(true)}
                onToggleEmployeeStatus={toggleEmployeeStatus}
              />
            )}

            {activeTab === "schedules" && (
              <SchedulesView employees={employees} onShowToast={showToast} />
            )}

            {activeTab === "commissions" && (
              <CommissionsView employees={employees} onShowToast={showToast} />
            )}

            {activeTab === "goals" && (
              <GoalsView employees={employees} onShowToast={showToast} />
            )}

            {/* 6. VENDAS & FRENTE DE CAIXA */}
            {activeTab === "pos" && (
              <PosCheckoutView
                attendances={attendances}
                currentAttendanceId={currentAttendanceId}
                onSelectAttendance={(id) => setCurrentAttendanceId(id)}
                onUpdateAttendanceStatus={(id, status) => {
                  setAttendances((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
                }}
                onOpenQuickAttendanceModal={() => setIsQuickAttendanceModalOpen(true)}
                products={products}
                services={services}
                customers={customers}
                employees={employees}
                loyaltySettings={loyaltySettings}
                loyaltyTiers={loyaltyTiers}
                loyaltyRedemptions={loyaltyRedemptions}
                onFinalizeSale={handleFinalizeSale}
                currentUserRole={currentUser.role}
              />
            )}

            {activeTab === "cash" && (
              <CashRegisterView
                cashStatus={cashStatus}
                cashBalance={cashBalance}
                onOpenCash={handleOpenCash}
                onCloseCash={handleCloseCash}
                onBleed={handleBleed}
                onSupply={handleSupply}
                currentOperator={currentUser.name}
                movements={cashMovements}
              />
            )}

            {/* 7. ESTOQUE & INSUMOS */}
            {activeTab === "products" && (
              <StockView
                products={products}
                onOpenNewProductModal={() => setIsNewProductModalOpen(true)}
                onToggleQuickPos={toggleProductQuickPos}
                onAdjustStock={adjustProductStock}
              />
            )}

            {activeTab === "supplies" && (
              <SuppliesView services={services} onShowToast={showToast} />
            )}

            {activeTab === "purchases" && (
              <SuppliersPurchasesView initialTab="PURCHASES" onShowToast={showToast} />
            )}

            {activeTab === "suppliers" && (
              <SuppliersPurchasesView initialTab="SUPPLIERS" onShowToast={showToast} />
            )}

            {/* 8. FINANCEIRO */}
            {activeTab === "financial" && (
              <FinancialView salesTotal={salesHistoryTotal} commissionsTotal={commissionsTotal} initialSubTab="DRE" />
            )}

            {activeTab === "payables" && (
              <FinancialView salesTotal={salesHistoryTotal} commissionsTotal={commissionsTotal} initialSubTab="PAYABLES" />
            )}

            {activeTab === "receivables" && (
              <FinancialView salesTotal={salesHistoryTotal} commissionsTotal={commissionsTotal} initialSubTab="RECEIVABLES" />
            )}

            {activeTab === "dre" && (
              <FinancialView salesTotal={salesHistoryTotal} commissionsTotal={commissionsTotal} initialSubTab="DRE" />
            )}

            {/* 9. RELACIONAMENTO & OMNICHANNEL */}
            {activeTab === "chat_hub" && (
              <CentralAtendimentoView
                conversations={botConversations}
                activeAgentName={currentUser.name}
                onTakeOver={handleTakeOverChat}
                onSendReply={handleSendAgentReply}
                onFinish={handleFinishChat}
                onOpenNewAppointmentModal={(prefill) =>
                  handleOpenInternalBooking({
                    origin: "BOT",
                    prefilledCustomer: prefill
                      ? { name: prefill.name, phone: prefill.phone, id: prefill.customerId || "c-bot" }
                      : undefined,
                  })
                }
                onShowToast={showToast}
              />
            )}

            {activeTab === "marketing" && <MarketingView />}

            {activeTab === "reviews" && <ReviewsView />}

            {/* 10. ANÁLISES & RELATÓRIOS */}
            {activeTab === "reports" && <ReportsView />}

            {/* 11. CONFIGURAÇÕES */}
            {(activeTab === "settings" || activeTab.startsWith("settings_")) && (
              <SettingsView
                activeSubTab={activeSettingsSubTab}
                onChangeSubTab={setActiveSettingsSubTab}
                businessSettings={businessSettings}
                onUpdateBusinessSettings={setBusinessSettings}
                employees={employees}
                onOpenNewEmployeeModal={() => setIsNewEmployeeModalOpen(true)}
                onToggleEmployeeStatus={toggleEmployeeStatus}
                onShowToast={showToast}
                services={services}
                products={products}
                onOpenNewServiceModal={() => setIsNewServiceModalOpen(true)}
                loyaltySettings={loyaltySettings}
                onUpdateLoyaltySettings={setLoyaltySettings}
                loyaltyTiers={loyaltyTiers}
                onUpdateLoyaltyTiers={setLoyaltyTiers}
                faqList={faqList}
                onUpdateFaqList={setFaqList}
                humanWorkingHours={humanWorkingHours}
                onUpdateHumanWorkingHours={setHumanWorkingHours}
              />
            )}

            {/* 12. CANAL EXTERNO (SITE PÚBLICO & PORTAL CLIENTE) */}
            {activeTab === "public_site" && (
              <PublicSiteView
                businessSettings={businessSettings}
                services={services}
                employees={employees}
                onOpenBookingModal={(options) =>
                  handleOpenPublicBooking({
                    serviceId: options?.serviceId,
                    employeeId: options?.employeeId,
                    origin: "SITE",
                  })
                }
                onBackToErp={() => setActiveTab("dashboard")}
                botConversation={botConversations.find((c) => c.id === webChatConvId || c.id === "web-chat-default")}
                onSendBotMessage={handleSendBotMessage}
              />
            )}

            {activeTab === "customer_portal" && (
              <CustomerPortalView
                customer={customers[0]}
                loyaltySettings={loyaltySettings}
                loyaltyTiers={loyaltyTiers}
                loyaltyRewards={loyaltyRewards}
                loyaltyLedger={loyaltyLedger}
                loyaltyRedemptions={loyaltyRedemptions}
                onRedeemReward={handleRedeemReward}
                onOpenBookingModal={(options) =>
                  handleOpenPublicBooking({
                    serviceId: options?.serviceId,
                    employeeId: options?.employeeId,
                    origin: "PORTAL_CLIENTE",
                    prefilledCustomer: options?.prefillCustomer
                      ? { name: customers[0]?.name || "Carlos Eduardo Santos", phone: customers[0]?.phone || "(11) 98888-1111", id: customers[0]?.id || "c1" }
                      : undefined,
                  })
                }
                onCancelAppointment={(code) => {
                  setAttendances((prev) => prev.filter((a) => a.code !== code));
                  showToast(`Agendamento ${code} cancelado com sucesso.`);
                }}
                onBackToErp={() => setActiveTab("dashboard")}
              />
            )}

            {activeTab === "booking_mobile" && (
              <PublicSiteView
                businessSettings={businessSettings}
                services={services}
                employees={employees}
                onOpenBookingModal={(options) =>
                  handleOpenPublicBooking({
                    serviceId: options?.serviceId,
                    employeeId: options?.employeeId,
                    origin: "SITE",
                  })
                }
                onBackToErp={() => setActiveTab("dashboard")}
                botConversation={botConversations.find((c) => c.id === webChatConvId || c.id === "web-chat-default")}
                onSendBotMessage={handleSendBotMessage}
              />
            )}
          </div>
        </main>
      </div>

      {/* ========================================================= */}
      {/* MODAL DE ATENDIMENTO RÁPIDO BALCÃO (F2)                   */}
      {/* ========================================================= */}
      <QuickAttendanceModal
        isOpen={isQuickAttendanceModalOpen}
        onClose={() => setIsQuickAttendanceModalOpen(false)}
        customers={customers}
        employees={employees}
        services={services}
        onStartAttendance={handleStartQuickAttendance}
      />

      {/* ========================================================= */}
      {/* MODAL UNIFICADO DE AGENDAMENTO (SITE, BOT, PORTAL, RECEPÇÃO) */}
      {/* ========================================================= */}
      <UnifiedBookingModal
        isOpen={isNewAppointmentModalOpen}
        onClose={() => {
          setIsNewAppointmentModalOpen(false);
          setBookingInitialServiceId(undefined);
          setBookingInitialEmployeeId(undefined);
          setBookingPrefilledCustomer(undefined);
        }}
        mode={bookingModalMode}
        initialOrigin={bookingModalOrigin}
        initialServiceId={bookingInitialServiceId}
        initialEmployeeId={bookingInitialEmployeeId}
        prefilledCustomer={bookingPrefilledCustomer}
        businessSettings={businessSettings}
        services={services}
        employees={employees}
        customers={customers}
        existingAppointments={attendances}
        onConfirmBooking={handleConfirmUnifiedBooking}
        onAddToWaitingList={handleAddToWaitingList}
      />

      {/* ========================================================= */}
      {/* MODAL NOVO CLIENTE                                       */}
      {/* ========================================================= */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-card border border-hairline rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="font-bold text-base text-foreground">Novo Cliente</h3>
              <button onClick={() => setIsNewCustomerModalOpen(false)} className="text-muted-foreground hover:text-foreground text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Nome Completo:</label>
                <Input
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="bg-muted/30 border-hairline h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">WhatsApp:</label>
                  <Input
                    placeholder="(11) 98888-7777"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="bg-muted/30 border-hairline h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">CPF:</label>
                  <Input
                    placeholder="000.000.000-00"
                    value={newCustCpf}
                    onChange={(e) => setNewCustCpf(e.target.value)}
                    className="bg-muted/30 border-hairline h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">E-mail:</label>
                <Input
                  type="email"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  className="bg-muted/30 border-hairline h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">🎂 Data de Nascimento:</label>
                  <Input
                    type="date"
                    value={newCustBirthDate}
                    onChange={(e) => setNewCustBirthDate(e.target.value)}
                    className="bg-muted/30 border-hairline h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">🔗 Código de Indicação:</label>
                  <Input
                    placeholder="Ex: CARLOS-7K29"
                    value={newCustReferrerCode}
                    onChange={(e) => setNewCustReferrerCode(e.target.value)}
                    className="bg-muted/30 border-hairline h-8 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Observações / Preferências:</label>
                <Input
                  placeholder="Ex: Prefere degradê na zero alta"
                  value={newCustNotes}
                  onChange={(e) => setNewCustNotes(e.target.value)}
                  className="bg-muted/30 border-hairline h-8 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
                <Button type="button" variant="outline" onClick={() => setIsNewCustomerModalOpen(false)} className="h-8 text-xs">
                  Cancelar
                </Button>
                <Button type="submit" className="h-8 text-xs font-bold bg-primary text-primary-foreground">
                  Cadastrar Cliente
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL NOVO PRODUTO COM DESTAQUE RÁPIDO NO PDV             */}
      {/* ========================================================= */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-card border border-hairline rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="font-bold text-base text-foreground">Novo Produto no Estoque</h3>
              <button onClick={() => setIsNewProductModalOpen(false)} className="text-muted-foreground hover:text-foreground text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Nome do Produto:</label>
                <Input
                  required
                  placeholder="Ex: Pomada Matte 100g"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="bg-muted/30 border-hairline h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">SKU / Código:</label>
                  <Input
                    placeholder="Auto gerado se vazio"
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value)}
                    className="bg-muted/30 border-hairline h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Código de Barras:</label>
                  <Input
                    placeholder="Bipe ou digite"
                    value={newProdBarcode}
                    onChange={(e) => setNewProdBarcode(e.target.value)}
                    className="bg-muted/30 border-hairline h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Preço de Custo (R$):</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newProdCost}
                    onChange={(e) => setNewProdCost(e.target.value)}
                    className="bg-muted/30 border-hairline h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Preço de Venda (R$):</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newProdSale}
                    onChange={(e) => setNewProdSale(e.target.value)}
                    className="bg-muted/30 border-hairline h-8 text-xs font-mono font-bold text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Estoque Inicial:</label>
                  <Input
                    type="number"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    className="bg-muted/30 border-hairline h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Estoque Mínimo:</label>
                  <Input
                    type="number"
                    value={newProdMin}
                    onChange={(e) => setNewProdMin(e.target.value)}
                    className="bg-muted/30 border-hairline h-8 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Toggle de Destaque no PDV */}
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between">
                <div>
                  <span className="font-bold text-foreground block">Exibir em Destaque no PDV?</span>
                  <span className="text-[10px] text-muted-foreground">Aparecerá nos botões de 1 clique da Frente de Caixa.</span>
                </div>
                <input
                  type="checkbox"
                  checked={newProdQuickPos}
                  onChange={(e) => setNewProdQuickPos(e.target.checked)}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
                <Button type="button" variant="outline" onClick={() => setIsNewProductModalOpen(false)} className="h-8 text-xs">
                  Cancelar
                </Button>
                <Button type="submit" className="h-8 text-xs font-bold bg-primary text-primary-foreground">
                  Salvar Produto
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL NOVO COLABORADOR                                   */}
      {/* ========================================================= */}
      {isNewEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-card border border-hairline rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="font-bold text-base text-foreground">Novo Colaborador</h3>
              <button onClick={() => setIsNewEmployeeModalOpen(false)} className="text-muted-foreground hover:text-foreground text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Nome Completo:</label>
                <Input
                  required
                  value={newEmployeeName}
                  onChange={(e) => setNewEmployeeName(e.target.value)}
                  className="bg-muted/30 border-hairline h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Cargo:</label>
                  <select
                    value={newEmployeeRole}
                    onChange={(e) => setNewEmployeeRole(e.target.value as any)}
                    className="w-full bg-muted/30 border border-hairline rounded-lg h-8 px-2 text-xs text-foreground cursor-pointer"
                  >
                    <option value="BARBEIRO">Barbeiro</option>
                    <option value="RECEPCIONISTA">Recepcionista</option>
                    <option value="GERENTE">Gerente</option>
                    <option value="CAIXA">Caixa</option>
                    <option value="ESTOQUISTA">Estoquista</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Comissão (%):</label>
                  <Input
                    type="number"
                    value={newEmployeeCommission}
                    onChange={(e) => setNewEmployeeCommission(e.target.value)}
                    className="bg-muted/30 border-hairline h-8 text-xs font-mono font-bold text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">WhatsApp:</label>
                  <Input
                    value={newEmployeePhone}
                    onChange={(e) => setNewEmployeePhone(e.target.value)}
                    className="bg-muted/30 border-hairline h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Chave PIX:</label>
                  <Input
                    value={newEmployeePix}
                    onChange={(e) => setNewEmployeePix(e.target.value)}
                    className="bg-muted/30 border-hairline h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
                <Button type="button" variant="outline" onClick={() => setIsNewEmployeeModalOpen(false)} className="h-8 text-xs">
                  Cancelar
                </Button>
                <Button type="submit" className="h-8 text-xs font-bold bg-primary text-primary-foreground">
                  Cadastrar Colaborador
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL NOVO SERVIÇO NO CATÁLOGO                           */}
      {/* ========================================================= */}
      {isNewServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in zoom-in-95">
          <div className="w-full max-w-md bg-card border border-hairline rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Scissors className="h-5 w-5 text-primary" />
                Novo Serviço no Catálogo
              </h3>
              <button
                onClick={() => setIsNewServiceModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Nome do Serviço:</label>
                <Input
                  required
                  placeholder="Ex: Corte Degradê / Fade Pro"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="bg-muted/30 border-hairline h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Duração Padrão:</label>
                  <select
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(e.target.value)}
                    className="w-full bg-muted/30 border border-hairline rounded-lg h-8 px-2 text-xs text-foreground cursor-pointer"
                  >
                    <option value="15 min">15 minutos</option>
                    <option value="30 min">30 minutos</option>
                    <option value="45 min">45 minutos</option>
                    <option value="60 min">60 minutos</option>
                    <option value="90 min">90 minutos</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Preço de Venda (R$):</label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    className="bg-muted/30 border-hairline h-8 text-xs font-mono font-bold text-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Comissão Padrão do Barbeiro (%):</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={newServiceCommission}
                  onChange={(e) => setNewServiceCommission(e.target.value)}
                  className="bg-muted/30 border-hairline h-8 text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
                <Button type="button" variant="outline" onClick={() => setIsNewServiceModalOpen(false)} className="h-8 text-xs cursor-pointer">
                  Cancelar
                </Button>
                <Button type="submit" className="h-8 text-xs font-bold bg-primary text-primary-foreground cursor-pointer">
                  Cadastrar Serviço
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Perfil e Logout do Usuário */}
      {currentUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          onLogout={() => {
            localStorage.removeItem("barberhub_session_user");
            supabase.auth.signOut();
            setCurrentUser(null);
            setIsProfileModalOpen(false);
            showToast("Sessão encerrada com sucesso.");
          }}
          onOpenEnvironmentSelector={() => {
            setIsProfileModalOpen(false);
            setIsNavorSelectorOpen(true);
          }}
          onOpenSettings={() => {
            setActiveTab("settings");
            setIsProfileModalOpen(false);
          }}
        />
      )}

      {/* Seletor de Ambientes NAVOR ("Escolha seu ambiente de trabalho") */}
      <NavorEnvironmentSelectorModal
        isOpen={isNavorSelectorOpen}
        onClose={() => setIsNavorSelectorOpen(false)}
      />
    </div>
  );
}
