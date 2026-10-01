import React from "react";
import { User, LogOut, Shield, Mail, Building2, KeyRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RoleSlug } from "@/lib/auth/auth.types";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    name: string;
    role: RoleSlug | string;
    email: string;
    tenantId?: string | undefined;
    companyName?: string | undefined;
  };
  onLogout: () => void;
  onOpenSettings?: () => void;
  onOpenChangePassword?: () => void;
}

export function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onOpenSettings,
  onOpenChangePassword,
}: UserProfileModalProps) {
  if (!isOpen) return null;

  const displayCompanyName = currentUser.companyName || "Barbearia Contratante";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-sm bg-card border border-hairline rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4.5 w-4.5 text-primary" />
            <h3 className="font-bold text-sm text-foreground">Menu da Empresa & Perfil</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Informações da Empresa & Usuário */}
        <div className="p-3.5 rounded-xl bg-muted/20 border border-hairline space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30 font-bold text-base">
              {displayCompanyName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <h4 className="font-bold text-sm text-foreground truncate">{displayCompanyName}</h4>
              <p className="text-xs text-muted-foreground truncate">{currentUser.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1 border-t border-hairline">
            <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded font-mono font-bold uppercase">
              {currentUser.role}
            </span>
            <span className="text-[10px] text-muted-foreground truncate font-mono">
              {currentUser.email}
            </span>
          </div>
        </div>

        {/* Ações Oficiais Obrigatórias */}
        <div className="space-y-2 pt-2 border-t border-hairline">
          {/* 1. Minha conta / Perfil */}
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
              <Shield className="h-3.5 w-3.5 mr-2 text-primary" />
              Minha Conta / Configurações da Barbearia
            </Button>
          )}

          {/* 2. Alterar Senha */}
          {onOpenChangePassword && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onOpenChangePassword();
              }}
              className="w-full justify-start text-xs font-medium h-9 cursor-pointer"
            >
              <KeyRound className="h-3.5 w-3.5 mr-2 text-primary" />
              Alterar Senha de Acesso
            </Button>
          )}

          {/* 3. Sair */}
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
