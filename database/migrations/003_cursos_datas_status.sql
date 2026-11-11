-- Executar uma vez no SQL Editor do Supabase para adicionar datas e status aos cursos.
-- Migração aditiva: preserva os registros atuais da tabela public.servicos.
begin;

alter table public.servicos
  add column if not exists data_inicio date,
  add column if not exists data_fim date,
  add column if not exists status text not null default 'Inscrições abertas';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.servicos'::regclass
      and conname = 'servicos_status_curso_check'
  ) then
    alter table public.servicos
      add constraint servicos_status_curso_check
      check (status in ('Inscrições abertas', 'Em breve', 'Em andamento', 'Encerrado'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.servicos'::regclass
      and conname = 'servicos_datas_curso_check'
  ) then
    alter table public.servicos
      add constraint servicos_datas_curso_check
      check (data_fim is null or data_inicio is null or data_fim >= data_inicio);
  end if;
end $$;

commit;
