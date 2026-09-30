// BarberHub Pro ERP - Coupons & Promotions Service
// Regras determinísticas de cupons promocionais e validação server-side

export interface CouponState {
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderAmount?: number;
  maxUses?: number | null;
  currentUses: number;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  isActive: boolean;
}

/**
 * Valida o cupom promocional e calcula o desconto com precisão
 */
export function validateAndApplyCoupon(params: {
  coupon: CouponState;
  orderSubtotal: number;
  now?: Date;
}): {
  valid: boolean;
  discountAmount: number;
  finalTotal: number;
  reason?: string;
} {
  const { coupon, orderSubtotal, now = new Date() } = params;

  if (orderSubtotal <= 0) {
    return {
      valid: false,
      discountAmount: 0,
      finalTotal: 0,
      reason: "Subtotal do pedido deve ser maior que zero.",
    };
  }

  // 1. Status ativo
  if (!coupon.isActive) {
    return {
      valid: false,
      discountAmount: 0,
      finalTotal: orderSubtotal,
      reason: "Este cupom está desativado.",
    };
  }

  // 2. Data de início
  if (coupon.startsAt && now.getTime() < coupon.startsAt.getTime()) {
    return {
      valid: false,
      discountAmount: 0,
      finalTotal: orderSubtotal,
      reason: "A promoção deste cupom ainda não foi iniciada.",
    };
  }

  // 3. Data de expiração
  if (coupon.expiresAt && now.getTime() > coupon.expiresAt.getTime()) {
    return {
      valid: false,
      discountAmount: 0,
      finalTotal: orderSubtotal,
      reason: "Este cupom já expirou.",
    };
  }

  // 4. Limite de utilizações
  if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
    return {
      valid: false,
      discountAmount: 0,
      finalTotal: orderSubtotal,
      reason: "O limite de utilizações deste cupom foi esgotado.",
    };
  }

  // 5. Valor mínimo do pedido
  const minAmount = coupon.minOrderAmount || 0;
  if (orderSubtotal < minAmount) {
    return {
      valid: false,
      discountAmount: 0,
      finalTotal: orderSubtotal,
      reason: `Valor mínimo do pedido para este cupom é R$ ${minAmount.toFixed(2)}.`,
    };
  }

  // 6. Cálculo do desconto
  let discountAmount = 0;
  if (coupon.discountType === "PERCENTAGE") {
    if (coupon.discountValue > 100) {
      discountAmount = orderSubtotal;
    } else {
      discountAmount = Math.round(((orderSubtotal * coupon.discountValue) / 100) * 100) / 100;
    }
  } else {
    // FIXED
    discountAmount = Math.min(coupon.discountValue, orderSubtotal);
  }

  const finalTotal = Math.round(Math.max(0, orderSubtotal - discountAmount) * 100) / 100;

  return {
    valid: true,
    discountAmount,
    finalTotal,
  };
}
