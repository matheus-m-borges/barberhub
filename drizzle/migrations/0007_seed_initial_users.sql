-- Inserir Tenant Principal
INSERT INTO public.tenants (id, name, slug, email, status)
VALUES ('tenant_matriz', 'BarberHub Studio & Lounge', 'barberhub-matriz', 'contato@barberhub.com', 'ACTIVE')
ON CONFLICT (slug) DO NOTHING;

-- Inserir Unidade Matriz
INSERT INTO public.units (id, tenant_id, name, address, is_active)
VALUES ('unit_matriz', 'tenant_matriz', 'Matriz — Centro', 'Av. Paulista, 1000 - São Paulo/SP', true)
ON CONFLICT (id) DO NOTHING;

-- Inserir Perfis Padrão (RBAC)
INSERT INTO public.roles (id, tenant_id, name, slug, description, is_system)
VALUES
  ('role_proprietario', 'tenant_matriz', 'Proprietário', 'PROPRIETARIO', 'Acesso total e irrestrito ao sistema', true),
  ('role_administrador', 'tenant_matriz', 'Administrador', 'ADMINISTRADOR', 'Gestão administrativa e operacional', true),
  ('role_gerente', 'tenant_matriz', 'Gerente', 'GERENTE', 'Supervisão de equipe, agenda e PDV', true),
  ('role_barbeiro', 'tenant_matriz', 'Barbeiro', 'BARBEIRO', 'Atendimento ao cliente e visualização de comissões', true),
  ('role_caixa', 'tenant_matriz', 'Operador de Caixa', 'CAIXA', 'Abertura, fechamento e recebimento no PDV', true),
  ('role_recepcionista', 'tenant_matriz', 'Recepcionista', 'RECEPCIONISTA', 'Recepção, agendamento e check-in', true),
  ('role_estoquista', 'tenant_matriz', 'Estoquista', 'ESTOQUISTA', 'Controle físico de produtos e compras', true)
ON CONFLICT DO NOTHING;

-- Inserir Usuário Administrador / Proprietário
-- Email: admin@barberhub.com | Senha: Admin@2026
INSERT INTO public.users (id, tenant_id, unit_id, name, email, password_hash, status)
VALUES ('usr_admin', 'tenant_matriz', 'unit_matriz', 'Matheus (Proprietário)', 'admin@barberhub.com', '$2b$10$T2Py8xD11214.wNiZk6He./tTzm7QqEWxf7CuyH5G654QAXzoDA9O', 'ACTIVE')
ON CONFLICT (tenant_id, email) DO NOTHING;

-- Vincular Role de Proprietário
INSERT INTO public.user_roles (user_id, role_id)
VALUES ('usr_admin', 'role_proprietario')
ON CONFLICT DO NOTHING;
