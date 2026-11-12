# Documentação do projeto

## Visão geral

O projeto é o site institucional e a plataforma de gestão da Casa Mamãe Margarida. Reúne páginas públicas, painel da equipe e área individual da usuária. É uma aplicação multipágina feita com HTML, CSS e JavaScript modular, compilada pelo Vite. Supabase fornece autenticação, banco PostgreSQL, políticas de acesso (RLS) e armazenamento de arquivos.

## Começar a trabalhar

Requisitos: Node.js 22.12 ou superior e npm.

```powershell
npm.cmd install
npm.cmd run dev
```

Abra a URL local informada pelo Vite. Não abra os HTML diretamente com `file://`, pois as páginas usam módulos JavaScript.

Comandos disponíveis:

| Comando | Uso |
| --- | --- |
| `npm run dev` | Inicia o servidor local do Vite. |
| `npm run build` | Gera as páginas prontas para publicação em `dist/`. |
| `npm run preview` | Serve localmente a compilação de `dist/`. |
| `npm run docs:pdf` | Regera o PDF consolidado da documentação. |
| `npm test` | Executa testes unitários, de validação e segurança com banco PostgreSQL local simulado. |
| `npm run test:e2e` | Executa os testes de navegador Playwright. |
| `npm run test:supabase` | Faz verificações de leitura na conexão Supabase configurada. |

No PowerShell do Windows, os comandos podem ser executados como `npm.cmd`. O diagnóstico Supabase pode aceitar `-- --insert-test`, que cria um registro sintético; use essa opção somente quando quiser explicitamente gravar um dado de teste.

## Páginas

### Site público

- `index.html`: apresentação, cursos e projetos publicados.
- `voluntariado.html`: informações, oportunidades e formulário de voluntariado.
- `solicitar-atendimento.html`: solicitação pública de atendimento.
- `doacoes.html`: informações e registro de intenção de doação; não processa pagamentos.
- `contato.html`: formulário de contato.

### Acesso e área individual

- `login.html`, `recuperar-senha.html` e `redefinir-senha.html`: autenticação e recuperação de acesso.
- `cadastro.html` e `area-usuario.html`: criação de conta e página inicial da usuária.
- `minhas-consultas.html`, `agenda.html`, `minhas-solicitacoes.html`, `historico.html`, `perfil.html` e `notificacoes.html`: acompanhamento individual.
- `nova-solicitacao.html`: solicitação de atendimento pela área autenticada.

### Painel da equipe

- `dashboard.html`: indicadores.
- `beneficiarias.html` e `atendimentos.html`: registros e encontros de atendimento.
- `cursos.html` (e a rota legada `servicos.html`): cadastro e publicação de cursos.
- `projetos.html`: cadastro e publicação de projetos.
- `solicitacoes.html`: solicitações feitas pela área da usuária.
- `profissionais.html`: profissionais responsáveis pelos atendimentos.
- `gestao-doacoes.html`, `mensagens.html`, `relatorios.html`, `usuarios.html` e `configuracoes.html`: gestão administrativa.

O Vite declara as páginas de entrada em `vite.config.js`. Ao adicionar uma página HTML, inclua-a nessa lista para que ela faça parte da compilação multipágina.

## Organização do código

| Caminho | Responsabilidade |
| --- | --- |
| `css/style.css` | Estilos compartilhados e site público, incluindo navegação e layout responsivo. |
| `css/dashboard.css` | Painel administrativo. |
| `css/usuario.css` | Área individual da usuária. |
| `css/login.css` | Login e recuperação de senha. |
| `css/voluntariado.css` | Estilos próprios da página de voluntariado. |
| `js/layout.js` | Monta cabeçalho, navegação e rodapé públicos. |
| `js/main.js` | Inicialização da página principal, catálogo e interações públicas. |
| `js/forms.js` | Formulários públicos. |
| `js/voluntariado.js` | Interações da página de voluntariado. |
| `js/supabase.js` | Inicializa o cliente Supabase e a persistência de sessão. |
| `js/login.js`, `js/cadastro.js` | Autenticação, criação de conta e recuperação de acesso. |
| `js/dashboard.js` | Painel, operações de dados, tabelas, formulários e relatórios. |
| `js/admin-schema.js` | Colunas, campos e opções de cadastro do painel. |
| `js/usuario.js`, `js/usuario-data.js` | Páginas e dados da área individual. |
| `js/auth-routing.js` | Direcionamento após autenticação. |
| `js/utils.js`, `js/supabase-errors.js` | Ícones, formatação, escape de conteúdo e mensagens de erro. |
| `database/` | Esquema inicial, dados de exemplo, migrações e verificações SQL. |
| `img/` | Imagens e favicon. |
| `tests/` | Testes de lógica, segurança e navegador. |

