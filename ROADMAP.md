# BarberHub — ROADMAP DE DESENVOLVIMENTO (10 FASES)

> **Status Atual**: TODAS AS 10 FASES CONCLUÍDAS COM SUCESSO (131 testes automatizados passando com 100% de aprovação).  
> **Status de Entrega**: ERP Comercial BarberHub Standalone 100% homologado, seguro e preparado para futura integração SaaS.

---

## VISÃO GERAL DAS FASES

### [x] FASE 1: Fundação, Arquitetura, Banco & Segurança
- **Objetivo**: Estabelecer a infraestrutura corporativa, modelo relacional completo, motor de segurança, multi-tenant estrito, RBAC de 7 perfis e rastreabilidade total via auditoria.
- **Entregas**:
  - Modelo Prisma completo cobrindo todos os módulos do ERP (30+ entidades relacionais).
  - Isolamento Multi-tenant estrito no backend (`tenantId` em todas as consultas).
  - Criptografia de senhas com `bcrypt` (12 rounds) e validação de complexidade mínima.
  - Controle de Sessões seguro (tokens criptográficos de 64 bytes com hash SHA-256 no banco).
  - Proteção contra Força Bruta (Lockout de 15 minutos após 5 tentativas incorretas).
  - Matriz RBAC para 7 perfis operacionais: `PROPRIETARIO`, `ADMINISTRADOR`, `GERENTE`, `RECEPCIONISTA`, `BARBEIRO`, `CAIXA`, `ESTOQUISTA`.
  - Serviço de Auditoria Imutável (`audit_logs`) com sanitização automática de credenciais.
  - Suíte de 20 testes automatizados com Vitest cobrindo 100% dos fluxos de segurança e autenticação.
  - Documentação técnica mestre: `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md` e `ROADMAP.md`.

---

### [x] FASE 2: Clientes (CRM), Serviços, Funcionários & Configurações
- **Objetivo**: Gestão completa das entidades base da barbearia.
- **Entregas**:
  - CRM de Clientes: cadastro completo, validação estrita de CPF com algoritmo matemático, higienização de telefones, acumulação determinística de métricas (total gasto, ticket médio, atendimentos, faltas e cancelamentos).
  - Catálogo de Serviços: categorias com cores e ordenação, cálculo determinístico de comissões (percentual, valor fixo, limite no teto do serviço e sobreposição por profissional).
  - Gestão de Funcionários & Barbeiros: controle de admissão, cargo, salário base, comissão padrão, chave Pix e validação de elegibilidade para agendamento na agenda.
  - Configurações da Barbearia: horários de funcionamento semanal, intervalos permitidos (15 a 60 min), tempo de tolerância para cancelamento grátis e buffers entre clientes.
  - Suíte de 21 testes automatizados no Vitest (Totalizando 41 testes no projeto).
  - Script DDL de migração para o Supabase/Lovable (`drizzle/migrations/0001_phase2_crm_services_employees.sql`).

---

### [x] FASE 3: Agenda, Motor de Disponibilidade & Agendamento Online
- **Objetivo**: Operação da agenda profissional e fluxo público para clientes.
- **Entregas**:
  - Motor de Disponibilidade Determinístico: cálculo milimétrico de slots livres baseado na duração, intervalos, bloqueios, folgas e agendamentos existentes (sem sobreposições).
  - Validação Anti-Sobreposição Rigorosa: garantia matemática de que serviços mais longos (ex: Corte + Barba de 60 min) não são agendados se colidirem com slots parciais ocupados.
  - Agenda Interna & Ciclo de Vida: máquina de estados finita com transições estritas (`AGENDADO` -> `CONFIRMADO` -> `AGUARDANDO` -> `EM_ATENDIMENTO` -> `CONCLUIDO`, `CANCELADO`, `NAO_COMPARECEU`).
  - Criação & Reagendamento com Rastreabilidade: geração de códigos amigáveis únicos (`#BH-XXXXXX`) e tokens criptográficos não previsíveis para a URL pública `/agendamento/:token`.
  - Fila de Espera Inteligente: matching determinístico de clientes por data civil, períodos do dia (`MANHA`, `TARDE`, `NOITE`, `QUALQUER`), compatibilidade de barbeiro e ordenação por prioridade.
  - Protocolo WhatsApp wa.me Oficial sem APIs Pagas: gerador de links universais com mensagens pré-formatadas para confirmação e cancelamento com link direto para consulta.
  - Suíte de 15 testes automatizados no Vitest (Totalizando 56 testes no projeto).
  - Script DDL de migração para o Supabase/Lovable (`drizzle/migrations/0002_phase3_appointments_schedule_waitinglist.sql`).

---

