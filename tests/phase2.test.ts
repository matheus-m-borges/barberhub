import { describe, it, expect } from "vitest";
import {
  isValidCPF,
  sanitizePhone,
  calculateAverageTicket,
  registerCustomerAttendance,
  registerNoShow,
  registerCancellation,
  buildCustomerCreatePayload,
} from "../src/server/customers/customer.service";
import {
  calculateServiceCommission,
  buildServiceCreatePayload,
} from "../src/server/services/service.service";
import {
  isEmployeeEligibleForAppointments,
  buildEmployeeCreatePayload,
} from "../src/server/employees/employee.service";
import {
  businessSettingSchema,
  timeStringToMinutes,
  isCancellationFree,
} from "../src/server/settings/setting.service";
import {
  PERMISSIONS,
  hasPermission,
  assertPermission,
  RoleSlug,
} from "../src/server/auth/rbac";

describe("Fase 2: Clientes & CRM - Validação e Higienização", () => {
  it("deve validar corretamente CPFs válidos conhecidos", () => {
    // CPFs com dígitos verificadores matematicamente válidos
    expect(isValidCPF("52998224725")).toBe(true);
    expect(isValidCPF("00000000191")).toBe(true);
  });

  it("deve rejeitar CPFs matematicamente inválidos ou sequências repetidas", () => {
    expect(isValidCPF("11111111111")).toBe(false);
    expect(isValidCPF("00000000000")).toBe(false);
    expect(isValidCPF("12345678900")).toBe(false);
    expect(isValidCPF("123")).toBe(false);
  });

  it("deve higienizar números de telefone e rejeitar formatos insuficientes", () => {
    expect(sanitizePhone("(11) 98765-4321")).toBe("11987654321");
    expect(() => sanitizePhone("12345")).toThrow("Telefone inválido");
  });

  it("deve calcular o ticket médio sem divisão por zero", () => {
    expect(calculateAverageTicket(0, 0)).toBe(0);
    expect(calculateAverageTicket(150, 3)).toBe(50.0);
    expect(calculateAverageTicket(100, 3)).toBe(33.33);
  });

  it("deve atualizar as métricas do cliente ao concluir atendimento pago", () => {
    const initial = {
      totalSpent: 100,
      appointmentsCount: 2,
      averageTicket: 50,
      noShowCount: 0,
      canceledCount: 0,
    };
    const updated = registerCustomerAttendance(initial, 50, new Date("2026-09-29T14:00:00Z"));
    expect(updated.totalSpent).toBe(150);
    expect(updated.appointmentsCount).toBe(3);
    expect(updated.averageTicket).toBe(50);
    expect(updated.lastVisitAt).toEqual(new Date("2026-09-29T14:00:00Z"));
  });

  it("deve contabilizar faltas (no-show) e cancelamentos determinísticamente", () => {
    const initial = {
      totalSpent: 0,
      appointmentsCount: 0,
      averageTicket: 0,
      noShowCount: 1,
      canceledCount: 2,
    };
    const withNoShow = registerNoShow(initial);
    expect(withNoShow.noShowCount).toBe(2);

    const withCancel = registerCancellation(withNoShow);
    expect(withCancel.canceledCount).toBe(3);
  });

  it("deve exigir tenantId obrigatório para criação do cliente", () => {
    expect(() =>
      buildCustomerCreatePayload("", {
        name: "João Silva",
        phone: "11999998888",
      })
    ).toThrow("tenantId é obrigatório para cadastrar cliente.");
  });
});

describe("Fase 2: Serviços & Cálculo de Comissões", () => {
  it("deve calcular comissão percentual padrão do serviço", () => {
    const commission = calculateServiceCommission({
      servicePrice: 60.0,
      commissionType: "PERCENTAGE",
      commissionValue: 40.0, // 40%
    });
    expect(commission).toBe(24.0);
  });

  it("deve calcular comissão em valor fixo", () => {
    const commission = calculateServiceCommission({
      servicePrice: 80.0,
      commissionType: "FIXED",
      commissionValue: 35.0,
    });
    expect(commission).toBe(35.0);
  });

  it("comissão de valor fixo não pode exceder o preço total do serviço", () => {
    const commission = calculateServiceCommission({
      servicePrice: 30.0,
      commissionType: "FIXED",
      commissionValue: 50.0,
    });
    expect(commission).toBe(30.0);
  });

  it("taxa customizada do colaborador (employeeCustomRate) deve ter prioridade sobre o serviço", () => {
    const commission = calculateServiceCommission({
      servicePrice: 100.0,
      commissionType: "PERCENTAGE",
      commissionValue: 30.0, // base do serviço: 30%
      employeeCustomRate: 60.0, // taxa especial do barbeiro master: 60%
    });
    expect(commission).toBe(60.0);
  });

  it("deve rejeitar comissão percentual acima de 100%", () => {
    expect(() =>
      calculateServiceCommission({
        servicePrice: 100.0,
        commissionType: "PERCENTAGE",
        commissionValue: 120.0,
      })
    ).toThrow("Comissão percentual não pode exceder 100%.");
  });

  it("deve validar campos mínimos de cadastro do serviço", () => {
    expect(() =>
      buildServiceCreatePayload("tenant_1", {
        name: "Corte Degradê",
        price: -10, // Preço negativo inválido
        durationMinutes: 30,
        commissionType: "PERCENTAGE",
        commissionValue: 50,
        isActive: true,
      })
    ).toThrow();
  });
});

