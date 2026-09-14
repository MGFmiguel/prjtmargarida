-- Somente leitura. Executar no SQL Editor após a migração 002.
select c.relname as tabela,c.relrowsecurity as rls_ativa
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in
('perfis','beneficiarias','atendimentos','solicitacoes','notificacoes','profissionais')
order by c.relname;

select table_name,column_name,data_type from information_schema.columns
where table_schema='public' and (
  (table_name='perfis' and column_name in ('data_nascimento','cpf','telefone','foto_url')) or
  (table_name='beneficiarias' and column_name='usuario_id') or
  (table_name='atendimentos' and column_name in ('profissional_id','solicitacao_id','local','observacao_usuario')))
order by table_name,column_name;

select tablename,policyname,roles,cmd,qual,with_check from pg_policies
where schemaname='public' and tablename in ('perfis','solicitacoes','notificacoes','profissionais')
order by tablename,policyname;

select p.proname, p.prosecdef as security_definer, p.proconfig as configuracao
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
('criar_perfil_publico','minhas_consultas','minhas_solicitacoes','cadastro_disponivel','proteger_perfil_usuario','notificar_consulta','notificar_solicitacao');

select tgname,pg_get_triggerdef(oid) as definicao from pg_trigger
where tgname='cmm_criar_perfil_publico';

select public.cadastro_disponivel();
