export type DeviceType = "MOBILE" | "TABLET" | "DESKTOP";

export type ScheduleViewMode = "TIMELINE_VERTICAL" | "COLUMNS_SWIPE" | "MULTI_BARBER_GRID";

export type PosShortcutAction =
  | "NEW_SALE"
  | "FINALIZE_PAYMENT"
  | "CASH_ACTION"
  | "CANCEL_ACTION"
  | "SEARCH_CUSTOMER"
  | "APPLY_DISCOUNT";

export const BREAKPOINTS = {
  MOBILE_MAX: 767,
  TABLET_MAX: 1023,
  DESKTOP_MIN: 1024,
} as const;

/**
 * Classifica determinísticamente o dispositivo com base na largura da viewport.
 */
export function getDeviceType(viewportWidth: number): DeviceType {
  if (viewportWidth <= BREAKPOINTS.MOBILE_MAX) {
    return "MOBILE";
  }
  if (viewportWidth <= BREAKPOINTS.TABLET_MAX) {
    return "TABLET";
  }
  return "DESKTOP";
}

/**
 * Retorna o modo de visualização mais eficiente para a agenda com base no dispositivo.
 */
export function getScheduleViewMode(viewportWidth: number): ScheduleViewMode {
  const device = getDeviceType(viewportWidth);
  switch (device) {
    case "MOBILE":
      // Celular: timeline vertical linear com seleção rápida de profissional em pílulas
      return "TIMELINE_VERTICAL";
    case "TABLET":
      // Tablet: colunas deslize horizontal com alvos de toque generosos
      return "COLUMNS_SWIPE";
    case "DESKTOP":
      // Desktop: visão panorâmica multi-coluna em tela cheia com arrasto
      return "MULTI_BARBER_GRID";
  }
}

/**
 * Mapeador de atalhos rápidos de teclado para operação ágil do PDV no balcão.
 */
export function mapPosKeyboardShortcut(event: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}): PosShortcutAction | null {
  const { key } = event;

  switch (key) {
    case "F2":
      return "NEW_SALE";
    case "F4":
      return "FINALIZE_PAYMENT";
    case "F8":
      return "CASH_ACTION";
    case "F9":
      return "SEARCH_CUSTOMER";
    case "F10":
      return "APPLY_DISCOUNT";
    case "Escape":
      return "CANCEL_ACTION";
    default:
      return null;
  }
}

/**
 * Validador de acessibilidade de alvos de toque (mínimo de 44x44px para touch/mobile).
 */
export function isValidTouchTarget(widthPx: number, heightPx: number): boolean {
  return widthPx >= 44 && heightPx >= 44;
}