describe("Fase 2: Funcionários & Elegibilidade de Barbeiros", () => {
  it("barbeiro ativo deve estar apto para receber agendamentos", () => {
    const check = isEmployeeEligibleForAppointments({
      position: "BARBEIRO",
      status: "ACTIVE",
    });
    expect(check.eligible).toBe(true);
  });

  it("barbeiro em férias ou inativo NÃO deve estar apto para a agenda", () => {
    const checkVacation = isEmployeeEligibleForAppointments({
      position: "BARBEIRO",
      status: "VACATION",
    });
    expect(checkVacation.eligible).toBe(false);
    expect(checkVacation.reason).toContain("VACATION");

    const checkInactive = isEmployeeEligibleForAppointments({
      position: "BARBEIRO",
      status: "INACTIVE",
    });
    expect(checkInactive.eligible).toBe(false);
  });

  it("colaborador em cargo diferente de BARBEIRO não deve receber agendamentos", () => {
    const check = isEmployeeEligibleForAppointments({
      position: "RECEPCIONISTA",
      status: "ACTIVE",
    });
    expect(check.eligible).toBe(false);
    expect(check.reason).toContain("Apenas colaboradores no cargo de BARBEIRO");
  });

  it("deve construir payload do colaborador com higienização e validação de tenant", () => {
    const payload = buildEmployeeCreatePayload("tenant_123", {
      name: "Carlos Barbeiro",
      phone: "(11) 97777-6666",
      position: "BARBEIRO",
      salary: 1500,
      commissionRate: 50,
      status: "ACTIVE",
    });
    expect(payload.tenantId).toBe("tenant_123");
    expect(payload.phone).toBe("11977776666");
    expect(payload.commissionRate).toBe(50);
  });
});

describe("Fase 2: Configurações Operacionais da Barbearia", () => {
  it("deve converter string HH:mm para minutos corretamente", () => {
    expect(timeStringToMinutes("08:30")).toBe(510);
    expect(timeStringToMinutes("19:00")).toBe(1140);
  });

  it("deve validar configuração quando horário de fechamento for posterior ao de abertura", () => {
    expect(() =>
      businessSettingSchema.parse({
        businessName: "Barbearia Alfa",
        weekdayOpeningTime: "08:00",
        weekdayClosingTime: "20:00",
        intervalMinutes: 30,
        appointmentBufferMinutes: 5,
        cancellationGraceMinutes: 120,
        enableOnlineBooking: true,
        requirePhoneConfirmation: false,
      })
    ).not.toThrow();
  });

  it("deve rejeitar se o horário de fechamento for anterior ao de abertura", () => {
    expect(() =>
      businessSettingSchema.parse({
        businessName: "Barbearia Alfa",
        weekdayOpeningTime: "18:00",
        weekdayClosingTime: "09:00", // Inválido
        intervalMinutes: 30,
        appointmentBufferMinutes: 0,
        cancellationGraceMinutes: 120,
        enableOnlineBooking: true,
        requirePhoneConfirmation: false,
      })
    ).toThrow("Horário de fechamento deve ser posterior ao horário de abertura");
  });

  it("deve calcular corretamente se o cancelamento está dentro da tolerância gratuita", () => {
    const now = new Date("2026-09-29T10:00:00Z");
    const appointmentIn3Hours = new Date("2026-09-29T13:00:00Z"); // 180 min
    const appointmentIn30Min = new Date("2026-09-29T10:30:00Z");  // 30 min

    const check1 = isCancellationFree(appointmentIn3Hours, 120, now);
    expect(check1.isFree).toBe(true);
    expect(check1.minutesUntilStart).toBe(180);

    const check2 = isCancellationFree(appointmentIn30Min, 120, now);
    expect(check2.isFree).toBe(false);
    expect(check2.minutesUntilStart).toBe(30);
  });
});

