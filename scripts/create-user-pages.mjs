import { readFileSync, writeFileSync } from 'node:fs';
const head = (title) =>
  `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="theme-color" content="#9e4f5c"><meta name="robots" content="noindex,nofollow"><title>${title} — Casa Mamãe Margarida</title><link rel="icon" href="/img/favicon.svg"><link rel="stylesheet" href="/css/style.css">`;
const pages = {
  'area-usuario': 'Início',
  'minhas-consultas': 'Minhas consultas',
  agenda: 'Minha agenda',
  'minhas-solicitacoes': 'Minhas solicitações',
  'nova-solicitacao': 'Solicitar atendimento',
  historico: 'Histórico',
  perfil: 'Meu perfil',
  notificacoes: 'Notificações',
};
for (const [page, title] of Object.entries(pages))
  writeFileSync(
    `${page}.html`,
    `${head(title)}<link rel="stylesheet" href="/css/dashboard.css"><link rel="stylesheet" href="/css/usuario.css"></head><body class="admin-body user-body" data-page="${page}"><a class="skip-link" href="#user-content">Pular para o conteúdo</a><aside id="sidebar" class="sidebar"></aside><div class="admin-main"><header id="user-header" class="admin-header"></header><main id="user-content" class="admin-content"><p class="loading" role="status">Verificando seu acesso…</p></main></div><script type="module" src="/js/usuario.js"></script></body></html>`
  );
for (const [page, title] of Object.entries({
  solicitacoes: 'Solicitações das usuárias',
  profissionais: 'Profissionais',
}))
  writeFileSync(
    `${page}.html`,
    `${head(title)}<link rel="stylesheet" href="/css/dashboard.css"></head><body class="admin-body" data-page="${page}"><a class="skip-link" href="#admin-content">Pular para o conteúdo</a><aside id="sidebar" class="sidebar"></aside><div class="admin-main"><header id="admin-header" class="admin-header"></header><main id="admin-content" class="admin-content"><p class="loading">Verificando seu acesso…</p></main></div><script type="module" src="/js/dashboard.js"></script></body></html>`
  );
writeFileSync(
  'redefinir-senha.html',
  readFileSync('recuperar-senha.html', 'utf8')
    .replace('ÁREA DA EQUIPE', 'RECUPERAR MINHA CONTA')
    .replace(
      'Acesso exclusivo para a equipe autorizada',
      'Uma nova senha para acessar seu espaço com segurança'
    )
);
const field = (name, label, type, attrs = '') =>
  `<label class="field">${label} *<input name="${name}" type="${type}" required ${attrs}></label>`;
writeFileSync(
  'cadastro.html',
  `${head('Criar minha conta')}</head><body><a class="skip-link" href="#conteudo">Pular para o conteúdo</a><header id="site-header"></header><main id="conteudo"><section class="page-hero"><div class="eyebrow">UM NOVO COMEÇO, COM VOCÊ</div><h1>Seu espaço de <em>acolhimento.</em></h1><p>Crie sua conta para solicitar atendimento e acompanhar cada passo com a Casa.</p></section><div class="container form-layout"><aside class="info-card"><i data-lucide="heart-handshake"></i><h2>É bom ter você por perto.</h2><p>Suas informações são usadas para identificar seu cadastro e organizar seu atendimento.</p><p>Após criar a conta, confira seu e-mail. Consultas e horários serão confirmados pela equipe.</p><p>Já tem conta? <a href="login.html">Entrar no meu espaço</a></p></aside><form id="signup-form" class="form-card"><h2>Vamos nos conhecer?</h2><p class="form-intro">Os campos com * são obrigatórios.</p><div class="form-grid">${field('nome', 'Nome completo', 'text', 'autocomplete="name" minlength="3" maxlength="250"')}${field('data_nascimento', 'Data de nascimento', 'date')}${field('cpf', 'CPF', 'text', 'inputmode="numeric" maxlength="14" placeholder="000.000.000-00"')}${field('telefone', 'Telefone', 'tel', 'autocomplete="tel" pattern="[0-9()+ .\\-]{10,20}"')}${field('email', 'E-mail', 'email', 'autocomplete="email" maxlength="254"')}${field('password', 'Senha', 'password', 'autocomplete="new-password" minlength="12" maxlength="128"')}${field('confirm_password', 'Confirmar senha', 'password', 'autocomplete="new-password" minlength="12" maxlength="128"')}<p class="form-intro full">Use uma senha com pelo menos 12 caracteres.</p><label class="checkbox full"><input type="checkbox" name="consentimento" required>Autorizo o uso dos meus dados exclusivamente para cadastro e atendimento da instituição.</label></div><div class="form-actions"><button type="submit" class="button">Criar minha conta <i data-lucide="arrow-right"></i></button></div><p class="form-status" role="status" aria-live="polite"></p></form></div></main><footer id="site-footer"></footer><script type="module" src="/js/cadastro.js"></script></body></html>`
);
