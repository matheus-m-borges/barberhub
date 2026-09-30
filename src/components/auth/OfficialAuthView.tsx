import React, { useState, useEffect } from "react";
import { Lock, Mail, KeyRound, ArrowLeft, Scissors, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { RoleSlug, AuthenticatedUser } from "@/lib/auth/auth.types";
import { hashPasswordClient, verifyPasswordClient } from "@/lib/auth/client-password";

export type { AuthenticatedUser };

interface OfficialAuthViewProps {
  onLoginSuccess: (user: AuthenticatedUser) => void;
  onNavigateNavorPortals?: () => void;
}

type AuthMode = "LOGIN" | "FORGOT_PASSWORD" | "FIRST_ACCESS";

export function OfficialAuthView({ onLoginSuccess, onNavigateNavorPortals }: OfficialAuthViewProps) {
  const [mode, setMode] = useState<AuthMode>("LOGIN");

  // Campos de Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Campos de Recuperação
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);

  // Campos de Primeiro Acesso
  const [inviteToken, setInviteToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstAccessSuccess, setFirstAccessSuccess] = useState(false);

  // Estados de Operação
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  // 1. FLUXO DE LOGIN OFICIAL
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
      // 1. Tenta autenticação oficial via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!authError && authData.user) {
        const tenantId = (authData.user.app_metadata?.tenant_id as string) || (authData.user.user_metadata?.tenant_id as string) || "tenant-matriz";
        const role = ((authData.user.app_metadata?.role as string) || (authData.user.user_metadata?.role as string) || "PROPRIETARIO") as RoleSlug;
        const name = (authData.user.user_metadata?.name as string) || cleanEmail.split("@")[0] || "Administrador";

        const loggedUser: AuthenticatedUser = {
          id: authData.user.id,
          name,
          role,
          email: cleanEmail,
          tenantId,
        };

        localStorage.setItem("barberhub_session_user", JSON.stringify(loggedUser));
        onLoginSuccess(loggedUser);
        return;
      }

      // 2. Consulta tabela 'users' com criptografia segura se auth direto não estiver populado
      const { data: dbUser, error: dbError } = await supabase
        .from("users")
        .select("id, name, email, password_hash, tenant_id, unit_id, status, failed_attempts, locked_until")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (dbError) {
        console.error("Erro na busca de usuário:", dbError);
      }

      if (dbUser) {
        if (dbUser.status !== "ACTIVE") {
          setErrorMessage("Esta conta de acesso está inativa. Contate o proprietário da barbearia.");
          setIsLoading(false);
          return;
        }

        // Validação de senha
        const passwordMatches = await verifyPasswordClient(password, dbUser.password_hash);

        if (passwordMatches) {
          // Busca o papel do usuário
          const { data: userRoleData } = await supabase
            .from("user_roles")
            .select("role_id, roles(slug)")
            .eq("user_id", dbUser.id)
            .maybeSingle();

          const resolvedRole = ((userRoleData as any)?.roles?.slug as RoleSlug) || "PROPRIETARIO";

          const loggedUser: AuthenticatedUser = {
            id: dbUser.id,
            name: dbUser.name,
            role: resolvedRole,
            email: dbUser.email,
            tenantId: dbUser.tenant_id,
            unitId: dbUser.unit_id,
          };

          localStorage.setItem("barberhub_session_user", JSON.stringify(loggedUser));
          onLoginSuccess(loggedUser);
          return;
        }
      }

      // Se falhou em ambas as tentativas
      setErrorMessage("E-mail ou senha incorretos. Verifique suas credenciais.");
    } catch (err: any) {
      console.error("Erro no login:", err);
      setErrorMessage(err.message || "Falha ao autenticar. Tente novamente em instantes.");
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
        redirectTo: "https://barberhub.navorbr.com/auth/callback?type=recovery",
      });

      if (error) {
        console.warn("Aviso ao enviar link de recuperação:", error);
      }

      // Mesmo que o e-mail não exista, exibe sucesso genérico por segurança (prevenção de enumeração)
      setRecoverySent(true);
      setSuccessMessage("Se o e-mail estiver cadastrado em nosso sistema, as instruções foram enviadas para sua caixa de entrada.");
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

      // Executa RPC accept_user_invite
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
      }, 2500);
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
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-amber-500/30 shadow-lg shadow-amber-500/10 flex items-center justify-center">
              <Scissors className="h-5 w-5 text-amber-500" />
            </div>
          </div>

          <span className="text-[11px] font-bold tracking-widest text-[#0088cc] uppercase flex items-center gap-1.5">
            <span>NAVOR</span>
            <span className="text-zinc-600">•</span>
            <span>PORTAL BARBERHUB</span>
          </span>

          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl font-display">
            Acesse sua Barbearia
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-sm">
            Entre para gerenciar sua agenda, equipe, atendimentos, caixa e clientes com excelência e precisão.
          </p>
        </div>

        {/* Card Principal */}
        <Card className="w-full rounded-2xl border border-hairline bg-card shadow-2xl p-6 sm:p-8 backdrop-blur-md">
          <CardContent className="p-0 space-y-5">
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
            {/* MODO 1: LOGIN OFICIAL                                    */}
            {/* ========================================================= */}
            {mode === "LOGIN" && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Entrar</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Acesso restrito a profissionais e equipe cadastrados.
                  </p>
                </div>

                <div className="space-y-1.5 text-left">
                  <Label htmlFor="login-email" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    E-MAIL
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
                    "Entrar"
                  )}
                </Button>

                <div className="pt-2 text-center space-y-2 border-t border-hairline">
                  <p className="text-[11px] text-muted-foreground">
                    Novos colaboradores são cadastrados em Usuários.
                  </p>

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
            Escolher outra área de acesso
          </a>
          <p className="text-[11px] text-muted-foreground font-sans">
            NAVOR - Tecnologia que move negócios
          </p>
        </div>
      </div>
    </div>
  );
}
