-- Casa Mamãe Margarida | Run once in the SQL Editor of a new Supabase project.
begin;
create extension if not exists pgcrypto;

create table public.perfis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 3 and 250),
  email text not null check (length(email) between 3 and 254),
  cargo text,
  role text not null default 'funcionario' check (role in ('admin','funcionario')),
  created_at timestamptz not null default now()
);
create table public.servicos (
  id uuid primary key default gen_random_uuid(), nome text not null check(length(trim(nome)) between 3 and 250),
  descricao text not null check(length(descricao) between 3 and 4000), imagem_url text,
  data_inicio date, data_fim date,
  status text not null default 'Inscrições abertas' check(status in ('Inscrições abertas','Em breve','Em andamento','Encerrado')),
  ativo boolean not null default true, created_at timestamptz not null default now(),
  check(data_fim is null or data_inicio is null or data_fim >= data_inicio)
);
create or replace function public.cpf_valido(cpf text) returns boolean
language plpgsql immutable set search_path = '' as $$
declare soma integer; digito integer; tamanho integer; i integer;
begin
  if cpf is null or cpf !~ '^[0-9]{11}$' or cpf ~ '^([0-9])\1{10}$' then return false; end if;
  for tamanho in 9..10 loop
    soma := 0;
    for i in 1..tamanho loop soma := soma + substring(cpf from i for 1)::integer * (tamanho + 2 - i); end loop;
    digito := ((soma * 10) % 11) % 10;
    if digito <> substring(cpf from tamanho + 1 for 1)::integer then return false; end if;
  end loop;
  return true;
