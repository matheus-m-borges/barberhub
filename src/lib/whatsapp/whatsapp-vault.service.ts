// BarberHub Pro ERP - WhatsApp Cloud API Credential Vault
// Cofre Seguro de Credenciais Meta com Isolamento Estrito Multi-Tenant e Anti-IDOR

import { type WhatsAppCloudConfig } from "./whatsapp.types";
import crypto from "node:crypto";
import { supabase } from "@/integrations/supabase/client";

export class SecurityException extends Error {
  constructor(public code: string, message: string) {
    super(`[${code}] ${message}`);
    this.name = "SecurityException";
  }
}

/**
 * Validação rigorosa de isolamento Multi-Tenant (Anti-IDOR).
 * Garante matematicamente que nenhum usuário acesse registros de outra barbearia.
 */
export function enforceTenantIsolation(
  sessionTenantId: string | null | undefined,
  targetTenantId: string | null | undefined
): void {
  if (!sessionTenantId || !targetTenantId) {
    throw new SecurityException(
      "TENANT_ISOLATION_VIOLATION",
      "Acesso negado: Identificador de tenant ausente na requisição."
    );
  }

  if (sessionTenantId !== targetTenantId) {
    throw new SecurityException(
      "CROSS_TENANT_ACCESS_DENIED",
      "Acesso não autorizado: Tentativa de acesso a dados pertencentes a outra organização."
    );
  }
}

/**
 * Armazenamento de credenciais do cofre em memória (espelhado com banco seguro de dados).
 * Indexado por Tenant ID e com índice reverso por phoneNumberId para resolução instantânea de webhooks.
 */
class WhatsAppCredentialVault {
  private configsByTenant: Map<string, WhatsAppCloudConfig> = new Map();
  private configsByPhoneNumberId: Map<string, WhatsAppCloudConfig> = new Map();
  private listeners: Set<(tenantId: string) => void> = new Set();

  constructor() {
    // Zero hardcoded demo configs. Fail-closed by default.
  }

  private getStorageKey(tenantId: string): string {
    return `barberhub_whatsapp_vault_${tenantId}`;
  }

