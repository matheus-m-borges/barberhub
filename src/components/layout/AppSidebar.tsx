import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  Calendar,
  ConciergeBell,
  Scissors,
  UsersRound,
  Users,
  Award,
  Sparkles,
  Boxes,
  Briefcase,
  CalendarCheck,
  Percent,
  Target,
  CreditCard,
  Wallet,
  Package,
  Pipette,
  ShoppingCart,
  Truck,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  MessageSquare,
  Send,
  Star,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  UserCheck,
  Globe,
  Smartphone,
  ArrowUpDown,
  GripVertical,
  RotateCcw,
  Check,
  Layers,
} from "lucide-react";
import type { RoleSlug } from "@/lib/auth/auth.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export type NavTabId =
  // Visão Geral
  | "dashboard"
  // Área do Barbeiro
  | "barber_today"
  // Operação
  | "agenda"
  | "recepcao"
  | "atendimentos"
  | "fila_encaixes"
  // Clientes
  | "customers"
  | "plans"
  | "packages"
  | "loyalty"
  // Equipe
  | "employees"
  | "schedules"
  | "commissions"
  | "goals"
  // Vendas
  | "pos"
  | "cash"
  // Estoque
  | "products"
  | "supplies"
  | "purchases"
  | "suppliers"
  // Financeiro
  | "financial"
  | "payables"
  | "receivables"
  | "dre"
  // Relacionamento
  | "chat_hub"
  | "marketing"
  | "reviews"
  // Análises
  | "reports"
  // Configurações
  | "settings"
  | "settings_business"
  | "settings_team"
  | "settings_agenda"
  | "settings_services"
  | "settings_financial"
  | "settings_stock"
  | "settings_online"
  | "settings_security"
  // Atalhos / Externos
  | "public_site"
  | "customer_portal"
  | "booking_mobile";

export interface NavItem {
  id: NavTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: "default" | "outline" | "secondary" | "orange";
  allowedRoles?: RoleSlug[];
}

export interface NavSection {
  id: string;
  title: string;
  allowedRoles?: RoleSlug[];
  items: NavItem[];
}

export const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  area_profissional: UserCheck,
  visao_geral: LayoutDashboard,
  operacao: Calendar,
  clientes: Users,
  equipe: Briefcase,
  vendas: CreditCard,
  estoque: Package,
  financeiro: TrendingUp,
  relacionamento: MessageSquare,
  analises: BarChart3,
  configuracoes: Settings,
  canal_externo: Globe,
};