### [x] FASE 4: Atendimento, Frente de Caixa (PDV) & Caixa Diário
- **Objetivo**: Operação de atendimento ao vivo e fechamento financeiro imediato.
- **Entregas**:
  - PDV Rápido: inclusão de múltiplos itens (serviços e produtos), cálculo automático de subtotais e cálculo de comissões por item para cada colaborador responsável.
  - Controle de Descontos com Trava de Perfil: regras rígidas limitando descontos para operadores (10%), gerentes (25%) e liberação irrestrita para proprietários/administradores, impedindo descontos maiores que o subtotal.
  - Pagamentos Múltiplos & Divididos: suporte nativo a divisão de valores (ex: R$ 50 Pix + R$ 25 Dinheiro) e cálculo determinístico de troco em dinheiro.
  - Controle Diário de Caixa: abertura com fundo de troco, sangrias para cofre com validação de saldo físico em dinheiro, suprimentos com motivo obrigatório e fechamento cego com cálculo exato de conferência (conferência perfeita, quebra ou sobra de caixa).
  - Suíte de 14 testes automatizados no Vitest (Totalizando 70 testes no projeto).
  - Script DDL de migração para o Supabase/Lovable (`drizzle/migrations/0003_phase4_pos_cash_sales_payments.sql`).

---

### [x] FASE 5: Gestão Financeira, Comissões & Fluxo de Caixa
- **Objetivo**: Controle contábil completo e cálculo auditável de comissões.
- **Entregas**:
  - Motor de Comissões e Repasses: geração auditável vinculada a cada item de venda concluída, estorno automático quando a venda for cancelada (impedindo pagamento indevido), liquidação com registro de data/hora e espelho/extrato por barbeiro.
  - Contas a Pagar: controle de fornecedores, boletos, despesas fixas/variáveis, status automático de vencimento (`OVERDUE`) e liquidação segura.
  - Contas a Receber: controle de mensalidades de planos e parcelamentos futuros com liquidação auditada.
  - Fluxo de Caixa & DRE Operacional: cálculo determinístico de Receitas, Despesas, Comissões Pagas, Resultado Líquido e Saldo Final sem arredondamentos espúrios.
  - Suíte de 11 testes automatizados no Vitest (Totalizando 81 testes no projeto).
  - Script DDL de migração para o Supabase/Lovable (`drizzle/migrations/0004_phase5_financial_commissions_payables.sql`).

---

### [x] FASE 6: Estoque, Produtos, Fornecedores & Compras
- **Objetivo**: Controle rigoroso de estoque e compras.
- **Entregas**:
  - Catálogo de Produtos: custo, preço de venda, cálculo de margem bruta (R$ e %), estoque mínimo e alerta automático de reposição (`isLowStock`).
  - Movimentações de Estoque Rastreáveis: entradas (`INBOUND`), vendas no PDV (`SALE`), consumo de bancada (`CONSUMPTION`), perdas/avarias (`LOSS`), ajustes de inventário (`ADJUSTMENT`) e devoluções (`RETURN`), com trava impedindo saldo negativo acidental.
  - Gestão de Fornecedores & Ordens de Compra: cadastro de fornecedores com chave Pix/dados fiscais e criação de ordens de compra (`PC-XXXXXX`).
  - Recebimento Integrado: ao receber a ordem de compra, o sistema gera automaticamente as entradas físicas no estoque e lança a respectiva fatura no Contas a Pagar (`AccountPayable`).
  - Suíte de 10 testes automatizados no Vitest (Totalizando 91 testes no projeto).
  - Script DDL de migração para o Supabase/Lovable (`drizzle/migrations/0005_phase6_stock_products_suppliers_purchases.sql`).

---

### [x] FASE 7: Fidelidade, Planos de Assinatura, Cupons & Promoções
- **Objetivo**: Retenção e fidelização de clientes.
- **Entregas**:
  - Sistema de Pontos / Fidelidade: conversão determinística de consumo em pontos (R$ 1,00 = 1 ponto), extrato histórico de créditos e débitos, e catálogo de recompensas com trava de saldo de pontos.
  - Planos & Clubes de Assinatura: planos recorrentes (ex: Barber Black - 2 cortes + 2 barbas por mês), controle de vigência do ciclo e trava ao esgotar as cotas contratadas.
  - Cupons & Promoções Server-Side: cupons percentuais ou de valor fixo, validação de período de vigência, limites máximos de utilização e valor mínimo do pedido.
  - Suíte de 10 testes automatizados no Vitest (Totalizando 101 testes no projeto).
  - Script DDL de migração para o Supabase/Lovable (`drizzle/migrations/0006_phase7_loyalty_plans_coupons.sql`).

---

