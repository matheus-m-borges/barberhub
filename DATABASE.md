# BarberHub — MODELO DE BANCO DE DADOS (DATABASE.md)

## 1. Visão Geral do Modelo Relacional

O BarberHub utiliza **PostgreSQL** através do **Prisma ORM**. Todas as tabelas operacionais possuem isolamento com `tenant_id` e suporte a multiunidade com `unit_id`.

Todos os valores financeiros utilizam o tipo `Decimal(12, 2)` para prevenção de erros de ponto flutuante.

---

## 2. Mapa de Entidades (30+ Tabelas)

### Núcleo & Multi-Tenant
1. `tenants`: Empresa contratante, domínio/subdomínio, plano e status.
2. `units`: Unidades físicas ou operacionais pertencentes a um tenant.
3. `users`: Contas de acesso de operadores, barbeiros e administradores.
4. `roles`: Perfis de acesso do sistema (7 papéis padrão).
5. `permissions`: Permissões granulares associadas aos papéis.
6. `user_roles`: Tabela associativa entre usuários e seus papéis.
7. `sessions`: Sessões ativas de login com tokens criptográficos SHA-256 e expiração.

### Funcionários & Escala
8. `employees`: Registro detalhado do colaborador (salário fixo, comissão base, Pix).
9. `employee_schedules`: Grade de horários semanais e intervalos.
10. `employee_time_records`: Registro de ponto eletrônico (entrada, almoço, saída).
11. `employee_commissions`: Comissões geradas por atendimentos e vendas de produtos.

### Clientes & CRM
12. `customers`: Cadastro unificado com dados de contato, CPF, data de nascimento e métricas agregadas.
13. `customer_notes`: Anotações de preferências, cortes anteriores e restrições.
14. `customer_subscriptions`: Assinaturas e planos contratados pelo cliente.
15. `subscription_usages`: Histórico de consumo de créditos dos planos contratados.

### Serviços & Agenda
16. `service_categories`: Categorização dos serviços (ex: Cabelo, Barba, Estética).
17. `services`: Serviços com preço, duração em minutos e tipo de comissão.
18. `appointments`: Agendamentos com status (`AGENDADO` até `CONCLUIDO` / `CANCELADO`).
19. `appointment_services`: Serviços vinculados a um determinado agendamento.
20. `appointment_status_history`: Linha do tempo de alterações de status para auditoria.
21. `waiting_list`: Lista de espera para preenchimento de horários vagos.

### Frente de Caixa (PDV) & Caixa Diário
22. `sales`: Vendas registradas com totais, descontos e cliente vinculado.
23. `sale_items`: Itens da venda (serviços executados e produtos comercializados).
24. `payments`: Métodos de pagamento utilizados (permite pagamentos fracionados).
25. `cash_registers`: Sessões de caixa (abertura, conferência cega e fechamento).
26. `cash_movements`: Lançamentos no caixa (sangrias, suprimentos, estornos).

### Gestão Financeira
27. `financial_categories`: Categorias de despesas e receitas.
28. `financial_transactions`: Lançamentos consolidados no fluxo financeiro.
29. `accounts_payable`: Contas a pagar com fornecedores, vencimento e liquidação.
30. `accounts_receivable`: Contas a receber e mensalidades a liquidar.

### Estoque & Compras
31. `product_categories`: Categorias de produtos físicos.
32. `products`: Catálogo com estoque atual, estoque mínimo, preço de custo e venda.
33. `stock_movements`: Histórico rastreável de entradas, vendas no PDV, perdas e consumos.
34. `suppliers`: Cadastro de fornecedores de insumos e produtos.
35. `purchase_orders`: Ordens de compra emitidas para fornecedores.
36. `purchase_items`: Itens integrantes de uma ordem de compra.

### Fidelidade, Promoções & Auditoria
37. `loyalty_accounts`: Saldo de pontos do cliente.
38. `loyalty_transactions`: Créditos e débitos rastreáveis de pontos.
39. `loyalty_rewards`: Catálogo de prêmios e resgates de pontos.
40. `coupons`: Cupons de desconto com restrições e limites de uso.
41. `audit_logs`: Tabela de auditoria imutável registrando todas as ações críticas.

---

## 3. Integridade e Índices

- **Índices Multi-Tenant**: Cada tabela operacional possui índices compostos como `@@index([tenantId])` e `@@index([tenantId, createdAt])`.
- **Chaves Únicas Estritas**: Chaves de e-mail e logins possuem unicidade combinada com tenant (`@@unique([tenantId, email])`).
- **Deleção Segura / Soft Delete**: Nenhuma transação financeira, comissão ou venda é excluída fisicamente do banco de dados para garantir auditoria total e reconciliação fiscal.
