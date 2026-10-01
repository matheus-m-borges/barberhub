import React, { useState } from "react";
import { KeyRound, ShieldCheck, AlertCircle, CheckCircle2, Eye, EyeOff, X, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMandatory?: boolean;
  userEmail: string;
  userId?: string;
  onSuccess: () => void;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  isMandatory = false,
  userEmail,
  userId,
  onSuccess,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isMandatory && !currentPassword) {
      setErrorMessage("Por favor, informe a senha atual.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("A nova senha deve possuir no mínimo 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("As senhas informadas não coincidem.");
      return;
    }

    if (!isMandatory && currentPassword === newPassword) {
      setErrorMessage("A nova senha deve ser diferente da senha atual.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Se não for obrigatório (já logado normalmente), valida a senha atual antes de trocar
      if (!isMandatory && currentPassword) {
        let authEmail = userEmail.trim().toLowerCase();
        try {
          const { data: resolvedEmail } = await (supabase.rpc as any)("resolve_product_auth_email", {
            p_product_slug: "barberhub",
            p_email: authEmail,
          });
          if (resolvedEmail) authEmail = resolvedEmail;
        } catch {
          // ignora fallback
        }

        const { error: verifyErr } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: currentPassword,
        });

        if (verifyErr) {
          throw new Error("A senha atual informada está incorreta.");
        }
      }

      // 2. Atualiza a senha no Supabase Auth central com metadata isolado do BarberHub
      const { error: updateAuthErr } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          must_change_password: false,
        },
      });

      if (updateAuthErr) {
        throw new Error(updateAuthErr.message || "Erro ao atualizar a senha no serviço de autenticação.");
      }

      // 3. Executa função segura no servidor (SECURITY DEFINER) para atualizar credenciais exclusivas do BarberHub
      try {
        const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)("barberhub_change_password", {
          p_new_password: newPassword,
        });

        if (rpcErr || (rpcData && rpcData.success === false)) {
          console.warn("[ChangePassword] Retorno da função segura barberhub_change_password:", rpcErr || rpcData);
        }
      } catch (rpcEx) {
        console.warn("[ChangePassword] Erro ao invocar RPC de sincronização:", rpcEx);
      }

      // 4. Atualiza o estado da sessão local removendo must_change_password
      try {
        const stored = localStorage.getItem("barberhub_session_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.mustChangePassword = false;
          localStorage.setItem("barberhub_session_user", JSON.stringify(parsed));
        }
      } catch {}

      setSuccessMessage("Senha alterada com sucesso! Suas credenciais foram atualizadas.");

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "Falha ao alterar senha. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-card border border-hairline rounded-2xl shadow-2xl p-6 space-y-4">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30">
              <KeyRound className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">
                {isMandatory ? "Definição de Senha Obrigatória" : "Alterar Senha de Acesso"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {isMandatory
                  ? "Primeiro acesso com senha provisória da NAVOR"
                  : "Credencial individual do BarberHub"}
              </p>
            </div>
          </div>

          {!isMandatory && (
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Mensagens de feedback */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="p-3 rounded-xl bg-muted/20 border border-hairline text-[11px] text-muted-foreground flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-[#0088cc] shrink-0 mt-0.5" />
          <span>
            Esta senha é exclusiva para o seu acesso ao <strong>BarberHub</strong>. Alterações realizadas aqui
            não afetam credenciais de outros produtos NAVOR associados ao seu e-mail.
          </span>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Senha Atual / Provisória */}
          <div className="space-y-1 text-left">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {isMandatory ? "SENHA PROVISÓRIA / ATUAL (OPCIONAL)" : "SENHA ATUAL"}
            </Label>
            <div className="relative">
              <Input
                type={showCurrentPass ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                required={!isMandatory}
                className="h-9 text-xs bg-muted/20 border-hairline pr-9"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrentPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Nova Senha */}
          <div className="space-y-1 text-left">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              NOVA SENHA (MÍNIMO 8 CARACTERES)
            </Label>
            <div className="relative">
              <Input
                type={showNewPass ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                minLength={8}
                className="h-9 text-xs bg-muted/20 border-hairline pr-9"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Confirmar Nova Senha */}
          <div className="space-y-1 text-left">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              CONFIRME A NOVA SENHA
            </Label>
            <div className="relative">
              <Input
                type={showConfirmPass ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                minLength={8}
                className="h-9 text-xs bg-muted/20 border-hairline pr-9"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-hairline">
            {!isMandatory && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isLoading}
                className="h-9 text-xs cursor-pointer"
              >
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              className={`h-9 text-xs font-bold bg-primary text-primary-foreground cursor-pointer shadow-md ${
                isMandatory ? "w-full" : ""
              }`}
            >
              {isLoading ? "Salvando..." : isMandatory ? "Definir Senha e Entrar" : "Atualizar Senha"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
