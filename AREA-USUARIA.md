# Área da Usuária — complemento do projeto existente

A implementação acrescenta cadastro público, consultas, agenda, solicitações, histórico, perfil e notificações. O site público e o painel administrativo existentes continuam no mesmo projeto e usam o mesmo `js/supabase.js`.

## Para ativar no seu Supabase e na Vercel

1. Abra o SQL Editor do projeto `upleyrxuhdqotaccvcuu`.
2. Execute **somente** [database/migrations/002_area_usuario.sql](database/migrations/002_area_usuario.sql), uma vez, sobre o banco existente. **Não execute novamente `database/supabase.sql`.** A migração é transacional e não remove registros.
3. Execute [database/verificar-area-usuario.sql](database/verificar-area-usuario.sql). Confira as colunas, as três tabelas novas, políticas, funções e trigger de cadastro.
4. Em Supabase → Authentication, habilite cadastro de novas contas por e-mail e mantenha a confirmação de e-mail ativada. Configure o remetente/SMTP para o envio real de mensagens de confirmação e recuperação.
5. Em Authentication → URL Configuration, defina a **Site URL** como `https://prjtmargarida.vercel.app` e permita estas URLs exatas:

   ```text
   https://prjtmargarida.vercel.app/area-usuario.html
   https://prjtmargarida.vercel.app/redefinir-senha.html
   https://prjtmargarida.vercel.app/recuperar-senha.html
   ```

6. Na Vercel, mantenha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. O projeto tem `vercel.json` com build `npm run build` e saída `dist`. Publique uma nova versão contendo os arquivos desta alteração, **após** aplicar a migração. Não configure um rewrite geral de todas as URLs para `index.html`.
7. Abra `https://prjtmargarida.vercel.app/cadastro.html`, crie uma conta de teste autorizada e confirme o e-mail. Ao entrar, uma conta `usuario` segue para `area-usuario.html`; `admin` e `funcionario` seguem para o dashboard existente.

Os links de e-mail usam a URL de produção informada, mesmo quando o formulário é aberto localmente. A configuração está em [js/auth-routing.js](js/auth-routing.js). A confirmação precisa encontrar o código novo já publicado na Vercel. A página antiga `recuperar-senha.html` foi preservada para links anteriores.

