import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  getDeviceType,
  getScheduleViewMode,
  mapPosKeyboardShortcut,
  isValidTouchTarget,
  BREAKPOINTS,
} from "../src/lib/responsive";
import {
  canAdvanceBookingStep,
  getNextBookingStep,
  getPreviousBookingStep,
  formatBarberMobileTimeline,
  MobileBookingDraft,
  RawBarberScheduleItem,
} from "../src/lib/mobile-booking";

describe("FASE 9: PWA, Responsividade & Refinamento Visual", () => {
  // ------------------------------------------------------------------
  // TESTE 1: Validação da Especificação PWA Manifest
  // ------------------------------------------------------------------
  it("deve conter um Web App Manifest válido com todos os requisitos PWA", () => {
    const manifestPath = path.resolve(__dirname, "../public/manifest.json");
    expect(fs.existsSync(manifestPath)).toBe(true);

    const raw = fs.readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(raw);

    expect(manifest.name).toContain("BarberHub");
    expect(manifest.short_name).toBe("BarberHub");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe("#121214");
    expect(manifest.background_color).toBe("#0c0c0e");

    // Ícones obrigatórios de 192 e 512
    const icon192 = manifest.icons.find((i: any) => i.sizes === "192x192");
    const icon512 = manifest.icons.find((i: any) => i.sizes === "512x512");
    expect(icon192).toBeDefined();
    expect(icon512).toBeDefined();

    // Atalhos rápidos para PDV e Agenda
    expect(manifest.shortcuts.length).toBeGreaterThanOrEqual(2);
    expect(manifest.shortcuts.some((s: any) => s.url === "/pdv")).toBe(true);
    expect(manifest.shortcuts.some((s: any) => s.url === "/agenda")).toBe(true);
  });

  // ------------------------------------------------------------------
  // TESTE 2: Validação do Service Worker e Estratégias de Cache
  // ------------------------------------------------------------------
  it("deve possuir Service Worker configurado com estratégias de cache e fallback offline", () => {
    const swPath = path.resolve(__dirname, "../public/sw.js");
    expect(fs.existsSync(swPath)).toBe(true);

    const swContent = fs.readFileSync(swPath, "utf8");
    expect(swContent).toContain("addEventListener(\"install\"");
    expect(swContent).toContain("addEventListener(\"activate\"");
    expect(swContent).toContain("addEventListener(\"fetch\"");
    expect(swContent).toContain("STATIC_CACHE");
    expect(swContent).toContain("RUNTIME_CACHE");
    expect(swContent).toContain("caches.match");
    // Fallback offline
    expect(swContent).toContain("BarberHub Offline");
  });

  // ------------------------------------------------------------------
  // TESTE 3: Classificação Determinística de Dispositivos (Breakpoints)
  // ------------------------------------------------------------------
  it("deve classificar corretamente Mobile, Tablet e Desktop com base na largura da viewport", () => {
    expect(getDeviceType(375)).toBe("MOBILE");
    expect(getDeviceType(BREAKPOINTS.MOBILE_MAX)).toBe("MOBILE");

    expect(getDeviceType(768)).toBe("TABLET");
    expect(getDeviceType(820)).toBe("TABLET");
    expect(getDeviceType(BREAKPOINTS.TABLET_MAX)).toBe("TABLET");

    expect(getDeviceType(1024)).toBe("DESKTOP");
    expect(getDeviceType(1440)).toBe("DESKTOP");
    expect(getDeviceType(1920)).toBe("DESKTOP");
  });

  // ------------------------------------------------------------------
  // TESTE 4: Adaptador Responsivo da Agenda por Tipo de Dispositivo
  // ------------------------------------------------------------------
  it("deve alternar a visualização da agenda conforme o dispositivo", () => {
    // Smartphone: timeline vertical linear
    expect(getScheduleViewMode(390)).toBe("TIMELINE_VERTICAL");

    // Tablet: colunas com scroll/swipe horizontal
    expect(getScheduleViewMode(800)).toBe("COLUMNS_SWIPE");

    // Desktop: grade multi-barbeiro simultânea
    expect(getScheduleViewMode(1280)).toBe("MULTI_BARBER_GRID");
  });

  // ------------------------------------------------------------------
  // TESTE 5: Mapeamento de Atalhos de Teclado no PDV (F2, F4, Esc, F8)
  // ------------------------------------------------------------------
  it("deve mapear atalhos rápidos de teclado determinísticos para operação ágil do PDV", () => {
    expect(mapPosKeyboardShortcut({ key: "F2" })).toBe("NEW_SALE");
    expect(mapPosKeyboardShortcut({ key: "F4" })).toBe("FINALIZE_PAYMENT");
    expect(mapPosKeyboardShortcut({ key: "F8" })).toBe("CASH_ACTION");
    expect(mapPosKeyboardShortcut({ key: "F9" })).toBe("SEARCH_CUSTOMER");
    expect(mapPosKeyboardShortcut({ key: "F10" })).toBe("APPLY_DISCOUNT");
    expect(mapPosKeyboardShortcut({ key: "Escape" })).toBe("CANCEL_ACTION");
    expect(mapPosKeyboardShortcut({ key: "Enter" })).toBeNull();
  });

  // ------------------------------------------------------------------
  // TESTE 6: Validador de Alvos de Toque (Touch Targets >= 44px)
  // ------------------------------------------------------------------
  it("deve validar tamanho mínimo de 44x44px para alvos de toque em telas táteis", () => {
    expect(isValidTouchTarget(48, 48)).toBe(true);
    expect(isValidTouchTarget(44, 44)).toBe(true);
    expect(isValidTouchTarget(40, 48)).toBe(false); // Estreito
    expect(isValidTouchTarget(48, 32)).toBe(false); // Baixo
    expect(isValidTouchTarget(30, 30)).toBe(false);
  });

  // ------------------------------------------------------------------
  // TESTE 7: Máquina de Estados Progressiva do Agendamento Online Mobile
  // ------------------------------------------------------------------
  it("deve validar avanço entre etapas do wizard de agendamento online mobile", () => {
    const draft: MobileBookingDraft = {
      step: "SELECT_SERVICE",
    };

    // Bloqueia avanço sem serviço
    expect(canAdvanceBookingStep(draft)).toBe(false);

    // Selecionou serviço -> pode avançar
    draft.serviceId = "srv_1";
    draft.serviceName = "Degradê Premium";
    expect(canAdvanceBookingStep(draft)).toBe(true);

    // Passo 2: Seleção de barbeiro
    draft.step = "SELECT_BARBER";
    expect(canAdvanceBookingStep(draft)).toBe(false);
    draft.employeeId = "ANY"; // Qualquer barbeiro disponível
    expect(canAdvanceBookingStep(draft)).toBe(true);

    // Passo 3: Data e Horário
    draft.step = "SELECT_DATE_TIME";
    expect(canAdvanceBookingStep(draft)).toBe(false);
    draft.date = "2026-10-05";
    draft.timeSlot = "15:00";
    expect(canAdvanceBookingStep(draft)).toBe(true);

    // Passo 4: Dados do Cliente
    draft.step = "CUSTOMER_INFO";
    expect(canAdvanceBookingStep(draft)).toBe(false);
    draft.customerName = "Al"; // Muito curto (< 3 letras)
    draft.customerPhone = "1198888"; // Menos de 10 dígitos
    expect(canAdvanceBookingStep(draft)).toBe(false);

    draft.customerName = "Alexandre Magno";
    draft.customerPhone = "(11) 98765-4321";
    expect(canAdvanceBookingStep(draft)).toBe(true);
  });

  // ------------------------------------------------------------------
  // TESTE 8: Navegação Bidirecional do Wizard de Agendamento
  // ------------------------------------------------------------------
  it("deve navegar para a frente e para trás nas etapas do wizard mobile sem falhas", () => {
    expect(getNextBookingStep("SELECT_SERVICE")).toBe("SELECT_BARBER");
    expect(getNextBookingStep("SELECT_BARBER")).toBe("SELECT_DATE_TIME");
    expect(getNextBookingStep("SELECT_DATE_TIME")).toBe("CUSTOMER_INFO");
    expect(getNextBookingStep("CUSTOMER_INFO")).toBe("CONFIRMED");

    expect(getPreviousBookingStep("CONFIRMED")).toBe("CUSTOMER_INFO");
    expect(getPreviousBookingStep("CUSTOMER_INFO")).toBe("SELECT_DATE_TIME");
    expect(getPreviousBookingStep("SELECT_DATE_TIME")).toBe("SELECT_BARBER");
    expect(getPreviousBookingStep("SELECT_BARBER")).toBe("SELECT_SERVICE");
    expect(getPreviousBookingStep("SELECT_SERVICE")).toBe("SELECT_SERVICE");
  });

  // ------------------------------------------------------------------
  // TESTE 9: Formatação da Timeline Mobile do Barbeiro com Link WhatsApp
  // ------------------------------------------------------------------
  it("deve formatar cards da timeline mobile do barbeiro com ordenação e link oficial wa.me", () => {
    const rawItems: RawBarberScheduleItem[] = [
      {
        id: "a2",
        code: "BH-002",
        startTime: "11:00",
        endTime: "11:45",
        customerName: "Bruno Souza",
        customerPhone: "(11) 97777-6666",
        serviceName: "Barboterapia",
        price: 40.0,
        status: "AGUARDANDO",
      },
      {
        id: "a1",
        code: "BH-001",
        startTime: "09:00",
        endTime: "09:45",
        customerName: "André Silva",
        customerPhone: "11988885555",
        serviceName: "Corte Tradicional",
        price: 50.0,
        status: "EM_ATENDIMENTO",
      },
    ];

    const cards = formatBarberMobileTimeline(rawItems);

    // Deve estar ordenado cronologicamente (09:00 antes de 11:00)
    expect(cards[0].appointmentId).toBe("a1");
    expect(cards[0].timeRange).toBe("09:00 - 09:45");
    expect(cards[0].canFinish).toBe(true);
    expect(cards[0].canStart).toBe(false);

    expect(cards[1].appointmentId).toBe("a2");
    expect(cards[1].statusLabel).toBe("Na Recepção");
    expect(cards[1].canStart).toBe(true);

    // Link oficial wa.me sem APIs pagas
    expect(cards[1].waLink).toContain("https://wa.me/5511977776666");
    expect(cards[1].waLink).toContain("Barboterapia");
    expect(cards[1].callLink).toBe("tel:+5511977776666");
  });

  // ------------------------------------------------------------------
  // TESTE 10: Integridade dos Arquivos e Ícones PWA no Disco
  // ------------------------------------------------------------------
  it("deve verificar a existência física dos ícones PWA e manifesto no diretório public", () => {
    const icon192 = path.resolve(__dirname, "../public/icons/icon-192.png");
    const icon512 = path.resolve(__dirname, "../public/icons/icon-512.png");
    const iconSvg = path.resolve(__dirname, "../public/icons/icon.svg");

    expect(fs.existsSync(icon192)).toBe(true);
    expect(fs.existsSync(icon512)).toBe(true);
    expect(fs.existsSync(iconSvg)).toBe(true);

    const stats192 = fs.statSync(icon192);
    expect(stats192.size).toBeGreaterThan(0);
  });
});
