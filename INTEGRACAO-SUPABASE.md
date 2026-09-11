# Integração do projeto existente

## Resultado e impedimento identificado

Arquitetura: **HTML/CSS/JavaScript com Vite**, sem Express ou backend próprio. A dependência `@supabase/supabase-js` já estava instalada. O design e os HTML/CSS foram preservados.

O `.env` local agora aponta para `upleyrxuhdqotaccvcuu`. Em 11/09/2026, `/auth/v1/settings` respondeu **HTTP 200**, com login por e-mail habilitado. Isso confirma que URL e chave publicável são aceitas; não equivale a um login de usuário.

Os testes GET de `perfis`, `beneficiarias`, `servicos`, `atendimentos`, `projetos`, `doacoes` e `mensagens` retornaram **PGRST205 — tabela não encontrada no cache do schema**. SELECT em `servicos` e INSERT em `mensagens` também retornaram esse erro. **Nenhuma mensagem de teste foi criada.** Não foi possível inspecionar o esquema remoto ou comprovar suas políticas pela chave publicável. A migração existente é compatível com o código e foi testada em PostgreSQL local.

Para completar a integração remota, abra o [SQL Editor deste projeto](https://supabase.com/dashboard/project/upleyrxuhdqotaccvcuu/sql/new), confira se as tabelas já existem no Table Editor e, se ainda não existem, execute **todo** o arquivo [database/supabase.sql](database/supabase.sql). Ele cria tabelas, relacionamentos, índices, consentimento, RLS e Storage. Não execute essa migração de criação sobre tabelas preexistentes: se elas existirem, compare seu esquema com o código e investigue exposição/cache da API antes de alterar algo.

Depois execute [database/verificar.sql](database/verificar.sql), que faz consultas administrativas de verificação sem ler dados de beneficiárias. Deve mostrar sete tabelas com RLS ativa, as políticas e o bucket privado. A chave publicável não pode executar SQL administrativo. Não é necessário enviar uma Secret Key para esta integração.

## Arquivos alterados e criados

Alterados: `js/supabase.js`, `.env.example`, `.gitignore`, `js/forms.js`, `js/main.js`, `js/login.js`, `js/dashboard.js`, `package.json`, `tests/browser/public.spec.js` e `README.md`.

Criados: `.env` (ignorado pelo Git), `js/supabase-errors.js`, `scripts/test-supabase.mjs`, `database/verificar.sql`, `tests/browser/connection.spec.js` e este guia.

O cliente compartilhado passou a ler a variável `VITE_SUPABASE_PUBLISHABLE_KEY`. Foram acrescentadas mensagens específicas para tabela/coluna ausente, permissão, campos inválidos e vínculos. O formulário de atendimento não oferece serviços ilustrativos quando o banco real falha. Os testes de interface foram isolados para não enviar registros reais por causa do novo `.env`.

## Configuração local

Arquivo `.env` já preenchido:

```dotenv
VITE_SUPABASE_URL=https://upleyrxuhdqotaccvcuu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_CYEX5itX4uA6XpxwNP00Mg_HyBMVY2f
```

Esses dois valores são públicos por definição; o acesso aos registros depende das políticas e da sessão. Veja [chaves de API do Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

Arquivo `.env.example`:

```dotenv
# Frontend Vite: somente URL e chave publicável.
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

# Reservadas para um futuro backend; não utilizadas neste site estático.
# Nunca adicione VITE_ a uma variável secreta.
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_JWKS_URL=
```

Arquivo `.gitignore`:

```gitignore
node_modules/
dist/
.env
.env.local
.env.*
!.env.example
test-results/
playwright-report/
```

Nenhuma Secret Key foi fornecida, gravada ou incorporada ao navegador. Os campos de backend no exemplo estão vazios e não são usados. O JWKS não é necessário: a aplicação usa Supabase Auth e o painel confirma o usuário com `getUser()`.

## Código completo de `js/supabase.js`

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured = Boolean(supabaseUrl && supabaseKey);
// Only a publishable/anon key belongs in this file. Access is enforced by RLS.
const storage = {
  getItem: (key) => localStorage.getItem(key) ?? sessionStorage.getItem(key),
  setItem: (key, value) => {
    const persistent = localStorage.getItem('cmm-remember') === 'true';
    (persistent ? sessionStorage : localStorage).removeItem(key);
    (persistent ? localStorage : sessionStorage).setItem(key, value);
  },
  removeItem: (key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};
export const supabase = configured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage },
    })
  : null;