## Configuração do Supabase

1. Crie ou selecione um projeto Supabase.
2. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Para um banco novo, revise e execute `database/supabase.sql` no SQL Editor.
4. Em uma instalação existente, compare o esquema antes de aplicar alterações. As migrações numeradas são incrementais: aplique `002_area_usuario.sql` e depois `003_cursos_datas_status.sql` quando os fluxos correspondentes forem usados. Não reaplique o SQL inicial sobre tabelas já existentes.
5. Execute os arquivos `database/verificar.sql` e `database/verificar-area-usuario.sql` no SQL Editor para inspecionar a configuração.
6. Configure URL do site e URLs de retorno de autenticação no painel do Supabase, incluindo o endereço de recuperação de senha.

Somente a URL e a chave **publicável** podem estar nas variáveis `VITE_` do frontend. Nunca coloque `service_role`, Secret Key, senha do banco ou outro segredo no navegador ou no repositório. O isolamento dos dados depende das políticas RLS configuradas no banco.

As telas de cadastro e redefinição aceitam senhas de 6 a 12 caracteres. No Supabase, configure o requisito mínimo de senha para aceitar 6 caracteres; as opções de segurança ficam em Authentication. O limite máximo de 12 é validado pelas telas deste site e não substitui a política do provedor para chamadas diretas à API. Consulte [segurança de senhas do Supabase](https://supabase.com/docs/guides/auth/password-security).

Para detalhes de ativação, migrações, permissões e diagnósticos, consulte [INTEGRACAO-SUPABASE.md](INTEGRACAO-SUPABASE.md) e [AREA-USUARIA.md](AREA-USUARIA.md).

## Perfis e acesso

Os perfis usados pela aplicação são `usuario`, `funcionario` e `admin`. O banco é responsável por autorizar cada operação; esconder um botão ou link no frontend não substitui RLS.

- **Visitante:** acessa conteúdo publicado e pode enviar os formulários públicos permitidos.
- **Usuária:** acessa seus próprios dados, consultas, agenda, solicitações, perfil e notificações.
- **Funcionário:** usa as rotinas de atendimento liberadas ao papel de equipe.
- **Administrador:** gerencia os cadastros e as páginas administrativas restritas.

As regras detalhadas por tabela estão no SQL e nos guias de integração. Não altere permissões para resolver um erro sem revisar as políticas e os vínculos de dados.

## Cursos, projetos e formulários

O painel compartilha a lógica de CRUD entre as páginas e define suas configurações em `js/admin-schema.js`. Cursos usam a tabela `servicos` por compatibilidade com o esquema existente; o conteúdo exibido ao público é chamado de curso. A migração `003_cursos_datas_status.sql` adiciona datas de início e fim e status. A página principal e a área da usuária leem os cursos publicados/ativos conforme os filtros implementados no catálogo.

As imagens de cursos e projetos podem usar o Storage do Supabase conforme a configuração do painel. Projetos têm status e datas; cursos têm status, datas e indicador de publicação. Solicitações e mensagens ficam no banco e podem estar vinculadas a outros registros: antes de apagar dados, verifique as chaves estrangeiras e o histórico relacionado.

## Publicação

O comando `npm run build` gera o conteúdo estático em `dist/`. Os arquivos `vercel.json` e `netlify.toml` definem o build e a pasta de saída para os respectivos provedores. Ao publicar pelo provedor, configure as duas variáveis `VITE_SUPABASE_*` no ambiente de build. Alterações nessas variáveis exigem uma nova compilação.

Após publicar, configure o domínio HTTPS como URL do site no Supabase e permita os redirecionamentos de autenticação usados pela aplicação. Verifique páginas internas abrindo suas URLs diretamente, login, recuperação de senha, permissões e visualização em celular. Não publique `.env`, `node_modules`, arquivos temporários de testes ou chaves secretas.

## Documentos relacionados

- [README.md](README.md): instruções existentes de instalação, banco, operação e publicação.
- [AREA-USUARIA.md](AREA-USUARIA.md): ativação e comportamento da área individual.
- [INTEGRACAO-SUPABASE.md](INTEGRACAO-SUPABASE.md): integração e diagnóstico do Supabase.