end $$;
create table public.beneficiarias (
  id uuid primary key default gen_random_uuid(),
  nome text not null check(length(trim(nome)) between 3 and 250),
  data_nascimento date not null check(data_nascimento <= current_date),
  cpf text not null check(public.cpf_valido(cpf)),
  telefone text not null check(telefone ~ '^[0-9()+ .-]{10,20}$'),
  email text check(email is null or (length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  endereco text not null check(length(trim(endereco)) between 1 and 250),
  bairro text not null check(length(trim(bairro)) between 1 and 250),
  cidade text not null check(length(trim(cidade)) between 1 and 250),
  motivo_atendimento text not null check(length(trim(motivo_atendimento)) between 1 and 4000),
  tipo_atendimento text not null check(length(tipo_atendimento) between 1 and 250),
  observacoes text check(length(observacoes) <= 4000),
  consentimento boolean not null check(consentimento = true),
  consentimento_em timestamptz not null default now(),
  status text not null default 'Pendente' check(status in ('Pendente','Em análise','Em atendimento','Finalizado')),
  created_at timestamptz not null default now()
);
create table public.atendimentos (
  id uuid primary key default gen_random_uuid(),
  beneficiaria_id uuid not null references public.beneficiarias(id) on delete restrict,
  funcionario_id uuid references auth.users(id) on delete set null,
  tipo_atendimento text not null check(length(tipo_atendimento) between 1 and 250),
  data_atendimento timestamptz not null,
  descricao text not null check(length(descricao) between 1 and 4000),
  observacao text check(length(observacao) <= 4000),
  status text not null default 'Pendente' check(status in ('Pendente','Em análise','Em atendimento','Finalizado')),
  created_at timestamptz not null default now()
);
create table public.projetos (
  id uuid primary key default gen_random_uuid(), nome text not null check(length(trim(nome)) between 3 and 250),
  descricao text not null check(length(descricao) between 3 and 4000), data_inicio date not null, data_fim date,
  imagem_url text, status text not null default 'Ativo' check(status in ('Ativo','Planejado','Concluído','Inativo')),
  created_at timestamptz not null default now(), check(data_fim is null or data_fim >= data_inicio)
);
create table public.doacoes (
  id uuid primary key default gen_random_uuid(), nome_doador text not null check(length(trim(nome_doador)) between 3 and 250),
  telefone text not null check(telefone ~ '^[0-9()+ .-]{10,20}$'),
  email text check(email is null or (length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  tipo_doacao text not null check(tipo_doacao in ('Pix','Alimentos','Roupas','Produtos de higiene','Materiais escolares','Voluntariado','Outros')),
  descricao text not null check(length(trim(descricao)) between 1 and 4000), data_prevista date,
  status text not null default 'Pendente' check(status in ('Pendente','Confirmada','Recebida','Cancelada')),
  consentimento boolean not null check(consentimento = true), consentimento_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table public.mensagens (
  id uuid primary key default gen_random_uuid(), nome text not null check(length(trim(nome)) between 3 and 250),
  email text not null check(length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  telefone text check(telefone is null or telefone ~ '^[0-9()+ .-]{10,20}$'),
  assunto text not null check(length(trim(assunto)) between 1 and 250),
  mensagem text not null check(length(trim(mensagem)) between 1 and 4000),
  lida boolean not null default false, consentimento boolean not null check(consentimento = true),
  consentimento_em timestamptz not null default now(), created_at timestamptz not null default now()
);

create index beneficiarias_status_created_idx on public.beneficiarias(status, created_at);
create index beneficiarias_cpf_idx on public.beneficiarias(cpf);
create index atendimentos_beneficiaria_idx on public.atendimentos(beneficiaria_id);
create index atendimentos_funcionario_idx on public.atendimentos(funcionario_id);
create index atendimentos_data_status_idx on public.atendimentos(data_atendimento, status);
create index projetos_status_idx on public.projetos(status);
create index servicos_ativo_idx on public.servicos(ativo);
create index doacoes_status_idx on public.doacoes(status, created_at);
create index mensagens_lida_idx on public.mensagens(lida, created_at);

-- SECURITY DEFINER prevents profile-policy recursion. No user metadata is trusted.
create function public.equipe_role() returns text language sql stable security definer
set search_path = '' as $$ select role from public.perfis where user_id = (select auth.uid()) $$;
revoke all on function public.equipe_role() from public;
grant execute on function public.equipe_role() to anon, authenticated;

alter table public.perfis enable row level security;
alter table public.beneficiarias enable row level security;
alter table public.atendimentos enable row level security;
alter table public.servicos enable row level security;
alter table public.projetos enable row level security;
alter table public.doacoes enable row level security;
alter table public.mensagens enable row level security;

revoke all on public.perfis, public.beneficiarias, public.atendimentos, public.servicos, public.projetos, public.doacoes, public.mensagens from anon, authenticated;
grant select on public.servicos, public.projetos to anon;
-- Public callers cannot specify status, timestamps, IDs, or read back personal data.
grant insert (nome,data_nascimento,cpf,telefone,email,endereco,bairro,cidade,motivo_atendimento,tipo_atendimento,observacoes,consentimento) on public.beneficiarias to anon;
grant insert (nome_doador,telefone,email,tipo_doacao,descricao,data_prevista,consentimento) on public.doacoes to anon;
grant insert (nome,email,telefone,assunto,mensagem,consentimento) on public.mensagens to anon;
grant select,insert,update,delete on public.perfis, public.beneficiarias, public.atendimentos, public.servicos, public.projetos, public.doacoes, public.mensagens to authenticated;

create policy perfil_leitura on public.perfis for select to authenticated using (user_id = (select auth.uid()) or (select public.equipe_role()) = 'admin');
create policy perfil_criar on public.perfis for insert to authenticated with check ((select public.equipe_role()) = 'admin');
-- Prevent self-demotion/deletion; initial and own admin provisioning is done in SQL Editor.
create policy perfil_editar on public.perfis for update to authenticated using ((select public.equipe_role()) = 'admin' and user_id <> (select auth.uid())) with check ((select public.equipe_role()) = 'admin' and user_id <> (select auth.uid()));
create policy perfil_excluir on public.perfis for delete to authenticated using ((select public.equipe_role()) = 'admin' and user_id <> (select auth.uid()));

create policy servicos_ler on public.servicos for select to anon, authenticated using (ativo or (select public.equipe_role()) in ('admin','funcionario'));
create policy servicos_gerir on public.servicos for all to authenticated using ((select public.equipe_role()) = 'admin') with check ((select public.equipe_role()) = 'admin');
create policy projetos_ler on public.projetos for select to anon, authenticated using (status = 'Ativo' or (select public.equipe_role()) in ('admin','funcionario'));
create policy projetos_gerir on public.projetos for all to authenticated using ((select public.equipe_role()) = 'admin') with check ((select public.equipe_role()) = 'admin');

create policy beneficiarias_solicitar on public.beneficiarias for insert to anon, authenticated with check (consentimento and status = 'Pendente' and created_at = now() and consentimento_em = now());
create policy beneficiarias_ler on public.beneficiarias for select to authenticated using ((select public.equipe_role()) in ('admin','funcionario'));
create policy beneficiarias_status on public.beneficiarias for update to authenticated using ((select public.equipe_role()) in ('admin','funcionario')) with check ((select public.equipe_role()) in ('admin','funcionario'));
create policy beneficiarias_excluir on public.beneficiarias for delete to authenticated using ((select public.equipe_role()) = 'admin');
create policy atendimentos_ler on public.atendimentos for select to authenticated using ((select public.equipe_role()) in ('admin','funcionario'));
create policy atendimentos_criar on public.atendimentos for insert to authenticated with check ((select public.equipe_role()) = 'admin' or ((select public.equipe_role()) = 'funcionario' and funcionario_id = (select auth.uid())));
create policy atendimentos_editar on public.atendimentos for update to authenticated using ((select public.equipe_role()) in ('admin','funcionario')) with check ((select public.equipe_role()) in ('admin','funcionario'));
create policy atendimentos_excluir on public.atendimentos for delete to authenticated using ((select public.equipe_role()) = 'admin');

create policy doacoes_enviar on public.doacoes for insert to anon, authenticated with check (consentimento and status = 'Pendente' and created_at = now() and consentimento_em = now());
create policy doacoes_admin on public.doacoes for all to authenticated using ((select public.equipe_role()) = 'admin') with check ((select public.equipe_role()) = 'admin');
create policy mensagens_enviar on public.mensagens for insert to anon, authenticated with check (consentimento and not lida and created_at = now() and consentimento_em = now());
create policy mensagens_admin on public.mensagens for all to authenticated using ((select public.equipe_role()) = 'admin') with check ((select public.equipe_role()) = 'admin');

-- Employees can change request status only, not identity or consent data.
create function public.proteger_registro() returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.role()) = 'authenticated' then
    if new.id is distinct from old.id or new.created_at is distinct from old.created_at then raise exception 'Identidade do registro imutável'; end if;
    if tg_table_name = 'beneficiarias' and (select public.equipe_role()) = 'funcionario' and (to_jsonb(new) - 'status') is distinct from (to_jsonb(old) - 'status') then raise exception 'Funcionários podem atualizar somente o status da solicitação'; end if;
    if tg_table_name = 'atendimentos' then
      if new.beneficiaria_id is distinct from old.beneficiaria_id or new.funcionario_id is distinct from old.funcionario_id then raise exception 'Vínculos do atendimento são imutáveis'; end if;
    end if;
    if tg_table_name = 'perfis' then
      if new.user_id is distinct from old.user_id then raise exception 'Vínculo do perfil imutável'; end if;
    end if;
  end if;
  return new;
end $$;
create trigger proteger_beneficiaria before update on public.beneficiarias for each row execute function public.proteger_registro();
create trigger proteger_atendimento before update on public.atendimentos for each row execute function public.proteger_registro();
create trigger proteger_perfil before update on public.perfis for each row execute function public.proteger_registro();

-- One PRIVATE bucket. Only editorial folders have public SELECT policies.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('casa-mamae-margarida','casa-mamae-margarida',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']);
create policy imagens_editoriais_ler on storage.objects for select to anon, authenticated using (bucket_id = 'casa-mamae-margarida' and (storage.foldername(name))[1] in ('projetos','servicos','institucional'));
create policy documentos_equipe_ler on storage.objects for select to authenticated using (bucket_id = 'casa-mamae-margarida' and (storage.foldername(name))[1] = 'documentos' and (select public.equipe_role()) in ('admin','funcionario'));
create policy arquivos_admin_criar on storage.objects for insert to authenticated with check (bucket_id = 'casa-mamae-margarida' and (select public.equipe_role()) = 'admin' and ((storage.foldername(name))[1] = 'documentos' or ((storage.foldername(name))[1] in ('projetos','servicos','institucional') and lower(storage.extension(name)) in ('jpg','jpeg','png','webp') and metadata->>'mimetype' in ('image/jpeg','image/png','image/webp'))));
create policy arquivos_admin_excluir on storage.objects for delete to authenticated using (bucket_id = 'casa-mamae-margarida' and (select public.equipe_role()) = 'admin');
commit;