O formulário verifica `cadastro_disponivel()` antes de chamar `signUp`, evitando que este frontend crie uma conta antes da migração. Nenhuma chave secreta é necessária. A configuração de redirects segue a [documentação de URLs do Supabase](https://supabase.com/docs/guides/auth/redirect-urls).

**Limite desta entrega:** o código e a migração foram implementados e testados localmente. Não foi executada a migração no seu projeto remoto, nem feito deploy na sua conta Vercel. A chave publicável disponível permite usar a API, mas não administrar o esquema do banco. Não foram criadas contas ou enviados e-mails reais durante os testes.

## O que foi reutilizado

| Recurso existente | Complemento                                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `perfis`          | Aceita `usuario` e recebe nascimento, CPF, telefone e caminho da foto.                                                     |
| `beneficiarias`   | Recebe `usuario_id` opcional e único para vincular a nova conta. Registros antigos permanecem sem vínculo automático.      |
| `atendimentos`    | Continua sendo a única tabela de consultas; recebe profissional, solicitação de origem, local e orientação para a usuária. |
| `servicos`        | Alimenta o novo formulário de solicitação.                                                                                 |
| Supabase Auth     | Mesmo cliente: `signUp`, login, recuperação, sessão e logout.                                                              |
| Storage           | Mesmo bucket privado; nova pasta `avatares/UUID-DA-CONTA/`.                                                                |
| Dashboard         | Novos itens Solicitações das usuárias e Profissionais; agendamento usa o formulário existente.                             |

As tabelas novas são **`solicitacoes`**, **`notificacoes`** e **`profissionais`**. Seus endpoints não existiam na API na análise inicial. Não foi criada uma tabela duplicada de consultas ou de usuárias.

O vínculo é criado por trigger no banco, na mesma transação do cadastro Auth. A trigger fixa `role = 'usuario'` e ignora qualquer `role` enviado em metadados. Nascimento, CPF, telefone e consentimento são validados também no banco. Não há escolha pública de perfil nem senha em uma tabela da aplicação. O padrão usa o fluxo de [gerenciamento de usuários do Supabase](https://supabase.com/docs/guides/auth/managing-user-data).

Para cadastrar uma conta sem inventar endereço ou pedido de atendimento, endereço, bairro, cidade, motivo e tipo de atendimento passam a aceitar `NULL` em `beneficiarias`. A política do formulário público antigo continua exigindo seus campos originais. Cadastros anteriores não são alterados. O telefone editado no perfil é sincronizado com a beneficiária vinculada.

## Fluxo da usuária

1. **Cadastro:** informa dados pessoais, senha, confirmação e consentimento. Recebe a orientação para confirmar o e-mail. Contas duplicadas recebem uma mensagem neutra, sem expor a existência da conta.
2. **Login:** o perfil é consultado no banco para decidir o destino. As páginas protegidas validam o usuário com `auth.getUser()`; a RLS e as funções verificam a identidade no servidor.
3. **Início:** mostra próxima consulta, consultas realizadas, solicitações pendentes e próximos compromissos. Quando não há dados, exibe estados vazios.
4. **Minhas consultas:** exibe atendimento, profissional, data, horário, local, situação e orientação liberada à usuária.
5. **Minha agenda:** organiza compromissos futuros em Hoje, Próximos dias, Este mês e Mais adiante. As categorias não repetem compromissos. Canceladas e realizadas não entram na agenda futura.
6. **Solicitar atendimento:** escolhe serviço ativo e informa motivo, data, horário e observações. A preferência não é uma confirmação de consulta.
7. **Minhas solicitações:** acompanha serviço, data do pedido, preferência e status.
8. **Histórico:** exibe somente consultas realizadas.
9. **Meu perfil:** permite telefone e foto; nome, CPF, nascimento e e-mail são somente leitura. Correções de identidade são tratadas com a equipe. A foto fica privada e usa URL temporária.
10. **Notificações:** apresenta novidades persistidas no banco e permite marcar como lidas. O contador indica apenas as não lidas.

Os dados e o contador são atualizados a cada **30 segundos** com a aba visível, ao retornar à aba e pelo botão Atualizar. Não depende de habilitar Realtime no Supabase. Os formulários abertos não são recriados durante a atualização, preservando o que a pessoa está digitando. As notificações são mensagens dentro do site; não são push nem e-mails automáticos.

## Fluxo da equipe no painel existente

1. Em **Profissionais**, o administrador cadastra nome e especialidade. Nenhuma pessoa foi cadastrada automaticamente. Um profissional pode atuar sem ter uma conta Auth; o responsável interno pelo registro continua sendo `funcionario_id`.
2. Em **Solicitações das usuárias**, a equipe consulta os pedidos, abre detalhes e muda o status pelo botão Editar. Somente o status pode ser alterado depois do envio.
3. Ao definir **Aprovada**, aparece o botão **Agendar atendimento** naquela linha.
4. Esse botão abre o formulário de atendimentos existente, com a beneficiária, serviço e preferência preenchidos. A equipe confirma a data/hora, escolhe o profissional, informa local e registra a descrição interna. A validação do banco impede vincular uma solicitação a outra beneficiária.
5. O campo **Orientação visível à usuária** pode conter informações de preparação para o encontro. **Descrição interna** e **Observação interna** continuam privadas.
6. Para confirmar, reagendar, cancelar ou realizar, abra o atendimento e altere seu status. Para reagendar, altere também data/hora.
7. Ao marcar como **Realizada** ou pelo status antigo **Finalizado**, a solicitação vinculada passa a **Concluída**. A usuária recebe uma notificação de atualização e vê o encontro no histórico.

Uma solicitação aprovada pode originar mais de um atendimento, permitindo acompanhamento. Finalizar um desses atendimentos conclui o pedido de agendamento; não exclui outros encontros. Solicitações não têm exclusão pela interface, preservando sua vinculação e acompanhamento.

Os status antigos continuam válidos para preservar registros e fluxos anteriores. Na leitura individual:

| Status anterior           | Exibição para a usuária |
| ------------------------- | ----------------------- |
| `Pendente` / `Em análise` | Agendada                |
| `Em atendimento`          | Confirmada              |
| `Finalizado`              | Realizada               |

Novos atendimentos podem usar diretamente Agendada, Confirmada, Realizada, Cancelada e Reagendada. Os relatórios administrativos passam a incluir Realizada nas contagens de conclusão, mantendo Finalizado.

## Privacidade e políticas

RLS controla linhas; liberar a linha completa de um atendimento também liberaria notas internas. Por isso, a usuária **não recebe SELECT direto** de `atendimentos` ou `beneficiarias`. Sua agenda, consultas e histórico usam `minhas_consultas()`, que retorna apenas os campos permitidos e filtra pelo vínculo com `auth.uid()`. Essa função não aceita um ID de outra pessoa como parâmetro. `minhas_solicitacoes()` segue o mesmo padrão, preservando o nome do serviço mesmo se ele for desativado depois.

| Recurso               | Acesso da usuária                                                                       |
| --------------------- | --------------------------------------------------------------------------------------- |
| Perfil                | Ler o próprio; alterar telefone/foto, com trigger que bloqueia identidade e permissões. |
| Consultas e histórico | Função com projeção segura dos próprios atendimentos; nunca notas internas.             |
| Solicitações          | Inserir para si com status Pendente; ler as próprias; sem alterar status.               |
| Notificações          | Ler as próprias; atualizar somente `lida`; sem criar mensagens falsas.                  |
| Profissionais         | Sem leitura direta do cadastro; apenas o nome associado à própria consulta.             |
| Avatares              | Upload, leitura e remoção apenas no diretório do próprio UUID.                          |
| Documentos da equipe  | Sem acesso.                                                                             |

As funções com privilégios elevados têm `search_path` fixo e permissões explícitas. As políticas antigas de admin/funcionário permanecem. O papel público não pode se promover via formulário, atualização de perfil, metadados ou troca de ID no navegador.

**Históricos anteriores:** não são associados automaticamente pelo CPF nem por e-mail. Isso poderia liberar um histórico sensível para uma pessoa que informou dados de outra. Contas novas ganham um novo registro vinculado. Se houver duplicidade com um cadastro anterior, a administração deve verificar a identidade e tratar os vínculos de forma controlada no banco. A migração não toma essa decisão sozinha.

## Arquivos e código completo

O código completo está nos arquivos do projeto, pronto para revisão. Não é necessário copiar fragmentos deste guia para montar as páginas.

**Novas páginas:** `cadastro.html`, `area-usuario.html`, `minhas-consultas.html`, `agenda.html`, `minhas-solicitacoes.html`, `nova-solicitacao.html`, `historico.html`, `perfil.html`, `notificacoes.html`, `redefinir-senha.html`, `solicitacoes.html` e `profissionais.html`.

**Novos módulos:** [js/cadastro.js](js/cadastro.js), [js/usuario.js](js/usuario.js), [js/usuario-data.js](js/usuario-data.js) e [js/auth-routing.js](js/auth-routing.js). O estilo complementar está em [css/usuario.css](css/usuario.css).

**Banco:** [migração completa](database/migrations/002_area_usuario.sql) e [SQL de verificação](database/verificar-area-usuario.sql).

**Arquivos existentes alterados:** `login.html`, `js/login.js`, `js/dashboard.js`, `js/admin-schema.js`, `js/supabase-errors.js`, `vite.config.js`, testes administrativos e documentação. `js/supabase.js`, as credenciais, o SQL inicial e os dados existentes foram preservados.

**Configuração e apoio:** `vercel.json` e `scripts/create-user-pages.mjs`. O gerador cria somente as páginas novas; executar novamente sobrescreve essas páginas. Prefira editar os arquivos entregues e manter o template sincronizado caso escolha usar o gerador.

## Testes

```powershell
npm.cmd test
npm.cmd run test:e2e
npm.cmd run build
npm.cmd run dev
```

Os testes SQL executam o banco inicial e a nova migração em PostgreSQL via PGlite. Criam duas usuárias fictícias somente no banco local de testes e verificam criação atômica, preservação da equipe, isolamento, ausência de notas internas, proteção de perfil, vínculo de solicitações, notificações e avatares.

Os testes de navegador usam um cliente simulado, sem cadastrar pessoas, inserir dados ou enviar e-mails no Supabase real. Verificam o cadastro, redirecionamento por perfil, solicitação, edição de telefone, marcação de notificações, atualização automática, layout e agendamento pelo painel existente, em computador e celular.

Após publicar, faça também a validação de ponta a ponta com duas contas de teste autorizadas:

1. Cadastre A e B, confirme os e-mails e confira `role = usuario` no banco.
2. A solicita um serviço. B não deve ver o pedido.
3. Como equipe, aprove o pedido de A e agende. A deve ver a consulta; B não.
4. Reagende e aguarde até 30 segundos com a aba de A aberta. Confira data/status e notificação.
5. Preencha uma nota interna e uma orientação pública diferentes. Somente a orientação deve aparecer para A.
6. Finalize e confira histórico e solicitação concluída.
7. Atualize telefone e foto de A. Confira o telefone sincronizado e que B não lê o avatar de A.
8. Solicite recuperação de senha e confira que o e-mail abre `https://prjtmargarida.vercel.app/redefinir-senha.html`.
9. Saia e tente abrir as páginas individuais diretamente: deve voltar ao login. Uma usuária também não deve acessar o dashboard da equipe.

Se aparecer erro de schema/função, confira se a migração foi aplicada inteira. Não desative RLS para contornar permissões. Se o signup retornar erro de banco, confira os logs Auth e a trigger de cadastro; uma falha de validação nessa trigger reverte a criação da conta.
