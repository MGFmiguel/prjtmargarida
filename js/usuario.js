import { supabase, configured } from './supabase.js';
import { brand } from './layout.js';
import { icon, refreshIcons, escapeHTML as esc, dateBR, notify, showDialog } from './utils.js';
import { supabaseErrorMessage } from './supabase-errors.js';
import { destinationForRole } from './auth-routing.js';
import { upcomingAppointments, agendaGroups } from './usuario-data.js';

const page = document.body.dataset.page;
const content = document.querySelector('#user-content');
const navigation = [
  ['area-usuario', 'house', 'Início'],
  ['minhas-consultas', 'calendar-heart', 'Minhas consultas'],
  ['agenda', 'calendar-days', 'Minha agenda'],
  ['minhas-solicitacoes', 'clipboard-list', 'Minhas solicitações'],
  ['historico', 'history', 'Histórico'],
  ['perfil', 'user-round', 'Meu perfil'],
  ['notificacoes', 'bell', 'Notificações'],
];
let user,
  profile,
  appointments = [],
  requests = [],
  courses = [],
  notifications = [],
  busy = false,
  timer;
const timeBR = (value) =>
  new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const badge = (status) =>
  `<span class="badge ${['Realizada', 'Aprovada', 'Concluída', 'Confirmada'].includes(status) ? 'green' : ['Cancelada', 'Recusada'].includes(status) ? 'pink' : ''}">${esc(status)}</span>`;
