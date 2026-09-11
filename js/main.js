import { publicLayout } from './layout.js';
import { supabaseErrorMessage } from './supabase-errors.js';
import { supabase, configured } from './supabase.js';
import { services, projects } from './catalog.js';
import { icon, refreshIcons, escapeHTML as esc, showDialog, dateBR } from './utils.js';
publicLayout();
let serviceData = services,
  projectData = projects,
  expanded = false;
function renderServices() {
  document.querySelector('#services-list').innerHTML =
    serviceData
      .slice(0, expanded ? undefined : 4)
      .map(
        (s, i) =>
          `<article class="service-card"><span class="service-icon tone-${i % 4}">${icon(s.icon || ['hand-heart', 'brain', 'scissors', 'scale'][i % 4])}</span><h3>${esc(s.nome)}</h3><p>${esc(s.descricao)}</p><button class="text-button arrow-link" data-service="${esc(s.id)}">Saiba mais ${icon('arrow-up-right')}</button></article>`
      )
      .join('') || '<p class="empty-state">Os serviços serão publicados em breve.</p>';
  document.querySelectorAll('[data-service]').forEach(
    (button) =>
      (button.onclick = () => {
        const s = serviceData.find((s) => String(s.id) === button.dataset.service);
        showDialog(
          s.nome,
          `<p>${esc(s.descricao)}</p><p>Conte para a nossa equipe como podemos ajudar. A disponibilidade e os próximos passos serão confirmados após a análise da sua solicitação.</p><a class="button" href="solicitar-atendimento.html?servico=${encodeURIComponent(s.nome)}">Solicitar atendimento ${icon('arrow-up-right')}</a>`
        );
      })
  );
  refreshIcons();
}
function renderProjects() {
  document.querySelector('#projects-list').innerHTML =
    projectData
      .map(
        (p) =>
          `<article class="project-card"><div class="project-image">${p.imagem_url ? `<img src="${esc(safeImage(p.imagem_url))}" alt="" loading="lazy">` : icon('sprout')}<span>${esc(p.label || 'PROJETO DA CASA')}</span></div><div class="project-copy"><h3>${esc(p.nome)}</h3><p>${esc(p.descricao)}</p><div class="project-bottom"><span>${icon('calendar-days')} ${p.data_inicio ? dateBR(p.data_inicio) + (p.data_fim ? ' a ' + dateBR(p.data_fim) : '') : 'Consulte a programação'}</span><button class="icon-button" data-project="${esc(p.id)}" aria-label="Detalhes de ${esc(p.nome)}">${icon('arrow-up-right')}</button></div></div></article>`
      )
      .join('') || '<p class="empty-state">Novos projetos serão divulgados em breve.</p>';
  document.querySelectorAll('[data-project]').forEach(
    (button) =>
      (button.onclick = () => {
        const p = projectData.find((p) => String(p.id) === button.dataset.project);
        showDialog(
          p.nome,
          `<p>${esc(p.descricao)}</p><p>Período: ${p.data_inicio ? dateBR(p.data_inicio) : 'a confirmar'}${p.data_fim ? ' até ' + dateBR(p.data_fim) : ''}.</p><a class="button" href="contato.html?assunto=${encodeURIComponent(p.nome)}">Tenho interesse ${icon('arrow-up-right')}</a>`
        );
      })
  );
  refreshIcons();
}
function safeImage(url) {
  try {
    const parsed = new URL(url, location.origin);
    return parsed.protocol === 'https:' || parsed.origin === location.origin ? parsed.href : '';
  } catch {
    return '';
  }
}
document.querySelector('#all-services').onclick = () => {
  expanded = !expanded;
  renderServices();
  document.querySelector('#all-services').innerHTML =
    `${expanded ? 'Mostrar menos serviços' : 'Conheça todos os serviços'} ${icon(expanded ? 'arrow-up' : 'arrow-right')}`;
  refreshIcons();
};
const tabText = {
  missao:
    'Acolher e fortalecer mulheres, oferecendo cuidado, orientação e oportunidades para transformar suas próprias histórias.',
  visao:
    'Ser um espaço de referência em acolhimento e promoção da autonomia das mulheres, contribuindo para uma comunidade mais justa e solidária.',
  valores:
    'Respeito, empatia, dignidade, inclusão, ética e compromisso com a autonomia de cada mulher.',
};
const tabs = [...document.querySelectorAll('[data-tab]')];
tabs.forEach((tab, index) => {
  tab.onclick = () => {
    tabs.forEach((t) => {
      t.setAttribute('aria-selected', String(t === tab));
      t.tabIndex = t === tab ? 0 : -1;
    });
    document.querySelector('#about-panel').textContent = tabText[tab.dataset.tab];
    document.querySelector('#about-panel').setAttribute('aria-labelledby', tab.id);
  };
  tab.onkeydown = (e) => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      const next =
        e.key === 'Home'
          ? 0
          : e.key === 'End'
            ? tabs.length - 1
            : (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].click();
      tabs[next].focus();
    }
  };
});
if (configured) {
  try {
    const [s, p] = await Promise.all([
      supabase.from('servicos').select('*').eq('ativo', true).order('created_at'),
      supabase.from('projetos').select('*').eq('status', 'Ativo').order('created_at'),
    ]);
    if (s.error || p.error) throw s.error || p.error;
    serviceData = s.data;
    projectData = p.data;
    for (const item of [...serviceData, ...projectData])
      if (item.imagem_url && !item.imagem_url.startsWith('https://')) {
        const { data } = await supabase.storage
          .from('casa-mamae-margarida')
          .createSignedUrl(item.imagem_url, 3600);
        item.imagem_url = data?.signedUrl || '';
      }
  } catch (error) {
    serviceData = [];
    projectData = [];
    document.querySelector('#catalog-note').textContent = supabaseErrorMessage(
      error,
      'Não foi possível carregar o catálogo. Tente novamente mais tarde.'
    );
  }
} else {
  document.querySelector('#catalog-note').textContent =
    'Conteúdo ilustrativo. Serviços, projetos e programação serão confirmados pela instituição.';
}
renderServices();
renderProjects();
