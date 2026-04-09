-- ============================================================================
-- Copilot Contábil IA — Trigger de Auto-Provisioning
-- Quando um usuário faz login via Google Workspace pela primeira vez,
-- este trigger cria automaticamente o perfil e a organização no banco.
-- Execute no SQL Editor do Supabase.
-- ============================================================================

-- 1. Criar a função trigger
create or replace function public.handle_new_user()
returns trigger as $$
declare
  org_id uuid;
  user_domain text;
  user_full_name text;
  user_avatar text;
begin
  -- Extrair domínio do email
  user_domain := split_part(new.email, '@', 2);

  -- Verificar se é do domínio autorizado
  if user_domain != 'mendoncagalvao.com.br' then
    return new;
  end if;

  -- Extrair nome e avatar do metadata do Google
  user_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  user_avatar := new.raw_user_meta_data->>'avatar_url';

  -- Buscar ou criar organização
  select id into org_id
  from public.organizations
  where email = 'contato@' || user_domain;

  if org_id is null then
    insert into public.organizations (name, email)
    values ('Mendonça Galvão Contadores', 'contato@' || user_domain)
    returning id into org_id;
  end if;

  -- Criar perfil (se não existir)
  insert into public.profiles (id, organization_id, full_name, role, avatar_url)
  values (new.id, org_id, user_full_name, 'analista', user_avatar)
  on conflict (id) do update set
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url;

  return new;
end;
$$ language plpgsql security definer;

-- 2. Dropar trigger antigo se existir
drop trigger if exists on_auth_user_created on auth.users;

-- 3. Criar o trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Garantir permissões
grant usage on schema public to supabase_auth_admin;
grant all on public.organizations to supabase_auth_admin;
grant all on public.profiles to supabase_auth_admin;

-- 5. Recarregar schema
notify pgrst, 'reload schema';

select 'Trigger de auto-provisioning criado com sucesso.' as status;