// =========================================================================
// ESTRUTURA DEFINITIVA DO MENU COM RBAC ESTRITO E IDENTIFICADORES DE BLOCO
// =========================================================================
export const DEFINITIVE_NAV_SECTIONS: NavSection[] = [
  // SEÇÃO DEDICADA: ÁREA DO PROFISSIONAL (Apenas para Barbeiro)
  {
    id: "area_profissional",
    title: "ÁREA DO PROFISSIONAL",
    allowedRoles: ["BARBEIRO"],
    items: [
      { id: "barber_today", label: "Meu Dia", icon: UserCheck, badge: "Hoje" },
      { id: "agenda", label: "Minha Agenda", icon: Calendar },
      { id: "customers", label: "Meus Clientes", icon: Users },
      { id: "atendimentos", label: "Atendimentos", icon: Scissors },
      { id: "commissions", label: "Minhas Comissões", icon: Percent },
      { id: "goals", label: "Minhas Metas", icon: Target },
      { id: "reviews", label: "Minhas Avaliações", icon: Star },
    ],
  },

  // VISÃO GERAL
  {
    id: "visao_geral",
    title: "VISÃO GERAL",
    allowedRoles: ["PROPRIETARIO", "ADMINISTRADOR", "GERENTE", "RECEPCIONISTA"],
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },

  // OPERAÇÃO
  {
    id: "operacao",
    title: "OPERAÇÃO",
    allowedRoles: ["PROPRIETARIO", "ADMINISTRADOR", "GERENTE", "RECEPCIONISTA"],
    items: [
      { id: "agenda", label: "Agenda", icon: Calendar, badge: "Hoje" },
      { id: "recepcao", label: "Recepção", icon: ConciergeBell, badge: "Ao Vivo" },
      { id: "atendimentos", label: "Atendimentos", icon: Scissors },
      { id: "fila_encaixes", label: "Fila / Encaixes", icon: UsersRound },
    ],
  },

  // CLIENTES
  {
    id: "clientes",
    title: "CLIENTES",
    allowedRoles: ["PROPRIETARIO", "ADMINISTRADOR", "GERENTE", "RECEPCIONISTA", "CAIXA"],
    items: [
      { id: "customers", label: "Clientes & CRM", icon: Users },
      { id: "plans", label: "Planos & Assinaturas", icon: Sparkles },
      { id: "packages", label: "Pacotes Pré-pagos", icon: Boxes },
      { id: "loyalty", label: "Fidelidade", icon: Award },
    ],
  },

  // EQUIPE
  {
    id: "equipe",
    title: "EQUIPE",
    allowedRoles: ["PROPRIETARIO", "ADMINISTRADOR", "GERENTE"],
    items: [
      { id: "employees", label: "Funcionários", icon: Briefcase },
      { id: "schedules", label: "Escalas & Horários", icon: CalendarCheck },
      { id: "commissions", label: "Comissões", icon: Percent },
      { id: "goals", label: "Metas", icon: Target },
    ],
  },

  // VENDAS
  {
    id: "vendas",
    title: "VENDAS",
    allowedRoles: ["PROPRIETARIO", "ADMINISTRADOR", "GERENTE", "RECEPCIONISTA", "CAIXA"],
    items: [
      { id: "pos", label: "Frente de Caixa", icon: CreditCard, badge: "PDV" },
      { id: "cash", label: "Caixa Diário", icon: Wallet, badge: "Aberto" },
    ],
  },

  // ESTOQUE
  {
    id: "estoque",
    title: "ESTOQUE",
    allowedRoles: ["PROPRIETARIO", "ADMINISTRADOR", "GERENTE", "ESTOQUISTA"],
    items: [
      { id: "products", label: "Produtos de Venda", icon: Package },
      { id: "supplies", label: "Insumos & Bancada", icon: Pipette },
      { id: "purchases", label: "Compras", icon: ShoppingCart },
      { id: "suppliers", label: "Fornecedores", icon: Truck },
    ],
  },

  // FINANCEIRO
  {
    id: "financeiro",
    title: "FINANCEIRO",
    allowedRoles: ["PROPRIETARIO", "ADMINISTRADOR", "GERENTE"],
    items: [
      { id: "financial", label: "Visão Geral", icon: TrendingUp },
      { id: "payables", label: "Contas a Pagar", icon: ArrowDownRight },
      { id: "receivables", label: "Contas a Receber", icon: ArrowUpRight },
      { id: "dre", label: "DRE Gerencial", icon: FileText },
    ],
  },

  // RELACIONAMENTO
  {
    id: "relacionamento",
    title: "RELACIONAMENTO",
    allowedRoles: ["PROPRIETARIO", "ADMINISTRADOR", "GERENTE", "RECEPCIONISTA"],
    items: [
      { id: "chat_hub", label: "Central Atendimento", icon: MessageSquare, badge: "Bot" },
      { id: "marketing", label: "Marketing & Retenção", icon: Send },
      { id: "reviews", label: "Avaliações", icon: Star },
    ],
  },

  // ANÁLISES
  {
    id: "analises",
    title: "ANÁLISES",
    allowedRoles: ["PROPRIETARIO", "ADMINISTRADOR", "GERENTE"],
    items: [
      { id: "reports", label: "Relatórios", icon: BarChart3 },
    ],
  },

  // CONFIGURAÇÕES
  {
    id: "configuracoes",
    title: "CONFIGURAÇÕES",
    allowedRoles: ["PROPRIETARIO", "ADMINISTRADOR"],
    items: [
      { id: "settings", label: "Configurações", icon: Settings },
    ],
  },
];

// Persistência local da ordem dos blocos por Perfil de Usuário
const MENU_BLOCKS_ORDER_KEY = "barberhub_menu_block_order_v1";

