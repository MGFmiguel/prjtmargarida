-- Execute no SQL Editor após supabase.sql. Somente leitura; nenhum dado pessoal.
-- Deve retornar sete tabelas, todas com rls_ativa = true.
select c.relname as tabela, c.relrowsecurity as rls_ativa
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
and c.relname in ('perfis','beneficiarias','atendimentos','servicos','projetos','doacoes','mensagens')
order by c.relname;

-- Verifique as políticas e os papéis para cada operação.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename in
('perfis','beneficiarias','atendimentos','servicos','projetos','doacoes','mensagens'))
or (schemaname = 'storage' and policyname in
('imagens_editoriais_ler','documentos_equipe_ler','arquivos_admin_criar','arquivos_admin_excluir'))
order by schemaname, tablename, policyname;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'casa-mamae-margarida';

-- Compare nomes/tipos com os campos usados pelo código, sem consultar registros.
select table_name, column_name, data_type, is_nullable
from information_schema.columns where table_schema = 'public'
and table_name in ('perfis','beneficiarias','atendimentos','servicos','projetos','doacoes','mensagens')
order by table_name, ordinal_position;
