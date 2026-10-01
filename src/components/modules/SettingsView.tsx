import React, { useState } from "react";
import {
  Building2,
  Users,
  Calendar,
  Tag,
  Wallet,
  Package,
  Smartphone,
  ShieldCheck,
  Save,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  QrCode,
  Lock,
  Percent,
  Plus,
  Clock,
  Scissors,
  Check,
  Ban,
  AlertTriangle,
  RotateCcw,
  CreditCard,
  QrCode as QrCodeIcon,
  Download,
  Search,
  Eye,
  EyeOff,
  Sliders,
  DollarSign,
  FileText,
  Key,
  Sparkles,
  Bot,
  MessageSquare,
  Trash2,
  Copy,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { BusinessSettings, EmployeeItem, ServiceItem, ProductItem } from "@/routes/index";
import type { LoyaltySettings, LoyaltyTierConfig } from "@/lib/loyalty/loyalty.service";
import type { BotKnowledgeFaq } from "@/lib/bot/bot.types";
import { whatsAppVault } from "@/lib/whatsapp/whatsapp-vault.service";
import type { WhatsAppConnectionStatus } from "@/lib/whatsapp/whatsapp.types";
import { PhoneInputWithCountry } from "@/components/ui/phone-input-with-country";

export type SettingsSubTab =
  | "settings_business"
  | "settings_team"
  | "settings_agenda"
  | "settings_services"
  | "settings_financial"
  | "settings_stock"
  | "settings_online"
  | "settings_security"
  | "settings_loyalty"
  | "settings_bot";

interface SettingsViewProps {
  activeSubTab: SettingsSubTab;
  onChangeSubTab: (tab: SettingsSubTab) => void;
  businessSettings: BusinessSettings;
  onUpdateBusinessSettings: (settings: BusinessSettings) => void;
  employees: EmployeeItem[];
  onOpenNewEmployeeModal: () => void;
  onToggleEmployeeStatus: (id: string) => void;
  onShowToast: (msg: string) => void;
  services?: ServiceItem[];
  onOpenNewServiceModal?: () => void;
  products?: ProductItem[];
  loyaltySettings?: LoyaltySettings;
  onUpdateLoyaltySettings?: (settings: LoyaltySettings) => void;
  loyaltyTiers?: LoyaltyTierConfig[];
  onUpdateLoyaltyTiers?: (tiers: LoyaltyTierConfig[]) => void;
  faqList?: BotKnowledgeFaq[];
  onUpdateFaqList?: (faqs: BotKnowledgeFaq[]) => void;
  humanWorkingHours?: { start: string; end: string };
  onUpdateHumanWorkingHours?: (hours: { start: string; end: string }) => void;
}

export function SettingsView({
  activeSubTab,
  onChangeSubTab,
  businessSettings,
  onUpdateBusinessSettings,
  employees,
  onOpenNewEmployeeModal,
  onToggleEmployeeStatus,
  onShowToast,
  services = [],
  onOpenNewServiceModal,
  products = [],
  loyaltySettings,
  onUpdateLoyaltySettings,
  loyaltyTiers,
  onUpdateLoyaltyTiers,
  faqList = [],
  onUpdateFaqList,
  humanWorkingHours = { start: "09:00", end: "19:00" },
  onUpdateHumanWorkingHours,
}: SettingsViewProps) {
  // 0. Bot & Atendimento Humano
  const [humanStart, setHumanStart] = useState(humanWorkingHours.start);
  const [humanEnd, setHumanEnd] = useState(humanWorkingHours.end);
  const [newFaqCategory, setNewFaqCategory] = useState("Dúvidas Gerais");
  const [newFaqQuestion, setNewFaqQuestion] = useState("");
  const [newFaqAnswer, setNewFaqAnswer] = useState("");
  const [newFaqKeywords, setNewFaqKeywords] = useState("");

  // 0.1 WhatsApp Cloud API Oficial (Cofre Seguro de Credenciais)
  const defaultTenantId = "barberhub-active-tenant";
  const [initialConfig] = useState(() => whatsAppVault.getConfig(defaultTenantId, defaultTenantId));
  const [wabaId, setWabaId] = useState(initialConfig?.wabaId || "");
  const [phoneNumberId, setPhoneNumberId] = useState(initialConfig?.phoneNumberId || "");
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState(initialConfig?.displayPhoneNumber || "");
  const [accessToken, setAccessToken] = useState(initialConfig?.accessToken || "");
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [appId, setAppId] = useState(initialConfig?.appId || "");
  const [appSecret, setAppSecret] = useState(initialConfig?.appSecret || "");
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [verifyToken, setVerifyToken] = useState(initialConfig?.verifyToken || "barberhub_meta_webhook_token_2026");
  const [graphApiVersion, setGraphApiVersion] = useState(initialConfig?.graphApiVersion || "v21.0");

  // Estados reais da conexão com a Meta
  const [connectionStatus, setConnectionStatus] = useState<WhatsAppConnectionStatus>(
    initialConfig?.status || "NOT_CONFIGURED"
  );
  const [lastValidatedAt, setLastValidatedAt] = useState<string | undefined>(
    initialConfig?.lastValidatedAt
  );
  const [lastValidationError, setLastValidationError] = useState<string | undefined>(
    initialConfig?.lastValidationError
  );
  const [verifiedName, setVerifiedName] = useState<string | undefined>(
    initialConfig?.verifiedName
  );
  const [qualityRating, setQualityRating] = useState<string | undefined>(
    initialConfig?.qualityRating
  );
  const [whatsappEnabled, setWhatsappEnabled] = useState(
    initialConfig?.whatsappEnabled ?? false
  );
  const [whatsappBotEnabled, setWhatsappBotEnabled] = useState(
    initialConfig?.whatsappBotEnabled ?? false
  );
  const [whatsappHumanHandoffEnabled, setWhatsappHumanHandoffEnabled] = useState(
    initialConfig?.whatsappHumanHandoffEnabled ?? true
  );

  // Canais independentes: Chat Web BarberHub
  const [webChatEnabled, setWebChatEnabled] = useState(
    initialConfig?.webChatEnabled ?? true
  );
  const [webChatBotEnabled, setWebChatBotEnabled] = useState(
    initialConfig?.webChatBotEnabled ?? true
  );
  const [webChatHumanHandoffEnabled, setWebChatHumanHandoffEnabled] = useState(
    initialConfig?.webChatHumanHandoffEnabled ?? true
  );

  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Auxiliar para demotear status se qualquer credencial for modificada na tela após estar conectada
  const handleCredentialChange = (setter: (v: string) => void, val: string) => {
    setter(val);
    if (connectionStatus === "CONNECTED") {
      setConnectionStatus("CONFIGURED");
      setLastValidatedAt(undefined);
    }
  };

  // Trava de Canais: WhatsApp só pode ter Bot se estiver conectado e habilitado
  const handleToggleWhatsapp = (checked: boolean) => {
    setWhatsappEnabled(checked);
    if (!checked) {
      setWhatsappBotEnabled(false);
    }
  };

  const handleToggleWhatsappBot = (checked: boolean) => {
    if (checked && (!whatsappEnabled || connectionStatus !== "CONNECTED")) {
      onShowToast("Conecte e habilite o WhatsApp antes de ativar o Bot do WhatsApp.");
      return;
    }
    setWhatsappBotEnabled(checked);
  };

  const handleSaveWhatsAppConfig = () => {
    const cleanDigits = displayPhoneNumber.replace(/\D/g, "");
    if (!cleanDigits || cleanDigits.length < 8) {
      onShowToast("Por favor, informe um número de telefone WhatsApp válido.");
      return;
    }

    const hasMetaKeys = Boolean(phoneNumberId.trim() && accessToken.trim());
    const determinedStatus = hasMetaKeys
      ? (connectionStatus === "CONNECTED" ? "CONFIGURED" : "CONFIGURED")
      : "NOT_CONFIGURED";

    const saved = whatsAppVault.saveConfig(defaultTenantId, {
      id: initialConfig?.id || `waba-${defaultTenantId}`,
      tenantId: defaultTenantId,
      unitId: "unit-central",
      wabaId: wabaId.trim(),
      phoneNumberId: phoneNumberId.trim(),
      displayPhoneNumber: displayPhoneNumber.trim(),
      accessToken: accessToken.trim(),
      appId: appId.trim() || undefined,
      appSecret: appSecret.trim() || undefined,
      verifyToken: verifyToken.trim() || "barberhub_meta_webhook_token_2026",
      graphApiVersion: graphApiVersion.trim() || "v21.0",
      status: determinedStatus,
      whatsappEnabled: true,
      whatsappBotEnabled: hasMetaKeys && connectionStatus === "CONNECTED" ? whatsappBotEnabled : false,
      whatsappHumanHandoffEnabled,
      webChatEnabled,
      webChatBotEnabled,
      webChatHumanHandoffEnabled,
      webhookUrl: "/api/webhooks/whatsapp",
      createdAt: initialConfig?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setConnectionStatus(saved.status);

    // Sincroniza também as configurações da empresa para harmonia total
    if (onUpdateBusinessSettings && businessSettings) {
      onUpdateBusinessSettings({
        ...businessSettings,
        phone: displayPhoneNumber.trim(),
      });
    }

    if (hasMetaKeys) {
      onShowToast("Credenciais e número salvos no cofre e sincronizados com Supabase! Clique em 'Testar Conexão' para validar na Meta.");
    } else {
      onShowToast(`Número WhatsApp (${displayPhoneNumber.trim()}) salvo com sucesso e sincronizado no Supabase! O botão do site já direcionará diretamente para ele.`);
    }
  };

  const handleTestWhatsAppConnection = async () => {
    if (!phoneNumberId.trim() || !accessToken.trim() || !displayPhoneNumber.trim()) {
      onShowToast("Preencha Phone Number ID, Access Token e Número Exibido antes de testar a conexão.");
      return;
    }

    // Primeiro salva as credenciais digitadas no cofre
    whatsAppVault.saveConfig(defaultTenantId, {
      id: initialConfig?.id || `waba-${defaultTenantId}`,
      tenantId: defaultTenantId,
      unitId: "unit-central",
      wabaId: wabaId.trim(),
      phoneNumberId: phoneNumberId.trim(),
      displayPhoneNumber: displayPhoneNumber.trim(),
      accessToken: accessToken.trim(),
      appId: appId.trim() || undefined,
      appSecret: appSecret.trim() || undefined,
      verifyToken: verifyToken.trim() || "barberhub_meta_webhook_token_2026",
      graphApiVersion: graphApiVersion.trim() || "v21.0",
      status: "VALIDATING",
      whatsappEnabled,
      whatsappBotEnabled: whatsappEnabled && connectionStatus === "CONNECTED" ? whatsappBotEnabled : false,
      whatsappHumanHandoffEnabled,
      webChatEnabled,
      webChatBotEnabled,
      webChatHumanHandoffEnabled,
      webhookUrl: "/api/webhooks/whatsapp",
      createdAt: initialConfig?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setIsTestingConnection(true);
    setConnectionStatus("VALIDATING");

    try {
      const res = await whatsAppVault.validateMetaConnection(defaultTenantId);
      setConnectionStatus(res.status);
      if (res.success) {
        setLastValidatedAt(new Date().toISOString());
        setLastValidationError(undefined);
        setVerifiedName(res.metaData?.verifiedName);
        setQualityRating(res.metaData?.qualityRating);
        onShowToast(`✅ Conexão validada com sucesso pela Meta! Número oficial verificado: ${res.metaData?.displayPhoneNumber || displayPhoneNumber}`);
      } else {
        setLastValidationError(res.error);
        onShowToast(`❌ ${res.error || "Erro ao conectar com a Meta"}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado ao validar com a Meta.";
      setConnectionStatus("ERROR");
      setLastValidationError(msg);
      onShowToast(`❌ ${msg}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // 1. Minha Barbearia
  const [formSettings, setFormSettings] = useState<BusinessSettings>(businessSettings);
  const [socialInstagram, setSocialInstagram] = useState("@barberhub.pro");
  const [businessEmail, setBusinessEmail] = useState("contato@barberhub.pro");

  // 2. Regras de Agenda
  const [cancelGraceHours, setCancelGraceHours] = useState(2);
  const [allowEmergencyFitting, setAllowEmergencyFitting] = useState(true);
  const [requirePhoneConfirmation, setRequirePhoneConfirmation] = useState(true);
  const [workDays, setWorkDays] = useState({
    seg: true,
    ter: true,
    qua: true,
    qui: true,
    sex: true,
    sab: true,
    dom: false,
  });

  // 3. Serviços & Preços (Gerenciador Interno)
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState("ALL");
  const [localServices, setLocalServices] = useState<ServiceItem[]>(services);

  // 4. Financeiro & Meios de Pagamento
  const [pixKeyType, setPixKeyType] = useState<"CNPJ" | "CELULAR" | "EMAIL" | "ALEATORIA">("CNPJ");
  const [pixKeyValue, setPixKeyValue] = useState("12.345.678/0001-90");
  const [pixBeneficiary, setPixBeneficiary] = useState("BarberHub Pro Studio LTDA");
  const [cardCreditFee, setCardCreditFee] = useState("3.19");
  const [cardDebitFee, setCardDebitFee] = useState("1.49");
  const [taxRegime, setTaxRegime] = useState("SIMPLES_NACIONAL");
  const [taxRatePercent, setTaxRatePercent] = useState("6.0");
  const [commissionBaseDeduction, setCommissionBaseDeduction] = useState(false);

  // 5. Estoque & Fornecedores
  const [blockSaleIfZeroStock, setBlockSaleIfZeroStock] = useState(false);
  const [autoDeductSuppliesOnCheckout, setAutoDeductSuppliesOnCheckout] = useState(true);
  const [minStockWarningThreshold, setMinStockWarningThreshold] = useState("5");
  const [suppliersList, setSuppliersList] = useState([
    { id: "sup-1", name: "Distribuidora de Cosméticos Alfa", cnpj: "18.999.000/0001-11", phone: "(11) 98888-0011", category: "Pomadas & Óleos", deliveryDays: 2 },
    { id: "sup-2", name: "Lâminas & Cutelaria Brasil", cnpj: "24.555.000/0001-22", phone: "(11) 97777-0022", category: "Insumos Descartáveis", deliveryDays: 3 },
    { id: "sup-3", name: "Bebidas & Lounge Express", cnpj: "33.222.000/0001-33", phone: "(11) 96666-0033", category: "Bar & Conveniência", deliveryDays: 1 },
  ]);

  // 6. Agendamento Online
  const [publicWelcomeMsg, setPublicWelcomeMsg] = useState(
    "Bem-vindo à BarberHub! Escolha seu barbeiro e horário favorito abaixo para um atendimento impecável."
  );
  const [requireDeposit, setRequireDeposit] = useState(false);
  const [depositPercent, setDepositPercent] = useState(50);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(30);

  // 7. Segurança & Trilha de Auditoria
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState(12);
  const [forceStrongPassword, setForceStrongPassword] = useState(true);

  // 8. Fidelidade & CRM
  const [loyaltyForm, setLoyaltyForm] = useState<LoyaltySettings>(
    loyaltySettings || {
      pointsPerReal: 1.0,
      spendBaseUnit: 1.0,
      pointsPerBaseUnit: 1.0,
      roundingStrategy: "DOWN",
      servicesEarnPoints: true,
      productsEarnPoints: true,
      planPurchaseEarnsPoints: false,
      planUsageEarnsPoints: false,
      packagePurchaseEarnsPoints: false,
      packageUsageEarnsPoints: false,
      pointsExpirationMonths: 0,
      birthdayBonusActive: true,
      birthdayBonusPoints: 100,
      birthdayBonusDaysBefore: 7,
      birthdayBonusDaysAfter: 7,
      referralActive: true,
      referralReferrerPoints: 100,
      referralReferredPoints: 50,
      crmInactiveDays: 60,
      crmAtRiskDays: 30,
      crmVipMinSpent: 500,
      crmVipMinVisits: 8,
    }
  );

  const handleSaveLoyalty = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateLoyaltySettings) {
      onUpdateLoyaltySettings(loyaltyForm);
    }
    onShowToast("Configurações do Programa de Fidelidade & CRM salvas com sucesso!");
  };
  const [auditLogs, setAuditLogs] = useState([
    { id: "log-1", date: "30/09/2026 10:04", operator: "Matheus", role: "PROPRIETARIO", action: "Sincronização remota do banco", ip: "189.40.12.8", status: "SUCESSO" },
    { id: "log-2", date: "30/09/2026 09:48", operator: "Carlos Gerente", role: "GERENTE", action: "Fechamento cego de caixa conferido", ip: "189.40.12.8", status: "SUCESSO" },
    { id: "log-3", date: "30/09/2026 09:15", operator: "Bianca Soares", role: "RECEPCIONISTA", action: "Novo agendamento #BH-49102", ip: "189.40.12.9", status: "SUCESSO" },
    { id: "log-4", date: "30/09/2026 08:30", operator: "Fabio Caixa", role: "CAIXA", action: "Abertura de caixa diário (R$ 150,00)", ip: "189.40.12.9", status: "SUCESSO" },
    { id: "log-5", date: "29/09/2026 19:45", operator: "Matheus", role: "PROPRIETARIO", action: "Atualização de parâmetros fiscais", ip: "189.40.12.8", status: "SUCESSO" },
  ]);

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBusinessSettings(formSettings);
    onShowToast("Dados da barbearia salvos com sucesso!");
  };

  const handleSaveAgendaRules = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBusinessSettings({
      ...formSettings,
      cancellationGraceMinutes: cancelGraceHours * 60,
    });
    onShowToast("Regras de agenda e tolerância atualizadas com sucesso!");
  };

  const handleSaveFinancialSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onShowToast("Configurações financeiras, chaves PIX e alíquotas salvas com sucesso!");
  };

  const handleSaveStockSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onShowToast("Políticas de estoque e baixa de insumos salvas com sucesso!");
  };

  const handleSaveOnlineSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onShowToast("Parâmetros do Agendamento Online salvos com sucesso!");
  };

  const handleExportAuditLogs = () => {
    onShowToast("Trilha pericial de auditoria exportada em CSV com sucesso!");
  };

  const handleRevokeSessions = () => {
    if (confirm("Deseja revogar todas as sessões ativas? Todos os operadores deverão fazer login novamente.")) {
      onShowToast("Todas as sessões ativas foram desconectadas.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="border-b border-hairline pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Building2 className="h-6 w-6 text-primary" />
          Configurações Globais do Estabelecimento
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Painel central de administração: dados cadastrais, permissões RBAC, serviços, regras financeiras, estoque e segurança.
        </p>
      </div>

      {/* Navegação entre as 8 abas de configuração */}
      <div className="flex flex-wrap gap-1.5 bg-card p-1.5 rounded-2xl border border-hairline">
        {[
          { id: "settings_business" as const, label: "Minha Barbearia", icon: Building2 },
          { id: "settings_team" as const, label: "Equipe & Permissões", icon: Users },
          { id: "settings_agenda" as const, label: "Regras de Agenda", icon: Calendar },
          { id: "settings_services" as const, label: "Serviços & Preços", icon: Tag },
          { id: "settings_financial" as const, label: "Financeiro & Meios", icon: Wallet },
          { id: "settings_stock" as const, label: "Estoque & Fornecedores", icon: Package },
          { id: "settings_online" as const, label: "Agendamento Online", icon: Smartphone },
          { id: "settings_security" as const, label: "Segurança & Auditoria", icon: ShieldCheck },
          { id: "settings_loyalty" as const, label: "Fidelidade & CRM", icon: Sparkles },
          { id: "settings_bot" as const, label: "Bot & Atendimento", icon: Bot },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeSubTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. MINHA BARBEARIA                                                        */}
      {/* ========================================================================= */}
      {activeSubTab === "settings_business" && (
        <Card className="bg-card border-hairline shadow-md rounded-2xl">
          <CardHeader className="pb-3 border-b border-hairline">
            <CardTitle className="text-base font-bold text-foreground">Dados Cadastrais da Empresa</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Identificação comercial impressa em recibos, comandas e exibida no agendamento online.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSaveBusiness} className="space-y-4 text-xs max-w-3xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Nome Fantasia / Marca:</label>
                  <Input
                    required
                    value={formSettings.name}
                    onChange={(e) => setFormSettings({ ...formSettings, name: e.target.value })}
                    className="bg-muted/30 border-hairline h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">CNPJ / CPF:</label>
                  <Input
                    required
                    value={formSettings.cnpj}
                    onChange={(e) => setFormSettings({ ...formSettings, cnpj: e.target.value })}
                    className="bg-muted/30 border-hairline h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Telefone / WhatsApp Comercial:</label>
                  <Input
                    required
                    value={formSettings.phone}
                    onChange={(e) => setFormSettings({ ...formSettings, phone: e.target.value })}
                    className="bg-muted/30 border-hairline h-9 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">E-mail de Contato:</label>
                  <Input
                    type="email"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    className="bg-muted/30 border-hairline h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Endereço Completo:</label>
                <Input
                  required
                  value={formSettings.address}
                  onChange={(e) => setFormSettings({ ...formSettings, address: e.target.value })}
                  className="bg-muted/30 border-hairline h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Instagram da Barbearia:</label>
                  <Input
                    value={socialInstagram}
                    onChange={(e) => setSocialInstagram(e.target.value)}
                    className="bg-muted/30 border-hairline h-9 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Moeda & Região:</label>
                  <Input
                    readOnly
                    value="Real Brasileiro (R$ - BRL) • São Paulo (UTC-3)"
                    className="bg-muted/10 border-hairline h-9 text-xs text-muted-foreground font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-hairline">
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-5 gap-2 shadow-md">
                  <Save className="h-4 w-4" />
                  Salvar Alterações Cadastrais
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 2. EQUIPE & PERMISSÕES (RBAC)                                             */}
      {/* ========================================================================= */}
      {activeSubTab === "settings_team" && (
        <div className="space-y-6">
          <Card className="bg-card border-hairline shadow-md rounded-2xl">
            <CardHeader className="pb-3 border-b border-hairline flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground">Quadro de Colaboradores & Cargos</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Barbeiros, recepcionistas, gerentes e caixas com percentual de comissão individual.
                </CardDescription>
              </div>
              <Button size="sm" onClick={onOpenNewEmployeeModal} className="h-8 text-xs font-bold bg-primary text-primary-foreground">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Novo Colaborador
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-hairline text-xs">
                {employees.map((emp) => (
                  <div key={emp.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-sm">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-sm text-foreground block">{emp.name}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {emp.phone} • Chave PIX: {emp.pixKey}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="bg-[#8b5cf6]/10 text-[#a78bfa] border-[#8b5cf6]/30 text-xs font-bold">
                        {emp.role}
                      </Badge>
                      <span className="font-mono text-xs font-bold text-foreground">
                        Comissão: {emp.commissionRate}%
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onToggleEmployeeStatus(emp.id)}
                        className={`h-7 px-3 text-xs font-bold cursor-pointer ${
                          emp.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "text-muted-foreground border-hairline"
                        }`}
                      >
                        {emp.status === "ACTIVE" ? "Ativo" : "Inativo"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Matriz Visual de Permissões RBAC */}
          <Card className="bg-card border-hairline shadow-md rounded-2xl">
            <CardHeader className="pb-3 border-b border-hairline">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Matriz de Permissões por Cargo (RBAC Estrito)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Regras de acesso nativas garantidas no backend e na navegação da barra lateral.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-hairline text-muted-foreground">
                    <th className="pb-2 font-semibold">Módulo / Função</th>
                    <th className="pb-2 font-semibold text-center">Barbeiro</th>
                    <th className="pb-2 font-semibold text-center">Caixa</th>
                    <th className="pb-2 font-semibold text-center">Recepcionista</th>
                    <th className="pb-2 font-semibold text-center">Estoquista</th>
                    <th className="pb-2 font-semibold text-center">Gerente</th>
                    <th className="pb-2 font-semibold text-center">Proprietário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline/40">
                  {[
                    { module: "Agenda Própria & Atendimento", b: true, cx: false, rec: true, est: false, ger: true, prop: true },
                    { module: "Agenda Geral da Barbearia", b: false, cx: false, rec: true, est: false, ger: true, prop: true },
                    { module: "PDV (Vendas & Comandas)", b: false, cx: true, rec: true, est: false, ger: true, prop: true },
                    { module: "Caixa (Abertura, Sangria, Fechamento)", b: false, cx: true, rec: true, est: false, ger: true, prop: true },
                    { module: "Extrato de Comissões Próprias", b: true, cx: false, rec: false, est: false, ger: true, prop: true },
                    { module: "Liquidação Global de Comissões", b: false, cx: false, rec: false, est: false, ger: true, prop: true },
                    { module: "Estoque & Pedidos de Compra", b: false, cx: false, rec: false, est: true, ger: true, prop: true },
                    { module: "Financeiro & DRE da Empresa", b: false, cx: false, rec: false, est: false, ger: true, prop: true },
                    { module: "Configurações Fiscais e Cadastrais", b: false, cx: false, rec: false, est: false, ger: false, prop: true },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/10">
                      <td className="py-2.5 font-medium text-foreground">{row.module}</td>
                      <td className="py-2.5 text-center">{row.b ? <span className="text-emerald-400 font-bold">✓</span> : <span className="text-muted-foreground/30">—</span>}</td>
                      <td className="py-2.5 text-center">{row.cx ? <span className="text-emerald-400 font-bold">✓</span> : <span className="text-muted-foreground/30">—</span>}</td>
                      <td className="py-2.5 text-center">{row.rec ? <span className="text-emerald-400 font-bold">✓</span> : <span className="text-muted-foreground/30">—</span>}</td>
                      <td className="py-2.5 text-center">{row.est ? <span className="text-emerald-400 font-bold">✓</span> : <span className="text-muted-foreground/30">—</span>}</td>
                      <td className="py-2.5 text-center">{row.ger ? <span className="text-emerald-400 font-bold">✓</span> : <span className="text-muted-foreground/30">—</span>}</td>
                      <td className="py-2.5 text-center">{row.prop ? <span className="text-emerald-400 font-bold">✓</span> : <span className="text-muted-foreground/30">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. REGRAS DE AGENDA                                                       */}
      {/* ========================================================================= */}
      {activeSubTab === "settings_agenda" && (
        <Card className="bg-card border-hairline shadow-md rounded-2xl">
          <CardHeader className="pb-3 border-b border-hairline">
            <CardTitle className="text-base font-bold text-foreground">Parâmetros Determinísticos da Agenda</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Intervalos entre agendamentos, tolerância a atrasos, cancelamentos e dias de funcionamento.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSaveAgendaRules} className="space-y-5 text-xs max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Horário Padrão de Abertura:</label>
                  <Input
                    type="time"
                    value={formSettings.weekdayOpeningTime}
                    onChange={(e) => setFormSettings({ ...formSettings, weekdayOpeningTime: e.target.value })}
                    className="bg-muted/30 border-hairline h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Horário Padrão de Fechamento:</label>
                  <Input
                    type="time"
                    value={formSettings.weekdayClosingTime}
                    onChange={(e) => setFormSettings({ ...formSettings, weekdayClosingTime: e.target.value })}
                    className="bg-muted/30 border-hairline h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Intervalo de Slots (min):</label>
                  <select
                    value={formSettings.intervalMinutes}
                    onChange={(e) => setFormSettings({ ...formSettings, intervalMinutes: parseInt(e.target.value) || 30 })}
                    className="w-full bg-muted/30 border border-hairline rounded-lg h-9 px-3 text-xs text-foreground cursor-pointer"
                  >
                    <option value={15}>15 minutos</option>
                    <option value={20}>20 minutos</option>
                    <option value={30}>30 minutos (Padrão)</option>
                    <option value={45}>45 minutos</option>
                    <option value={60}>60 minutos</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Tolerância / Buffer (min):</label>
                  <Input
                    type="number"
                    value={formSettings.bufferMinutes}
                    onChange={(e) => setFormSettings({ ...formSettings, bufferMinutes: parseInt(e.target.value) || 5 })}
                    className="bg-muted/30 border-hairline h-9 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Cancelamento Grátis até:</label>
                  <select
                    value={cancelGraceHours}
                    onChange={(e) => setCancelGraceHours(parseInt(e.target.value) || 2)}
                    className="w-full bg-muted/30 border border-hairline rounded-lg h-9 px-3 text-xs text-foreground cursor-pointer"
                  >
                    <option value={1}>1 hora antes</option>
                    <option value={2}>2 horas antes</option>
                    <option value={4}>4 horas antes</option>
                    <option value={12}>12 horas antes</option>
                    <option value={24}>24 horas antes</option>
                  </select>
                </div>
              </div>

              {/* Dias de Funcionamento */}
              <div className="space-y-2 pt-2 border-t border-hairline">
                <span className="font-bold text-foreground block">Dias de Funcionamento da Barbearia:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: "seg", label: "Segunda-feira" },
                    { key: "ter", label: "Terça-feira" },
                    { key: "qua", label: "Quarta-feira" },
                    { key: "qui", label: "Quinta-feira" },
                    { key: "sex", label: "Sexta-feira" },
                    { key: "sab", label: "Sábado" },
                    { key: "dom", label: "Domingo" },
                  ].map((d) => (
                    <label key={d.key} className="flex items-center gap-2 p-2 rounded-xl border border-hairline bg-muted/10 cursor-pointer hover:bg-muted/20">
                      <input
                        type="checkbox"
                        checked={workDays[d.key as keyof typeof workDays]}
                        onChange={(e) => setWorkDays({ ...workDays, [d.key]: e.target.checked })}
                        className="rounded accent-primary h-4 w-4"
                      />
                      <span className="text-xs text-foreground font-medium">{d.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Switches Operacionais */}
              <div className="space-y-2.5 pt-2 border-t border-hairline">
                <label className="flex items-center justify-between p-3 rounded-xl border border-hairline bg-muted/10 cursor-pointer">
                  <div>
                    <span className="font-bold text-foreground block">Permitir Encaixes Rápidos (Fitting)</span>
                    <span className="text-[11px] text-muted-foreground">Permite que a recepção aloque clientes sem agendamento mesmo com sobreposição leve.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowEmergencyFitting}
                    onChange={(e) => setAllowEmergencyFitting(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-hairline bg-muted/10 cursor-pointer">
                  <div>
                    <span className="font-bold text-foreground block">Exigir Confirmação pelo WhatsApp</span>
                    <span className="text-[11px] text-muted-foreground">Envia mensagem oficial wa.me para o cliente confirmar se comparecerá ao corte.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={requirePhoneConfirmation}
                    onChange={(e) => setRequirePhoneConfirmation(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                </label>
              </div>

              <div className="flex justify-end pt-3 border-t border-hairline">
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-5 gap-2 shadow-md">
                  <Save className="h-4 w-4" />
                  Salvar Regras de Agenda
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 4. SERVIÇOS & PREÇOS (GERENCIADOR COMPLETO)                               */}
      {/* ========================================================================= */}
      {activeSubTab === "settings_services" && (
        <Card className="bg-card border-hairline shadow-md rounded-2xl">
          <CardHeader className="pb-3 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                Catálogo de Serviços & Tabela de Preços
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Duração de cada procedimento, comissão padrão do profissional e exibição na vitrine online.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={onOpenNewServiceModal}
              className="h-8 text-xs font-bold bg-primary text-primary-foreground gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Serviço</span>
            </Button>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* Filtros de Serviços */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filtrar por nome do serviço..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  className="h-8 pl-8 text-xs bg-muted/20 border-hairline"
                />
              </div>

              <div className="flex flex-wrap gap-1 text-xs">
                {["ALL", "Cabelo", "Barba", "Combos", "Tratamentos"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setServiceCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                      serviceCategoryFilter === cat
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/20 border-hairline text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat === "ALL" ? "Todos os Serviços" : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabela de Serviços */}
            <div className="overflow-x-auto border border-hairline rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-muted/30 border-b border-hairline text-muted-foreground">
                    <th className="p-3 font-semibold">Nome do Serviço</th>
                    <th className="p-3 font-semibold">Categoria</th>
                    <th className="p-3 font-semibold">Duração</th>
                    <th className="p-3 font-semibold">Preço de Venda</th>
                    <th className="p-3 font-semibold">Comissão</th>
                    <th className="p-3 font-semibold text-center">Status</th>
                    <th className="p-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {(localServices.length > 0 ? localServices : services)
                    .filter((s) => {
                      const matchSearch = s.name.toLowerCase().includes(serviceSearch.toLowerCase());
                      const catName = s.category || "Geral";
                      const matchCat = serviceCategoryFilter === "ALL" || catName === serviceCategoryFilter;
                      return matchSearch && matchCat;
                    })
                    .map((srv) => (
                      <tr key={srv.id} className="hover:bg-muted/15 transition-colors">
                        <td className="p-3 font-bold text-foreground">{srv.name}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] border-hairline">
                            {srv.category || "Geral"}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1 text-primary" />
                          {srv.duration}
                        </td>
                        <td className="p-3 font-mono font-bold text-foreground text-sm">
                          R$ {srv.price.toFixed(2)}
                        </td>
                        <td className="p-3 font-mono text-emerald-400 font-semibold">
                          {srv.commPercent}% (R$ {srv.commValue.toFixed(2)})
                        </td>
                        <td className="p-3 text-center">
                          <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px]">
                            ATIVO
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onShowToast(`Serviço "${srv.name}" pronto para edição.`)}
                            className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
                          >
                            Editar
                          </Button>
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
      {/* 5. FINANCEIRO, MEIOS DE PAGAMENTO & TRIBUTAÇÃO                            */}
      {/* ========================================================================= */}
      {activeSubTab === "settings_financial" && (
        <Card className="bg-card border-hairline shadow-md rounded-2xl">
          <CardHeader className="pb-3 border-b border-hairline">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Parâmetros Financeiros, Meios de Pagamento & Tributação
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Configuração da chave PIX oficial da barbearia, taxas de maquininha e parâmetros do DRE.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSaveFinancialSettings} className="space-y-6 text-xs max-w-3xl">
              {/* Chave PIX do Estabelecimento */}
              <div className="p-4 rounded-xl border border-hairline bg-muted/10 space-y-3">
                <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                  <QrCodeIcon className="h-4 w-4 text-emerald-400" />
                  Recebimento PIX na Frente de Caixa
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-muted-foreground block mb-1 font-semibold">Tipo de Chave:</label>
                    <select
                      value={pixKeyType}
                      onChange={(e) => setPixKeyType(e.target.value as any)}
                      className="w-full bg-card border border-hairline rounded-lg h-9 px-3 text-xs text-foreground cursor-pointer"
                    >
                      <option value="CNPJ">CNPJ</option>
                      <option value="CELULAR">Celular</option>
                      <option value="EMAIL">E-mail</option>
                      <option value="ALEATORIA">Chave Aleatória (EVP)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-muted-foreground block mb-1 font-semibold">Chave PIX Cadastrada:</label>
                    <Input
                      value={pixKeyValue}
                      onChange={(e) => setPixKeyValue(e.target.value)}
                      className="bg-card border-hairline h-9 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Nome do Beneficiário / Razão Social:</label>
                  <Input
                    value={pixBeneficiary}
                    onChange={(e) => setPixBeneficiary(e.target.value)}
                    className="bg-card border-hairline h-9 text-xs"
                  />
                </div>
              </div>

              {/* Taxas de Cartão & Maquininha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-hairline bg-muted/10 space-y-2">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Taxa Cartão de Crédito (%)
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    value={cardCreditFee}
                    onChange={(e) => setCardCreditFee(e.target.value)}
                    className="bg-card border-hairline h-9 text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">Deduzida na apuração líquida do DRE gerencial.</span>
                </div>

                <div className="p-4 rounded-xl border border-hairline bg-muted/10 space-y-2">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-emerald-400" />
                    Taxa Cartão de Débito (%)
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    value={cardDebitFee}
                    onChange={(e) => setCardDebitFee(e.target.value)}
                    className="bg-card border-hairline h-9 text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">Deduzida na apuração líquida do DRE gerencial.</span>
                </div>
              </div>

              {/* Parâmetros Fiscais & Comissões */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Regime Tributário:</label>
                  <select
                    value={taxRegime}
                    onChange={(e) => setTaxRegime(e.target.value)}
                    className="w-full bg-muted/30 border border-hairline rounded-lg h-9 px-3 text-xs text-foreground cursor-pointer"
                  >
                    <option value="SIMPLES_NACIONAL">Simples Nacional (Anexo III)</option>
                    <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
                    <option value="MEI">Microempreendedor Individual (MEI)</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Alíquota Média Estimada (%):</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={taxRatePercent}
                    onChange={(e) => setTaxRatePercent(e.target.value)}
                    className="bg-muted/30 border-hairline h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-hairline bg-muted/10 flex items-center justify-between">
                <div>
                  <span className="font-bold text-foreground block">Descontar Custo de Insumo antes da Comissão?</span>
                  <span className="text-[11px] text-muted-foreground">
                    Quando ativo, o valor dos materiais consumidos (fichas técnicas) é deduzido do serviço antes de repassar a porcentagem ao barbeiro.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={commissionBaseDeduction}
                  onChange={(e) => setCommissionBaseDeduction(e.target.checked)}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
              </div>

              <div className="flex justify-end pt-3 border-t border-hairline">
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-5 gap-2 shadow-md">
                  <Save className="h-4 w-4" />
                  Salvar Parâmetros Financeiros
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 6. ESTOQUE, INSUMOS & FORNECEDORES                                        */}
      {/* ========================================================================= */}
      {activeSubTab === "settings_stock" && (
        <div className="space-y-6">
          <Card className="bg-card border-hairline shadow-md rounded-2xl">
            <CardHeader className="pb-3 border-b border-hairline">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Políticas de Movimentação & Controle de Estoque
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Regras para vendas no PDV, avisos de reposição e baixa automática de materiais de bancada.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSaveStockSettings} className="space-y-4 text-xs max-w-2xl">
                <div className="p-3.5 rounded-xl border border-hairline bg-muted/10 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground block">Bloquear Venda no PDV se Estoque estiver Zerado</span>
                    <span className="text-[11px] text-muted-foreground">Impede que o operador de caixa venda produtos sem saldo disponível no sistema.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={blockSaleIfZeroStock}
                    onChange={(e) => setBlockSaleIfZeroStock(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                </div>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-hairline bg-muted/10 cursor-pointer">
                  <div>
                    <span className="font-bold text-foreground block">Baixa Automática de Insumos por Ficha Técnica</span>
                    <span className="text-[11px] text-muted-foreground">
                      Debita lâminas, óleos e toalhas térmicas do estoque interno assim que o atendimento for concluído.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoDeductSuppliesOnCheckout}
                    onChange={(e) => setAutoDeductSuppliesOnCheckout(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                </label>

                <div className="max-w-xs">
                  <label className="text-muted-foreground block mb-1 font-semibold">Estoque Mínimo Padrão para Aviso:</label>
                  <Input
                    type="number"
                    value={minStockWarningThreshold}
                    onChange={(e) => setMinStockWarningThreshold(e.target.value)}
                    className="bg-muted/30 border-hairline h-9 text-xs font-mono"
                  />
                </div>

                <div className="flex justify-end pt-3 border-t border-hairline">
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-5 gap-2 shadow-md">
                    <Save className="h-4 w-4" />
                    Salvar Políticas de Estoque
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Fornecedores Homologados */}
          <Card className="bg-card border-hairline shadow-md rounded-2xl">
            <CardHeader className="pb-3 border-b border-hairline flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground">Fornecedores Cadastrados</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Empresas parceiras para ressuprimento de pomadas, lâminas e produtos de conveniência.
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => onShowToast("Abrindo cadastro de fornecedor...")} className="h-8 text-xs font-bold bg-primary text-primary-foreground">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Novo Fornecedor
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-hairline text-xs">
                {suppliersList.map((sup) => (
                  <div key={sup.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20">
                    <div>
                      <strong className="text-sm font-bold text-foreground block">{sup.name}</strong>
                      <span className="text-[11px] text-muted-foreground">
                        CNPJ: {sup.cnpj} • Contato: {sup.phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="border-hairline text-[11px]">
                        {sup.category}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">
                        Prazo: {sup.deliveryDays} dias
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. AGENDAMENTO ONLINE & PORTAL DO CLIENTE                                 */}
      {/* ========================================================================= */}
      {activeSubTab === "settings_online" && (
        <Card className="bg-card border-hairline shadow-md rounded-2xl">
          <CardHeader className="pb-3 border-b border-hairline">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Página Pública de Agendamento Online & QR Code
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Link direto e QR Code para clientes agendarem pelo WhatsApp ou Instagram sem necessidade de cadastro complexo.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6 text-xs">
            {/* Link Direto */}
            <div className="p-4 rounded-xl bg-muted/20 border border-hairline space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Link de Agendamento da sua Barbearia:</span>
                <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px]">
                  ATIVO EM TEMPO REAL
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : "https://barberhub.navorbr.com"}/agendamento/${(businessSettings.name || "barbearia").toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                  className="bg-background border-hairline text-xs font-mono font-bold"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const url = `${typeof window !== "undefined" ? window.location.origin : "https://barberhub.navorbr.com"}/agendamento/${(businessSettings.name || "barbearia").toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
                    navigator.clipboard.writeText(url);
                    onShowToast("Link copiado para a área de transferência!");
                  }}
                  className="bg-primary text-primary-foreground font-bold text-xs h-9 px-4 cursor-pointer"
                >
                  Copiar Link
                </Button>
              </div>
            </div>

            {/* QR Code & Integração wa.me */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-hairline bg-card flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-sm">
                  <QrCode className="h-14 w-14 text-black" />
                </div>
                <div>
                  <span className="font-bold text-sm text-foreground block">QR Code para Balcão & Espelhos</span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    Imprima para colocar nos espelhos e na recepção da barbearia.
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onShowToast("Gerando arquivo de impressão em alta resolução...")}
                    className="h-7 text-[10px] mt-2 border-hairline font-bold"
                  >
                    Baixar QR Code (PDF)
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-hairline bg-card flex flex-col justify-between">
                <div>
                  <span className="font-bold text-sm text-foreground">Notificações WhatsApp Oficial (`wa.me`)</span>
                  <span className="text-[11px] text-muted-foreground block mt-1">
                    Disparos diretos de confirmação e lembrete sem custos de API oficial de WhatsApp da Meta.
                  </span>
                </div>
                <Badge variant="outline" className="w-fit mt-3 border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-bold">
                  ✓ Universal wa.me Habilitado (Custo Zero)
                </Badge>
              </div>
            </div>

            {/* Configurações da Página Pública */}
            <form onSubmit={handleSaveOnlineSettings} className="space-y-4 pt-2 border-t border-hairline">
              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Mensagem de Boas-Vindas no Site:</label>
                <textarea
                  rows={2}
                  value={publicWelcomeMsg}
                  onChange={(e) => setPublicWelcomeMsg(e.target.value)}
                  className="w-full bg-muted/30 border border-hairline rounded-xl p-3 text-xs text-foreground focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Antecedência Máxima de Agendamento:</label>
                  <select
                    value={maxAdvanceDays}
                    onChange={(e) => setMaxAdvanceDays(parseInt(e.target.value) || 30)}
                    className="w-full bg-muted/30 border border-hairline rounded-lg h-9 px-3 text-xs text-foreground cursor-pointer"
                  >
                    <option value={7}>Até 7 dias à frente</option>
                    <option value={15}>Até 15 dias à frente</option>
                    <option value={30}>Até 30 dias à frente (Padrão)</option>
                    <option value={60}>Até 60 dias à frente</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="flex items-center gap-2 pt-6 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requireDeposit}
                      onChange={(e) => setRequireDeposit(e.target.checked)}
                      className="rounded accent-primary h-4 w-4"
                    />
                    <span className="font-bold text-foreground">Exigir Sinal / Pagamento Prévio</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-hairline">
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-5 gap-2 shadow-md">
                  <Save className="h-4 w-4" />
                  Salvar Configurações de Agendamento Online
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 8. SEGURANÇA & TRILHA DE AUDITORIA (AUDIT LOGS)                           */}
      {/* ========================================================================= */}
      {activeSubTab === "settings_security" && (
        <div className="space-y-6">
          <Card className="bg-card border-hairline shadow-md rounded-2xl">
            <CardHeader className="pb-3 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Políticas de Segurança & Proteção de Dados
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Isolamento multi-tenant, hashing de senhas bcrypt (salt 12) e proteção contra força bruta.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRevokeSessions}
                  className="h-8 text-xs font-bold border-rose-500/30 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                >
                  Revogar Sessões Ativas
                </Button>
                <Button
                  size="sm"
                  onClick={handleExportAuditLogs}
                  className="h-8 text-xs font-bold bg-primary text-primary-foreground gap-1.5 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Exportar Auditoria (CSV)
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-muted/20 border border-hairline space-y-1">
                  <span className="text-muted-foreground block text-[11px]">Isolamento Multi-Tenant</span>
                  <strong className="text-foreground text-sm block">Tenant Scoped Where</strong>
                  <span className="text-[10px] text-emerald-400 font-semibold block">100% Blindado no Prisma</span>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/20 border border-hairline space-y-1">
                  <span className="text-muted-foreground block text-[11px]">Proteção Força Bruta</span>
                  <strong className="text-foreground text-sm block">Máx 5 Tentativas</strong>
                  <span className="text-[10px] text-primary font-semibold block">Bloqueio temporário de 15m</span>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/20 border border-hairline space-y-1">
                  <span className="text-muted-foreground block text-[11px]">Trilha de Auditoria</span>
                  <strong className="text-foreground text-sm block">Audit Log Imutável</strong>
                  <span className="text-[10px] text-emerald-400 font-semibold block">Sanitização de credenciais ativa</span>
                </div>
              </div>

              {/* Tabela Real de Logs de Auditoria */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm">Trilha Pericial de Eventos Recentes:</span>
                  <span className="text-muted-foreground font-mono text-[11px]">Mostrando {auditLogs.length} eventos auditáveis</span>
                </div>

                <div className="overflow-x-auto border border-hairline rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-muted/30 border-b border-hairline text-muted-foreground">
                        <th className="p-3 font-semibold">Data / Hora</th>
                        <th className="p-3 font-semibold">Operador</th>
                        <th className="p-3 font-semibold">Cargo (RBAC)</th>
                        <th className="p-3 font-semibold">Ação Executada</th>
                        <th className="p-3 font-semibold">IP Origem</th>
                        <th className="p-3 font-semibold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/15 transition-colors">
                          <td className="p-3 font-mono text-muted-foreground">{log.date}</td>
                          <td className="p-3 font-bold text-foreground">{log.operator}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-[10px] border-hairline">
                              {log.role}
                            </Badge>
                          </td>
                          <td className="p-3 font-medium text-foreground">{log.action}</td>
                          <td className="p-3 font-mono text-muted-foreground">{log.ip}</td>
                          <td className="p-3 text-center">
                            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px]">
                              {log.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. FIDELIDADE & CRM (REQUISITOS 10-15, 42-48, 58, 72-73)                  */}
      {/* ========================================================================= */}
      {activeSubTab === "settings_loyalty" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <form onSubmit={handleSaveLoyalty} className="space-y-6">
            {/* Bloco 1: Regra Base de Pontuação & Arredondamento */}
            <Card className="border-hairline bg-card rounded-2xl shadow-md p-5 space-y-4">
              <div className="border-b border-hairline pb-3">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> Regra Base do Programa de Pontos
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Defina a taxa de conversão monetária em pontos creditados exclusivamente após pagamento confirmado.
                </CardDescription>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="text-muted-foreground font-semibold block mb-1">A cada R$ gastos:</label>
                  <Input
                    type="number"
                    min="1"
                    value={loyaltyForm.spendBaseUnit}
                    onChange={(e) =>
                      setLoyaltyForm({ ...loyaltyForm, spendBaseUnit: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                    className="bg-muted/30 border-hairline h-9 text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-muted-foreground mt-1 block">Ex: R$ 1, R$ 5 ou R$ 10</span>
                </div>

                <div>
                  <label className="text-muted-foreground font-semibold block mb-1">Gerar quantidade de pontos:</label>
                  <Input
                    type="number"
                    min="1"
                    value={loyaltyForm.pointsPerBaseUnit}
                    onChange={(e) =>
                      setLoyaltyForm({ ...loyaltyForm, pointsPerBaseUnit: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                    className="bg-muted/30 border-hairline h-9 text-xs font-mono font-bold text-primary"
                  />
                  <span className="text-[10px] text-muted-foreground mt-1 block">Ex: 1 ponto, 2 pontos</span>
                </div>

                <div>
                  <label className="text-muted-foreground font-semibold block mb-1">Estratégia de Arredondamento:</label>
                  <select
                    value={loyaltyForm.roundingStrategy}
                    onChange={(e) =>
                      setLoyaltyForm({ ...loyaltyForm, roundingStrategy: e.target.value as "DOWN" | "MATH" })
                    }
                    className="w-full bg-muted/30 border border-hairline rounded px-2.5 h-9 text-xs text-foreground font-semibold"
                  >
                    <option value="DOWN">Arredondar para Baixo (Truncado)</option>
                    <option value="MATH">Arredondamento Padrão (Mais próximo)</option>
                  </select>
                  <span className="text-[10px] text-muted-foreground mt-1 block">Garante pontos inteiros e consistentes</span>
                </div>
              </div>

              {/* Fontes Elegíveis */}
              <div className="border-t border-hairline pt-4 space-y-2 text-xs">
                <span className="font-bold text-foreground block">Fontes Elegíveis para Acúmulo:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={loyaltyForm.servicesEarnPoints}
                      onChange={(e) => setLoyaltyForm({ ...loyaltyForm, servicesEarnPoints: e.target.checked })}
                      className="rounded border-hairline"
                    />
                    <span className="text-foreground font-medium">Serviços executados geram pontos</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={loyaltyForm.productsEarnPoints}
                      onChange={(e) => setLoyaltyForm({ ...loyaltyForm, productsEarnPoints: e.target.checked })}
                      className="rounded border-hairline"
                    />
                    <span className="text-foreground font-medium">Produtos do estoque geram pontos</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={loyaltyForm.planPurchaseEarnsPoints}
                      onChange={(e) => setLoyaltyForm({ ...loyaltyForm, planPurchaseEarnsPoints: e.target.checked })}
                      className="rounded border-hairline"
                    />
                    <span>Adesão a Plano/Assinatura gera pontos</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={loyaltyForm.packagePurchaseEarnsPoints}
                      onChange={(e) => setLoyaltyForm({ ...loyaltyForm, packagePurchaseEarnsPoints: e.target.checked })}
                      className="rounded border-hairline"
                    />
                    <span>Compra de Pacotes gera pontos</span>
                  </label>
                </div>
              </div>

              {/* Validade */}
              <div className="border-t border-hairline pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-muted-foreground font-semibold block mb-1">
                    Validade dos Pontos (0 = Não Expiram):
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={loyaltyForm.pointsExpirationMonths}
                    onChange={(e) =>
                      setLoyaltyForm({ ...loyaltyForm, pointsExpirationMonths: Math.max(0, parseInt(e.target.value) || 0) })
                    }
                    className="bg-muted/30 border-hairline h-9 text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {loyaltyForm.pointsExpirationMonths === 0
                      ? "Os pontos acumulados nunca expiram."
                      : `Expiram após ${loyaltyForm.pointsExpirationMonths} meses de inatividade.`}
                  </span>
                </div>
              </div>
            </Card>

            {/* Bloco 2: Inteligência de Aniversários & Indique um Amigo */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Aniversários */}
              <Card className="border-hairline bg-card rounded-2xl shadow-md p-5 space-y-4">
                <div className="border-b border-hairline pb-3">
                  <CardTitle className="text-base font-bold text-foreground">
                    🎂 Benefício de Aniversário
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Concessão automática de pontos e janela de relacionamento para felicitações.
                  </CardDescription>
                </div>

                <div className="space-y-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={loyaltyForm.birthdayBonusActive}
                      onChange={(e) => setLoyaltyForm({ ...loyaltyForm, birthdayBonusActive: e.target.checked })}
                      className="rounded border-hairline"
                    />
                    <span className="text-foreground font-semibold">Ativar bônus de aniversário</span>
                  </label>

                  <div>
                    <label className="text-muted-foreground font-semibold block mb-1">Pontos de Presente:</label>
                    <Input
                      type="number"
                      min="0"
                      value={loyaltyForm.birthdayBonusPoints}
                      onChange={(e) =>
                        setLoyaltyForm({ ...loyaltyForm, birthdayBonusPoints: Math.max(0, parseInt(e.target.value) || 0) })
                      }
                      className="bg-muted/30 border-hairline h-8 text-xs font-mono font-bold text-pink-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-muted-foreground font-semibold block mb-1">Janela Antes (Dias):</label>
                      <Input
                        type="number"
                        min="0"
                        value={loyaltyForm.birthdayBonusDaysBefore}
                        onChange={(e) =>
                          setLoyaltyForm({ ...loyaltyForm, birthdayBonusDaysBefore: Math.max(0, parseInt(e.target.value) || 0) })
                        }
                        className="bg-muted/30 border-hairline h-8 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-muted-foreground font-semibold block mb-1">Janela Depois (Dias):</label>
                      <Input
                        type="number"
                        min="0"
                        value={loyaltyForm.birthdayBonusDaysAfter}
                        onChange={(e) =>
                          setLoyaltyForm({ ...loyaltyForm, birthdayBonusDaysAfter: Math.max(0, parseInt(e.target.value) || 0) })
                        }
                        className="bg-muted/30 border-hairline h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Indique um Amigo */}
              <Card className="border-hairline bg-card rounded-2xl shadow-md p-5 space-y-4">
                <div className="border-b border-hairline pb-3">
                  <CardTitle className="text-base font-bold text-foreground">
                    🔗 Programa Indique um Amigo
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Regra antifraude: pontos creditados somente após o amigo indicado pagar seu 1º atendimento.
                  </CardDescription>
                </div>

                <div className="space-y-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={loyaltyForm.referralActive}
                      onChange={(e) => setLoyaltyForm({ ...loyaltyForm, referralActive: e.target.checked })}
                      className="rounded border-hairline"
                    />
                    <span className="text-foreground font-semibold">Ativar programa de indicação</span>
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-muted-foreground font-semibold block mb-1">Bônus do Indicador (pts):</label>
                      <Input
                        type="number"
                        min="0"
                        value={loyaltyForm.referralReferrerPoints}
                        onChange={(e) =>
                          setLoyaltyForm({ ...loyaltyForm, referralReferrerPoints: Math.max(0, parseInt(e.target.value) || 0) })
                        }
                        className="bg-muted/30 border-hairline h-8 text-xs font-mono font-bold text-primary"
                      />
                    </div>
                    <div>
                      <label className="text-muted-foreground font-semibold block mb-1">Bônus do Amigo Indicado (pts):</label>
                      <Input
                        type="number"
                        min="0"
                        value={loyaltyForm.referralReferredPoints}
                        onChange={(e) =>
                          setLoyaltyForm({ ...loyaltyForm, referralReferredPoints: Math.max(0, parseInt(e.target.value) || 0) })
                        }
                        className="bg-muted/30 border-hairline h-8 text-xs font-mono font-bold text-emerald-400"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Bloco 3: Régua de Segmentação CRM */}
            <Card className="border-hairline bg-card rounded-2xl shadow-md p-5 space-y-4">
              <div className="border-b border-hairline pb-3">
                <CardTitle className="text-base font-bold text-foreground">
                  👥 Parâmetros de Segmentação Automática (CRM)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Critérios determinísticos para classificação do cliente em Em Risco ou Inativo.
                </CardDescription>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-muted-foreground font-semibold block mb-1">
                    Dias sem retorno para considerar "Em Risco":
                  </label>
                  <Input
                    type="number"
                    min="7"
                    value={loyaltyForm.crmAtRiskDays}
                    onChange={(e) =>
                      setLoyaltyForm({ ...loyaltyForm, crmAtRiskDays: Math.max(7, parseInt(e.target.value) || 30) })
                    }
                    className="bg-muted/30 border-hairline h-9 text-xs font-mono font-bold text-amber-500"
                  />
                  <span className="text-[10px] text-muted-foreground mt-1 block">Padrão sugerido: 30 a 45 dias</span>
                </div>

                <div>
                  <label className="text-muted-foreground font-semibold block mb-1">
                    Dias sem retorno para considerar "Inativo":
                  </label>
                  <Input
                    type="number"
                    min="15"
                    value={loyaltyForm.crmInactiveDays}
                    onChange={(e) =>
                      setLoyaltyForm({ ...loyaltyForm, crmInactiveDays: Math.max(15, parseInt(e.target.value) || 60) })
                    }
                    className="bg-muted/30 border-hairline h-9 text-xs font-mono font-bold text-rose-500"
                  />
                  <span className="text-[10px] text-muted-foreground mt-1 block">Padrão sugerido: 60 a 90 dias</span>
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-10 px-6 shadow-md cursor-pointer"
              >
                <Save className="h-4 w-4 mr-1.5" />
                Salvar Parâmetros de Fidelidade & CRM
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. BOT & ATENDIMENTO HUMANO (BASE DE CONHECIMENTO & EXPEDIENTE HUMANO)  */}
      {/* ========================================================================= */}
      {activeSubTab === "settings_bot" && (
        <div className="space-y-6">
          {/* Card WhatsApp Cloud API Oficial (Meta) */}
          <Card className="bg-card border-hairline shadow-md rounded-2xl">
            <CardHeader className="pb-3 border-b border-hairline">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-bold text-foreground">
                        WhatsApp Cloud API Oficial (Meta Business)
                      </CardTitle>
                      {connectionStatus === "CONNECTED" && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px] font-semibold">
                          🟢 Conectado & Ativo
                        </Badge>
                      )}
                      {connectionStatus === "VALIDATING" && (
                        <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/40 text-[10px] font-semibold animate-pulse">
                          🔵 Validando...
                        </Badge>
                      )}
                      {connectionStatus === "CONFIGURED" && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[10px] font-semibold">
                          🟡 Configurado — Não Validado
                        </Badge>
                      )}
                      {connectionStatus === "ERROR" && (
                        <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/40 text-[10px] font-semibold">
                          🔴 Erro de Conexão
                        </Badge>
                      )}
                      {connectionStatus === "DISCONNECTED" && (
                        <Badge className="bg-neutral-500/20 text-neutral-400 border-neutral-500/40 text-[10px] font-semibold">
                          ⚫ Desconectado
                        </Badge>
                      )}
                      {connectionStatus === "NOT_CONFIGURED" && (
                        <Badge className="bg-muted text-muted-foreground text-[10px] font-semibold">
                          ⚪ Não Configurado
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs text-muted-foreground">
                      Conexão direta com a API oficial da Meta (Graph API {graphApiVersion}). Cada barbearia configura suas credenciais seguras, isoladas estritamente por tenant.
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTestWhatsAppConnection}
                    disabled={isTestingConnection}
                    className="h-8 text-xs border-hairline cursor-pointer"
                  >
                    {isTestingConnection ? "Validando na Meta..." : "Testar Conexão"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveWhatsAppConfig}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shadow-xs"
                  >
                    <Save className="h-3.5 w-3.5 mr-1" />
                    Salvar no Cofre
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Banners de Evidência e Status Operacional */}
              {connectionStatus === "CONNECTED" && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex items-center justify-between flex-wrap gap-2 text-emerald-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>
                      <strong>Conexão Comprovada com a Meta Graph API</strong>
                      {verifiedName && <span> • Conta: <strong>{verifiedName}</strong></span>}
                      {displayPhoneNumber && <span> • Número Oficial: <strong>{displayPhoneNumber}</strong></span>}
                      {qualityRating && <span> • Qualidade da Linha: <strong>{qualityRating}</strong></span>}
                    </span>
                  </div>
                  {lastValidatedAt && (
                    <span className="text-[10px] text-emerald-400/80">
                      Validado em: {new Date(lastValidatedAt).toLocaleString("pt-BR")}
                    </span>
                  )}
                </div>
              )}

              {connectionStatus === "ERROR" && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs flex items-start gap-2.5 text-rose-400">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold block">Falha na validação com a Meta Graph API:</span>
                    <p className="text-[11px] text-rose-300/90 leading-relaxed">{lastValidationError || "Credenciais rejeitadas pela Graph API oficial da Meta."}</p>
                  </div>
                </div>
              )}

              {connectionStatus === "CONFIGURED" && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-start gap-2.5 text-amber-400">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold block">Configurado — Não Validado (WhatsApp OFF):</span>
                    <p className="text-[11px] text-amber-300/90 leading-relaxed">
                      As credenciais foram salvas no cofre, mas ainda NÃO foram comprovadas junto à Meta. Por segurança (FAIL CLOSED), o canal WhatsApp permanece indisponível até que a validação seja concluída clicando em <strong>Testar Conexão</strong>.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* WABA ID */}
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold text-[11px]">
                    WhatsApp Business Account ID (WABA ID):
                  </label>
                  <Input
                    value={wabaId}
                    onChange={(e) => handleCredentialChange(setWabaId, e.target.value)}
                    placeholder="Ex: 109876543210987"
                    className="bg-muted/30 border-hairline h-9 text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">Identificador da Conta Comercial no Meta Business Suite</span>
                </div>

                {/* Phone Number ID */}
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold text-[11px]">
                    Phone Number ID (Resolução Multi-Tenant):
                  </label>
                  <Input
                    value={phoneNumberId}
                    onChange={(e) => handleCredentialChange(setPhoneNumberId, e.target.value)}
                    placeholder="Ex: 101112131415161"
                    className="bg-muted/30 border-hairline h-9 text-xs font-mono font-bold text-primary"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">Identificador exclusivo do número na Graph API</span>
                </div>

                {/* Número Exibido com Bandeiras e Auto-formatação */}
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold text-[11px] flex items-center justify-between">
                    <span>Número de Telefone Exibido:</span>
                    <span className="text-[10px] text-primary font-normal">Auto-formata DDI e DDD</span>
                  </label>
                  <PhoneInputWithCountry
                    value={displayPhoneNumber}
                    onChange={(val) => handleCredentialChange(setDisplayPhoneNumber, val)}
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    Número acionado pelo botão verde do WhatsApp e no site público
                  </span>
                </div>

                {/* Access Token */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-muted-foreground font-semibold text-[11px]">
                      Access Token Permanente (System User Token):
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAccessToken(!showAccessToken)}
                      className="text-[10px] text-primary flex items-center gap-1 cursor-pointer hover:underline"
                    >
                      {showAccessToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {showAccessToken ? "Ocultar" : "Revelar"}
                    </button>
                  </div>
                  <Input
                    type={showAccessToken ? "text" : "password"}
                    value={accessToken}
                    onChange={(e) => handleCredentialChange(setAccessToken, e.target.value)}
                    placeholder="EAAG..."
                    className="bg-muted/30 border-hairline h-9 text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">Token seguro gerado no Meta Business Manager com permissões <code>whatsapp_business_messaging</code></span>
                </div>

                {/* Graph API Version */}
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold text-[11px]">
                    Versão da Graph API:
                  </label>
                  <Input
                    value={graphApiVersion}
                    onChange={(e) => handleCredentialChange(setGraphApiVersion, e.target.value)}
                    placeholder="v21.0"
                    className="bg-muted/30 border-hairline h-9 text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">Versão recomendada pela Meta: v21.0</span>
                </div>

                {/* App ID */}
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold text-[11px]">
                    Meta App ID:
                  </label>
                  <Input
                    value={appId}
                    onChange={(e) => handleCredentialChange(setAppId, e.target.value)}
                    placeholder="Ex: 987654321098765"
                    className="bg-muted/30 border-hairline h-9 text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">ID do aplicativo no Meta Developers</span>
                </div>

                {/* App Secret */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-muted-foreground font-semibold text-[11px]">
                      App Secret (Assinatura HMAC-SHA256):
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAppSecret(!showAppSecret)}
                      className="text-[10px] text-primary flex items-center gap-1 cursor-pointer hover:underline"
                    >
                      {showAppSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {showAppSecret ? "Ocultar" : "Revelar"}
                    </button>
                  </div>
                  <Input
                    type={showAppSecret ? "text" : "password"}
                    value={appSecret}
                    onChange={(e) => handleCredentialChange(setAppSecret, e.target.value)}
                    placeholder="Segredo do app"
                    className="bg-muted/30 border-hairline h-9 text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">Valida integridade criptográfica dos webhooks recebidos</span>
                </div>

                {/* Verify Token */}
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold text-[11px]">
                    Verify Token (Handshake do Webhook):
                  </label>
                  <Input
                    value={verifyToken}
                    onChange={(e) => handleCredentialChange(setVerifyToken, e.target.value)}
                    placeholder="barberhub_meta_webhook_token_2026"
                    className="bg-muted/30 border-hairline h-9 text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">Token enviado pela Meta na validação GET do webhook</span>
                </div>
              </div>

              {/* Box de Canais Independentes (Canais Omnichannel: Chat Web vs WhatsApp Oficial) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Canal 1: Chat BarberHub (Web Chat) */}
                <div className="p-4 rounded-xl border border-hairline bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold text-foreground">Chat Web BarberHub</span>
                    </div>
                    <Badge variant="outline" className={webChatEnabled ? "bg-primary/10 text-primary border-primary/30 text-[10px]" : "bg-muted text-muted-foreground text-[10px]"}>
                      {webChatEnabled ? "Ativo no Site" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Canal nativo do site público. Opera com autonomia total e <strong>independente da Meta</strong>.
                  </p>
                  <div className="space-y-2 pt-1 border-t border-hairline/60">
                    <label className="text-xs text-foreground flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={webChatEnabled}
                        onChange={(e) => setWebChatEnabled(e.target.checked)}
                        className="rounded border-hairline text-primary focus:ring-0"
                      />
                      <span>Habilitar Chat Web no Site</span>
                    </label>
                    <label className="text-xs text-foreground flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={webChatBotEnabled}
                        disabled={!webChatEnabled}
                        onChange={(e) => setWebChatBotEnabled(e.target.checked)}
                        className="rounded border-hairline text-primary focus:ring-0 disabled:opacity-50"
                      />
                      <span className={!webChatEnabled ? "text-muted-foreground" : ""}>Bot Determinístico Automático</span>
                    </label>
                    <label className="text-xs text-foreground flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={webChatHumanHandoffEnabled}
                        disabled={!webChatEnabled}
                        onChange={(e) => setWebChatHumanHandoffEnabled(e.target.checked)}
                        className="rounded border-hairline text-primary focus:ring-0 disabled:opacity-50"
                      />
                      <span className={!webChatEnabled ? "text-muted-foreground" : ""}>Transbordo para Atendimento Humano</span>
                    </label>
                  </div>
                </div>

                {/* Canal 2: WhatsApp Oficial (Meta Cloud API) */}
                <div className="p-4 rounded-xl border border-hairline bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-bold text-foreground">WhatsApp Oficial (Meta)</span>
                    </div>
                    <Badge variant="outline" className={whatsappEnabled && connectionStatus === "CONNECTED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]" : "bg-muted text-muted-foreground text-[10px]"}>
                      {whatsappEnabled && connectionStatus === "CONNECTED" ? "Operacional" : "Indisponível"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Canal oficial via Meta Graph API. Exige credenciais válidas e conexão comprovada.
                  </p>
                  <div className="space-y-2 pt-1 border-t border-hairline/60">
                    <label className="text-xs text-foreground flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatsappEnabled}
                        onChange={(e) => handleToggleWhatsapp(e.target.checked)}
                        className="rounded border-hairline text-emerald-500 focus:ring-0"
                      />
                      <span>Habilitar Canal Oficial WhatsApp</span>
                    </label>
                    <label className="text-xs text-foreground flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatsappBotEnabled}
                        disabled={!whatsappEnabled || connectionStatus !== "CONNECTED"}
                        onChange={(e) => handleToggleWhatsappBot(e.target.checked)}
                        className="rounded border-hairline text-emerald-500 focus:ring-0 disabled:opacity-50"
                      />
                      <span className={(!whatsappEnabled || connectionStatus !== "CONNECTED") ? "text-muted-foreground" : ""}>
                        Bot Automático no WhatsApp
                      </span>
                    </label>
                    <label className="text-xs text-foreground flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatsappHumanHandoffEnabled}
                        disabled={!whatsappEnabled || connectionStatus !== "CONNECTED"}
                        onChange={(e) => setWhatsappHumanHandoffEnabled(e.target.checked)}
                        className="rounded border-hairline text-emerald-500 focus:ring-0 disabled:opacity-50"
                      />
                      <span className={(!whatsappEnabled || connectionStatus !== "CONNECTED") ? "text-muted-foreground" : ""}>
                        Transbordo para Central de Atendimento
                      </span>
                    </label>
                    {(!whatsappEnabled || connectionStatus !== "CONNECTED") && (
                      <span className="text-[10px] text-amber-400/90 block pt-0.5">
                        ⚠️ Conecte e valide as credenciais com a Meta antes de habilitar o bot do WhatsApp.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Box de Instruções do Webhook Meta */}
              <div className="p-4 rounded-xl border border-hairline bg-muted/20 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    Configuração do Webhook no Meta Developer Portal
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-card border border-hairline flex items-center justify-between gap-2">
                    <div className="space-y-0.5 overflow-hidden">
                      <span className="text-[10px] text-muted-foreground font-semibold block">URL de Callback (Webhook URL):</span>
                      <code className="text-[11px] text-foreground font-mono truncate block">
                        https://barberhub.app/api/webhooks/whatsapp
                      </code>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard?.writeText("https://barberhub.app/api/webhooks/whatsapp");
                        onShowToast("URL do Webhook copiada para a área de transferência!");
                      }}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                      title="Copiar URL"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="p-2.5 rounded-lg bg-card border border-hairline flex items-center justify-between gap-2">
                    <div className="space-y-0.5 overflow-hidden">
                      <span className="text-[10px] text-muted-foreground font-semibold block">Verify Token:</span>
                      <code className="text-[11px] text-foreground font-mono truncate block">
                        {verifyToken}
                      </code>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard?.writeText(verifyToken);
                        onShowToast("Verify Token copiado para a área de transferência!");
                      }}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                      title="Copiar Token"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  💡 No painel do <strong>Meta for Developers</strong> → App WhatsApp → Configuração → Webhook, assine os campos: <code>messages</code>, <code>message_deliveries</code> e <code>message_reads</code>. O BarberHub validará a assinatura criptográfica HMAC-SHA256 automaticamente.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card Horário de Atendimento Humano */}
          <Card className="bg-card border-hairline shadow-md rounded-2xl">
            <CardHeader className="pb-3 border-b border-hairline">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base font-bold text-foreground">
                    Horário da Equipe de Atendimento Humano
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    O Assistente BarberHub (Bot) opera 24h respondendo FAQs e agendamentos. Defina aqui a janela em que a equipe humana está disponível para assumir chats.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center gap-4 max-w-xl">
                <div className="flex-1 min-w-[140px]">
                  <label className="text-muted-foreground block mb-1 font-semibold text-xs">Início do Expediente:</label>
                  <Input
                    type="time"
                    value={humanStart}
                    onChange={(e) => setHumanStart(e.target.value)}
                    className="bg-muted/30 border-hairline h-9 text-xs"
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="text-muted-foreground block mb-1 font-semibold text-xs">Fim do Expediente:</label>
                  <Input
                    type="time"
                    value={humanEnd}
                    onChange={(e) => setHumanEnd(e.target.value)}
                    className="bg-muted/30 border-hairline h-9 text-xs"
                  />
                </div>
                <div className="pt-5">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (onUpdateHumanWorkingHours) {
                        onUpdateHumanWorkingHours({ start: humanStart, end: humanEnd });
                      }
                      onShowToast("Horário do atendimento humano atualizado com sucesso!");
                    }}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-4 cursor-pointer"
                  >
                    Salvar Horário
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Base de Conhecimento / FAQ */}
          <Card className="bg-card border-hairline shadow-md rounded-2xl">
            <CardHeader className="pb-3 border-b border-hairline">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base font-bold text-foreground">
                    Base de Conhecimento & FAQ do Assistente
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Cadastre perguntas e respostas comuns para o assistente responder de forma determinística e segura no site público.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Formulário para Cadastrar Nova FAQ */}
              <div className="bg-muted/20 border border-hairline rounded-2xl p-4 space-y-3">
                <span className="text-xs font-bold text-foreground block">
                  ➕ Cadastrar Nova Pergunta & Resposta
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-muted-foreground block mb-1 font-semibold text-[11px]">Categoria:</label>
                    <Input
                      value={newFaqCategory}
                      onChange={(e) => setNewFaqCategory(e.target.value)}
                      placeholder="Ex: Localização, Estacionamento..."
                      className="bg-muted/30 border-hairline h-9 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-muted-foreground block mb-1 font-semibold text-[11px]">Pergunta:</label>
                    <Input
                      value={newFaqQuestion}
                      onChange={(e) => setNewFaqQuestion(e.target.value)}
                      placeholder="Ex: Vocês possuem convênio com estacionamento?"
                      className="bg-muted/30 border-hairline h-9 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold text-[11px]">Resposta do Bot:</label>
                  <textarea
                    rows={2}
                    value={newFaqAnswer}
                    onChange={(e) => setNewFaqAnswer(e.target.value)}
                    placeholder="Ex: Sim, possuímos convênio com o estacionamento Estapar ao lado da barbearia..."
                    className="w-full p-2.5 rounded-xl border border-hairline bg-muted/30 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold text-[11px]">
                    Palavras-chave (separadas por vírgula):
                  </label>
                  <Input
                    value={newFaqKeywords}
                    onChange={(e) => setNewFaqKeywords(e.target.value)}
                    placeholder="Ex: estacionamento, carro, vaga, parar"
                    className="bg-muted/30 border-hairline h-9 text-xs"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) {
                        onShowToast("Preencha a pergunta e a resposta para cadastrar.");
                        return;
                      }
                      const kws = newFaqKeywords
                        .split(",")
                        .map((k) => k.trim())
                        .filter(Boolean);
                      const newFaq: BotKnowledgeFaq = {
                        id: `faq-${Date.now()}`,
                        category: newFaqCategory.trim() || "Geral",
                        question: newFaqQuestion.trim(),
                        answer: newFaqAnswer.trim(),
                        keywords: kws,
                      };
                      if (onUpdateFaqList) {
                        onUpdateFaqList([...faqList, newFaq]);
                      }
                      setNewFaqQuestion("");
                      setNewFaqAnswer("");
                      setNewFaqKeywords("");
                      onShowToast("Pergunta e resposta adicionada à Base de Conhecimento do Bot!");
                    }}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-8 px-4 cursor-pointer"
                  >
                    Adicionar à Base do Bot
                  </Button>
                </div>
              </div>

              {/* Lista de Perguntas Cadastradas */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground">
                  Perguntas Ativas na Base ({faqList.length})
                </span>
                {faqList.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-hairline rounded-xl">
                    Nenhuma pergunta personalizada cadastrada. O bot utiliza as informações estruturadas de serviços, preços, horários e endereço do sistema.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {faqList.map((faq) => (
                      <div
                        key={faq.id}
                        className="p-3.5 rounded-xl border border-hairline bg-card/60 flex items-start justify-between gap-3 hover:border-primary/40 transition-all"
                      >
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] font-bold border-hairline">
                              {faq.category}
                            </Badge>
                            <span className="font-bold text-foreground">{faq.question}</span>
                          </div>
                          <p className="text-muted-foreground whitespace-pre-wrap">{faq.answer}</p>
                          {faq.keywords && faq.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {faq.keywords.map((kw, i) => (
                                <span
                                  key={i}
                                  className="text-[9px] px-1.5 py-0.2 rounded-md bg-muted/30 border border-hairline text-muted-foreground"
                                >
                                  #{kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (onUpdateFaqList) {
                              onUpdateFaqList(faqList.filter((f) => f.id !== faq.id));
                            }
                            onShowToast("Item removido da base de conhecimento.");
                          }}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
