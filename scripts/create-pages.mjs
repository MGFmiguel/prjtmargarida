// Generates the static HTML pages. Run again only when intentionally changing templates.
import { writeFileSync } from 'node:fs';
const head = (title, css = '') =>
  `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="theme-color" content="#9e4f5c"><title>${title} — Casa Mamãe Margarida</title><link rel="icon" href="/img/favicon.svg"><link rel="stylesheet" href="/css/style.css">${css}</head>`;
const field = (name, label, type = 'text', required = true, full = false, extra = '') =>
  `<label class="field ${full ? 'full' : ''}">${label}${required ? ' *' : ''}${type === 'textarea' ? `<textarea name="${name}" ${required ? 'required' : ''} maxlength="4000" ${extra}></textarea>` : `<input type="${type}" name="${name}" ${required ? 'required' : ''} ${type === 'text' ? 'maxlength="250"' : ''} ${extra}>`}</label>`;
const select = (name, label, options) =>
  `<label class="field">${label} *<select name="${name}" required><option value="">Selecione uma opção</option>${options.map((o) => `<option>${o}</option>`).join('')}</select></label>`;
const consent = `<label class="checkbox full"><input type="checkbox" name="consentimento" required>Autorizo o uso dos meus dados exclusivamente para fins de atendimento da instituição.</label><div hidden aria-hidden="true"><label>Deixe vazio<input name="website" tabindex="-1" autocomplete="off"></label></div>`;
const publicPage = (file, title, description, aside, table, fields, submit, before = '') =>
  writeFileSync(
    `${file}.html`,
    `${head(title)}<body><a class="skip-link" href="#conteudo">Pular para o conteúdo</a><header id="site-header"></header><main id="conteudo"><section class="page-hero"><div class="eyebrow">CUIDADO, RESPEITO E ACOLHIMENTO</div><h1>${title}</h1><p>${description}</p></section>${before}<div class="container form-layout"><aside class="info-card"><i data-lucide="heart-handshake"></i>${aside}</aside><form id="public-form" class="form-card" data-table="${table}"><h2>Vamos dar o primeiro passo?</h2><p class="form-intro">Preencha os campos abaixo. Os itens com * são obrigatórios.</p><div class="form-grid">${fields}${consent}</div><div class="form-actions"><button type="submit" class="button">${submit}<i data-lucide="arrow-up-right"></i></button></div><p class="form-status" role="status" aria-live="polite"></p></form></div></main><footer id="site-footer"></footer><script type="module" src="/js/forms.js"></script></body></html>`
  );
