-- Executar UMA VEZ, depois de database/supabase.sql, no SQL Editor.
-- Migração aditiva: preserva cadastros, status antigos e observações da equipe.
begin;
alter table public.perfis drop constraint perfis_role_check;
alter table public.perfis add constraint perfis_role_check check (role in ('admin','funcionario','usuario'));
alter table public.perfis alter column role set default 'usuario';
alter table public.perfis
  add column data_nascimento date check(data_nascimento <= current_date),
  add column cpf text check(cpf is null or public.cpf_valido(cpf)),
  add column telefone text check(telefone is null or telefone ~ '^[0-9()+ .-]{10,20}$'),
  add column foto_url text;

alter table public.beneficiarias add column usuario_id uuid unique references auth.users(id) on delete set null;
-- Cadastro de conta não exige um pedido de atendimento/endereço fictício.
alter table public.beneficiarias alter column endereco drop not null;
alter table public.beneficiarias alter column bairro drop not null;
alter table public.beneficiarias alter column cidade drop not null;
alter table public.beneficiarias alter column motivo_atendimento drop not null;
alter table public.beneficiarias alter column tipo_atendimento drop not null;
-- O formulário público anterior continua exigindo os seus campos originais.
drop policy beneficiarias_solicitar on public.beneficiarias;
create policy beneficiarias_solicitar on public.beneficiarias for insert to anon, authenticated
with check (usuario_id is null and consentimento and status = 'Pendente' and created_at = now()
  and consentimento_em = now() and endereco is not null and bairro is not null and cidade is not null
  and motivo_atendimento is not null and tipo_atendimento is not null);

-- Profissionais podem trabalhar na instituição sem possuir conta de acesso à equipe.
create table public.profissionais (
  id uuid primary key default gen_random_uuid(),
  nome text not null check(length(trim(nome)) between 3 and 250),
  especialidade text not null check(length(trim(especialidade)) between 3 and 250),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.solicitacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfis(user_id) on delete restrict,
  servico_id uuid not null references public.servicos(id) on delete restrict,
  motivo text not null check(length(trim(motivo)) between 3 and 4000),
  data_preferencia date not null,
  horario_preferencia time not null,
  observacoes text check(length(observacoes) <= 4000),
  status text not null default 'Pendente' check(status in ('Pendente','Em análise','Aprovada','Recusada','Concluída')),
  created_at timestamptz not null default now()
);
create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  mensagem text not null,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);
create index solicitacoes_usuario_data_idx on public.solicitacoes(usuario_id,created_at);
create index solicitacoes_servico_idx on public.solicitacoes(servico_id);
create index notificacoes_usuario_lida_idx on public.notificacoes(usuario_id,lida);

alter table public.atendimentos
  add column profissional_id uuid references public.profissionais(id) on delete restrict,
  add column solicitacao_id uuid references public.solicitacoes(id) on delete restrict,
  add column local text check(length(local) <= 250),
  add column observacao_usuario text check(length(observacao_usuario) <= 4000);
-- descricao e observacao existentes são internas. Não são retornadas à usuária.
alter table public.atendimentos drop constraint atendimentos_status_check;
alter table public.atendimentos add constraint atendimentos_status_check check(status in
  ('Pendente','Em análise','Em atendimento','Finalizado','Agendada','Confirmada','Realizada','Cancelada','Reagendada'));
create index atendimentos_profissional_idx on public.atendimentos(profissional_id);
create index atendimentos_solicitacao_idx on public.atendimentos(solicitacao_id);

alter table public.profissionais enable row level security;
alter table public.solicitacoes enable row level security;
alter table public.notificacoes enable row level security;
revoke all on public.profissionais,public.solicitacoes,public.notificacoes from anon,authenticated;
grant select,insert,update,delete on public.profissionais to authenticated;
grant select,insert,update on public.solicitacoes to authenticated;
grant select on public.notificacoes to authenticated;
grant update(lida) on public.notificacoes to authenticated;

create policy profissionais_equipe on public.profissionais for select to authenticated
using ((select public.equipe_role()) in ('admin','funcionario'));
create policy profissionais_admin on public.profissionais for all to authenticated
using ((select public.equipe_role()) = 'admin') with check ((select public.equipe_role()) = 'admin');
create policy solicitacoes_proprias on public.solicitacoes for select to authenticated
using (usuario_id = (select auth.uid()) or (select public.equipe_role()) in ('admin','funcionario'));
-- Não libera SELECT da usuária na tabela interna de beneficiárias.
create function public.possui_cadastro_usuario() returns boolean language sql stable security definer
set search_path = '' as $$ select exists(select 1 from public.beneficiarias where usuario_id=(select auth.uid())) $$;
revoke all on function public.possui_cadastro_usuario() from public;
grant execute on function public.possui_cadastro_usuario() to authenticated;
create policy solicitacoes_enviar on public.solicitacoes for insert to authenticated
with check (usuario_id = (select auth.uid()) and (select public.equipe_role()) = 'usuario'
  and status = 'Pendente' and created_at = now() and data_preferencia >= current_date
  and exists(select 1 from public.servicos s where s.id=servico_id and s.ativo)
  and (select public.possui_cadastro_usuario()));