const empty = (text) => `<p class="empty-state">${esc(text)}</p>`;
async function all(query) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await query().range(offset, offset + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
function heading(title, description) {
  return `<div class="user-heading"><div><div class="eyebrow">SEU ESPAÇO DE ACOLHIMENTO</div><h1>${esc(title)}</h1><p>${esc(description)}</p></div><a class="button" href="nova-solicitacao.html">Solicitar atendimento ${icon('plus')}</a></div>`;
}
function shell() {
  document.querySelector('#sidebar').innerHTML =
    `${brand}<p class="sidebar-label">MEU ESPAÇO NA CASA</p><nav aria-label="Menu da usuária">${navigation.map(([key, i, label]) => `<a href="${key}.html" class="${key === page ? 'active' : ''}" ${key === page ? 'aria-current="page"' : ''}>${icon(i)}${label}${key === 'notificacoes' ? '<span id="notification-count" class="notification-count" hidden></span>' : ''}</a>`).join('')}</nav><a class="button small" style="margin-top:22px" href="nova-solicitacao.html">Solicitar atendimento</a><button class="logout" id="user-logout">${icon('log-out')}Sair da conta</button>`;
  document.querySelector('#user-header').innerHTML =
    `<button class="icon-button admin-menu-button" id="user-menu" aria-label="Abrir menu da usuária" aria-expanded="false">${icon('menu')}</button><span>Casa Mamãe Margarida / Meu espaço</span><div class="user-chip"><span>${esc(profile.nome[0])}</span><div>${esc(profile.nome)}<small>Bem-vinda à Casa</small></div></div>`;
  const toggle = document.querySelector('#user-menu');
  toggle.onclick = () => {
    const open = document.querySelector('#sidebar').classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  };
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#sidebar, #user-menu')) {
      document.querySelector('#sidebar').classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelector('#sidebar').classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
  document.querySelector('#user-logout').onclick = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) notify('Não foi possível sair. Tente novamente.', true);
    else location.replace('login.html');
  };
  refreshIcons();
}
function appointmentCard(row, compact = false) {
  const date = new Date(row.data_atendimento);
  return `<article class="appointment-card"><div class="appointment-date"><strong>${date.getDate()}</strong><small>${date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</small></div><div class="appointment-info"><h3>${esc(row.tipo_atendimento)}</h3><p>${esc(row.profissional || 'Profissional a confirmar')}</p><div class="appointment-meta"><span>${icon('clock-3')}${timeBR(row.data_atendimento)}</span><span>${icon('map-pin')}${esc(row.local || 'Local a confirmar')}</span></div>${!compact && row.observacao_usuario ? `<p>${esc(row.observacao_usuario)}</p>` : ''}</div>${badge(row.status)}</article>`;
}
function renderCourses() {
  const list = courses
    .map(
      (course) =>
        `<article class="project-card"><div class="project-image">${course.imagem_url ? `<img src="${esc(course.imagem_url)}" alt="" loading="lazy">` : icon('book-open')}<span>CURSOS E OFICINAS</span></div><div class="project-copy"><h3>${esc(course.nome)}</h3><p class="card-description">${esc(course.descricao || '')}</p><button class="text-button read-more" type="button" data-read-more>Ler mais</button><div class="project-bottom"><span>${icon('calendar-days')} ${coursePeriod(course)}</span><span class="course-status">${esc(course.status || 'Inscrições abertas')}</span><button class="icon-button" data-user-course="${esc(course.id)}" aria-label="Detalhes de ${esc(course.nome)}">${icon('arrow-up-right')}</button></div></div></article>`
    )
    .join('');
  return list || empty('Novos cursos serão divulgados em breve.');
}
function coursePeriod(course) {
  const start = course.data_inicio ? dateBR(course.data_inicio) : '';
  const end = course.data_fim ? dateBR(course.data_fim) : '';
  if (start && end) return `${start} a ${end}`;
  if (start) return `A partir de ${start}`;
  if (end) return `Até ${end}`;
  return 'Datas a confirmar';
}
function updateBadge() {
  const count = notifications.filter((n) => !n.lida).length;
  const node = document.querySelector('#notification-count');
  node.textContent = String(count);
  node.hidden = count === 0;
  node.setAttribute('aria-label', `${count} notificações não lidas`);
}
function renderData() {
  const next = upcomingAppointments(appointments);
  if (page === 'area-usuario') {
    content.innerHTML = `<section class="user-welcome"><div><div class="eyebrow">É BOM TER VOCÊ AQUI</div><h1>Olá, ${esc(profile.nome.split(' ')[0])}.</h1><p>Este espaço é seu. Acompanhe seus atendimentos, veja sua agenda e conte com a Casa no próximo passo.</p></div>${icon('flower-2')}</section><div class="metric-grid"><article class="metric"><div class="metric-top">Próxima consulta ${icon('calendar-heart')}</div><strong>${next[0] ? dateBR(next[0].data_atendimento) : 'A agendar'}</strong><small>${next[0] ? timeBR(next[0].data_atendimento) : 'Solicite seu primeiro atendimento'}</small></article><article class="metric"><div class="metric-top">Consultas realizadas ${icon('circle-check')}</div><strong>${appointments.filter((a) => a.status === 'Realizada').length}</strong></article><article class="metric"><div class="metric-top">Solicitações pendentes ${icon('clock-3')}</div><strong>${requests.filter((r) => ['Pendente', 'Em análise'].includes(r.status)).length}</strong></article><article class="metric"><div class="metric-top">Próximos compromissos ${icon('calendar-days')}</div><strong>${next.length}</strong></article></div><div class="user-content-grid"><section class="panel"><h2>Seus próximos passos</h2><div class="appointment-list">${
      next
        .slice(0, 3)
        .map((a) => appointmentCard(a, true))
        .join('') || empty('Quando um atendimento for agendado, ele aparecerá aqui.')
    }</div><a class="button" style="margin-top:20px" href="nova-solicitacao.html">Solicitar atendimento ${icon('arrow-up-right')}</a></section><section class="panel"><h2>Novidades para você</h2>${notifications.slice(0, 3).map(notificationCard).join('') || empty('Nenhuma novidade por enquanto.')}<a class="text-button" href="notificacoes.html">Ver todas as notificações</a></section></div><section class="user-courses"><div class="section-heading"><div><div class="eyebrow">APRENDIZADO E NOVAS POSSIBILIDADES</div><h2>Cursos para você</h2></div><a class="text-button arrow-link" href="index.html#cursos">Ver no site ${icon('arrow-up-right')}</a></div><div class="project-grid">${renderCourses()}</div></section>`;
    content.querySelectorAll('[data-read-more]').forEach((button) => {
      button.onclick = () => {
        const description = button.previousElementSibling;
        const expanded = description.classList.toggle('expanded');
        button.textContent = expanded ? 'Ler menos' : 'Ler mais';
      };
    });
    document.querySelectorAll('[data-user-course]').forEach((button) => {
      button.onclick = () => {
        const course = courses.find((item) => String(item.id) === button.dataset.userCourse);
        showDialog(
          course.nome,
          `<p>${esc(course.descricao || '')}</p><p>Período: ${esc(coursePeriod(course))}. Status: ${esc(course.status || 'Inscrições abertas')}.</p><p>Fale com a nossa equipe para saber sobre disponibilidade e próximas turmas.</p><a class="button" href="contato.html?assunto=${encodeURIComponent(course.nome)}">Tenho interesse ${icon('arrow-up-right')}</a>`
        );
      };
    });
  } else if (page === 'minhas-consultas') {
    content.innerHTML =
      heading('Minhas consultas', 'Datas, horários e informações dos seus atendimentos.') +
      `<div class="appointment-list">${
        [...appointments]
          .sort((a, b) => new Date(b.data_atendimento) - new Date(a.data_atendimento))
          .map((a) => appointmentCard(a))
          .join('') || empty('Você ainda não tem consultas registradas.')
      }</div>`;
  } else if (page === 'agenda') {
    content.innerHTML =
      heading('Minha agenda', 'Seus próximos compromissos, organizados para você.') +
      Object.entries(agendaGroups(appointments))
        .map(
          ([name, list]) =>
            `<section><h2 class="section-label">${name}</h2><div class="appointment-list">${list.map((a) => appointmentCard(a)).join('') || empty('Nenhum compromisso neste período.')}</div></section>`
        )
        .join('');
  } else if (page === 'historico') {
    content.innerHTML =
      heading('Meu histórico', 'Os atendimentos realizados ao longo da sua caminhada.') +
      `<div class="appointment-list">${
        appointments
          .filter((a) => a.status === 'Realizada')
          .map((a) => appointmentCard(a))
          .join('') || empty('Seus atendimentos realizados aparecerão aqui.')
      }</div>`;
  } else if (page === 'minhas-solicitacoes') {
    content.innerHTML =
      heading('Minhas solicitações', 'Acompanhe a análise dos seus pedidos de atendimento.') +
      (requests.length
        ? `<div class="table-wrap"><table><thead><tr><th>Serviço</th><th>Solicitada em</th><th>Preferência</th><th>Status</th></tr></thead><tbody>${requests.map((r) => `<tr><td>${esc(r.servico)}</td><td>${dateBR(r.created_at)}</td><td>${dateBR(r.data_preferencia)} às ${esc(r.horario_preferencia?.slice(0, 5))}</td><td>${badge(r.status)}</td></tr>`).join('')}</tbody></table></div>`
        : empty('Você ainda não enviou solicitações.'));
  } else if (page === 'notificacoes') {
    content.innerHTML =
      heading('Notificações', 'As atualizações da Casa, reunidas em um só lugar.') +
      (notifications.map(notificationCard).join('') || empty('Você não tem notificações.'));
  }
  if (!['perfil', 'nova-solicitacao'].includes(page))
    content.insertAdjacentHTML(
      'afterbegin',
      '<div class="user-refresh"><span id="updated-at" role="status">Atualizado agora · atualização automática a cada 30 segundos</span><button class="text-button" id="refresh-data">Atualizar</button></div>'
    );
  document.querySelector('#refresh-data')?.addEventListener('click', () => refreshData());
  document.querySelectorAll('[data-read]').forEach(
    (button) =>
      (button.onclick = async () => {
        button.disabled = true;
        const { error, data } = await supabase
          .from('notificacoes')
          .update({ lida: true })
          .eq('id', button.dataset.read)
          .eq('usuario_id', user.id)
          .select('id')
          .single();
        if (error || !data) {
          notify('Não foi possível atualizar a notificação.', true);
          button.disabled = false;
        } else await refreshData();
      })
  );
  refreshIcons();
}
function notificationCard(n) {
  return `<article class="notification-item ${n.lida ? '' : 'unread'}"><h3>${esc(n.titulo)}</h3><p>${esc(n.mensagem)}</p><footer><span>${dateBR(n.created_at)} · ${n.lida ? 'Lida' : 'Não lida'}</span>${n.lida ? '' : `<button class="text-button" data-read="${esc(n.id)}">Marcar como lida</button>`}</footer></article>`;
}
async function refreshData(initial = false) {
  if (busy) return;
  busy = true;
  try {
    const { data: current, error: profileError } = await supabase
      .from('perfis')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (current?.role !== 'usuario') {
      location.replace(destinationForRole(current?.role) || 'login.html');
      return;
    }
    profile = current;
    const values = await Promise.all([
      all(() => supabase.rpc('minhas_consultas')),
      all(() => supabase.rpc('minhas_solicitacoes')),
      all(() =>
        supabase
          .from('notificacoes')
          .select('id,titulo,mensagem,lida,created_at')
          .eq('usuario_id', user.id)
          .order('created_at', { ascending: false })
          .order('id')
      ),
    ]);
    [appointments, requests, notifications] = values;
    courses = page === 'area-usuario'
      ? await all(() => supabase.from('servicos').select('id,nome,descricao,imagem_url,data_inicio,data_fim,status').eq('ativo', true).order('created_at'))
      : [];
    for (const course of courses) {
      if (course.imagem_url && !course.imagem_url.startsWith('https://')) {
        const { data } = await supabase.storage
          .from('casa-mamae-margarida')
          .createSignedUrl(course.imagem_url, 3600);
        course.imagem_url = data?.signedUrl || '';
      }
    }
    updateBadge();
    if (!['perfil', 'nova-solicitacao'].includes(page)) renderData();
  } catch (error) {
    const message = supabaseErrorMessage(
      error,
      'Não foi possível atualizar seus dados. Tente novamente.'
    );
    if (initial) throw error;
    const label = document.querySelector('#updated-at');
    if (label)
      label.textContent =
        'Não foi possível atualizar. Os dados exibidos podem estar desatualizados.';
    notify(message, true);
  } finally {
    busy = false;
  }
}
async function renderRequest() {
  const services = await all(() =>
    supabase.from('servicos').select('id,nome,descricao').eq('ativo', true).order('nome').order('id')
  );
  content.innerHTML =
    heading(
      'Solicitar atendimento',
      'Conte como podemos ajudar. A preferência de horário não confirma um agendamento.'
    ) +
    `<form class="form-card user-form" id="request-form"><div class="form-grid"><label class="field full">Serviço desejado *<select name="servico_id" required><option value="">Selecione um serviço</option>${services.map((s) => `<option value="${esc(s.id)}">${esc(s.nome)}</option>`).join('')}</select></label><label class="field full">Motivo *<textarea name="motivo" required minlength="3" maxlength="4000"></textarea></label><label class="field">Data de preferência *<input name="data_preferencia" type="date" required min="${new Date().toLocaleDateString('en-CA')}"></label><label class="field">Horário de preferência *<input name="horario_preferencia" type="time" required></label><label class="field full">Observações<textarea name="observacoes" maxlength="4000"></textarea></label></div><div class="form-actions"><button class="button" type="submit" ${services.length ? '' : 'disabled'}>Enviar solicitação ${icon('arrow-right')}</button></div><p class="form-status" role="status">${services.length ? '' : 'Os serviços serão disponibilizados pela equipe. Tente novamente mais tarde.'}</p></form>`;
  document.querySelector('#request-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget,
      button = form.querySelector('button');
    button.disabled = true;
    try {
      const payload = Object.fromEntries(new FormData(form));
      payload.usuario_id = user.id;
      payload.motivo = payload.motivo.trim();
      payload.observacoes = payload.observacoes.trim() || null;
      const { error } = await supabase.from('solicitacoes').insert(payload);
      if (error) throw error;
      location.assign('minhas-solicitacoes.html');
    } catch (error) {
      form.querySelector('.form-status').textContent = supabaseErrorMessage(error);
      button.disabled = false;
    }
  };
  refreshIcons();
}
async function renderProfile() {
  let photo = '';
  if (profile.foto_url) {
    const { data } = await supabase.storage
      .from('casa-mamae-margarida')
      .createSignedUrl(profile.foto_url, 3600);
    photo = data?.signedUrl || '';
  }
  content.innerHTML =
    heading('Meu perfil', 'Confira seu cadastro e mantenha seu telefone atualizado.') +
    `<form class="form-card user-form" id="profile-form"><div class="profile-intro">${photo ? `<img class="profile-photo" src="${esc(photo)}" alt="Sua foto de perfil">` : `<span class="profile-photo profile-placeholder">${esc(profile.nome[0])}</span>`}<div><h2>${esc(profile.nome)}</h2><p class="form-intro">Seu espaço, com privacidade.</p></div></div><div class="form-grid">${[
      ['nome', 'Nome'],
      ['data_nascimento', 'Data de nascimento'],
      ['cpf', 'CPF'],
      ['email', 'E-mail'],
    ]
      .map(
        ([key, label]) =>
          `<label class="field">${label}<input readonly value="${esc(key === 'data_nascimento' ? dateBR(profile[key]) : profile[key] || 'Não informado')}"></label>`
      )
      .join(
        ''
      )}<label class="field">Telefone *<input name="telefone" type="tel" value="${esc(profile.telefone)}" pattern="[0-9()+ .\-]{10,20}" required></label><label class="field">Foto de perfil<input type="file" name="foto" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG ou WebP, até 5 MB. Visível somente com autorização.</small></label></div><p class="form-intro" style="margin-top:18px">Para corrigir nome, nascimento, CPF ou e-mail, <a class="text-button" href="contato.html">fale com a instituição</a>.</p><div class="form-actions"><button class="button" type="submit">Salvar alterações ${icon('check')}</button></div><p class="form-status" role="status"></p></form>`;
  document.querySelector('#profile-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget,
      button = form.querySelector('button');
    button.disabled = true;
    let uploaded,
      committed = false;
    try {
      const values = { telefone: form.elements.telefone.value.trim() };
      const file = form.elements.foto.files[0];
      if (file) {
        const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
        if (!ext || file.size > 5 * 1024 * 1024)
          throw new Error('Escolha uma imagem JPG, PNG ou WebP de até 5 MB.');
        uploaded = `avatares/${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from('casa-mamae-margarida')
          .upload(uploaded, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        values.foto_url = uploaded;
      }
      const { data, error } = await supabase
        .from('perfis')
        .update(values)
        .eq('user_id', user.id)
        .select('id')
        .single();
      if (error || !data) throw error || new Error('Não foi possível salvar.');
      committed = true;
      if (uploaded && profile.foto_url)
        await supabase.storage.from('casa-mamae-margarida').remove([profile.foto_url]);
      Object.assign(profile, values);
      if (uploaded) {
        const { data: image } = await supabase.storage
          .from('casa-mamae-margarida')
          .createSignedUrl(uploaded, 3600);
        if (image?.signedUrl)
          form.querySelector('.profile-photo').outerHTML =
            `<img class="profile-photo" src="${esc(image.signedUrl)}" alt="Sua foto de perfil">`;
        form.elements.foto.value = '';
      }
      form.querySelector('.form-status').textContent = 'Perfil atualizado com sucesso.';
      form.querySelector('.form-status').className = 'form-status success';
      notify('Perfil atualizado.');
    } catch (error) {
      if (uploaded && !committed)
        await supabase.storage.from('casa-mamae-margarida').remove([uploaded]);
      form.querySelector('.form-status').textContent = supabaseErrorMessage(error, error.message);
    } finally {
      button.disabled = false;
    }
  };
  refreshIcons();
}
async function init() {
  if (!configured) {
    content.innerHTML = empty('A conexão precisa ser configurada pela instituição.');
    return;
  }
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      location.replace('login.html');
      return;
    }
    user = data.user;
    const result = await supabase.from('perfis').select('*').eq('user_id', user.id).maybeSingle();
    if (result.error) throw result.error;
    profile = result.data;
    if (profile?.role !== 'usuario') {
      location.replace(destinationForRole(profile?.role) || 'login.html');
      return;
    }
    shell();
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearInterval(timer);
        content.replaceChildren();
        location.replace('login.html');
      }
    });
    await refreshData(true);
    if (page === 'nova-solicitacao') await renderRequest();
    if (page === 'perfil') await renderProfile();
    timer = setInterval(() => {
      if (!document.hidden) refreshData();
    }, 30000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshData();
    });
    window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
  } catch (error) {
    content.innerHTML = `<div class="panel"><h2>Não foi possível carregar seu espaço</h2><p>${esc(supabaseErrorMessage(error))}</p><a class="button button-outline" href="login.html" style="margin-top:20px">Voltar ao login</a></div>`;
  }
}
await init();