publicPage(
  'solicitar-atendimento',
  'Você não está sozinha.',
  'Estamos aqui para ouvir você. Conte um pouco sobre o que precisa e nossa equipe poderá orientar os próximos passos.',
  '<h2>Um espaço para acolher você.</h2><p>Seus dados serão acessados apenas pela equipe autorizada, para organizar sua solicitação.</p><p>O envio não confirma um agendamento. Aguarde o contato da instituição para combinar o atendimento.</p><p>Compartilhe somente as informações necessárias para este primeiro contato.</p><a href="contato.html">Precisa de ajuda com o formulário?</a>',
  'beneficiarias',
  field('nome', 'Nome completo', 'text', true, true, 'autocomplete="name" minlength="3"') +
    field('data_nascimento', 'Data de nascimento', 'date') +
    field('cpf', 'CPF', 'text', true, false, 'inputmode="numeric" placeholder="000.000.000-00"') +
    field(
      'telefone',
      'Telefone',
      'tel',
      true,
      false,
      'autocomplete="tel" pattern="[0-9()+ .\\-]{10,20}" placeholder="(92) 99999-9999"'
    ) +
    field('email', 'E-mail', 'email', false, false, 'autocomplete="email" maxlength="254"') +
    field('endereco', 'Endereço', 'text', true, true, 'autocomplete="street-address"') +
    field('bairro', 'Bairro') +
    field('cidade', 'Cidade') +
    `<label class="field full">Tipo de atendimento desejado *<select name="tipo_atendimento" required><option value="">Selecione um serviço</option></select></label>` +
    field('motivo_atendimento', 'Motivo do atendimento', 'textarea', true, true) +
    field('observacoes', 'Observações', 'textarea', false, true),
  'Enviar solicitação'
);
const donations = [
  ['qr-code', 'Pix', 'Entre em contato para confirmar os dados oficiais para doação.'],
  ['apple', 'Alimentos', 'Alimentos não perecíveis para apoiar mulheres e famílias.'],
  ['shirt', 'Roupas', 'Peças limpas e em bom estado de conservação.'],
  ['bath', 'Produtos de higiene', 'Itens de cuidado pessoal e higiene.'],
  ['notebook-pen', 'Materiais escolares', 'Materiais que abrem caminhos para a aprendizagem.'],
  ['hand-heart', 'Voluntariado', 'Seu tempo e seus talentos também transformam vidas.'],
];
publicPage(
  'doacoes',
  'Um gesto seu. Muitas possibilidades.',
  'Sua contribuição fortalece nossa rede de cuidado. Escolha como você gostaria de participar.',
  '<h2>A solidariedade floresce aqui.</h2><p>Preencha o formulário para manifestar sua intenção de ajudar. A equipe combinará com você a forma de entrega ou participação.</p><p>Para doar por Pix, solicite a chave oficial à instituição. Não há uma chave de pagamento configurada neste site.</p><a href="contato.html?assunto=Doação%20por%20Pix">Consultar dados para Pix</a>',
  'doacoes',
  field('nome_doador', 'Nome', 'text', true, true, 'autocomplete="name" minlength="3"') +
    field('telefone', 'Telefone', 'tel', true, false, 'pattern="[0-9()+ .\\-]{10,20}"') +
    field('email', 'E-mail', 'email', false) +
    select('tipo_doacao', 'Tipo de doação', [
      'Pix',
      'Alimentos',
      'Roupas',
      'Produtos de higiene',
      'Materiais escolares',
      'Voluntariado',
      'Outros',
    ]) +
    field('data_prevista', 'Data prevista', 'date', false) +
    field('descricao', 'Conte como gostaria de ajudar', 'textarea', true, true),
  'Quero contribuir',
  `<div class="container donation-options">${donations.map(([i, t, d]) => `<article class="donation-option"><i data-lucide="${i}"></i><h3>${t}</h3><p>${d}</p></article>`).join('')}</div>`
);
publicPage(
  'contato',
  'Vamos conversar?',
  'Dúvidas, sugestões ou vontade de fazer parte? Sua mensagem é bem-vinda.',
  '<h2>Uma conversa pode ser o começo.</h2><p>Use este canal para falar com a instituição. Nossa equipe responderá pelo e-mail ou telefone informado.</p><p>Para solicitar um serviço, utilize o formulário de atendimento.</p><a href="solicitar-atendimento.html">Solicitar atendimento</a>',
  'mensagens',
  field('nome', 'Nome', 'text', true, true, 'autocomplete="name" minlength="3"') +
    field('email', 'E-mail', 'email', true, false, 'autocomplete="email"') +
    field('telefone', 'Telefone', 'tel', false, false, 'pattern="[0-9()+ .\\-]{10,20}"') +
    field('assunto', 'Assunto', 'text', true, true) +
    field('mensagem', 'Mensagem', 'textarea', true, true),
  'Enviar mensagem'
);
for (const reset of [false, true]) {
  const title = reset ? 'Um novo acesso.' : 'Que bom ter você aqui.';
  writeFileSync(
    reset ? 'recuperar-senha.html' : 'login.html',
    `${head(reset ? 'Recuperar senha' : 'Entrar', '<link rel="stylesheet" href="/css/login.css">')}<body><main class="auth-page"><section class="auth-story"><div id="auth-brand"></div><div><div class="auth-flower"><i data-lucide="flower-2"></i></div><h1>Cuidar de quem cuida.<br><em>Transformar, juntas.</em></h1><p>Um espaço para organizar nosso trabalho e dedicar mais tempo ao que importa: acolher cada mulher.</p></div><p>Casa Mamãe Margarida · Acolhimento que transforma</p></section><section class="auth-main"><div class="auth-box"><div class="eyebrow">ÁREA DA EQUIPE</div><h2>${title}</h2><p>${reset ? 'Defina uma senha entre 6 e 12 caracteres.' : 'Entre com suas credenciais para acessar o painel.'}</p><form id="auth-form" data-mode="${reset ? 'reset' : 'login'}">${reset ? '' : field('email', 'E-mail', 'email', true, false, 'autocomplete="username" placeholder="seu@email.com"')}<label class="field">${reset ? 'Nova senha' : 'Senha'} *<span class="password-wrap"><input name="password" type="password" required ${reset ? 'minlength="6" maxlength="12" autocomplete="new-password"' : 'autocomplete="current-password"'} placeholder="${reset ? 'Crie sua nova senha' : 'Digite sua senha'}"><button type="button" id="toggle-password" class="icon-button" aria-label="Mostrar senha"><i data-lucide="eye"></i></button></span></label>${reset ? '<div style="height:24px"></div>' : '<div class="auth-options"><label class="checkbox"><input type="checkbox" name="remember">Manter sessão ativa</label><button id="forgot-password" type="button" class="text-button">Esqueci minha senha</button></div>'}<button type="submit" class="button">${reset ? 'Salvar nova senha' : 'Entrar no painel'}<i data-lucide="arrow-right"></i></button><p class="auth-status" id="auth-status" role="status"></p></form><p class="security-note"><i data-lucide="lock-keyhole"></i>Acesso exclusivo para a equipe autorizada</p><a class="auth-back" href="${reset ? 'login.html' : 'index.html'}"><i data-lucide="arrow-left"></i>${reset ? 'Voltar para entrar' : 'Voltar para o início'}</a></div></section></main><script type="module" src="/js/login.js"></script></body></html>`
  );
}
const adminPages = {
  dashboard: 'Dashboard',
  beneficiarias: 'Beneficiárias',
  atendimentos: 'Atendimentos',
  servicos: 'Serviços',
  projetos: 'Projetos',
  'gestao-doacoes': 'Doações',
  relatorios: 'Relatórios',
  usuarios: 'Usuários',
  configuracoes: 'Configurações',
  mensagens: 'Mensagens',
};
for (const [page, title] of Object.entries(adminPages))
  writeFileSync(
    `${page}.html`,
    `${head(title, '<link rel="stylesheet" href="/css/dashboard.css"><meta name="robots" content="noindex, nofollow">')}<body class="admin-body" data-page="${page}"><a class="skip-link" href="#admin-content">Pular para o conteúdo</a><aside id="sidebar" class="sidebar"></aside><div class="admin-main"><header id="admin-header" class="admin-header"></header><main id="admin-content" class="admin-content"><p class="loading" role="status">Verificando seu acesso…</p></main></div><script type="module" src="/js/dashboard.js"></script></body></html>`
  );
