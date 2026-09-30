# BarberHub — POLÍTICA E DIRETRIZES DE SEGURANÇA (SECURITY.md)

## 1. Princípios de Segurança

A segurança do BarberHub é projetada em camadas (*Defense in Depth*) com controle severo de acesso e isolamento de dados. Nenhuma decisão de autorização depende do cliente (frontend).

---

## 2. Autenticação e Gestão de Credenciais

### Criptografia de Senhas
- **Algoritmo**: `bcryptjs` com fator de trabalho (salt rounds) configurado em `12`.
- **Complexidade**: Comprimento mínimo de 8 caracteres exigido por validação severa.
- **Armazenamento**: NUNCA armazenar senhas em texto puro ou reversível.

### Gestão de Sessões
- **Geração de Tokens**: `crypto.randomBytes(64).toString('hex')` (128 caracteres hexadecimais de alta entropia).
- **Persistência de Sessões**: O token emitido para o cookie HTTP-Only é transformado em hash `SHA-256` antes de ser persistido na tabela `sessions`. Se o banco de dados for comprometido, tokens ativos permanecem ilegíveis.
- **Validade**: Sessões possuem validade padrão de 7 dias, renováveis ou revogáveis imediatamente pelo operador.

### Proteção Contra Força Bruta (Brute-Force Lockout)
- O sistema rastreia tentativas consecutivas de login incorretas por usuário (`failedAttempts`).
- Após **5 tentativas falhas**, a conta é bloqueada automaticamente por **15 minutos** (`lockedUntil`).
- Após um login bem-sucedido, o contador de falhas é zerado.

---

## 3. Matriz RBAC (Role-Based Access Control)

O BarberHub implementa 7 perfis operacionais com privilégios rigorosamente segregados:

| Perfil | Acesso Permitido | Restrições Absolutas |
| :--- | :--- | :--- |
| **PROPRIETARIO** | Acesso irrestrito a todos os módulos, relatórios, configurações críticas e exclusão de contas. | Nenhuma. |
| **ADMINISTRADOR** | Gestão de operações, funcionários, clientes, serviços, PDV e relatórios financeiros. | Não altera configurações mestres da empresa reservadas ao proprietário. |
| **GERENTE** | Gestão do dia a dia, acompanhamento de atendimentos, aprovação de sangrias/descontos e relatórios operacionais. | Não tem acesso a configurações de faturamento SaaS ou alteração de comissões mestres. |
| **RECEPCIONISTA** | Visualização completa da agenda, marcação de horários, check-in, cadastro de clientes e consulta básica de preços. | Não visualiza relatórios financeiros, comissões de terceiros ou custos de estoque. |
| **BARBEIRO** | Visualização estrita da sua própria agenda de atendimentos, lista de clientes do dia e extrato da sua própria comissão. | Bloqueado para agenda de outros barbeiros, financeiro global, PDV mestre e fechamento de caixa. |
| **CAIXA** | Operação rápida de PDV, lançamento de pagamentos múltiplos, abertura, sangria e fechamento de caixa diário. | Bloqueado para edição de funcionários, alteração de regras de comissão e exclusão de históricos. |
| **ESTOQUISTA** | Gestão de produtos, controle de níveis de estoque, entrada de compras e vínculo com fornecedores. | Bloqueado para frente de caixa, agenda de atendimentos e financeiro sensível. |

---

## 4. Isolamento Multi-Tenant

- **Backend Enforcement**: Toda busca no Prisma deve obrigatoriamente incluir `{ tenantId }`.
- **Prevenção de Cross-Tenant Leakage**: Tentativas de leitura de dados de outro tenant disparam `SecurityViolationError` e registram evento imediato no log de auditoria.

---

## 5. Auditoria Imutável (Audit Trail)

Toda ação de mutação sensível gera um registro na tabela `audit_logs`:
- **Campos**: `tenant_id`, `unit_id`, `user_id`, `action`, `entity`, `entity_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `created_at`.
- **Sanitização Automática**: Senhas, hashes de senhas, chaves de API e tokens são expurgados automaticamente antes do salvamento (`sanitizeAuditData`).
