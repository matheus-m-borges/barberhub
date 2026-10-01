import React, { useState, useEffect } from "react";
import { Lock, Mail, KeyRound, ArrowLeft, Scissors, CheckCircle2, AlertCircle, Loader2, Building2, User, Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { RoleSlug, AuthenticatedUser } from "@/lib/auth/auth.types";
import { verifyPasswordClient } from "@/lib/auth/client-password";

export type { AuthenticatedUser };

export async function computeBarberHubAuthEmail(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const bytes = new TextEncoder().encode(`barberhub:${normalized}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `barberhub.${hash.slice(0, 40)}@login.navor.internal`;
}

interface OfficialAuthViewProps {
  onLoginSuccess: (user: AuthenticatedUser) => void;
  onNavigateNavorPortals?: () => void;
}

type AuthMode = "LOGIN" | "FORGOT_PASSWORD" | "FIRST_ACCESS" | "SET_NEW_PASSWORD";
type PortalType = "SUBSCRIBER" | "CUSTOMER";

export function OfficialAuthView({ onLoginSuccess, onNavigateNavorPortals }: OfficialAuthViewProps) {
  const [portalType, setPortalType] = useState<PortalType>("SUBSCRIBER");
  const [mode, setMode] = useState<AuthMode>("LOGIN");

  // Campos de Login da Barbearia (Assinante / Gestor / Equipe)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Campos de Login do Cliente Final
  const [customerIdentifier, setCustomerIdentifier] = useState("");
  const [customerPin, setCustomerPin] = useState("");

  // Campos de Recuperação
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);

  // Campos de Troca Obrigatória de Senha (Primeiro Acesso com Senha Provisória)
  const [provisionalPassword, setProvisionalPassword] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstAccessSuccess, setFirstAccessSuccess] = useState(false);
  const [pendingAuthUser, setPendingAuthUser] = useState<AuthenticatedUser | null>(null);

  // Estados de Operação
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Ponto 6: O Portal do Cliente só existe se o módulo correspondente estiver habilitado no plano/assinatura
  const [isCustomerPortalEnabled, setIsCustomerPortalEnabled] = useState(false);

  // Detecta se o módulo de Portal do Cliente está habilitado para o estabelecimento
  useEffect(() => {
    let isMounted = true;
    const checkCustomerModule = async () => {
      try {
        const { data } = await supabase
          .from("account_modules")
          .select("id, system_modules!inner(key)")
          .eq("system_modules.key", "customer_portal")
          .limit(1);

        if (isMounted && data && data.length > 0) {
          setIsCustomerPortalEnabled(true);
        }
      } catch {
        // Módulo não contratado ou desabilitado
      }
    };
    checkCustomerModule();
    return () => {
      isMounted = false;
    };
  }, []);

  // Detecta parâmetros de URL para Primeiro Acesso ou Recuperação de Senha
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token") || params.get("invite_token");
    const recoveryParam = params.get("recovery") || params.get("reset");

    if (tokenParam) {
      setInviteToken(tokenParam);
      setMode("FIRST_ACCESS");
    } else if (recoveryParam || window.location.hash.includes("type=recovery")) {
      setMode("FORGOT_PASSWORD");
    }
  }, []);

  // 1. FLUXO DE LOGIN DO ASSINANTE / GESTÃO DA BARBEARIA
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMessage("Por favor, preencha o e-mail e a senha.");
      return;
    }

    setIsLoading(true);

    try {
      // 1.1 Resolve a identidade técnica exclusiva do BarberHub no Supabase Central
      let targetAuthEmail: string | null = null;
      try {
        const { data: resolvedEmail } = await (supabase.rpc as any)("resolve_product_auth_email", {
          p_product_slug: "barberhub",
          p_email: cleanEmail,
        });
        if (resolvedEmail) {
          targetAuthEmail = resolvedEmail;
        }
      } catch (rpcErr) {
        console.warn("[Auth] Resolução de identidade via RPC:", rpcErr);
      }

      // Se a RPC não retornou, gera o e-mail técnico padrão BarberHub
      if (!targetAuthEmail) {
        targetAuthEmail = await computeBarberHubAuthEmail(cleanEmail);
      }

      // 1.2 Tenta autenticação no Supabase Auth central com a identidade do BarberHub
      let authUser: any = null;
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: targetAuthEmail,
        password,
      });

      if (!authError && authData.user) {
        authUser = authData.user;
      } else {
        // Fallback exclusivamente para contas legadas cadastradas antes da segregação de produtos
        const { data: fallbackAuth, error: fallbackErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (!fallbackErr && fallbackAuth.user) {
          authUser = fallbackAuth.user;
        }
      }

      if (authUser) {
        const mustChange = Boolean(
          authUser.user_metadata?.must_change_password ||
          authUser.app_metadata?.must_change_password
        );

        // Busca informações relacionais no schema barberhub
        const { data: dbUser } = await supabase
          .from("users")
          .select("id, name, email, tenant_id, unit_id, status")
          .or(`id.eq.${authUser.id},email.eq.${cleanEmail}`)
          .maybeSingle();

        const tenantId = dbUser?.tenant_id || (authUser.app_metadata?.tenant_id as string) || (authUser.user_metadata?.tenant_id as string) || "";
        const name = dbUser?.name || (authUser.user_metadata?.name as string) || cleanEmail.split("@")[0] || "Administrador";

        // Busca o papel no RBAC do schema barberhub
        const { data: userRoleData } = await supabase
          .from("user_roles")
          .select("role_id, roles(slug)")
          .eq("user_id", dbUser?.id || authUser.id)
          .maybeSingle();

        const resolvedRole = ((userRoleData as any)?.roles?.slug as RoleSlug) || "PROPRIETARIO";

        // Busca nome oficial da empresa contratante no schema barberhub
        let companyName = "Minha Barbearia";
        if (tenantId) {
          try {
            const { data: tenantData } = await supabase
              .from("tenants")
              .select("id, name, trade_name")
              .eq("id", tenantId)
              .maybeSingle();
            if (tenantData) {
              companyName = tenantData.trade_name || tenantData.name || companyName;
            }
          } catch (tErr) {
            console.warn("[Auth] Erro ao buscar dados do tenant:", tErr);
          }
        }

        const loggedUser: AuthenticatedUser = {
          id: dbUser?.id || authUser.id,
          name,
          role: resolvedRole,
          email: cleanEmail,
          tenantId,
          companyName,
          unitId: dbUser?.unit_id || undefined,
          mustChangePassword: mustChange,
        };

        // Regra Obrigatória NAVOR: no primeiro acesso com senha provisória, obriga a criação da senha definitiva
        if (mustChange) {
          setPendingAuthUser(loggedUser);
          setProvisionalPassword(password);
          setMode("SET_NEW_PASSWORD");
          setNewPassword("");
          setConfirmPassword("");
          setSuccessMessage("Autenticado com senha provisória da retaguarda. Por segurança, crie sua senha definitiva agora.");
          setIsLoading(false);
          return;
        }

        localStorage.setItem("barberhub_session_user", JSON.stringify(loggedUser));
        onLoginSuccess(loggedUser);
        return;
      }

      // 1.3 Fallback: consulta tabela 'users' no schema barberhub
      const { data: dbUser, error: dbError } = await supabase
        .from("users")
        .select("id, name, email, password_hash, tenant_id, unit_id, status, failed_attempts, locked_until")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (dbError) {
        console.error("Erro na busca de usuário no schema barberhub:", dbError);
      }

      if (dbUser) {
        if (dbUser.status !== "ACTIVE") {
          setErrorMessage("Esta conta de acesso está inativa. Contate o suporte da NAVOR ou o proprietário da barbearia.");
          setIsLoading(false);
          return;
        }

        const passwordMatches = await verifyPasswordClient(password, dbUser.password_hash);

        if (passwordMatches) {
          const { data: userRoleData } = await supabase
            .from("user_roles")
            .select("role_id, roles(slug)")
            .eq("user_id", dbUser.id)
            .maybeSingle();

          const resolvedRole = ((userRoleData as any)?.roles?.slug as RoleSlug) || "PROPRIETARIO";

          let companyName = "Minha Barbearia";
          if (dbUser.tenant_id) {
            try {
              const { data: tenantData } = await supabase
                .from("tenants")
                .select("id, name, trade_name")
                .eq("id", dbUser.tenant_id)
                .maybeSingle();
              if (tenantData) {
                companyName = tenantData.trade_name || tenantData.name || companyName;
              }
            } catch {}
          }

          const loggedUser: AuthenticatedUser = {
            id: dbUser.id,
            name: dbUser.name,
            role: resolvedRole,
            email: dbUser.email,
            tenantId: dbUser.tenant_id,
            companyName,
            unitId: dbUser.unit_id,
          };

          localStorage.setItem("barberhub_session_user", JSON.stringify(loggedUser));
          onLoginSuccess(loggedUser);
          return;
        }
      }

      setErrorMessage("E-mail ou senha incorretos. Verifique suas credenciais.");
    } catch (err: any) {
      console.error("Erro no login:", err);
      setErrorMessage(err.message || "Falha ao autenticar. Tente novamente em instantes.");
    } finally {
      setIsLoading(false);
    }
  };

  // 1.2 FLUXO DE LOGIN DO CLIENTE FINAL (PORTAL DO CLIENTE)
  const handleCustomerLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanInput = customerIdentifier.trim();
    if (!cleanInput) {
      setErrorMessage("Por favor, informe seu celular, CPF ou e-mail cadastrado.");
      return;
    }

    setIsLoading(true);

    try {
      // Busca cliente na tabela barberhub.customers
      const { data: client, error: clientErr } = await supabase
        .from("customers")
        .select("id, name, phone, email, cpf, tenant_id")
        .or(`phone.eq.${cleanInput},email.eq.${cleanInput.toLowerCase()},cpf.eq.${cleanInput}`)
        .maybeSingle();

      if (clientErr || !client) {
        throw new Error("Cliente não encontrado. Solicite o cadastro no balcão da barbearia para ativar seu acesso.");
      }

      // Busca dados do estabelecimento
      let companyName = "Barbearia";
      if (client.tenant_id) {
        try {
          const { data: tenantData } = await supabase
            .from("tenants")
            .select("name, trade_name")
            .eq("id", client.tenant_id)
            .maybeSingle();
          if (tenantData) {
            companyName = tenantData.trade_name || tenantData.name || companyName;
          }
        } catch {}
      }

      const customerUser: AuthenticatedUser = {
        id: client.id,
        name: client.name,
        role: "CLIENTE",
        email: client.email || `${client.phone}@cliente.barberhub`,
        tenantId: client.tenant_id,
        companyName,
        unitId: null,
        mustChangePassword: false,
      };

      localStorage.setItem("barberhub_session_user", JSON.stringify(customerUser));
      onLoginSuccess(customerUser);
    } catch (err: any) {
      setErrorMessage(err.message || "Falha no acesso do cliente.");
    } finally {
      setIsLoading(false);
    }
  };

  // 1.4 FLUXO DE DEFINIÇÃO DE SENHA DEFINITIVA (OBRIGATÓRIO NO PRIMEIRO ACESSO)
  const handleSetNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage("A nova senha deve possuir no mínimo 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("As senhas informadas não coincidem.");
      return;
    }

    if (provisionalPassword && newPassword === provisionalPassword) {
      setErrorMessage("A nova senha definitiva deve ser diferente da senha provisória.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Atualiza a senha no Supabase Auth central e remove o indicador de troca pendente
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          must_change_password: false,
        },
      });

      if (updateError) {
        throw new Error(updateError.message || "Erro ao salvar nova senha definitiva.");
      }

      // 2. Executa função segura no servidor (SECURITY DEFINER) para sincronizar credenciais BarberHub
      try {
        const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)("barberhub_change_password", {
          p_new_password: newPassword,
        });

        if (rpcErr || (rpcData && rpcData.success === false)) {
          console.warn("[Auth] Retorno da função segura barberhub_change_password:", rpcErr || rpcData);
        }
      } catch (rpcEx) {
        console.warn("[Auth] Erro ao invocar RPC de sincronização:", rpcEx);
      }

      if (pendingAuthUser) {
        const updatedUser: AuthenticatedUser = {
          ...pendingAuthUser,
          mustChangePassword: false,
        };
        localStorage.setItem("barberhub_session_user", JSON.stringify(updatedUser));
        setSuccessMessage("Senha definitiva cadastrada com sucesso! Entrando no BarberHub...");
        setTimeout(() => {
          onLoginSuccess(updatedUser);
        }, 1200);
      } else {
        setMode("LOGIN");
        setSuccessMessage("Senha definitiva cadastrada com sucesso! Faça login com sua nova senha.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Falha ao definir nova senha.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. FLUXO DE RECUPERAÇÃO DE SENHA
  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = recoveryEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage("Por favor, informe seu e-mail cadastrado.");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });

      if (error) {
        console.warn("Aviso ao enviar link de recuperação:", error);
      }

      setRecoverySent(true);
      setSuccessMessage("Se o e-mail estiver cadastrado, as instruções foram enviadas para sua caixa de entrada.");
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao processar solicitação.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. FLUXO DE PRIMEIRO ACESSO (CONVITE)
  const handleFirstAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!inviteToken.trim()) {
      setErrorMessage("Por favor, informe o token de convite recebido.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("A senha deve possuir no mínimo 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("As senhas informadas não coincidem.");
      return;
    }

    setIsLoading(true);

    try {
      const passwordHash = await hashPasswordClient(newPassword);

      const { data, error } = await (supabase.rpc as any)("accept_user_invite", {
        p_token: inviteToken.trim(),
        p_password_hash: passwordHash,
      });

      if (error) {
        throw new Error(error.message || "Falha ao ativar primeiro acesso.");
      }

      if (data && data.success === false) {
        setErrorMessage(data.error || "Token de convite inválido ou expirado.");
        setIsLoading(false);
        return;
      }

      setFirstAccessSuccess(true);
      setSuccessMessage("Senha cadastrada com sucesso! Agora você já pode fazer login.");
      setTimeout(() => {
        setMode("LOGIN");
        setEmail(data?.email || "");
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || "Falha ao registrar nova senha.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 bg-background selection:bg-primary selection:text-primary-foreground">
      {/* Grade de Fundo Estilo NAVOR LawHub */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{
          backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 w-full max-w-[460px] flex flex-col items-center">
        {/* Logo & Emblema Oficial NAVOR BarberHub */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex items-center gap-2.5 mb-3">
            <img
              src="/icons/navor-icon.png"
              alt="NAVOR Logo"
              className="h-10 w-10 object-contain drop-shadow-[0_2px_10px_rgba(0,136,204,0.35)]"
            />
            <div className="h-6 w-px bg-zinc-700/60 mx-0.5" />
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-primary/30 shadow-lg shadow-primary/10 flex items-center justify-center">
              <Scissors className="h-5 w-5 text-primary" />
            </div>
          </div>

          <span className="text-[11px] font-bold tracking-widest text-[#0088cc] uppercase flex items-center gap-1.5">
            <span>NAVOR</span>
            <span className="text-zinc-600">•</span>
            <span>BARBERHUB PRO</span>
          </span>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl font-display">
            {portalType === "SUBSCRIBER" ? "Acesso à Barbearia" : "Portal do Cliente"}
          </h1>

          <p className="mt-1.5 text-xs text-muted-foreground max-w-sm">
            {portalType === "SUBSCRIBER"
              ? "Gerenciamento completo: agenda, equipe, atendimentos, caixa e faturamento."
              : "Consulte seus agendamentos, histórico de cortes e saldo do programa de fidelidade."}
          </p>
        </div>

        {/* Card Principal */}
        <Card className="w-full rounded-2xl border border-hairline bg-card shadow-2xl p-6 sm:p-8 backdrop-blur-md">
          <CardContent className="p-0 space-y-4">
            {/* Seletor de Perfil de Login (Exibido estritamente quando o módulo Portal do Cliente estiver habilitado) */}
            {mode === "LOGIN" && isCustomerPortalEnabled && (
              <div className="grid grid-cols-2 p-1 rounded-xl bg-muted/40 border border-hairline text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setPortalType("SUBSCRIBER");
                    setErrorMessage(null);
                  }}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-all cursor-pointer ${
                    portalType === "SUBSCRIBER"
                      ? "bg-card text-foreground shadow-xs font-bold border border-hairline"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span>Gestão Barbearia</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPortalType("CUSTOMER");
                    setErrorMessage(null);
                  }}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-all cursor-pointer ${
                    portalType === "CUSTOMER"
                      ? "bg-card text-foreground shadow-xs font-bold border border-hairline"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <User className="h-3.5 w-3.5 text-[#0088cc]" />
                  <span>Portal do Cliente</span>
                </button>
              </div>
            )}

            {/* Mensagens de Feedback */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* ========================================================= */}
            {/* MODO 1A: LOGIN GESTÃO DA BARBEARIA (ASSINANTE / EQUIPE)   */}
            {/* ========================================================= */}
            {mode === "LOGIN" && portalType === "SUBSCRIBER" && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="login-email" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    E-MAIL CADASTRADO
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@barbearia.com"
                    autoComplete="email"
                    required
                    className="h-10 text-sm bg-muted/20 border-hairline focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      SENHA
                    </Label>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    required
                    className="h-10 text-sm bg-muted/20 border-hairline focus:border-primary"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 text-sm font-bold bg-[#0088cc] hover:bg-[#0077b3] text-white shadow-md transition-all cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Autenticando...</span>
                    </div>
                  ) : (
                    "Acessar Painel da Barbearia"
                  )}
                </Button>

                <div className="pt-2 text-center space-y-2 border-t border-hairline">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setSuccessMessage(null);
                        setMode("FORGOT_PASSWORD");
                      }}
                      className="text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
                    >
                      Esqueci minha senha
                    </button>
                    <span className="hidden sm:inline text-muted-foreground/40">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setSuccessMessage(null);
                        setMode("FIRST_ACCESS");
                      }}
                      className="text-[#0088cc] hover:underline font-medium cursor-pointer"
                    >
                      Primeiro acesso?
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ========================================================= */}
            {/* MODO 1B: LOGIN DO CLIENTE FINAL (PORTAL DO CLIENTE)       */}
            {/* ========================================================= */}
            {mode === "LOGIN" && portalType === "CUSTOMER" && (
              <form onSubmit={handleCustomerLoginSubmit} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="customer-ident" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    CELULAR, CPF OU E-MAIL DO CLIENTE
                  </Label>
                  <Input
                    id="customer-ident"
                    type="text"
                    value={customerIdentifier}
                    onChange={(e) => setCustomerIdentifier(e.target.value)}
                    placeholder="(11) 99999-9999 ou seu@email.com"
                    required
                    className="h-10 text-sm bg-muted/20 border-hairline focus:border-primary"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Use o mesmo contato informado durante seu atendimento na barbearia.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Localizando cadastro...</span>
                    </div>
                  ) : (
                    "Entrar no Portal do Cliente"
                  )}
                </Button>

                <div className="pt-2 text-center border-t border-hairline">
                  <p className="text-[11px] text-muted-foreground">
                    O acesso do cliente é restrito a seus agendamentos e fidelidade, sem permissões administrativas.
                  </p>
                </div>
              </form>
            )}

            {/* ========================================================= */}
            {/* MODO 2: RECUPERAÇÃO DE SENHA                              */}
            {/* ========================================================= */}
            {mode === "FORGOT_PASSWORD" && (
              <form onSubmit={handleRecoverySubmit} className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Recuperação de Senha</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Informe seu e-mail cadastrado para receber o link de redefinição segura.
                  </p>
                </div>

                {!recoverySent ? (
                  <>
                    <div className="space-y-1.5 text-left">
                      <Label htmlFor="rec-email" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        E-MAIL CADASTRADO
                      </Label>
                      <Input
                        id="rec-email"
                        type="email"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        placeholder="seu.email@barbearia.com"
                        required
                        className="h-10 text-sm bg-muted/20 border-hairline focus:border-primary"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 text-sm font-bold bg-[#0088cc] hover:bg-[#0077b3] text-white shadow-md transition-all cursor-pointer"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Enviando...</span>
                        </div>
                      ) : (
                        "Enviar Link Seguro"
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="p-4 rounded-xl bg-muted/30 border border-hairline text-center space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Verifique sua caixa de entrada e clique no link recebido para criar uma nova senha.
                    </p>
                  </div>
                )}

                <div className="pt-2 text-center border-t border-hairline">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      setMode("LOGIN");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Voltar para o Login
                  </button>
                </div>
              </form>
            )}

            {/* ========================================================= */}
            {/* MODO 3: PRIMEIRO ACESSO (CONVITE)                         */}
            {/* ========================================================= */}
            {mode === "FIRST_ACCESS" && (
              <form onSubmit={handleFirstAccessSubmit} className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Primeiro Acesso</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Defina sua senha individual para ativar sua conta no BarberHub.
                  </p>
                </div>

                {!firstAccessSuccess ? (
                  <>
                    <div className="space-y-1.5 text-left">
                      <Label htmlFor="inv-token" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        TOKEN DE CONVITE
                      </Label>
                      <Input
                        id="inv-token"
                        type="text"
                        value={inviteToken}
                        onChange={(e) => setInviteToken(e.target.value)}
                        placeholder="Cole o token recebido no convite"
                        required
                        className="h-10 text-sm font-mono bg-muted/20 border-hairline focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1.5 text-left">
                      <Label htmlFor="inv-pass" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        NOVA SENHA (MÍNIMO 8 CARACTERES)
                      </Label>
                      <Input
                        id="inv-pass"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        minLength={8}
                        className="h-10 text-sm bg-muted/20 border-hairline focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1.5 text-left">
                      <Label htmlFor="inv-confirm-pass" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        CONFIRME A NOVA SENHA
                      </Label>
                      <Input
                        id="inv-confirm-pass"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        minLength={8}
                        className="h-10 text-sm bg-muted/20 border-hairline focus:border-primary"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 text-sm font-bold bg-[#0088cc] hover:bg-[#0077b3] text-white shadow-md transition-all cursor-pointer"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Ativando...</span>
                        </div>
                      ) : (
                        "Cadastrar Senha e Ativar Conta"
                      )}
                    </Button>
                  </>
                ) : null}

                <div className="pt-2 text-center border-t border-hairline">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      setMode("LOGIN");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Voltar para o Login
                  </button>
                </div>
              </form>
            )}

            {/* ========================================================= */}
            {/* MODO 4: DEFINIÇÃO DE SENHA DEFINITIVA (PRIMEIRO ACESSO)  */}
            {/* ========================================================= */}
            {mode === "SET_NEW_PASSWORD" && (
              <form onSubmit={handleSetNewPasswordSubmit} className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Definir Senha Definitiva</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Você entrou com uma senha provisória da NAVOR. É obrigatório cadastrar sua senha definitiva antes de prosseguir.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/20 border border-hairline text-[11px] text-muted-foreground flex items-start gap-2 text-left">
                  <ShieldCheck className="h-4 w-4 text-[#0088cc] shrink-0 mt-0.5" />
                  <span>
                    Esta credencial é isolada e exclusiva para o <strong>BarberHub</strong>, sem alterar suas senhas em outros produtos NAVOR.
                  </span>
                </div>

                <div className="space-y-1.5 text-left">
                  <Label htmlFor="set-new-pass" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    NOVA SENHA DEFINITIVA (MÍNIMO 8 CARACTERES)
                  </Label>
                  <Input
                    id="set-new-pass"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    minLength={8}
                    className="h-10 text-sm bg-muted/20 border-hairline focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <Label htmlFor="set-confirm-pass" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    CONFIRME A NOVA SENHA DEFINITIVA
                  </Label>
                  <Input
                    id="set-confirm-pass"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    minLength={8}
                    className="h-10 text-sm bg-muted/20 border-hairline focus:border-primary"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all cursor-pointer"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Salvando senha...</span>
                    </div>
                  ) : (
                    "Salvar Senha Definitiva e Acessar"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Rodapé de Retorno para os Sistemas NAVOR */}
        <div className="mt-8 text-center space-y-1">
          <a
            href="https://navorbr.com"
            onClick={(e) => {
              if (onNavigateNavorPortals) {
                e.preventDefault();
                onNavigateNavorPortals();
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs text-[#0088cc] hover:underline font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Escolher outro produto NAVOR
          </a>
          <p className="text-[11px] text-muted-foreground font-sans">
            NAVOR • Tecnologia que move negócios
          </p>
        </div>
      </div>
    </div>
  );
}
