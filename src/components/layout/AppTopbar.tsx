import React, { useState, useEffect } from "react";
import {
  Menu,
  Building2,
  Bell,
  Sun,
  Moon,
  Plus,
  ChevronDown,
  Scissors,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getInitialTheme, applyTheme, type ThemeMode } from "@/lib/theme";

interface AppTopbarProps {
  onToggleMobileSidebar: () => void;
  onOpenNewServiceModal?: () => void;
  onOpenNewAppointmentModal?: () => void;
  onOpenQuickAttendanceModal?: () => void;
  onOpenLoginModal: () => void;
  onSimulateMobileBooking?: () => void;
  currentUser: {
    name: string;
    role: string;
    email: string;
    companyName?: string;
  };
  currentUnitName?: string;
  isCashOpen?: boolean;
  cashBalance?: number;
}

export function AppTopbar({
  onToggleMobileSidebar,
  onOpenQuickAttendanceModal,
  onOpenLoginModal,
  currentUser,
  currentUnitName,
  isCashOpen = false,
  cashBalance = 0.0,
}: AppTopbarProps) {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [hasNotifications, setHasNotifications] = useState(false);

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  const displayCompanyName = currentUser.companyName || currentUnitName || "Minha Barbearia";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/85 px-4 sm:px-6 backdrop-blur-md transition-colors">
      {/* Lado Esquerdo: Botão Mobile + Identificação da Empresa */}
      <div className="flex items-center gap-3">
        {/* Toggle Mobile Drawer */}
        <button
          onClick={onToggleMobileSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/80 lg:hidden cursor-pointer"
          title="Abrir Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo visível em telas menores quando a sidebar estiver fechada */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Scissors className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm text-foreground">
            Barber<span className="text-primary">Hub</span>
          </span>
        </div>

        {/* Identificação Oficial do Estabelecimento */}
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-hairline bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors">
          <Building2 className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-foreground max-w-[200px] truncate">{displayCompanyName}</span>
        </div>

        {/* Indicador Real de Caixa (Aberto vs Fechado) */}
        {isCashOpen ? (
          <Badge
            variant="outline"
            className="hidden md:inline-flex items-center gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px] font-mono py-1 px-2.5"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Caixa Aberto: R$ {cashBalance.toFixed(2)}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="hidden md:inline-flex items-center gap-1.5 border-hairline bg-muted/40 text-muted-foreground text-[11px] font-mono py-1 px-2.5"
          >
            <Lock className="h-3 w-3 text-muted-foreground/60" />
            Caixa Fechado
          </Badge>
        )}
      </div>

      {/* Lado Direito: Ações Rápidas, Notificações, Tema e Menu da Empresa */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Botão de Atalho + NOVO ATENDIMENTO (F2) */}
        <Button
          onClick={onOpenQuickAttendanceModal}
          size="sm"
          className="h-8.5 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-md shadow-primary/25 cursor-pointer px-3 sm:px-4"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Atendimento</span>
          <span className="sm:hidden">Atender</span>
          <kbd className="hidden md:inline-block ml-1 rounded bg-black/20 px-1.5 py-0.2 text-[9px] font-mono text-primary-foreground/90">
            F2
          </kbd>
        </Button>

        {/* Notificações Operacionais */}
        <div className="relative">
          <button
            onClick={() => setHasNotifications(false)}
            className="relative flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-hairline bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            title="Notificações Operacionais"
          >
            <Bell className="h-4 w-4" />
            {hasNotifications && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
            )}
          </button>
        </div>

        {/* Alternador de Tema: Claro / Escuro */}
        <button
          onClick={toggleTheme}
          className="flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-hairline bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
          title={theme === "dark" ? "Alternar para Modo Claro" : "Alternar para Modo Escuro"}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-primary" />
          )}
        </button>

        {/* Menu da Empresa Contratante & Sessão */}
        <button
          onClick={onOpenLoginModal}
          className="flex items-center gap-2 rounded-lg border border-hairline bg-muted/40 hover:bg-muted/80 px-2.5 py-1 text-xs text-foreground cursor-pointer transition-colors"
          title="Menu da Empresa / Minha Conta"
        >
          <div className="flex h-6.5 w-6.5 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30 font-bold text-[11px]">
            {displayCompanyName.charAt(0)}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="font-semibold text-xs leading-tight truncate max-w-[130px]">
              {displayCompanyName}
            </span>
            <span className="text-[9px] text-muted-foreground font-mono leading-tight">
              {currentUser.role}
            </span>
          </div>
          <ChevronDown className="hidden sm:inline h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