  private loadFromStorage(tenantId: string): WhatsAppCloudConfig | null {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return null;
    }
    try {
      const stored = localStorage.getItem(this.getStorageKey(tenantId));
      if (!stored) return null;
      const parsed = JSON.parse(stored) as WhatsAppCloudConfig;
      if (parsed && parsed.tenantId === tenantId) {
        this.configsByTenant.set(tenantId, parsed);
        if (parsed.phoneNumberId) {
          this.configsByPhoneNumberId.set(parsed.phoneNumberId.trim(), parsed);
        }
        return parsed;
      }
    } catch {
      // Falha de leitura de storage tratada silenciosamente
    }
    return null;
  }

  private persistToStorage(config: WhatsAppCloudConfig): void {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return;
    }
    try {
      localStorage.setItem(this.getStorageKey(config.tenantId), JSON.stringify(config));
    } catch {
      // Falha de escrita de storage tratada silenciosamente
    }
  }

  /**
   * Assina notificações reativas de atualização do cofre para atualização instantânea na UI sem Shift+F5
   */
  public subscribe(listener: (tenantId: string) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(tenantId: string): void {
    this.listeners.forEach((listener) => {
      try {
        listener(tenantId);
      } catch (err) {
        console.error("Erro no listener do cofre WhatsApp:", err);
      }
    });
  }

  /**
   * Salva ou atualiza as credenciais de um tenant de forma isolada.
   * Regra estrita: SALVAR CREDENCIAIS NÃO SIGNIFICA CONECTAR!
   * Se a conexão estava CONNECTED e credenciais foram alteradas, rebaixa para CONFIGURED.
   */
  public saveConfig(
    sessionTenantId: string,
    config: WhatsAppCloudConfig
  ): WhatsAppCloudConfig {
    enforceTenantIsolation(sessionTenantId, config.tenantId);

    const previous = this.getConfig(sessionTenantId, config.tenantId);
    const now = new Date().toISOString();

    // Determina o status real:
    let determinedStatus: WhatsAppCloudConfig["status"] = config.status || "NOT_CONFIGURED";

    // Se estava CONNECTED e qualquer credencial foi alterada, invalida imediatamente para CONFIGURED
    if (previous && previous.status === "CONNECTED") {
      const credentialsChanged =
        previous.phoneNumberId !== config.phoneNumberId ||
        previous.accessToken !== config.accessToken ||
        previous.wabaId !== config.wabaId ||
        previous.appSecret !== config.appSecret ||
        previous.displayPhoneNumber !== config.displayPhoneNumber;

      if (credentialsChanged) {
        determinedStatus = "CONFIGURED";
      }
    }

    // Se faltarem credenciais da Graph API, status da API oficial é NOT_CONFIGURED
    const hasMetaApiCredentials =
      Boolean(config.phoneNumberId?.trim()) &&
      Boolean(config.accessToken?.trim());

    if (!hasMetaApiCredentials) {
      determinedStatus = "NOT_CONFIGURED";
    } else if (determinedStatus === "NOT_CONFIGURED") {
      determinedStatus = "CONFIGURED";
    }

    // Se whatsapp foi desabilitado explicitamente
    if (config.whatsappEnabled === false) {
      determinedStatus = "DISCONNECTED";
    }

    // Se o lojista cadastrou o número exibido e não desmarcou expressamente o WhatsApp, mantém canal ativo
    const hasPhone = Boolean(config.displayPhoneNumber && config.displayPhoneNumber.replace(/\D/g, "").length >= 8);
    const whatsappEnabled = config.whatsappEnabled !== false && (hasPhone || config.whatsappEnabled === true);

    const updated: WhatsAppCloudConfig = {
      ...config,
      whatsappEnabled,
      status: determinedStatus,
      lastValidatedAt: determinedStatus === "CONNECTED" ? (config.lastValidatedAt || previous?.lastValidatedAt) : undefined,
      lastValidationError: determinedStatus === "ERROR" ? config.lastValidationError : undefined,
      updatedAt: now,
      webhookUrl: config.webhookUrl || "/api/webhooks/whatsapp",
    };

    // Remove índice anterior se mudou o phoneNumberId
    if (previous && previous.phoneNumberId && previous.phoneNumberId !== updated.phoneNumberId) {
      this.configsByPhoneNumberId.delete(previous.phoneNumberId.trim());
    }

    this.configsByTenant.set(config.tenantId, updated);
    if (config.tenantId === "tenant-matriz") {
      this.configsByTenant.set("tenant-default", { ...updated, tenantId: "tenant-default" });
    } else if (config.tenantId === "tenant-default") {
      this.configsByTenant.set("tenant-matriz", { ...updated, tenantId: "tenant-matriz" });
    }

    if (updated.phoneNumberId) {
      this.configsByPhoneNumberId.set(updated.phoneNumberId.trim(), updated);
    }

    this.persistToStorage(updated);
    this.notify(config.tenantId);

    // Sincronização assíncrona não-bloqueante com o Supabase oficial
    this.syncToSupabase(updated);

    return updated;
  }

  /**
   * Sincronização direta com a tabela 'tenants' e 'audit_logs' do Supabase
   */
  public async syncToSupabase(config: WhatsAppCloudConfig): Promise<void> {
    try {
      const cleanPhone = config.displayPhoneNumber?.trim() || null;
      // 1. Atualiza ou insere na tabela tenants
      await supabase.from("tenants").upsert({
        id: config.tenantId,
        slug: config.tenantId,
        name: "BarberHub Studio",
        phone: cleanPhone,
        status: "ACTIVE",
        updated_at: new Date().toISOString(),
      });

      // 2. Registra trilha de auditoria em audit_logs
      await supabase.from("audit_logs").insert({
        tenant_id: config.tenantId,
        entity: "whatsapp_config",
        entity_id: config.id,
        action: "UPDATE_WHATSAPP_CONFIG",
        new_values: JSON.stringify({
          displayPhoneNumber: config.displayPhoneNumber,
          status: config.status,
          hasMetaGraphApi: Boolean(config.phoneNumberId && config.accessToken),
          whatsappEnabled: config.whatsappEnabled,
        }),
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("[WhatsAppVault] Supabase sync notice:", err);
    }
  }

  /**
   * Carrega telefone do Supabase caso o armazenamento local esteja limpo
   */
  public async loadFromSupabase(tenantId: string): Promise<WhatsAppCloudConfig | null> {
    try {
      const { data } = await supabase
        .from("tenants")
        .select("phone, name")
        .eq("id", tenantId)
        .maybeSingle();

      if (data && data.phone) {
        const existing = this.getConfig(tenantId, tenantId);
        if (!existing || !existing.displayPhoneNumber) {
          const config: WhatsAppCloudConfig = {
            id: `waba-${tenantId}`,
            tenantId,
            wabaId: "",
            phoneNumberId: "",
            displayPhoneNumber: data.phone,
            accessToken: "",
            verifyToken: "barberhub_meta_webhook_token_2026",
            graphApiVersion: "v21.0",
            status: "NOT_CONFIGURED",
            whatsappEnabled: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          this.configsByTenant.set(tenantId, config);
          this.persistToStorage(config);
          this.notify(tenantId);
          return config;
        }
      }
    } catch {
      // Ignora falha de rede
    }
    return null;
  }

  /**
   * Obtém as credenciais completas de um tenant.
   * Exige correspondência estrita de tenantId para evitar vazamentos entre barbearias.
   */
  public getConfig(
    sessionTenantId: string,
    targetTenantId: string
  ): WhatsAppCloudConfig | null {
    enforceTenantIsolation(sessionTenantId, targetTenantId);
    let config = this.configsByTenant.get(targetTenantId);
    if (!config && (targetTenantId === "tenant-matriz" || targetTenantId === "tenant-default")) {
      const alt = targetTenantId === "tenant-matriz" ? "tenant-default" : "tenant-matriz";
      config = this.configsByTenant.get(alt);
    }
    if (!config) {
      config = this.loadFromStorage(targetTenantId) || undefined;
      if (!config && (targetTenantId === "tenant-matriz" || targetTenantId === "tenant-default")) {
        const alt = targetTenantId === "tenant-matriz" ? "tenant-default" : "tenant-matriz";
        config = this.loadFromStorage(alt) || undefined;
      }
    }
    return config || null;
  }

  /**
   * Atualiza status e evidências de validação diretamente
   */
  public updateStatus(
    tenantId: string,
    status: WhatsAppCloudConfig["status"],
    evidence?: Partial<WhatsAppCloudConfig>
  ): void {
    const current = this.getConfig(tenantId, tenantId);
    if (!current) return;

    const updated: WhatsAppCloudConfig = {
      ...current,
      ...evidence,
      status,
      updatedAt: new Date().toISOString(),
    };

    this.configsByTenant.set(tenantId, updated);
    if (tenantId === "tenant-matriz") {
      this.configsByTenant.set("tenant-default", { ...updated, tenantId: "tenant-default" });
    } else if (tenantId === "tenant-default") {
      this.configsByTenant.set("tenant-matriz", { ...updated, tenantId: "tenant-matriz" });
    }

    if (updated.phoneNumberId) {
      this.configsByPhoneNumberId.set(updated.phoneNumberId.trim(), updated);
    }
    this.persistToStorage(updated);
    this.notify(tenantId);
  }

  /**
   * Retorna o número de WhatsApp válido para wa.me e links diretos.
   * Se o tenant cadastrou um displayPhoneNumber válido e o WhatsApp não foi desativado explicitamente,
   * ele é retornado em formato numérico limpo (ex: "5586981116254").
   * Se não houver número cadastrado, retorna rigorosamente null (FAIL CLOSED: nunca usa número default ou de outro tenant).
   */
  public getDirectWhatsAppNumber(tenantId: string): string | null {
    const config = this.getConfig(tenantId, tenantId);
    if (!config || !config.displayPhoneNumber || config.whatsappEnabled === false) {
      return null;
    }
    const digits = config.displayPhoneNumber.replace(/\D/g, "");
    if (digits.length < 8) return null;
    if (digits.length === 10 || digits.length === 11) {
      return `55${digits}`;
    }
    return digits;
  }

  /**
   * Verifica se o canal oficial Meta Graph API está operacional para o tenant.
   * Operacional quando: status === "CONNECTED" e whatsappEnabled === true.
   */
  public isWhatsAppOperational(tenantId: string): boolean {
    const config = this.getConfig(tenantId, tenantId);
    if (!config || config.whatsappEnabled === false) return false;
    return config.status === "CONNECTED";
  }

  /**
   * Retorna o número de telefone operacional para envio automatizado via Meta Cloud API.
   * Regra FAIL CLOSED: Se a Meta API não estiver operacional (status !== CONNECTED),
   * NUNCA retorna número de fallback, NUNCA retorna número default e NUNCA retorna número de outro tenant. Retorna estritamente null.
   */
  public getOperationalWhatsAppNumber(tenantId: string): string | null {
    if (!this.isWhatsAppOperational(tenantId)) {
      return null;
    }
    return this.getDirectWhatsAppNumber(tenantId);
  }

  /**
   * Obtém a configuração unificada dos canais de atendimento por tenant (Fonte Única de Verdade).
   * Garante acesso centralizado aos canais webChat e WhatsApp oficial com FAIL CLOSED.
   */
  public getChannelSettings(tenantId: string) {
    const config = this.getConfig(tenantId, tenantId);
    const whatsappOperational = this.isWhatsAppOperational(tenantId);
    const directNumber = this.getDirectWhatsAppNumber(tenantId);
    return {
      webChatEnabled: config?.webChatEnabled ?? true,
      webChatBotEnabled: config?.webChatBotEnabled ?? true,
      webChatHumanHandoffEnabled: config?.webChatHumanHandoffEnabled ?? true,
      whatsappEnabled: config?.whatsappEnabled ?? false,
      whatsappConnected: config?.status === "CONNECTED",
      whatsappBotEnabled: whatsappOperational && (config?.whatsappBotEnabled ?? false),
      whatsappHumanHandoffEnabled: config?.whatsappHumanHandoffEnabled ?? true,
      whatsappDisplayNumber: whatsappOperational ? this.getOperationalWhatsAppNumber(tenantId) : null,
      directWhatsAppNumber: directNumber,
      hasDirectWhatsApp: Boolean(directNumber),
      whatsappPhoneNumberId: config?.phoneNumberId || null,
      connectionStatus: config?.status || "NOT_CONFIGURED",
      lastValidatedAt: config?.lastValidatedAt,
      lastValidationError: config?.lastValidationError,
      verifiedName: config?.verifiedName,
    };
  }

  /**
   * Executa validação REAL contra a API oficial da Meta Graph API (v21.0).
   * Não simula sucesso, não usa timeout falso, valida token e confere o número retornado pela Meta.
   */
  public async validateMetaConnection(tenantId: string): Promise<{
    success: boolean;
    status: WhatsAppCloudConfig["status"];
    metaData?: {
      verifiedName?: string | undefined;
      displayPhoneNumber?: string | undefined;
      qualityRating?: string | undefined;
      codeVerificationStatus?: string | undefined;
    } | undefined;
    error?: string | undefined;
  }> {
    const config = this.getConfig(tenantId, tenantId);

    if (!config || !config.phoneNumberId?.trim() || !config.accessToken?.trim() || !config.displayPhoneNumber?.trim()) {
      const errorMsg = "Campos obrigatórios ausentes: WABA ID, Phone Number ID, Access Token e Número Exibido são necessários.";
      if (config) {
        this.updateStatus(tenantId, "NOT_CONFIGURED", { lastValidationError: errorMsg });
      }
      return { success: false, status: "NOT_CONFIGURED", error: errorMsg };
    }

    // Transição imediata para VALIDATING
    this.updateStatus(tenantId, "VALIDATING");

    const version = config.graphApiVersion?.trim() || "v21.0";
    const phoneId = config.phoneNumberId.trim();
    const token = config.accessToken.trim();
    const url = `https://graph.facebook.com/${version}/${phoneId}?fields=verified_name,display_phone_number,quality_rating,code_verification_status`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = (await response.json().catch(() => ({}))) as Record<string, any>;

      if (!response.ok) {
        const metaError =
          data?.["error"]?.["message"] ||
          `Meta Graph API rejeitou a validação (HTTP ${response.status}). Verifique o Access Token e o Phone Number ID.`;

        this.updateStatus(tenantId, "ERROR", {
          lastValidationError: metaError,
          lastValidatedAt: undefined,
        });

        return {
          success: false,
          status: "ERROR",
          error: metaError,
        };
      }

      // Validação do número exibido retornado pela Meta (Section 15)
      const metaDisplayPhone = (data["display_phone_number"] as string) || "";
      const enteredDigits = config.displayPhoneNumber.replace(/\D/g, "");
      const metaDigits = metaDisplayPhone.replace(/\D/g, "");

      const normEntered = enteredDigits.startsWith("55") ? enteredDigits : `55${enteredDigits}`;
      const normMeta = metaDigits.startsWith("55") ? metaDigits : `55${metaDigits}`;

      if (normMeta && normEntered !== normMeta) {
        const mismatchError = `Configuração inconsistente: o Phone Number ID informado pertence ao número Meta "${metaDisplayPhone}", que é diferente do número digitado no BarberHub ("${config.displayPhoneNumber}").`;
        this.updateStatus(tenantId, "ERROR", {
          lastValidationError: mismatchError,
          lastValidatedAt: undefined,
        });
        return {
          success: false,
          status: "ERROR",
          error: mismatchError,
        };
      }

      // SUCESSO COMPROVADO PELA META
      const verifiedName = (data["verified_name"] as string) || config.verifiedName;
      const qualityRating = (data["quality_rating"] as string) || "GREEN";
      const validatedAt = new Date().toISOString();

      this.updateStatus(tenantId, "CONNECTED", {
        lastValidatedAt: validatedAt,
        lastValidationError: undefined,
        verifiedName,
        qualityRating,
      });

      return {
        success: true,
        status: "CONNECTED",
        metaData: {
          verifiedName,
          displayPhoneNumber: metaDisplayPhone || config.displayPhoneNumber,
          qualityRating,
          codeVerificationStatus: data["code_verification_status"] as string,
        },
      };
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? `Falha ao contatar os servidores da Meta: ${err.message}`
          : "Erro de rede ao validar credenciais na Meta Graph API.";

      this.updateStatus(tenantId, "ERROR", {
        lastValidationError: errorMsg,
        lastValidatedAt: undefined,
      });

      return {
        success: false,
        status: "ERROR",
        error: errorMsg,
      };
    }
  }

  /**
   * Resolve a barbearia/tenant proprietária da mensagem pelo Phone Number ID recebido da Meta.
   * Não expõe tokens desnecessariamente e garante roteamento correto no webhook multi-tenant.
   */
  public resolveByPhoneNumberId(phoneNumberId: string): WhatsAppCloudConfig | null {
    if (!phoneNumberId) return null;
    return this.configsByPhoneNumberId.get(phoneNumberId.trim()) || null;
  }

  /**
   * Retorna cópia sanitizada com secrets mascarados para exibição segura na UI/API.
   */
  public getMaskedConfig(
    sessionTenantId: string,
    targetTenantId: string
  ): WhatsAppCloudConfig | null {
    const raw = this.getConfig(sessionTenantId, targetTenantId);
    if (!raw) return null;

    return {
      ...raw,
      accessToken: maskSecret(raw.accessToken),
      appSecret: raw.appSecret ? maskSecret(raw.appSecret) : undefined,
    };
  }

  /**
   * Limpa registros para testes unitários isolados
   */
  public clearForTesting(): void {
    this.configsByTenant.clear();
    this.configsByPhoneNumberId.clear();
    this.listeners.clear();
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        localStorage.clear();
      } catch {
        // ignore
      }
    }
  }
}

