CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TABLE public.tenants (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, name text NOT NULL, slug text NOT NULL UNIQUE, document text, phone text, email text, status text NOT NULL DEFAULT 'ACTIVE', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.units (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE, name text NOT NULL, address text, phone text, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX units_tenant_id_idx ON public.units(tenant_id);
CREATE TABLE public.users (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE, unit_id text REFERENCES public.units(id) ON DELETE SET NULL, name text NOT NULL, email text NOT NULL, phone text, password_hash text NOT NULL, status text NOT NULL DEFAULT 'ACTIVE', failed_attempts int NOT NULL DEFAULT 0, locked_until timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (tenant_id, email));
CREATE INDEX users_tenant_id_idx ON public.users(tenant_id);
CREATE TABLE public.roles (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, tenant_id text REFERENCES public.tenants(id) ON DELETE CASCADE, name text NOT NULL, slug text NOT NULL, description text, is_system boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE NULLS NOT DISTINCT (tenant_id, slug));
CREATE TABLE public.permissions (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, code text NOT NULL UNIQUE, name text NOT NULL, module text NOT NULL, description text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.role_permissions (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, role_id text NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE, permission_id text NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE, UNIQUE (role_id, permission_id));
CREATE TABLE public.user_roles (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, role_id text NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE, UNIQUE (user_id, role_id));
CREATE TABLE public.sessions (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE, token_hash text NOT NULL UNIQUE, ip_address text, user_agent text, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX sessions_user_id_idx ON public.sessions(user_id);
CREATE INDEX sessions_tenant_id_idx ON public.sessions(tenant_id);
CREATE TABLE public.audit_logs (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE, unit_id text REFERENCES public.units(id) ON DELETE SET NULL, user_id text REFERENCES public.users(id) ON DELETE SET NULL, action text NOT NULL, entity text NOT NULL, entity_id text, old_values text, new_values text, ip_address text, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX audit_logs_tenant_id_idx ON public.audit_logs(tenant_id);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs(entity, entity_id);

GRANT ALL ON public.tenants, public.units, public.users, public.roles, public.permissions, public.role_permissions, public.user_roles, public.sessions, public.audit_logs TO service_role;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER units_updated_at BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();