import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

// CLI local, não importada pelo navegador. Nunca usa privilégios administrativos.
const env = loadEnv('development', process.cwd(), 'VITE_SUPABASE_');
const url = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key)
  throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env.');
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
let failures = 0;
function result(label, error, success) {
  if (error) {
    failures++;
    console.error(`${label}: ${error.code || 'ERRO'} — ${error.message}`);
    if (error.code === 'PGRST205')
      console.error('  Tabela indisponível na API. Confira database/supabase.sql no SQL Editor.');
    if (error.code === '42501')
      console.error('  Acesso recusado. Confira GRANT/RLS; não desative a segurança.');
  } else console.log(`${label}: ${success}`);
}
const authResponse = await fetch(`${url}/auth/v1/settings`, {
  headers: { apikey: key },
  signal: AbortSignal.timeout(15000),
});
console.log(`Supabase Auth: HTTP ${authResponse.status}`);
if (!authResponse.ok) failures++;

const { data, error } = await client.from('servicos').select('id,nome,ativo').limit(5);
result(
  'SELECT servicos',
  error,
  `conectado; ${data?.length ?? 0} serviço(s) na amostra. Conteúdo não exibido.`
);
// GET limit(0) verifica o endpoint sem trazer dados pessoais. HEAD pode ocultar erros do gateway.
for (const table of [
  'projetos',
  'perfis',
  'beneficiarias',
  'atendimentos',
  'doacoes',
  'mensagens',
]) {
  const { error } = await client.from(table).select('id').limit(0);
  if (error?.code === '42501' && !['projetos'].includes(table))
    console.log(`${table}: leitura anônima bloqueada (esperado).`);
  else result(`Endpoint ${table}`, error, 'respondeu; isso não comprova a configuração de RLS.');
}
if (process.argv.includes('--insert-test')) {
  const marker = `TESTE TECNICO CMM ${new Date().toISOString()}`;
  const { error } = await client.from('mensagens').insert({
    nome: 'Teste técnico de integração',
    email: 'teste@example.invalid',
    telefone: null,
    assunto: marker,
    mensagem:
      'Registro sintético de teste da conexão. Não é uma solicitação de atendimento. Pode ser excluído pela administração.',
    consentimento: true,
  });
  result(
    'INSERT mensagens',
    error,
    `registro criado: ${marker}. Confira e exclua em Mensagens com a conta admin.`
  );
}
process.exitCode = failures ? 1 : 0;
