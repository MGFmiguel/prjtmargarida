-- Executar uma vez no SQL Editor do Supabase para permitir categorias nos cursos.
begin;

alter table public.servicos
  add column if not exists categoria text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.servicos'::regclass
      and conname = 'servicos_categoria_check'
  ) then
    alter table public.servicos
      add constraint servicos_categoria_check
      check (categoria in (
        'Capacitação profissional',
        'Artes e ofícios',
        'Educação e cidadania',
        'Saúde e bem-estar',
        'Outros cursos'
      ));
  end if;
end $$;

commit;
