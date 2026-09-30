export interface PwaInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let deferredPrompt: PwaInstallPromptEvent | null = null;
const installListeners = new Set<(canInstall: boolean) => void>();
const connectionListeners = new Set<(isOnline: boolean) => void>();

/**
 * Inicializa os ouvintes do PWA no navegador.
 */
export function initPwa(): void {
  if (typeof window === "undefined") return;

  // 1. Registro do Service Worker
  if ("serviceWorker" in navigator && process.env["NODE_ENV"] === "production") {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[BarberHub PWA] Service Worker registrado com sucesso:", reg.scope);
        })
        .catch((err) => {
          console.warn("[BarberHub PWA] Falha ao registrar Service Worker:", err);
        });
    });
  }

  // 2. Captura do evento de instalação (Add to Home Screen)
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as PwaInstallPromptEvent;
    notifyInstallState(true);
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notifyInstallState(false);
    console.log("[BarberHub PWA] Aplicativo instalado com sucesso!");
  });

  // 3. Monitoramento de conexão Online/Offline
  window.addEventListener("online", () => notifyConnectionState(true));
  window.addEventListener("offline", () => notifyConnectionState(false));
}

/**
 * Dispara o diálogo nativo de instalação do PWA.
 */
export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  notifyInstallState(false);
  return choice.outcome === "accepted";
}

/**
 * Retorna se o app está elegível para instalação no momento.
 */
export function canInstallPwa(): boolean {
  return deferredPrompt !== null;
}

/**
 * Retorna o status atual de conectividade com a internet.
 */
export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

function notifyInstallState(canInstall: boolean) {
  for (const listener of installListeners) {
    listener(canInstall);
  }
}

function notifyConnectionState(online: boolean) {
  for (const listener of connectionListeners) {
    listener(online);
  }
}

export function onPwaInstallChange(callback: (canInstall: boolean) => void): () => void {
  installListeners.add(callback);
  callback(canInstallPwa());
  return () => installListeners.delete(callback);
}

export function onConnectionChange(callback: (isOnline: boolean) => void): () => void {
  connectionListeners.add(callback);
  callback(isOnline());
  return () => connectionListeners.delete(callback);
}