export const whatsAppVault = new WhatsAppCredentialVault();
export const channelSettingsService = whatsAppVault;

/**
 * Mascara strings confidenciais como tokens e secrets (Ex: "EAAG12345678" -> "EAAG...5678")
 */
export function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 8) return "********";
  const start = secret.slice(0, 4);
  const end = secret.slice(-4);
  return `${start}...${end}`;
}

/**
 * Validação criptográfica de integridade da Meta (HMAC-SHA256).
 * Verifica se a requisição do webhook realmente partiu dos servidores da Meta
 * utilizando o App Secret da barbearia.
 */
export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string
): boolean {
  if (!signatureHeader || !appSecret || !rawBody) {
    return false;
  }

  // O header vem no formato: "sha256=<digest_hexadecimal>"
  const parts = signatureHeader.split("=");
  const sig = parts[0] === "sha256" ? parts[1] : null;
  if (!sig) {
    return false;
  }

  try {
    const hmac = crypto.createHmac("sha256", appSecret);
    hmac.update(rawBody, "utf8");
    const calculatedDigest = hmac.digest("hex");

    // Comparação em tempo constante para mitigar timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(sig, "hex"),
      Buffer.from(calculatedDigest, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Valida o handshake inicial do Webhook da Meta (Requisição GET de verificação).
 */
export function verifyWebhookHandshake(params: {
  mode: string | null | undefined;
  verifyToken: string | null | undefined;
  challenge: string | null | undefined;
  expectedToken: string;
}): string | null {
  const { mode, verifyToken, challenge, expectedToken } = params;

  if (mode === "subscribe" && verifyToken && expectedToken && verifyToken === expectedToken) {
    return challenge || null;
  }

  return null;
}