export function requireConnection() {
  if (!supabase)
    throw new Error(
      'O envio ainda não está disponível. A instituição precisa configurar a conexão com o Supabase. Nenhum dado foi enviado.'
    );
  return supabase;
}
```

O modo sem credenciais foi preservado para visualização e testes. Na configuração atual, o cliente existe e consulta o projeto real. Há um único cliente no frontend; o script de terminal tem seu próprio cliente sem persistência, pois roda em outro processo.

## SELECT e INSERT: execução e resultado

O código completo está em `scripts/test-supabase.mjs`. Execute no terminal, a partir da pasta do projeto:

```powershell
npm.cmd run test:supabase
```

Esse comando faz um SELECT de até cinco serviços e verifica os outros endpoints com `limit(0)`, sem baixar dados pessoais. O terminal mostra o nome da operação, o código do erro ou o sucesso. Uma resposta vazia não comprova que a RLS está correta; use também o SQL de verificação e contas com diferentes perfis.

Para testar escrita real após criar as tabelas:

```powershell
npm.cmd run test:supabase -- --insert-test
```

Além das leituras, o script insere uma mensagem com assunto `TESTE TECNICO CMM` e data/hora. Usa somente dados sintéticos e não envia e-mail. A resposta de INSERT não solicita leitura do registro, pois visitantes não devem ler mensagens. Consulte o registro como administrador e depois exclua-o na tela Mensagens. Cada execução bem-sucedida cria um novo registro identificado.

Erros: `PGRST205` indica tabela indisponível; `PGRST204` pode indicar coluna ausente; `42501` indica permissão; `23514` indica restrição de dados. Corrija esquema, GRANT ou política correspondente; não desative RLS. Falhas de rede, chave inválida e erros de backend também aparecem no terminal. O script termina com código 1 quando há falha.

## Login, sessão, logout e primeira conta

1. Em [Authentication → Users](https://supabase.com/dashboard/project/upleyrxuhdqotaccvcuu/auth/users), crie sua conta de equipe.
2. Após executar a migração, autorize a conta no SQL Editor, substituindo o e-mail:

```sql
insert into public.perfis (user_id, nome, email, cargo, role)
select id, 'Administração da Casa', email, 'Administração', 'admin'
from auth.users
where email = 'SEU-EMAIL-REAL@EXEMPLO.COM';
```

3. Reinicie o Vite com `npm.cmd run dev` e abra `login.html`.
4. Em `js/login.js`, o formulário executa:

```javascript
const { data, error } = await client.auth.signInWithPassword({
  email: form.elements.email.value.trim(),
  password: form.elements.password.value,
});
```

O login consulta o perfil antes de liberar a navegação. Em `js/dashboard.js`, `supabase.auth.getUser()` confirma o usuário no serviço Auth antes de consultar registros. Não confiamos somente em uma sessão armazenada localmente. A página de recuperação usa `const { data: { session } } = await client.auth.getSession()` antes de atualizar a senha. O botão Sair chama `await supabase.auth.signOut()` e retorna ao login.

**Teste:** entre, recarregue a página, saia e abra `dashboard.html` diretamente. Sem sessão, ele deve voltar ao login. Uma conta Auth sem perfil não deve acessar registros. Crie também um funcionário e confirme que as telas administrativas exclusivas ficam bloqueadas.

Para recuperação por e-mail, configure Site URL e permita `http://127.0.0.1:5173/recuperar-senha.html` e/ou `http://localhost:5173/recuperar-senha.html`, conforme o endereço usado. Configure também o domínio final e o envio de e-mails no Supabase. Não foi realizado login real nem envio de recuperação, pois não foram fornecidas credenciais de equipe.

## Como testar as páginas já integradas

| Área          | Arquivos/lógica                              | Teste após preparar o banco                                                                     |
| ------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Serviços      | `main.js`, `dashboard.js`, `admin-schema.js` | Como admin, criar, editar, desativar e excluir um serviço; conferir o catálogo público.         |
| Projetos      | Mesmos módulos                               | Cadastrar período e imagem; conferir que apenas projetos ativos são publicados.                 |
| Beneficiárias | `forms.js`, `dashboard.js`                   | Solicitar atendimento com dados de teste autorizados; consultar como equipe e atualizar status. |
| Atendimentos  | `dashboard.js`                               | Criar dois encontros, editar um, finalizar e conferir o histórico da beneficiária.              |
| Doações       | `forms.js`, `dashboard.js`                   | Registrar intenção e atualizar seu status como administrador.                                   |
| Contato       | Mesmos módulos                               | Enviar uma mensagem sintética, marcá-la como lida e excluir após o teste.                       |
| Dashboard     | `dashboard.js`                               | Conferir contagens com os registros criados; nenhum indicador usa números ilustrativos.         |
| Relatórios    | `dashboard.js`                               | Filtrar data/status/tipo e exportar CSV agregado.                                               |
| Storage       | `dashboard.js`, `main.js`                    | Enviar imagem como admin; verificar que documentos não podem ser consultados como visitante.    |

As operações SELECT/INSERT/UPDATE/DELETE e os controles de perfil já existiam; a configuração agora aponta esses fluxos para o projeto informado. Não foi recriado o site nem adicionado backend.

## Políticas necessárias e validação

`database/supabase.sql` mantém visitantes com leitura apenas do catálogo ativo e INSERT limitado nos formulários; funcionários podem consultar beneficiárias e atualizar status/atendimentos; administradores gerenciam os cadastros. Perfis não permitem autoelevação, e documentos pessoais ficam em pasta privada. Consulte [RLS no Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

```powershell
npm.cmd test
npm.cmd run test:e2e
npm.cmd run build
```

Validação desta alteração: nove testes locais de segurança/validação e 16 testes de navegador passaram, e o build de produção foi gerado. Também foi verificado no navegador, usando o cliente real, que a página mostra a configuração de banco pendente e que o dashboard sem sessão retorna ao login.

Os testes locais não substituem o teste de integração remota. A próxima ação necessária é executar/verificar o SQL no painel; depois repetir SELECT/INSERT e validar login, permissões e Storage com contas reais de teste.