create policy solicitacoes_equipe_atualizar on public.solicitacoes for update to authenticated
using ((select public.equipe_role()) in ('admin','funcionario'))
with check ((select public.equipe_role()) in ('admin','funcionario'));
create policy notificacoes_proprias on public.notificacoes for select to authenticated using(usuario_id=(select auth.uid()));
create policy notificacoes_marcar_lida on public.notificacoes for update to authenticated
using(usuario_id=(select auth.uid())) with check(usuario_id=(select auth.uid()));

create policy perfil_usuario_editar on public.perfis for update to authenticated
using(user_id=(select auth.uid()) and role='usuario') with check(user_id=(select auth.uid()) and role='usuario');
create function public.proteger_perfil_usuario() returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.role())='authenticated' and (select public.equipe_role())='usuario' then
    if (to_jsonb(new)-array['telefone','foto_url']) is distinct from (to_jsonb(old)-array['telefone','foto_url']) then
      raise exception 'Somente telefone e foto podem ser alterados';
    end if;
    if new.foto_url is not null and new.foto_url not like ('avatares/' || auth.uid()::text || '/%') then
      raise exception 'A foto deve pertencer à sua conta';
    end if;
  end if;
  return new;
end $$;
create trigger proteger_perfil_usuario before update on public.perfis for each row execute function public.proteger_perfil_usuario();
create function public.sincronizar_telefone_usuario() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role='usuario' and new.telefone is distinct from old.telefone and new.telefone is not null then
    update public.beneficiarias set telefone=new.telefone where usuario_id=new.user_id;
  end if;
  return new;
end $$;
revoke all on function public.sincronizar_telefone_usuario() from public;
create trigger sincronizar_telefone_usuario after update on public.perfis for each row execute function public.sincronizar_telefone_usuario();

-- O cadastro é atômico com Auth; nunca confia no role enviado em user_metadata.
create function public.criar_perfil_publico() returns trigger language plpgsql security definer set search_path = '' as $$
declare m jsonb := coalesce(new.raw_user_meta_data,'{}'::jsonb);
  cadastro boolean := coalesce(m->>'cadastro_cmm','')='true';
begin
  if cadastro then
    if coalesce(m->>'consentimento','') <> 'true' or not public.cpf_valido(m->>'cpf')
      or m->>'data_nascimento' is null or m->>'telefone' is null or m->>'nome' is null then
      raise exception 'Dados do cadastro ou consentimento inválidos';
    end if;
  end if;
  insert into public.perfis(user_id,nome,email,role,data_nascimento,cpf,telefone)
  values(new.id,coalesce(nullif(trim(m->>'nome'),''),'Usuária'),new.email,'usuario',
    case when cadastro then (m->>'data_nascimento')::date end,
    case when cadastro then m->>'cpf' end,case when cadastro then m->>'telefone' end);
  if cadastro then
    insert into public.beneficiarias(usuario_id,nome,data_nascimento,cpf,telefone,email,consentimento)
    values(new.id,m->>'nome',(m->>'data_nascimento')::date,m->>'cpf',m->>'telefone',new.email,true);
    insert into public.notificacoes(usuario_id,titulo,mensagem)
    values(new.id,'Bem-vinda à Casa','Sua conta foi criada. Você já pode acompanhar seus pedidos por aqui.');
  end if;
  return new;
end $$;
revoke all on function public.criar_perfil_publico() from public;
create trigger cmm_criar_perfil_publico after insert on auth.users for each row execute function public.criar_perfil_publico();

-- Projeção segura: nenhum SELECT da usuária é liberado na tabela interna de atendimentos.
-- auth.uid() vem da sessão verificada pelo Supabase, nunca de um parâmetro de URL.
create function public.minhas_consultas() returns table(
  id uuid,tipo_atendimento text,profissional text,data_atendimento timestamptz,local text,status text,observacao_usuario text
) language sql stable security definer set search_path = '' as $$
  select a.id,a.tipo_atendimento,coalesce(p.nome,f.nome,'A confirmar'),a.data_atendimento,a.local,
    case a.status when 'Finalizado' then 'Realizada' when 'Em atendimento' then 'Confirmada'
      when 'Pendente' then 'Agendada' when 'Em análise' then 'Agendada' else a.status end,
    a.observacao_usuario
  from public.atendimentos a join public.beneficiarias b on b.id=a.beneficiaria_id
  left join public.profissionais p on p.id=a.profissional_id
  left join public.perfis f on f.user_id=a.funcionario_id
  where b.usuario_id=(select auth.uid()) and (select public.equipe_role())='usuario'
  order by a.data_atendimento desc,a.id
