# Casa Mamãe Margarida

Consulte [DOCUMENTACAO.md](DOCUMENTACAO.md) para uma visão geral das páginas, módulos, configuração, permissões e publicação do projeto.
O PDF consolidado pode ser regenerado com `npm run docs:pdf`.

**Nova Área da Usuária:** consulte [AREA-USUARIA.md](AREA-USUARIA.md) para ativar o cadastro, agenda, consultas, solicitações, perfil e notificações. A alteração usa a migração incremental `database/migrations/002_area_usuario.sql`; não execute novamente o SQL inicial em um banco existente.

Site público e painel de gestão para uma instituição de acolhimento de mulheres. Feito com HTML5, CSS3, JavaScript modular, Vite e `@supabase/supabase-js`. O banco é PostgreSQL, com Supabase Auth, Storage privado e Row Level Security.

O código completo está nos arquivos deste projeto. Não é preciso copiar trechos desta documentação para montar o site. Os exemplos de SQL para autorizar a primeira conta devem ser adaptados à sua conta real.

**Integração atualizada:** `.env` foi configurado para o projeto `upleyrxuhdqotaccvcuu` usando somente a chave publicável. O Supabase Auth respondeu HTTP 200, mas as sete tabelas retornaram `PGRST205` na verificação de 11/09/2026. O teste de INSERT também foi recusado porque `mensagens` não está disponível. Execute o SQL da etapa 3 e repita os testes; o banco remoto ainda não está pronto para os cadastros. Veja [INTEGRACAO-SUPABASE.md](INTEGRACAO-SUPABASE.md) para código completo da configuração, diagnóstico e próximos passos. Sem variáveis, o modo ilustrativo continua disponível; com elas, o site consulta o banco real.

## 1. Estrutura das pastas e execução local

```text
casa-mamae-margarida/
├── index.html                 Página inicial
├── solicitar-atendimento.html Solicitação pública
├── doacoes.html               Doações públicas
├── voluntariado.html          Oportunidades e cadastro de voluntariado
├── contato.html               Contato público
├── login.html                 Login da equipe
├── recuperar-senha.html       Redefinição de senha
├── dashboard.html             Indicadores da equipe
├── beneficiarias.html         Consulta e status das solicitações
├── atendimentos.html          Cadastro, edição e consulta
├── cursos.html                Gestão de cursos
├── projetos.html              Gestão de projetos
├── gestao-doacoes.html         Gestão privada de doações
├── mensagens.html             Mensagens recebidas
├── relatorios.html            Filtros e exportação CSV
├── usuarios.html              Autorização de perfis
├── configuracoes.html         Uploads e arquivos
├── css/
│   ├── style.css              Site e componentes compartilhados
│   ├── login.css              Login e recuperação
│   └── dashboard.css          Painel responsivo
├── js/
│   ├── supabase.js            Cliente e persistência da sessão
│   ├── layout.js              Cabeçalho, rodapé e marca
│   ├── main.js                Site, cursos, projetos e diálogos
│   ├── catalog.js             Conteúdo ilustrativo sem credenciais
│   ├── forms.js               Envio dos formulários públicos
│   ├── voluntariado.js        Filtros de vagas e cadastro de voluntariado
│   ├── login.js               Login e recuperação de senha
│   ├── dashboard.js           Consultas, CRUD, relatórios e Storage
│   ├── admin-schema.js        Campos e colunas dos cadastros
│   └── utils.js               Ícones, CPF, datas e escape de texto
├── img/                       Fotografias ilustrativas e favicon
├── database/
│   ├── supabase.sql           Banco, índices, restrições, RLS e bucket
│   └── seed.sql               Catálogo ilustrativo opcional
├── tests/                     Testes de SQL, validação e navegador
├── scripts/create-pages.mjs   Gerador dos HTML secundários
├── .env.example               Modelo de configuração
├── vite.config.js             Compilação de todas as páginas
├── playwright.config.js       Testes desktop e mobile
├── netlify.toml               Configuração de publicação
└── package.json               Dependências e comandos
```

Os cadastros compartilham `dashboard.js` e `admin-schema.js`, em vez de duplicar a lógica de conexão e segurança em um arquivo por entidade. Os HTML permanecem separados e podem ser abertos por suas próprias URLs.

Instale Node.js 22.12+ ou 24 e execute na pasta do projeto:

```powershell
npm.cmd install
npm.cmd run dev
```

