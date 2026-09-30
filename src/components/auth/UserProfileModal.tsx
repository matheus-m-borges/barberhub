import React from "react";
import { User, LogOut, Shield, Mail, Building2, Grid, X } from "lucide-react";
import type { RoleSlug } from "@/lib/auth/auth.types";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    name: string;
    role: RoleSlug | string;
    email: string;
    tenantId?: string | undefined;
  };
  onLogout: () => void;
  onOpenEnvironmentSelector?: () => void;
  onOpenSettings?: () => void;
}

export function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onOpenEnvironmentSelector,
  onOpenSettings,
}: UserProfileModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-sm bg-card border border-hairline rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <User className="h-4.5 w-4.5 text-primary" />
            <h3 className="font-bold text-sm text-foreground">Perfil do Colaborador</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Informações do Usuário */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-muted/20 border border-hairline">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary border border-primary/30 font-bold text-base">
            {currentUser.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <h4 className="font-bold text-sm text-foreground truncate">{currentUser.name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                {currentUser.role}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground text-left">
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
            <span className="truncate">{currentUser.email}</span>
          </div>
          {currentUser.tenantId && (
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
              <span className="truncate font-mono text-[11px]">Empresa: {currentUser.tenantId}</span>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="space-y-2 pt-2 border-t border-hairline">
          {onOpenSettings && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="w-full justify-start text-xs font-medium h-9 cursor-pointer"
            >
              <Shield className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              Configurações do Estabelecimento
            </Button>
          )}

          {onOpenEnvironmentSelector && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onOpenEnvironmentSelector();
              }}
              className="w-full justify-start text-xs font-medium h-9 cursor-pointer"
            >
              <Grid className="h-3.5 w-3.5 mr-2 text-[#0088cc]" />
              Trocar de Sistema NAVOR
            </Button>
          )}

          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full justify-center text-xs font-bold h-9 cursor-pointer mt-2"
          >
            <LogOut className="h-3.5 w-3.5 mr-2" />
            Sair do Sistema
          </Button>
        </div>
      </div>
    </div>
  );
}
