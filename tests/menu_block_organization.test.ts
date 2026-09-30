import { describe, it, expect, beforeEach } from "vitest";
import { DEFINITIVE_NAV_SECTIONS, type NavSection } from "../src/components/layout/AppSidebar";

describe("Organização do Menu por Blocos de Sessão (AppSidebar)", () => {
  it("cada seção deve possuir um ID único e título bem definido", () => {
    const ids = DEFINITIVE_NAV_SECTIONS.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
    expect(ids).toContain("financeiro");
    expect(ids).toContain("relacionamento");
    expect(ids).toContain("operacao");
    expect(ids).toContain("vendas");
    expect(ids).toContain("estoque");
  });

  it("ao mover o bloco de sessão 'FINANCEIRO', todos os seus 4 links devem se mover juntos", () => {
    const finSection = DEFINITIVE_NAV_SECTIONS.find((s) => s.id === "financeiro");
    expect(finSection).toBeDefined();
    expect(finSection!.items.map((i) => i.id)).toEqual([
      "financial",
      "payables",
      "receivables",
      "dre",
    ]);

    // Simulação da lógica de reordenação de blocos
    const originalIds = DEFINITIVE_NAV_SECTIONS.map((s) => s.id);
    const financeiroIndex = originalIds.indexOf("financeiro");
    expect(financeiroIndex).toBeGreaterThan(0);

    // Move 'financeiro' para o topo (#1)
    const newOrder = [...originalIds];
    const [moved] = newOrder.splice(financeiroIndex, 1);
    newOrder.unshift(moved!);

    expect(newOrder[0]).toBe("financeiro");

    // Aplica ordenação nas seções
    const orderMap = new Map(newOrder.map((id, index) => [id, index]));
    const reorderedSections = [...DEFINITIVE_NAV_SECTIONS].sort((a, b) => {
      const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999;
      const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999;
      return idxA - idxB;
    });

    expect(reorderedSections[0].id).toBe("financeiro");
    expect(reorderedSections[0].title).toBe("FINANCEIRO");
    expect(reorderedSections[0].items.length).toBe(4);
    expect(reorderedSections[0].items.map((i) => i.id)).toEqual([
      "financial",
      "payables",
      "receivables",
      "dre",
    ]);
  });

  it("ao mover o bloco 'RELACIONAMENTO', a Central de Atendimento, Marketing e Avaliações permanecem agrupadas", () => {
    const relSection = DEFINITIVE_NAV_SECTIONS.find((s) => s.id === "relacionamento");
    expect(relSection).toBeDefined();
    expect(relSection!.items.map((i) => i.id)).toEqual([
      "chat_hub",
      "marketing",
      "reviews",
    ]);

    // Move 'relacionamento' para depois de 'financeiro'
    const customOrder = ["financeiro", "relacionamento", "visao_geral", "operacao"];
    const orderMap = new Map(customOrder.map((id, index) => [id, index]));

    const sorted = [...DEFINITIVE_NAV_SECTIONS].sort((a, b) => {
      const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999;
      const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999;
      return idxA - idxB;
    });

    expect(sorted[0].id).toBe("financeiro");
    expect(sorted[1].id).toBe("relacionamento");
    expect(sorted[1].items.map((i) => i.id)).toContain("chat_hub");
  });

  it("o perfil BARBEIRO deve acessar apenas sua sessão exclusiva mantendo a integridade", () => {
    const barbeiroSections = DEFINITIVE_NAV_SECTIONS.filter((s) =>
      s.allowedRoles?.includes("BARBEIRO")
    );

    const sectionIds = barbeiroSections.map((s) => s.id);
    expect(sectionIds).toContain("area_profissional");
    expect(sectionIds).not.toContain("financeiro");
    expect(sectionIds).not.toContain("configuracoes");
  });
});
