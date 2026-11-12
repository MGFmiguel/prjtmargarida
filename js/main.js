import { publicLayout } from './layout.js';
import { supabaseErrorMessage } from './supabase-errors.js';
import { supabase, configured } from './supabase.js';
import { services, projects } from './catalog.js';
import { icon, refreshIcons, escapeHTML as esc, showDialog, dateBR } from './utils.js';
publicLayout();
let serviceData = services.filter((service) =>
    /curso|oficina|capacita|educa|aprendiz/i.test(`${service.nome} ${service.descricao}`)
  ),
  projectData = projects;
function renderCourses() {
  const courses = serviceData;
  document.querySelector('#courses-list').innerHTML =
    courses
      .map(
        (course) =>
          `<article class="project-card"><div class="project-image">${course.imagem_url ? `<img src="${esc(safeImage(course.imagem_url))}" alt="" loading="lazy">` : icon(course.icon || 'book-open')}<span>CURSOS E OFICINAS</span></div><div class="project-copy"><h3>${esc(course.nome)}</h3><p class="card-description">${esc(course.descricao)}</p><button class="text-button read-more" type="button" data-read-more>Ler mais</button><div class="project-bottom"><span>${icon('calendar-days')} ${coursePeriod(course)}</span><span class="course-status">${esc(course.status || 'Inscrições abertas')}</span><button class="icon-button" data-course="${esc(course.id)}" aria-label="Detalhes de ${esc(course.nome)}">${icon('arrow-up-right')}</button></div></div></article>`
      )
      .join('') || '<p class="empty-state">Novos cursos serão divulgados em breve.</p>';
  bindReadMore(document.querySelector('#courses-list'));
  document.querySelectorAll('[data-course]').forEach(
    (button) =>
      (button.onclick = () => {
        const course = courses.find((item) => String(item.id) === button.dataset.course);
        const canEnroll =
          configured && (course.status || 'Inscrições abertas') === 'Inscrições abertas';
        showDialog(
          course.nome,
          `<p>${esc(course.descricao)}</p><p>Período: ${esc(coursePeriod(course))}. Status: ${esc(course.status || 'Inscrições abertas')}.</p>${canEnroll ? `<button class="button" type="button" data-enroll-course>Inscrever-se no curso ${icon('arrow-up-right')}</button><p class="form-status" data-enroll-status role="status"></p>` : `<p>Fale com a nossa equipe para saber sobre disponibilidade e próximas turmas.</p><a class="button" href="contato.html?assunto=${encodeURIComponent(course.nome)}">Tenho interesse ${icon('arrow-up-right')}</a>`}`
        );
        document.querySelector('[data-enroll-course]')?.addEventListener('click', async (event) => {
          const enrollButton = event.currentTarget;
          const next = `nova-solicitacao.html?servico_id=${encodeURIComponent(course.id)}`;
          const status = document.querySelector('[data-enroll-status]');
          enrollButton.disabled = true;
          try {
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            location.assign(
              data.session?.user ? next : `login.html?redirect=${encodeURIComponent(next)}`
            );
          } catch {
            status.textContent = 'Não foi possível verificar sua conta. Tente novamente.';
            enrollButton.disabled = false;
          }
        });
      })
  );
  refreshIcons();
}
function coursePeriod(course) {
  const start = course.data_inicio ? dateBR(course.data_inicio) : '';
  const end = course.data_fim ? dateBR(course.data_fim) : '';
  if (start && end) return `${start} a ${end}`;
  if (start) return `A partir de ${start}`;
  if (end) return `Até ${end}`;
  return 'Datas a confirmar';
}
function renderProjects() {
  document.querySelector('#projects-list').innerHTML =
    projectData
      .map(
        (p) =>
          `<article class="project-card"><div class="project-image">${p.imagem_url ? `<img src="${esc(safeImage(p.imagem_url))}" alt="" loading="lazy">` : icon('sprout')}<span>${esc(p.label || 'PROJETO DA CASA')}</span></div><div class="project-copy"><h3>${esc(p.nome)}</h3><p class="card-description">${esc(p.descricao)}</p><button class="text-button read-more" type="button" data-read-more>Ler mais</button><div class="project-bottom"><span>${icon('calendar-days')} ${p.data_inicio ? dateBR(p.data_inicio) + (p.data_fim ? ' a ' + dateBR(p.data_fim) : '') : 'Consulte a programação'}</span><button class="icon-button" data-project="${esc(p.id)}" aria-label="Detalhes de ${esc(p.nome)}">${icon('arrow-up-right')}</button></div></div></article>`
      )
      .join('') || '<p class="empty-state">Novos projetos serão divulgados em breve.</p>';
  bindReadMore(document.querySelector('#projects-list'));
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
function bindReadMore(container) {
  container.querySelectorAll('[data-read-more]').forEach((button) => {
    button.onclick = () => {
      const description = button.previousElementSibling;
      const expanded = description.classList.toggle('expanded');
      button.textContent = expanded ? 'Ler menos' : 'Ler mais';
    };
  });
}
function safeImage(url) {
  try {
    const parsed = new URL(url, location.origin);
    return parsed.protocol === 'https:' || parsed.origin === location.origin ? parsed.href : '';
  } catch {
    return '';
  }
}
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
    'Conteúdo ilustrativo. Cursos, projetos e programação serão confirmados pela instituição.';
}
renderCourses();
renderProjects();
