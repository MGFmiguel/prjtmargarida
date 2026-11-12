import { icon, refreshIcons } from './utils.js';
export const brand = `<a class="brand" href="index.html" aria-label="Casa Mamãe Margarida — início"><span class="brand-symbol">${icon('flower-2')}</span><span>Casa Mamãe<strong>Margarida<span class="brand-dot">.</span></strong></span></a>`;
export function publicLayout() {
  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelector('#site-header').innerHTML =
    `<div class="topbar"><span>Um lugar de acolhimento. Um novo começo.</span><a href="doacoes.html">Faça parte dessa transformação ${icon('arrow-up-right')}</a></div><div class="nav-wrap container">${brand}<button class="menu-toggle icon-button" aria-label="Abrir menu" aria-expanded="false">${icon('ellipsis')}</button><nav aria-label="Menu principal"><a href="index.html" ${current === 'index.html' ? 'class="active" aria-current="page"' : ''}>Início</a><a href="index.html#sobre">Sobre nós</a><a href="index.html#cursos">Cursos</a><a href="index.html#projetos">Projetos</a><a href="voluntariado.html" ${current === 'voluntariado.html' ? 'class="active" aria-current="page"' : ''}>Voluntariado</a><a href="doacoes.html" ${current === 'doacoes.html' ? 'class="active"' : ''}>Doações</a><a href="contato.html" ${current === 'contato.html' ? 'class="active"' : ''}>Contato</a><a class="login-link" href="area-usuario.html">${icon('user-round')} Área da usuária</a><a class="button small" href="solicitar-atendimento.html">Solicitar atendimento ${icon('arrow-up-right')}</a></nav></div>`;
  document.querySelector('.menu-toggle').onclick = (e) => {
    const button = e.currentTarget;
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', open);
    document.querySelector('.nav-wrap nav').classList.toggle('open', open);
  };
  document.querySelectorAll('.nav-wrap nav a').forEach((a) =>
    a.addEventListener('click', () => {
      document.querySelector('.nav-wrap nav').classList.remove('open');
      document.querySelector('.menu-toggle').setAttribute('aria-expanded', 'false');
    })
  );
  window.addEventListener(
    'scroll',
    () => {
      const header = document.querySelector('#site-header');
      const currentScrollY = window.scrollY;

      if (window.matchMedia('(max-width: 950px)').matches) {
        header.classList.toggle('header-hidden', currentScrollY > 10);
      } else {
        header.classList.remove('header-hidden');
      }
    },
    { passive: true }
  );
  document.querySelector('#site-footer').innerHTML =
    `<div class="container footer-main"><div>${brand}<p>Acolhendo, orientando e<br>transformando vidas, juntas.</p></div><div><h3>A casa</h3><a href="index.html#sobre">Sobre nós</a><a href="index.html#cursos">Nossos cursos</a><a href="index.html#projetos">Projetos</a><a href="voluntariado.html">Voluntariado</a></div><div><h3>Vamos juntas</h3><a href="solicitar-atendimento.html">Solicitar atendimento</a><a href="doacoes.html">Quero ajudar</a><a href="contato.html">Fale com a gente</a></div><div class="footer-note">${icon('heart-handshake')}<p>Cada mulher merece ser ouvida,<br>respeitada e acolhida.</p><a href="area-usuario.html">Área da usuária ${icon('arrow-up-right')}</a><a href="login.html">Área da equipe ${icon('arrow-up-right')}</a></div></div><div class="container footer-bottom"><span>© ${new Date().getFullYear()} Casa Mamãe Margarida. Todos os direitos reservados.</span><button class="text-button" id="privacy">Privacidade e cuidado com seus dados</button></div>`;
  document.querySelector('#privacy').onclick = async () => {
    const { showDialog } = await import('./utils.js');
    showDialog(
      'Seus dados merecem cuidado',
      '<p>Os dados informados nos formulários são usados para responder à sua solicitação e organizar o atendimento. Informações pessoais são acessíveis apenas à equipe autorizada.</p><p>Você pode solicitar informações sobre o uso, a correção ou a exclusão dos seus dados pelo formulário de contato. Não envie documentos ou informações sensíveis que não sejam necessários ao atendimento.</p><a class="button" href="contato.html">Falar com a instituição</a>'
    );
  };
  refreshIcons();
}