describe("Fase 2: RBAC (Role-Based Access Control) & Permissões por Perfil", () => {
  it("deve permitir que o Proprietário acesse todas as permissões críticas", () => {
    const roles: RoleSlug[] = ["PROPRIETARIO"];
    expect(hasPermission(roles, PERMISSIONS.CONFIGURACOES_MANAGE)).toBe(true);
    expect(hasPermission(roles, PERMISSIONS.FINANCEIRO_READ)).toBe(true);
    expect(hasPermission(roles, PERMISSIONS.COMISSAO_MANAGE)).toBe(true);
    expect(hasPermission(roles, PERMISSIONS.ESTOQUE_READ)).toBe(true);
  });

  it("deve restringir alteração de configurações críticas para Administrador", () => {
    const roles: RoleSlug[] = ["ADMINISTRADOR"];
    expect(hasPermission(roles, PERMISSIONS.CONFIGURACOES_MANAGE)).toBe(false);
    expect(hasPermission(roles, PERMISSIONS.FINANCEIRO_READ)).toBe(true);
    expect(hasPermission(roles, PERMISSIONS.AUDITORIA_READ)).toBe(true);
  });

  it("deve garantir que o Barbeiro acesse apenas sua própria comissão e fluxo de atendimento", () => {
    const roles: RoleSlug[] = ["BARBEIRO"];
    expect(hasPermission(roles, PERMISSIONS.COMISSAO_OWN_READ)).toBe(true);
    expect(hasPermission(roles, PERMISSIONS.ATENDIMENTO_FLOW)).toBe(true);
    expect(hasPermission(roles, PERMISSIONS.AGENDA_OWN_ONLY)).toBe(true);
    // Não pode acessar financeiro da empresa, gerenciar comissões ou estoque
    expect(hasPermission(roles, PERMISSIONS.FINANCEIRO_READ)).toBe(false);
    expect(hasPermission(roles, PERMISSIONS.COMISSAO_MANAGE)).toBe(false);
    expect(hasPermission(roles, PERMISSIONS.ESTOQUE_WRITE)).toBe(false);
    expect(hasPermission(roles, PERMISSIONS.CONFIGURACOES_MANAGE)).toBe(false);
  });

  it("deve garantir que o Estoquista só acesse controle de estoque e pedidos de compra", () => {
    const roles: RoleSlug[] = ["ESTOQUISTA"];
    expect(hasPermission(roles, PERMISSIONS.ESTOQUE_READ)).toBe(true);
    expect(hasPermission(roles, PERMISSIONS.ESTOQUE_WRITE)).toBe(true);
    expect(hasPermission(roles, PERMISSIONS.COMPRAS_MANAGE)).toBe(true);
    // Não tem acesso a caixa, financeiro ou agenda
    expect(hasPermission(roles, PERMISSIONS.CAIXA_READ)).toBe(false);
    expect(hasPermission(roles, PERMISSIONS.FINANCEIRO_READ)).toBe(false);
    expect(hasPermission(roles, PERMISSIONS.AGENDA_READ)).toBe(false);
  });

  it("deve garantir que o Caixa acesse PDV e caixa, mas não relatórios globais ou estoque", () => {
    const roles: RoleSlug[] = ["CAIXA"];
    expect(hasPermission(roles, PERMISSIONS.PDV_SALE)).toBe(true);
    expect(hasPermission(roles, PERMISSIONS.CAIXA_READ)).toBe(true);
    expect(hasPermission(roles, PERMISSIONS.CAIXA_OPEN)).toBe(true);
    expect(hasPermission(roles, PERMISSIONS.CAIXA_CLOSE)).toBe(true);
    expect(hasPermission(roles, PERMISSIONS.RELATORIOS_READ)).toBe(false);
    expect(hasPermission(roles, PERMISSIONS.ESTOQUE_WRITE)).toBe(false);
  });

  it("deve lançar exceção em assertPermission quando usuário não tem o papel devido", () => {
    const roles: RoleSlug[] = ["BARBEIRO"];
    expect(() => assertPermission(roles, PERMISSIONS.CONFIGURACOES_MANAGE)).toThrow(
      "Acesso negado: o usuário não possui a permissão 'configuracoes:manage'."
    );
  });
});

