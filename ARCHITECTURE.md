# BarberHub — DOCUMENTO DE ARQUITETURA TÉCNICA (ARCHITECTURE.md)

## 1. Visão Geral
O **BarberHub** é um ERP corporativo completo para barbearias, desenvolvido inicialmente como um produto independente (*standalone*), mas concebido desde a sua primeira linha de código para integração futura com o ecossistema SaaS da NAVOR.

### Diretrizes Inegociáveis
1. **Zero Inteligência Artificial**: Toda a lógica de negócios, cálculos de disponibilidade, comissões e alertas operam sob regras determinísticas puras.
2. **Zero Dependência de APIs Pagas de WhatsApp**: Não utiliza WhatsApp Cloud API ou intermediários pagos. Notificações e confirmações utilizam protocolos de links diretos universais (`https://wa.me/telefone?text=...`).
3. **Isolamento Absoluto de Dados (Multi-Tenant)**: Nenhuma empresa pode, sob qualquer circunstância, acessar ou inferir dados de outra empresa.
4. **Precisão Financeira Estrita**: Todos os valores monetários utilizam tipo Decimal (`Decimal(12, 2)` / cents inteiros), evitando desvios de ponto flutuante.
5. **Rastreabilidade Total (Audit Logs)**: Toda alteração de estado crítico (preços, comissões, vendas, caixa, permissões) gera log de auditoria imutável.

---

## 2. Pilha Tecnológica (Tech Stack)

| Camada | Tecnologia | Justificativa |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript | Interface rápida, tipagem estrita e reatividade consistente. |
| **Roteamento & SSR** | TanStack Start / Router | Renderização de rotas com SSR/SPA unificado e type-safe. |
| **Estilização** | Tailwind CSS v4 + Radix UI | Componentes acessíveis, responsivos e de alta performance. |
| **Linguagem Backend** | Node.js + TypeScript | Unificação de linguagem, validações compartilhadas com Zod. |
| **Banco de Dados** | PostgreSQL | Robustez ACID, suporte a tipos numéricos exatos e chaves relacionais. |
| **ORM / Data Access** | Prisma ORM 5.22.0 | Esquema declarativo, migrações seguras e cliente fortemente tipado. |
| **Criptografia & Sessão** | bcryptjs + crypto nativo | Hashing de senhas seguro (salt rounds 12) e tokens SHA-256. |
| **Testes Automatizados**| Vitest | Execução ultrarrápida com TypeScript nativo. |

---

## 3. Estrutura de Pastas e Separação de Camadas

```
barberhub/
├── prisma/
│   └── schema.prisma              # Definição canônica do banco relacional (30+ entidades)
├── src/
│   ├── components/                # Componentes visuais desacoplados de regras críticas
│   │   ├── ui/                    # Primitivos shadcn/radix (botões, modais, selects)
│   │   └── modules/               # Componentes agrupados por módulo de negócio
│   ├── routes/                    # Rotas do TanStack Router (Páginas e APIs internas)
│   ├── server/                    # Backend e Lógica de Negócios (Nunca exposto no browser)
│   │   ├── auth/                  # Criptografia, Sessão, Força Bruta, RBAC e Tenant
│   │   ├── audit/                 # Serviço de auditoria imutável e sanitização
│   │   ├── appointments/          # Motor de disponibilidade e regras de agenda (Fase 3)
│   │   ├── customers/             # Serviços do CRM de clientes (Fase 2)
│   │   ├── services/              # Cadastro de serviços e comissões (Fase 2)
│   │   ├── employees/             # Jornada de trabalho e repasses (Fase 2)
│   │   ├── pos/                   # Frente de caixa, vendas e pagamentos (Fase 4)
│   │   ├── financial/             # Contas a pagar/receber e fluxo de caixa (Fase 5)
│   │   └── stock/                 # Movimentação e controle de estoque (Fase 6)
│   ├── lib/                       # Utilitários compartilhados, validação de schema e formatação
│   └── hooks/                     # Hooks de estado e dados reativos
├── tests/                         # Suíte de testes automatizados unitários e de integração
├── public/                        # Manifest PWA, ícones e assets estáticos
├── ARCHITECTURE.md                # Este documento de arquitetura
├── DATABASE.md                    # Documento de modelo de banco de dados
├── SECURITY.md                    # Documento de política e regras de segurança
└── ROADMAP.md                     # Roadmap de execução em 10 fases
```

---

## 4. Estratégia de Isolamento Multi-Tenant

Para garantir que a Empresa A nunca acerte dados da Empresa B:

1. **Chave de Tenant Canônica (`tenant_id`)**:
   - Todas as tabelas de entidades operacionais contêm `tenant_id` obrigatório indexado.
   - O banco impõe chaves estrangeiras apontando para `tenants(id)`.

2. **Scoped Queries no Prisma**:
   - Nenhuma query no repositório faz `findMany` ou `findFirst` sem aplicar `tenantId`.
   - Utilitário central `scopedTenantWhere(tenantId, filters)` garante a injeção em 100% das leituras e escritas.

3. **Validação de Propriedade (`assertTenantOwnership`)**:
   - Caso um usuário tente referenciar um registro com `tenant_id` divergente da sua sessão autenticada, a requisição é abortada com `SecurityViolationError` e um alerta de segurança é gravado no log de auditoria.

---

## 5. Preparação para Futura Integração NAVOR SaaS

A integração com a NAVOR não é executada agora, mas os alicerces já estão modelados:
- **`tenant_id`**: Identifica a conta/empresa contratante no ecossistema.
- **`unit_id`**: Suporta expansão de barbearias com múltiplas filiais sem quebra de esquema.
- **`subscription_id` & `plan_id`**: Prontos para espelhamento com os planos contratados no portal central.
- **`features` / Entitlements**: Campo flexível para habilitar módulos conforme o plano contratado.

O BarberHub opera autonomamente agora, e quando o conector NAVOR for acoplado, nenhuma migração destrutiva será necessária.