No Windows, `npm.cmd` evita o bloqueio do `npm.ps1` pela política de execução do PowerShell. Em macOS/Linux, use `npm`.

**Teste:** abra o endereço exibido pelo Vite, normalmente `http://localhost:5173`. A página deve exibir a marca, a fotografia, os cursos e os projetos. Não abra o HTML com `file://`, pois os módulos precisam do servidor.

## 2. Criar o projeto no Supabase

1. Entre no [painel do Supabase](https://supabase.com/dashboard) e crie um projeto na sua organização.
2. Dê um nome ao projeto, escolha a região e guarde a senha do banco em um local seguro.
3. Aguarde o provisionamento.
4. Em Authentication, mantenha login por e-mail habilitado e ajuste a política de senha para aceitar no mínimo 6 caracteres. Para a nova Área da Usuária, aplique a migração 002 e habilite cadastro público com confirmação de e-mail; novas contas recebem somente o perfil `usuario`. A autorização de equipe continua sendo administrativa. As telas do site limitam novas senhas a 12 caracteres.
5. Em Authentication → URL Configuration, configure a Site URL local e adicione `http://localhost:5173/recuperar-senha.html` às URLs permitidas. Se usar outro host ou porta, inclua a URL correspondente.
   Para retomar uma inscrição em curso após confirmar o cadastro, permita também `https://prjtmargarida.vercel.app/area-usuario.html**`.

**Teste:** confirme que você consegue abrir SQL Editor, Authentication e Storage no projeto. Consulte a documentação de [URLs de redirecionamento](https://supabase.com/docs/guides/auth/redirect-urls) para ajustar os ambientes local e publicado.

## 3. Criar o banco completo

Abra `database/supabase.sql`, copie todo o conteúdo e execute no SQL Editor de um projeto novo. O arquivo é transacional e deve ser executado uma vez; não apaga nem recria tabelas existentes.

O SQL cria as sete tabelas pedidas, PKs UUID, FKs, valores padrão, índices, validação de CPF, datas, campos de consentimento, RLS e políticas do Storage. Consentimento e sua data foram acrescentados para registrar a autorização do formulário. O CPF não é único: uma mesma mulher pode enviar mais de uma solicitação. Antes de criar atendimentos, a equipe deve conferir se há cadastros duplicados.

Opcionalmente, execute `database/seed.sql` para cadastrar o catálogo ilustrativo. Confirme a disponibilidade com a instituição antes de publicá-lo. Não são inseridas pessoas, doações ou atendimentos fictícios no banco real.

**Teste:** no Table Editor, confira `perfis`, `beneficiarias`, `atendimentos`, `servicos`, `projetos`, `doacoes` e `mensagens`. Todas devem ter RLS habilitada. No Storage deve existir o bucket privado `casa-mamae-margarida`.

## 4. Configurar `js/supabase.js`

Copie `.env.example` para `.env`:

```powershell
Copy-Item .env.example .env
```

Preencha com os dados do seu projeto:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICAVEL
```

No painel, o diálogo **Connect** mostra a URL e a chave publicável. As chaves também estão na área de API Keys das configurações do projeto. A integração usa `VITE_SUPABASE_PUBLISHABLE_KEY`, com uma chave `sb_publishable_...`. Consulte [API keys](https://supabase.com/docs/guides/getting-started/api-keys).

Nunca use `service_role`, `sb_secret_...` nem a senha do banco no frontend. Variáveis `VITE_` são incorporadas ao JavaScript entregue ao navegador: não são segredos. É a RLS que protege os registros.

O arquivo `js/supabase.js` importa `createClient` de `@supabase/supabase-js`, lê essas variáveis e configura a sessão. Reinicie o Vite após alterar `.env`.

**Teste:** os cursos devem ser carregados do seu banco. Um banco vazio mostra estado vazio, e um erro de conexão mostra uma mensagem, sem substituir dados reais por dados ilustrativos.

## 5. Página inicial

`index.html`, `css/style.css`, `js/layout.js` e `js/main.js` implementam navegação, banner, apresentação, missão, visão, valores, cursos, projetos, convite para doação, contato e rodapé. O layout usa rosa queimado, bege, branco e dourado suave.

A flor da marca é um espaço reservado para o logotipo oficial. Substitua o símbolo no componente `brand` de `js/layout.js`. Atualize também `img/favicon.svg` quando houver um ícone oficial.

**Teste:** clique nos itens do menu, abra os detalhes de um curso, alterne missão/visão/valores e abra um projeto. Em uma tela estreita, teste o botão do menu. Use Tab, Enter e Escape nos diálogos.

## 6. Login

`login.html` usa `supabase.auth.signInWithPassword()`. Há mostrar/ocultar senha, recuperação e opção de manter a sessão.

Em Authentication → Users, crie a primeira conta da equipe e confirme o e-mail conforme o procedimento do seu projeto. Em seguida, autorize esse usuário com SQL, substituindo o endereço abaixo pelo e-mail da conta criada:

```sql
insert into public.perfis (user_id, nome, email, cargo, role)
select id, 'Nome da administradora', email, 'Administração', 'admin'
from auth.users
where email = 'SEU-EMAIL-REAL@EXEMPLO.COM'
on conflict (user_id) do update set role = 'admin', cargo = excluded.cargo;
```

Se nenhum registro for inserido, o e-mail não foi encontrado em Auth. Não cadastre a senha na tabela `perfis`.

**Teste:** entre com a conta autorizada. Uma conta Auth sem perfil deve receber “acesso ainda não autorizado”; credenciais erradas não devem liberar o painel.

## 7. Autenticação, recuperação e perfis

Antes de buscar dados administrativos, o painel valida o usuário com `auth.getUser()` e consulta seu perfil. O banco confirma as permissões em cada operação. Funcionários não acessam doações, relatórios, usuários, mensagens ou configurações.

“Manter sessão ativa” usa a persistência do Supabase em `localStorage`; sem essa opção, a sessão usa `sessionStorage`. Nenhuma senha é armazenada manualmente. Ao sair, a sessão é removida e a página retorna ao login.

“Esqueci minha senha” envia uma solicitação via `resetPasswordForEmail`. O link abre `recuperar-senha.html`, que chama `updateUser` para salvar a nova senha. Ajuste SMTP e remetente do projeto para o envio real; o serviço padrão do Supabase tem restrições. Veja [autenticação por senha](https://supabase.com/docs/guides/auth/passwords).

**Teste:** faça login, recarregue, saia e tente abrir `beneficiarias.html` diretamente. Depois, solicite um link de recuperação, abra o e-mail e redefina a senha. Sem sessão válida, a página de recuperação deve recusar a alteração.

## 8. Dashboard

`dashboard.html` mostra seis indicadores reais e gráficos de barras com contagens textuais: atendimentos por mês, tipos solicitados e solicitações por status. A leitura percorre as páginas da API para evitar estatísticas cortadas pelo limite de resposta.

**Teste:** com o banco vazio, os totais devem ser zero. Cadastre uma solicitação pública e confira o aumento de beneficiárias e pendências. Não existem percentuais de crescimento ou números de impacto inventados.

## 9. Cadastro de beneficiárias

`solicitar-atendimento.html` coleta os campos solicitados e exige autorização de uso dos dados. O CPF passa por validação no navegador e no banco. A API pública pode inserir apenas os campos do formulário, sem escolher status, ID ou datas internas, e não pode ler os cadastros.

`beneficiarias.html` permite pesquisa, consulta detalhada, atualização de status e histórico de atendimentos. Funcionários podem alterar somente o status; o banco bloqueia alterações de identidade feitas por esse perfil. Excluir um cadastro é uma ação administrativa e exige confirmação. Cadastros com atendimentos vinculados são protegidos por FK.

**Teste:** use somente dados de teste autorizados. Envie um formulário, confira o status inicial “Pendente” e consulte-o como equipe. Em janela anônima, a tabela de beneficiárias não deve ser legível via API.

## 10. Sistema de atendimentos

Em `atendimentos.html`, crie um atendimento, escolha uma beneficiária, informe tipo, data, hora, descrição e status. O responsável inicial é o usuário autenticado. Edição não permite trocar os vínculos do atendimento. O responsável referencia a conta Auth, de modo que revogar seu perfil não apaga a identificação histórica da conta.

Uma beneficiária pode ter vários atendimentos. O histórico da beneficiária mostra os encontros registrados, com data, situação, descrição e observação; não é um log de cada edição. Status da solicitação e de seus atendimentos são independentes, para acomodar vários acompanhamentos simultâneos.

**Teste:** crie dois atendimentos para o mesmo cadastro, finalize um deles e abra o histórico na tela de beneficiárias. Confirme que os dois aparecem e que o painel atualiza suas contagens.

## 11. Cursos

Administradores cadastram, editam, ativam/desativam e excluem cursos em `cursos.html`. Também informam início, fim e status da turma. Em bancos existentes, execute `database/migrations/003_cursos_datas_status.sql` no SQL Editor do Supabase antes de usar esses campos. Para compatibilidade com os dados existentes, os cursos continuam armazenados na tabela `servicos` e as imagens usam a pasta `servicos/`.

Para solicitar inscrição, a pessoa precisa estar autenticada. O botão do curso abre o formulário da área da usuária com o curso escolhido; os pedidos entram em `solicitacoes` para análise da equipe. O pedido não confirma automaticamente uma vaga.

**Teste:** cadastre um curso e confira o site. Desative-o e recarregue: ele deve desaparecer do catálogo público, mas continuar visível para a equipe.

## 12. Projetos e Storage

Em `projetos.html`, o administrador define nome, descrição, período, imagem e status. A data final não pode ser anterior à inicial. Somente projetos com status “Ativo” aparecem no site.

O bucket é **privado**, inclusive para imagens. As políticas liberam leitura apenas das pastas editoriais `servicos/`, `projetos/` e `institucional/`; a aplicação gera URLs assinadas para exibi-las. A pasta `documentos/` permite leitura apenas para a equipe autorizada. Uploads são administrativos; PDF é aceito apenas em documentos. O tamanho máximo é 10 MB.

Configurações permite enviar e listar arquivos. As URLs de consulta de documentos expiram em 60 segundos. Nomes são UUIDs para não expor nomes de pessoas nas URLs. Não envie fotos de documentos pessoais para pastas editoriais: imagens nessas pastas têm leitura pública. A instituição deve definir critérios de autorização e retenção dos arquivos.

**Teste:** envie uma imagem de projeto e confira o card público. Envie um PDF autorizado à pasta privada e tente consultar seu caminho sem sessão: o acesso deve ser recusado. Confirme as políticas no Supabase real; os testes locais não executam o serviço HTTP do Storage.

## 13. Doações e contato

`doacoes.html` apresenta Pix, alimentos, roupas, higiene, materiais escolares e voluntariado. O formulário registra uma **intenção de doação**, não processa pagamentos. Nenhuma chave Pix fictícia é apresentada.

O administrador acompanha o status em `gestao-doacoes.html`. Mensagens de `contato.html` aparecem em `mensagens.html`, com leitura e marcação de lida. Nenhuma mensagem é enviada automaticamente a terceiros por e-mail.

**Teste:** registre uma intenção de doação e uma mensagem de teste; verifique ambas com a conta administrativa. A conta de funcionário e o visitante não devem poder consultar essas informações.

## 14. Relatórios

`relatorios.html` oferece filtros de período, status e tipo de atendimento, indicadores, gráficos e download CSV agregado. Solicitações usam sua data de cadastro; atendimentos usam a data do encontro. Projetos, cursos e doações usam a data de cadastro e não o status do atendimento. “Mulheres com atendimento” conta IDs distintos de beneficiárias com encontros em andamento ou finalizados; possíveis cadastros duplicados precisam ser resolvidos pela equipe.

**Teste:** crie encontros em dois meses diferentes, filtre um deles e compare as contagens. Informe um período invertido para conferir a validação. O CSV deve incluir os filtros e os indicadores, sem nomes, CPFs ou endereços.

## 15. Row Level Security e tratamento dos dados

| Recurso                  | Visitante          | Funcionário                  | Administrador                         |
| ------------------------ | ------------------ | ---------------------------- | ------------------------------------- |
| Cursos/projetos ativos    | Ler                | Ler todos                    | Gerenciar                             |
| Beneficiárias            | Enviar solicitação | Consultar e atualizar status | Consultar, atualizar status e excluir |
| Atendimentos             | Sem acesso         | Criar, consultar e atualizar | Gerenciar                             |
| Doações/mensagens        | Enviar formulário  | Sem leitura                  | Gerenciar                             |
| Perfis                   | Sem acesso         | Ler o próprio                | Autorizar e gerenciar outros          |
| Documentos               | Sem acesso         | Ler                          | Ler e enviar                          |
| Imagens editoriais       | Ler                | Ler                          | Ler e enviar                          |

A autorização vem da tabela `perfis`, nunca de metadados definidos pelo visitante. A função `equipe_role()` tem `search_path` fixo e evita recursão da política de perfis. Não há política para autoatribuição de privilégios. O administrador não pode excluir/rebaixar o próprio perfil pela interface.

Textos dos registros são escapados antes de inserir HTML. Formulários têm limites de tamanho e restrições no banco. Consentimento é registrado no servidor. A aplicação não grava dados pessoais em cache local próprio nem exporta essas informações nos relatórios.

Antes de operar com dados reais, a instituição deve preencher seu aviso de privacidade com responsável, finalidade, base legal aplicável, retenção e canal de direitos. O texto da interface é um ponto de partida, não uma declaração de conformidade jurídica. O envio público direto à API tem um honeypot básico, mas não tem rate limiting próprio: para operação exposta a abuso, adote um endpoint/Edge Function com limites e CAPTCHA validado no servidor, revogando o INSERT público direto. Não trate um CAPTCHA apenas visual como proteção da API.

**Teste:** execute os testes SQL abaixo e repita os cenários em um projeto de homologação. Nunca desative RLS para corrigir uma mensagem de permissão; verifique a política, o perfil e os campos enviados.

## 16. Testes

```powershell
npm.cmd test
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run build
npm.cmd run preview
```

`npm test` executa a migração real em PostgreSQL via PGlite, com esquemas de Auth/Storage simulados para testar permissões. Cobre inserção pública, privacidade, elevação de privilégio, status, CPF, consentimento, relacionamentos e documentos privados. Apenas a extensão `pgcrypto` é omitida nesse ambiente, porque `gen_random_uuid` já é nativo.

Os testes Playwright públicos simulam o cliente sem configuração, mesmo com `.env` presente, e nunca enviam seus formulários ao banco real. Eles verificam navegação, catálogo, diálogos, login e responsividade. Os testes administrativos usam um cliente simulado; as políticas são exercitadas separadamente em PostgreSQL local. Use `npm.cmd run test:supabase` para um diagnóstico de leitura contra o projeto real e adicione `-- --insert-test` para criar uma mensagem sintética identificada. Login com credenciais de equipe, recuperação por e-mail e Storage ainda precisam de validação após a criação do banco e da primeira conta autorizada.

**Teste:** os comandos devem terminar sem falhas. Abra o preview, teste os links e confira os estados vazios. Teste também o fluxo completo como admin, funcionário e visitante após conectar o Supabase.

## 17. Publicação

1. Confirme textos, logo, cursos disponíveis, imagens autorizadas, contatos, programação e informações de doação com a instituição.
2. Configure o Supabase e valide o fluxo completo em homologação.
3. Execute `npm.cmd run build`. O resultado estará em `dist/`, com todas as páginas HTML.
4. Em uma hospedagem estática, publique a pasta `dist`. No Netlify, o arquivo `netlify.toml` já define `npm run build`, `dist` e cabeçalhos básicos. Veja [Vite no Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/).
5. Se a hospedagem fizer o build, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` nas variáveis de ambiente antes de compilar. Alterá-las exige novo build.
6. Atualize a Site URL do Supabase para o domínio HTTPS e permita `https://SEU-DOMINIO/recuperar-senha.html` como redirecionamento. Configure SMTP para e-mails reais.
7. Não publique `node_modules`, `.env` nem pastas de resultados de teste. Não configure um redirecionamento geral para `index.html`: este é um site com múltiplas páginas.

**Teste:** no domínio final, abra `/login.html` e `/solicitar-atendimento.html` diretamente, recarregue as páginas, envie um registro de teste autorizado e valide recuperação por e-mail. Verifique a página no celular e o bloqueio de acesso administrativo sem sessão.

## Imagens e manutenção

As fotografias são ilustrativas, obtidas do Unsplash, e não representam beneficiárias ou atividades comprovadas da instituição. Identificadores das imagens: `photo-1529156069898-49953e39b3ac`, `photo-1455390582262-044cdead277a`, `photo-1511632765486-a01980e01a18` e `photo-1517486808906-6ca8b3f04846`. A marca usa uma flor do Lucide como elemento provisório. As fontes são DM Sans e Lora, com fontes locais de fallback.

O gerador `scripts/create-pages.mjs` serviu para criar os HTML secundários. Você pode editá-los diretamente; executar novamente o gerador sobrescreve essas páginas, portanto atualize também o template caso queira continuar usando essa ferramenta.