$$;
revoke all on function public.minhas_consultas() from public;
grant execute on function public.minhas_consultas() to authenticated;

create function public.minhas_solicitacoes() returns table(
  id uuid,servico text,motivo text,data_preferencia date,horario_preferencia time,observacoes text,status text,created_at timestamptz
) language sql stable security definer set search_path = '' as $$
  select s.id,v.nome,s.motivo,s.data_preferencia,s.horario_preferencia,s.observacoes,s.status,s.created_at
  from public.solicitacoes s join public.servicos v on v.id=s.servico_id
  where s.usuario_id=(select auth.uid()) and (select public.equipe_role())='usuario'
  order by s.created_at desc,s.id
$$;
revoke all on function public.minhas_solicitacoes() from public;
grant execute on function public.minhas_solicitacoes() to authenticated;

create function public.proteger_solicitacao() returns trigger language plpgsql set search_path = '' as $$
begin
  if (to_jsonb(new)-'status') is distinct from (to_jsonb(old)-'status') then
    raise exception 'Somente o status da solicitação pode ser alterado';
  end if;
  return new;
end $$;
create trigger proteger_solicitacao before update on public.solicitacoes for each row execute function public.proteger_solicitacao();
create function public.validar_agendamento() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='UPDATE' then
    if new.solicitacao_id is distinct from old.solicitacao_id then raise exception 'Vínculo da solicitação imutável'; end if;
  end if;
  if new.solicitacao_id is not null and not exists(
    select 1 from public.solicitacoes s join public.beneficiarias b on b.usuario_id=s.usuario_id
    where s.id=new.solicitacao_id and b.id=new.beneficiaria_id and s.status in ('Aprovada','Concluída')
  ) then raise exception 'A solicitação deve estar aprovada e pertencer à beneficiária'; end if;
  return new;
end $$;
create trigger validar_agendamento before insert or update on public.atendimentos for each row execute function public.validar_agendamento();

-- Notificações persistentes geradas no banco, inclusive para alterações fora da interface.
create function public.notificar_solicitacao() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.notificacoes(usuario_id,titulo,mensagem)
    values(new.usuario_id,'Atualização da solicitação','Sua solicitação está com o status: '||new.status||'.');
  end if;
  return new;
end $$;
create trigger notificar_solicitacao after update on public.solicitacoes for each row execute function public.notificar_solicitacao();
create function public.notificar_consulta() returns trigger language plpgsql security definer set search_path = '' as $$
declare destinataria uuid;
begin
  if tg_op='UPDATE' then
    if new.status is not distinct from old.status and new.data_atendimento is not distinct from old.data_atendimento
      and new.profissional_id is not distinct from old.profissional_id and new.local is not distinct from old.local
      and new.observacao_usuario is not distinct from old.observacao_usuario then return new; end if;
  end if;
  select usuario_id into destinataria from public.beneficiarias where id=new.beneficiaria_id;
  if destinataria is not null then
    insert into public.notificacoes(usuario_id,titulo,mensagem)
    values(destinataria,case when tg_op='INSERT' then 'Novo atendimento agendado' else 'Seu atendimento foi atualizado' end,
      'Confira a data, o horário e a situação em Minhas consultas.');
  end if;
  if new.status in ('Realizada','Finalizado') and new.solicitacao_id is not null then
    update public.solicitacoes set status='Concluída' where id=new.solicitacao_id and status <> 'Concluída';
  end if;
  return new;
end $$;
create trigger notificar_consulta after insert or update on public.atendimentos for each row execute function public.notificar_consulta();
revoke all on function public.validar_agendamento(), public.notificar_consulta(),public.notificar_solicitacao() from public;

-- Avatares no bucket privado existente. Sem leitura pública nem acesso à pasta documentos.
create policy avatar_proprio_ler on storage.objects for select to authenticated using(
  bucket_id='casa-mamae-margarida' and (storage.foldername(name))[1]='avatares'
  and (storage.foldername(name))[2]=(select auth.uid())::text);
create policy avatar_proprio_enviar on storage.objects for insert to authenticated with check(
  bucket_id='casa-mamae-margarida' and (select public.equipe_role())='usuario'
  and (storage.foldername(name))[1]='avatares' and (storage.foldername(name))[2]=(select auth.uid())::text
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp')
  and metadata->>'mimetype' in ('image/jpeg','image/png','image/webp'));
create policy avatar_proprio_excluir on storage.objects for delete to authenticated using(
  bucket_id='casa-mamae-margarida' and (storage.foldername(name))[1]='avatares'
  and (storage.foldername(name))[2]=(select auth.uid())::text);
-- Pré-verificação do formulário: evita criar uma conta Auth antes desta migração.
create function public.cadastro_disponivel() returns boolean language sql immutable set search_path = '' as $$ select true $$;
revoke all on function public.cadastro_disponivel() from public;
grant execute on function public.cadastro_disponivel() to anon,authenticated;
commit;