### [x] FASE 8: Dashboard Executivo, Relatórios & Auditoria Visual
- **Objetivo**: Inteligência de negócio e transparência operacional.
- **Entregas**:
  - Dashboard em tempo real: faturamento do dia, quantidade de atendimentos, agendamentos, cancelamentos, faltas, ticket médio, clientes novos vs recorrentes e taxa de ocupação da agenda.
  - Alertas Determinísticos: detecção em tempo real de caixa fechado, estoque baixo, horários ociosos, clientes aguardando na recepção, contas a pagar vencidas e clientes inativos (> 45 dias).
  - Relatórios Especializados: Vendas (serviços vs produtos, ranking e formas de pagamento), Clientes (LTV, retenção, novos vs recorrentes, inatividade), Funcionários (faturamento individual, comissões acumuladas, cancelamentos), Agenda (taxa de ocupação real e horários de pico), Financeiro DRE Operacional determinístico (Receitas brutas, descontos, CMV, comissões, despesas e resultado líquido exato sem erros de float) e Estoque (valorização a custo/varejo, movimentações e itens críticos).
  - Painel de Auditoria Visual (`audit_logs`): motor de busca avançado com isolamento multi-tenant obrigatório, filtros por ação, entidade, data, usuário, paginação determinística e humanização de logs.
  - Suíte de 10 testes automatizados no Vitest (Totalizando 111 testes no projeto).

---

### [x] FASE 9: PWA, Responsividade & Refinamento Visual
- **Objetivo**: Experiência de aplicativo nativo e refinamento de interface.
- **Entregas**:
  - Configuração PWA Completa: Web App Manifest (`public/manifest.json`), Service Worker (`public/sw.js`) com cache estático versionado (`barberhub-static-v1`), fallback offline para navegação e ícones de alta resolução (192x192, 512x512, maskable e SVG vetorial).
  - Gerenciador de Ciclo de Vida PWA (`src/lib/pwa.ts`): captura do evento `beforeinstallprompt`, gatilhos para instalação e monitoramento reativo de conexão online/offline.
  - Motor de Responsividade & Dispositivos (`src/lib/responsive.ts`): classificação determinística de Mobile (< 768px), Tablet (768px - 1023px) e Desktop (>= 1024px), validação de alvos de toque (touch targets >= 44x44px) e adaptador dinâmico de visualização da agenda (`TIMELINE_VERTICAL`, `COLUMNS_SWIPE`, `MULTI_BARBER_GRID`).
  - Mapeamento de Atalhos de Teclado no PDV: aceleração de atendimento no balcão com atalhos determinísticos (`F2` nova venda, `F4` finalizar pagamento, `F8` sangria/suprimento, `F9` buscar cliente, `F10` cupom, `Escape` cancelar).
  - Agendamento Online Mobile-First (`src/lib/mobile-booking.ts`): máquina de estados progressiva em wizard sem recarregamento de página (Serviço -> Barbeiro -> Data/Hora -> Dados do Cliente -> Confirmação).
  - Timeline Mobile do Barbeiro: cartões cronológicos compactos com badges de status táteis, ações rápidas de início/término e link oficial `wa.me` sem uso de APIs pagas.
  - Suíte de 10 testes automatizados no Vitest (Totalizando 121 testes no projeto).

---

### [x] FASE 10: Auditoria Geral de Segurança, Testes de Carga & Preparação SaaS
- **Objetivo**: Blindagem final, alta performance e preparação para o ecossistema SaaS.
- **Entregas**:
  - Blindagem Geral de Segurança (`src/server/security/security-audit.service.ts`):
    - Sanitização recursiva em respostas de API (`sanitizeApiResponse`) garantindo zero vazamento de senhas, hashes, chaves privadas ou tokens.
    - Imposição estrita de isolamento multi-tenant (`enforceTenantIsolation`) anti-IDOR.
    - Validação de permissão multi-unidade (`enforceUnitAccess`) garantindo isolamento entre filiais.
    - Detector determinístico de injeção de código (SQL Injection e XSS) com regex de proteção em profundidade.
    - Política rigorosa de senhas corporativas (mínimo 8 dígitos, maiúsculas, minúsculas, números e caracteres especiais).
  - Motor de Entitlements & Preparação SaaS (`src/server/saas/entitlements.service.ts`):
    - Arquitetura isolada contendo `tenantId`, `unitId`, `userId`, `subscriptionId`, `planId` e `features` (Section 4 do Prompt Mestre).
    - Planos determinísticos (`STARTER`, `PROFESSIONAL`, `ENTERPRISE`) com limites de funcionários, filiais e controle de features ativas (`ONLINE_BOOKING`, `LOYALTY_PROGRAM`, `SUBSCRIPTION_CLUBS`, `ADVANCED_REPORTS`, `MULTI_UNIT`).
  - Benchmarks de Performance & Carga:
    - Execução de 1.000 validações de conflito de agenda em menos de 100ms.
    - Processamento de 5.000 cálculos de DRE financeiro em lote em menos de 100ms com precisão decimal exata.
  - Critérios de Conclusão (Section 48) Atendidos:
    - Zero botões falsos ou rotas quebradas.
    - Zero dados falsos ou temporários residuais em produção.
    - 10 suítes de testes cobrindo 100% dos módulos críticos com 131 testes automatizados passando.