function getStoredBlockOrder(role: string): string[] | null {
  try {
    const raw = localStorage.getItem(`${MENU_BLOCKS_ORDER_KEY}_${role}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return null;
}

function saveStoredBlockOrder(role: string, order: string[]) {
  try {
    localStorage.setItem(`${MENU_BLOCKS_ORDER_KEY}_${role}`, JSON.stringify(order));
  } catch {}
}

function clearStoredBlockOrder(role: string) {
  try {
    localStorage.removeItem(`${MENU_BLOCKS_ORDER_KEY}_${role}`);
  } catch {}
}

interface AppSidebarProps {
  currentTab: NavTabId | string;
  onSelectTab: (tabId: NavTabId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  currentUser: {
    name: string;
    role: RoleSlug | string;
    email: string;
    companyName?: string;
  };
  onOpenLoginModal: () => void;
  waitingChatCount?: number;
}

export function AppSidebar({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  currentUser,
  onOpenLoginModal,
  waitingChatCount = 0,
}: AppSidebarProps) {
  const userRole = (currentUser.role || "PROPRIETARIO") as RoleSlug;

  // Estado da ordem personalizada dos blocos
  const [customOrder, setCustomOrder] = useState<string[] | null>(() =>
    getStoredBlockOrder(userRole)
  );
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isOrganizerModalOpen, setIsOrganizerModalOpen] = useState(false);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);

  // Sincroniza ordem se o usuário alterar de perfil (ex: de Proprietário para Barbeiro)
  useEffect(() => {
    setCustomOrder(getStoredBlockOrder(userRole));
    setIsReorderMode(false);
  }, [userRole]);

  // Filtra seções e itens estritamente autorizados para o perfil ativo (RBAC)
  const rawVisibleSections = useMemo(() => {
    return DEFINITIVE_NAV_SECTIONS.filter((section) => {
      if (section.allowedRoles && !section.allowedRoles.includes(userRole)) {
        return false;
      }
      return true;
    }).map((section) => {
      const allowedItems = section.items.filter((item) => {
        if (item.allowedRoles && !item.allowedRoles.includes(userRole)) {
          return false;
        }
        return true;
      });
      return { ...section, items: allowedItems };
    }).filter((section) => section.items.length > 0);
  }, [userRole]);

  // Ordena os blocos conforme customOrder persistido (ou ordem padrão)
  const visibleSections = useMemo(() => {
    if (!customOrder || customOrder.length === 0) return rawVisibleSections;
    const orderMap = new Map(customOrder.map((id, index) => [id, index]));
    return [...rawVisibleSections].sort((a, b) => {
      const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999;
      const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999;
      return indexA - indexB;
    });
  }, [rawVisibleSections, customOrder]);

  // Move um bloco de sessão inteiro (com todos os seus links)
  const handleMoveBlock = (sourceId: string, targetId: string) => {
    const currentOrder = visibleSections.map((s) => s.id);
    const sourceIndex = currentOrder.indexOf(sourceId);
    const targetIndex = currentOrder.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;

    const newOrder = [...currentOrder];
    const moved = newOrder.splice(sourceIndex, 1)[0];
    if (!moved) return;
    newOrder.splice(targetIndex, 0, moved);

    setCustomOrder(newOrder);
    saveStoredBlockOrder(userRole, newOrder);
  };

  const handleMoveUp = (sectionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const index = visibleSections.findIndex((s) => s.id === sectionId);
    if (index <= 0) return;
    const prevSection = visibleSections[index - 1];
    if (!prevSection) return;
    handleMoveBlock(sectionId, prevSection.id);
  };

  const handleMoveDown = (sectionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const index = visibleSections.findIndex((s) => s.id === sectionId);
    if (index < 0 || index >= visibleSections.length - 1) return;
    const nextSection = visibleSections[index + 1];
    if (!nextSection) return;
    handleMoveBlock(sectionId, nextSection.id);
  };

  const handleResetOrder = () => {
    clearStoredBlockOrder(userRole);
    setCustomOrder(null);
  };

  // Drag and Drop de Blocos
  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    e.dataTransfer.setData("text/plain", sectionId);
    setDraggedSectionId(sectionId);
  };

  const handleDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    if (dragOverSectionId !== sectionId) {
      setDragOverSectionId(sectionId);
    }
  };

  const handleDragLeave = () => {
    setDragOverSectionId(null);
  };

  const handleDrop = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    if (draggedSectionId && draggedSectionId !== targetSectionId) {
      handleMoveBlock(draggedSectionId, targetSectionId);
    }
    setDraggedSectionId(null);
    setDragOverSectionId(null);
  };

  const handleNavClick = (tabId: NavTabId) => {
    onSelectTab(tabId);
    if (isMobileOpen) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Overlay Backdrop Mobile */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity lg:hidden"
        />
      )}

      {/* Container Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out lg:static ${
          isCollapsed ? "w-[72px]" : "w-[260px]"
        } ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header da Sidebar */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4 shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30">
              <Scissors className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-sm tracking-tight text-sidebar-foreground">
                  Barber<span className="text-primary font-bold">Hub</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  PRO ERP
                </span>
              </div>
            )}
          </div>

          {/* Botões do Topo (Reordenar Blocos + Recolher) */}
          <div className="flex items-center gap-1">
            {!isCollapsed && (
              <button
                type="button"
                onClick={() => setIsReorderMode(!isReorderMode)}
                className={`h-7 w-7 items-center justify-center rounded-md border border-hairline transition-colors cursor-pointer flex ${
                  isReorderMode
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
                title={isReorderMode ? "Concluir Organização" : "Organizar Blocos do Menu"}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md border border-hairline bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
            >
              {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Banner do Modo de Organização de Blocos */}
        {isReorderMode && !isCollapsed && (
          <div className="mx-2 mt-2 p-2.5 rounded-xl bg-primary/10 border border-primary/25 flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-primary text-[11px]">
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span>Organizando Blocos</span>
              </div>
              <button
                type="button"
                onClick={() => setIsReorderMode(false)}
                className="h-6 px-2 rounded-md bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Check className="h-3 w-3" />
                Concluir
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground leading-snug">
              Use as setas ⬆️ ⬇️ ou arraste cada bloco de sessão inteiro com seus links.
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-primary/10 text-[10px]">
              <button
                type="button"
                onClick={() => setIsOrganizerModalOpen(true)}
                className="text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <Layers className="h-3 w-3" />
                Lista em Janela
              </button>
              <button
                type="button"
                onClick={handleResetOrder}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                title="Restaurar sequência original do menu"
              >
                <RotateCcw className="h-3 w-3" />
                Padrão
              </button>
            </div>
          </div>
        )}

        {/* Lista de Navegação com Scroll */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4">
          {visibleSections.map((section, index) => {
            const SectionIcon = SECTION_ICONS[section.id] || LayoutDashboard;
            const isTarget = dragOverSectionId === section.id;
            const isDragging = draggedSectionId === section.id;

            return (
              <div
                key={section.id}
                draggable={isReorderMode}
                onDragStart={(e) => handleDragStart(e, section.id)}
                onDragOver={(e) => handleDragOver(e, section.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, section.id)}
                className={`space-y-0.5 transition-all duration-200 ${
                  isReorderMode
                    ? "p-1.5 rounded-xl border border-dashed border-hairline/80 bg-card/30 hover:border-primary/50"
                    : ""
                } ${
                  isTarget
                    ? "ring-2 ring-primary bg-primary/15 rounded-xl shadow-md"
                    : ""
                } ${
                  isDragging ? "opacity-35 scale-[0.98]" : "opacity-100"
                }`}
              >
                {!isCollapsed ? (
                  <div className="flex items-center justify-between px-2 py-1 group/sec select-none">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isReorderMode && (
                        <span className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0">
                          <GripVertical className="h-3 w-3" />
                        </span>
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 truncate flex items-center gap-1">
                        {isReorderMode && (
                          <span className="text-primary font-mono text-[9px] bg-primary/10 px-1 rounded font-bold">
                            #{index + 1}
                          </span>
                        )}
                        {section.title}
                      </span>
                    </div>

                    {/* Botões Rápidos de Subir/Descer Bloco Inteiro */}
                    <div
                      className={`flex items-center gap-0.5 shrink-0 ${
                        isReorderMode
                          ? "opacity-100"
                          : "opacity-0 group-hover/sec:opacity-100"
                      } transition-opacity`}
                    >
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={(e) => handleMoveUp(section.id, e)}
                        className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                        title={`Mover bloco ${section.title} para cima`}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === visibleSections.length - 1}
                        onClick={(e) => handleMoveDown(section.id, e)}
                        className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                        title={`Mover bloco ${section.title} para baixo`}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="my-1.5 border-t border-hairline/60" />
                )}

                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      title={isCollapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-all cursor-pointer ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
                      } ${isCollapsed ? "justify-center px-0" : ""}`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive
                            ? "text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate flex-1 text-left">
                          {item.label}
                        </span>
                      )}

                      {!isCollapsed &&
                        (item.badge ||
                          (item.id === "chat_hub" && waitingChatCount > 0)) && (
                          <span
                            className={`ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                              item.id === "chat_hub" && waitingChatCount > 0
                                ? "bg-amber-500 text-black font-extrabold animate-pulse"
                                : isActive
                                ? "bg-black/20 text-white"
                                : item.badgeVariant === "orange"
                                ? "bg-primary/20 text-primary border border-primary/30"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {item.id === "chat_hub" && waitingChatCount > 0
                              ? waitingChatCount
                              : item.badge}
                          </span>
                        )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Rodapé da Sidebar - Menu da Empresa & Perfil */}
        <div className="border-t border-sidebar-border p-3 shrink-0 bg-sidebar/80">
          <div
            onClick={onOpenLoginModal}
            className={`flex items-center gap-2.5 rounded-lg p-1.5 transition-colors cursor-pointer hover:bg-sidebar-accent/60 ${
              isCollapsed ? "justify-center" : ""
            }`}
            title="Menu da Empresa e Perfil"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30 font-bold text-xs">
              {(currentUser.companyName || currentUser.name).charAt(0)}
            </div>

            {!isCollapsed && (
              <div className="flex flex-col truncate flex-1 text-left">
                <span className="truncate text-xs font-semibold text-foreground">
                  {currentUser.companyName || currentUser.name}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] bg-primary/15 text-primary border border-primary/20 px-1.5 py-0.2 rounded font-mono font-bold uppercase">
                    {currentUser.role}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Modal Dialog: Organização Completa dos Blocos do Menu */}
      <Dialog open={isOrganizerModalOpen} onOpenChange={setIsOrganizerModalOpen}>
        <DialogContent className="max-w-md p-6 bg-card border-hairline rounded-2xl shadow-2xl">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <ArrowUpDown className="h-4 w-4 text-primary" />
              Organizar Blocos de Sessão do Menu
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Reordene a posição dos blocos de sessão. Ao mover uma sessão inteira (ex: <strong>FINANCEIRO</strong> ou <strong>RELACIONAMENTO</strong>), todos os seus links e funcionalidades se movem juntos.
            </DialogDescription>
          </DialogHeader>

          {/* Lista de Blocos Reordenáveis */}
          <div className="max-h-[60vh] overflow-y-auto space-y-2 py-2 pr-1">
            {visibleSections.map((section, index) => {
              const SectionIcon = SECTION_ICONS[section.id] || LayoutDashboard;
              const isTarget = dragOverSectionId === section.id;
              const isDragging = draggedSectionId === section.id;

              return (
                <div
                  key={section.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, section.id)}
                  onDragOver={(e) => handleDragOver(e, section.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, section.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all select-none ${
                    isTarget
                      ? "border-primary bg-primary/15 ring-2 ring-primary/40 shadow-md"
                      : "border-hairline bg-muted/20 hover:border-hairline/80 hover:bg-muted/40"
                  } ${isDragging ? "opacity-35 scale-[0.98]" : "opacity-100"}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                    <span className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0">
                      <GripVertical className="h-4 w-4" />
                    </span>

                    <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded shrink-0">
                      #{index + 1}
                    </span>

                    <div className="flex h-7 w-7 rounded-lg bg-primary/10 text-primary items-center justify-center shrink-0">
                      <SectionIcon className="h-3.5 w-3.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs text-foreground block truncate">
                        {section.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate block">
                        {section.items.map((i) => i.label).join(" • ")}
                      </span>
                    </div>
                  </div>

                  {/* Ações de subir e descer */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveUp(section.id)}
                      className="h-7 w-7 rounded-lg border border-hairline flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                      title="Mover bloco para cima"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === visibleSections.length - 1}
                      onClick={() => handleMoveDown(section.id)}
                      className="h-7 w-7 rounded-lg border border-hairline flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                      title="Mover bloco para baixo"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rodapé do Modal */}
          <div className="flex items-center justify-between pt-3 border-t border-hairline text-xs">
            <button
              type="button"
              onClick={handleResetOrder}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer py-1.5 px-2.5 rounded-lg hover:bg-muted/40 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar Ordem Padrão
            </button>
            <button
              type="button"
              onClick={() => setIsOrganizerModalOpen(false)}
              className="bg-primary text-primary-foreground font-bold px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Check className="h-3.5 w-3.5" />
              Concluir
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
