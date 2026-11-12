import { supabase, configured } from './supabase.js';
import { brand } from './layout.js';
import { icon, refreshIcons, escapeHTML as esc, dateBR, notify, showDialog } from './utils.js';
import { schemas, appointmentStatuses as statuses } from './admin-schema.js';
import { supabaseErrorMessage } from './supabase-errors.js';
const page = document.body.dataset.page;
const schemaPage = page === 'cursos' ? 'servicos' : page;
const content = document.querySelector('#admin-content');
let profile,
  user,
  rows = [],
  linkedBeneficiaries = [],
  professionals = [],
  currentPage = 1;
const pageSize = 12;
const isAdmin = () => profile?.role === 'admin';
const navigation = [
  ['dashboard', 'layout-dashboard', 'Dashboard'],
  ['beneficiarias', 'users-round', 'Beneficiárias'],
  ['atendimentos', 'calendar-heart', 'Atendimentos'],
  ['solicitacoes', 'clipboard-list', 'Solicitações das usuárias'],
  ['profissionais', 'contact-round', 'Profissionais'],
  ['cursos', 'book-open', 'Cursos'],
  ['projetos', 'sprout', 'Projetos'],
  ['gestao-doacoes', 'gift', 'Doações', true],
  ['relatorios', 'chart-no-axes-combined', 'Relatórios', true],
  ['mensagens', 'mail', 'Mensagens', true],
  ['usuarios', 'user-round-cog', 'Usuários', true],
  ['configuracoes', 'settings-2', 'Configurações', true],
];
function accessMessage(title, message) {
  content.innerHTML = `<div class="access-message"><div class="eyebrow">ÁREA DA EQUIPE</div><h1>${esc(title)}</h1><p>${esc(message)}</p><a class="button" href="login.html">Ir para o login ${icon('arrow-right')}</a></div>`;
  refreshIcons();
}
async function init() {
  if (!configured) {
    accessMessage(
      'Conexão não configurada',
      'Configure as variáveis do Supabase seguindo o README para habilitar o painel. Nenhum dado pessoal é carregado neste modo.'
    );
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
    profile = result.data;
    if (result.error) throw result.error;
    if (profile?.role === 'usuario') {
      location.replace('area-usuario.html');
      return;
    }
    if (result.error || !['admin', 'funcionario'].includes(profile?.role)) {
      accessMessage(
        'Acesso não autorizado',
        'Seu usuário precisa ser autorizado pela administração da instituição.'
      );
      return;
    }
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        content.replaceChildren();
        location.replace('login.html');
      }
    });
    renderShell();
    if (navigation.find((n) => n[0] === page)?.[3] && !isAdmin()) {
      accessMessage('Área restrita', 'Esta página está disponível apenas para administradores.');
      return;
    }
    if (page === 'dashboard' || page === 'relatorios') await renderDashboard();
    else if (page === 'configuracoes') await renderSettings();
    else await renderCollection();
  } catch (error) {
    content.innerHTML = `<p class="empty-state">${esc(supabaseErrorMessage(error, 'Não foi possível carregar os dados. Verifique a conexão e recarregue a página.'))}</p>`;
  }
}
function renderShell() {
  document.querySelector('#sidebar').innerHTML =
    `${brand}<p class="sidebar-label">ESPAÇO DA EQUIPE</p><nav aria-label="Menu administrativo">${navigation
      .filter((n) => !n[3] || isAdmin())
      .map(
        ([key, i, label]) =>
          `<a href="${key}.html" class="${key === page ? 'active' : ''}" ${key === page ? 'aria-current="page"' : ''}>${icon(i)}${label}</a>`
      )
      .join('')}</nav><button class="logout" id="logout">${icon('log-out')}Sair da conta</button>`;
  document.querySelector('#admin-header').innerHTML =
    `<button class="icon-button admin-menu-button" id="admin-menu" aria-label="Abrir menu administrativo" aria-expanded="false">${icon('menu')}</button><span>Casa Mamãe Margarida <span aria-hidden="true">/</span> ${navigation.find((n) => n[0] === page)?.[2] || ''}</span><div class="user-chip"><span>${esc(profile.nome[0])}</span><div>${esc(profile.nome)}<small>${isAdmin() ? 'Administradora / Administrador' : 'Equipe de atendimento'}</small></div></div>`;
  document.querySelector('#admin-menu').onclick = (e) => {
    const open = document.querySelector('#sidebar').classList.toggle('open');
    e.currentTarget.setAttribute('aria-expanded', String(open));
  };
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#sidebar, #admin-menu')) {
      document.querySelector('#sidebar').classList.remove('open');
      document.querySelector('#admin-menu').setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelector('#sidebar').classList.remove('open');
      document.querySelector('#admin-menu').setAttribute('aria-expanded', 'false');
    }
  });
  document.querySelector('#logout').onclick = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) notify('Não foi possível sair. Tente novamente.', true);
    else location.replace('login.html');
  };
  refreshIcons();
}
// Supabase limits responses; pagination avoids silently incomplete statistics.
async function readAll(table, columns = '*') {
  const all = [];
  let start = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order('created_at', { ascending: false })
      .order('id')
      .range(start, start + 499);
    if (error) throw error;
    all.push(...data);
    if (data.length < 500) return all;
    start += 500;
  }
}
function title(name, description, action = '') {
  return `<div class="admin-title"><div><div class="eyebrow">ACOLHER PARA TRANSFORMAR</div><h1>${esc(name)}</h1><p>${esc(description)}</p></div>${action}</div>`;
}
function badge(value) {
  const good = [
    'Finalizado',
    'Realizada',
    'Aprovada',
    'Concluída',
    'Ativo',
    'Recebida',
    'Confirmada',
    'Sim',
  ].includes(value);
  return `<span class="badge ${good ? 'green' : ['Em atendimento', 'Em análise'].includes(value) ? 'pink' : ''}">${esc(value)}</span>`;
}
function format(key, value) {
  if (value == null || value === '') return '—';
  if (key.startsWith('data_') || key.endsWith('_at') || key.endsWith('_em')) return dateBR(value);
  if (typeof value === 'boolean') return badge(value ? 'Sim' : 'Não');
  if (key === 'status' || key === 'role') return badge(value);
  return esc(String(value).length > 105 ? String(value).slice(0, 105) + '…' : value);
}
async function renderCollection() {
  const schema = schemas[schemaPage];
  const canWrite = !schema.adminWrite || isAdmin();
  content.innerHTML =
    title(
      schema.title,
      schema.subtitle,
      schema.create && canWrite
        ? `<button class="button" id="create-record">${icon('plus')}${schema.create}</button>`
        : ''
    ) +
    (page === 'usuarios'
      ? '<p class="form-intro">Novas contas recebem o perfil usuário. Para autorizar a equipe, edite o perfil existente. Use Autorizar usuário somente para contas Auth antigas que ainda não têm perfil.</p>'
      : '') +
    `<div class="toolbar"><input id="search" class="filter-input" type="search" aria-label="Buscar registros" placeholder="Buscar ${schema.title.toLowerCase()}…"><select id="status-filter" class="filter-input" aria-label="Filtrar por status"><option value="">Todos os status</option></select></div><div id="collection-table"><p class="loading">Carregando registros…</p></div><div id="pagination" class="pagination"></div>`;
  rows = await readAll(schema.table);
  if (page === 'atendimentos') {
    await loadAppointmentOptions();
    rows = rows.map((r) => ({
      ...r,
      beneficiaria_nome:
        linkedBeneficiaries.find((b) => b.id === r.beneficiaria_id)?.nome ||
        'Registro indisponível',
    }));
  }
  if (page === 'solicitacoes') {
    const [beneficiaries, services] = await Promise.all([
      readAll('beneficiarias', 'id,nome,usuario_id,created_at'),
      readAll('servicos', 'id,nome,created_at'),
    ]);
    rows = rows.map((r) => ({
      ...r,
      beneficiaria_nome:
        beneficiaries.find((b) => b.usuario_id === r.usuario_id)?.nome || 'Cadastro indisponível',
      beneficiaria_id: beneficiaries.find((b) => b.usuario_id === r.usuario_id)?.id,
      servico_nome: services.find((s) => s.id === r.servico_id)?.nome || 'Serviço indisponível',
    }));
  }
  const filter = document.querySelector('#status-filter');
  const options = [
    ...new Set(
      rows
        .map(
          (r) => r.status || (typeof r.ativo === 'boolean' ? (r.ativo ? 'Ativo' : 'Inativo') : '')
        )
        .filter(Boolean)
    ),
  ];
  filter.hidden = !options.length;
  options.forEach((s) => filter.add(new Option(s, s)));
  document.querySelector('#search').oninput = filter.onchange = () => {
    currentPage = 1;
    renderRows();
  };
  document.querySelector('#create-record')?.addEventListener('click', () => editRecord());
  renderRows();
}
function renderRows() {
  const schema = schemas[schemaPage];
  const query = document.querySelector('#search').value.trim().toLocaleLowerCase('pt-BR');
  const status = document.querySelector('#status-filter').value;
  const filtered = rows.filter(
    (r) =>
      (!query ||
        schema.columns.some(([key]) =>
          String(r[key] ?? '')
            .toLocaleLowerCase('pt-BR')
            .includes(query)
        )) &&
      (!status || (r.status || (r.ativo ? 'Ativo' : 'Inativo')) === status)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  currentPage = Math.min(currentPage, totalPages);
  const canWrite = !schema.adminWrite || isAdmin();
  document.querySelector('#collection-table').innerHTML = filtered.length
    ? `<div class="table-wrap"><table><thead><tr>${schema.columns.map(([, label]) => `<th scope="col">${label}</th>`).join('')}<th scope="col">Ações</th></tr></thead><tbody>${filtered
        .slice((currentPage - 1) * pageSize, currentPage * pageSize)
        .map(
          (r) =>
            `<tr>${schema.columns.map(([key]) => `<td>${format(key, r[key])}</td>`).join('')}<td><div class="table-actions"><button class="icon-button" data-view="${r.id}" aria-label="Ver detalhes">${icon('eye')}</button>${canWrite && !(page === 'usuarios' && r.user_id === user.id) ? `<button class="icon-button" data-edit="${r.id}" aria-label="Editar registro">${icon('pencil')}</button>` : ''}${isAdmin() && page !== 'solicitacoes' && !(page === 'usuarios' && r.user_id === user.id) ? `<button class="icon-button" data-delete="${r.id}" aria-label="Excluir registro">${icon('trash-2')}</button>` : ''}</div></td></tr>`
        )
        .join('')}</tbody></table></div>`
    : '<p class="empty-state">Nenhum registro encontrado.</p>';
  document.querySelector('#pagination').innerHTML =
    `<span>${filtered.length} registro(s) · Página ${currentPage} de ${totalPages}</span><button class="button button-outline" id="prev-page" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button><button class="button button-outline" id="next-page" ${currentPage === totalPages ? 'disabled' : ''}>Próxima</button>`;
  document.querySelector('#prev-page').onclick = () => {
    currentPage--;
    renderRows();
  };
  document.querySelector('#next-page').onclick = () => {
    currentPage++;
    renderRows();
  };
  document
    .querySelectorAll('[data-view]')
    .forEach((b) => (b.onclick = () => viewRecord(rows.find((r) => r.id === b.dataset.view))));
  document
    .querySelectorAll('[data-edit]')
    .forEach((b) => (b.onclick = () => editRecord(rows.find((r) => r.id === b.dataset.edit))));
  document
    .querySelectorAll('[data-delete]')
    .forEach((b) => (b.onclick = () => deleteRecord(rows.find((r) => r.id === b.dataset.delete))));
  if (page === 'solicitacoes') {
    document.querySelectorAll('[data-view]').forEach((button) => {
      const r = rows.find((row) => row.id === button.dataset.view);
      if (r.status !== 'Aprovada' || !r.beneficiaria_id) return;
      const schedule = document.createElement('button');
      schedule.className = 'icon-button';
      schedule.setAttribute('aria-label', 'Agendar atendimento');
      schedule.innerHTML = icon('calendar-plus');
      schedule.onclick = async () => {
        try {
          await loadAppointmentOptions();
          await editRecord(null, schemas.atendimentos, {
            beneficiaria_id: r.beneficiaria_id,
            tipo_atendimento: r.servico_nome,
            data_atendimento: `${r.data_preferencia}T${r.horario_preferencia}`,
            status: 'Agendada',
            solicitacao_id: r.id,
          });
        } catch (error) {
          notify(supabaseErrorMessage(error), true);
        }
      };
      button.parentElement.append(schedule);
    });
  }
  refreshIcons();
}
async function viewRecord(record) {
  const schema = schemas[schemaPage];
  const fields = schema.details || [
    ...schema.fields.filter((f) => f.type !== 'image').map((f) => [f.key, f.label]),
    ['created_at', 'Cadastro'],
  ];
  const dialog = showDialog(
    record.nome || record.nome_doador || 'Detalhes do atendimento',
    `<dl class="detail-list">${fields.map(([key, label]) => `<div><dt>${esc(label)}</dt><dd>${key === 'beneficiaria_id' ? esc(record.beneficiaria_nome) : key.startsWith('data_') || key.endsWith('_at') || key.endsWith('_em') ? dateBR(record[key]) : esc(typeof record[key] === 'boolean' ? (record[key] ? 'Sim' : 'Não') : record[key] || '—')}</dd></div>`).join('')}</dl>${page === 'beneficiarias' ? '<h3>Histórico de atendimentos</h3><div id="history" class="loading">Carregando histórico…</div>' : ''}`
  );
  if (page === 'beneficiarias') {
    const { data, error } = await supabase
      .from('atendimentos')
      .select('*')
      .eq('beneficiaria_id', record.id)
      .order('data_atendimento', { ascending: false });
    dialog.querySelector('#history').className = '';
    dialog.querySelector('#history').innerHTML = error
      ? '<p>Não foi possível carregar o histórico.</p>'
      : data.length
        ? data
            .map(
              (a) =>
                `<article class="history-item"><small>${dateBR(a.data_atendimento)} · ${esc(a.status)}</small><h3>${esc(a.tipo_atendimento)}</h3><p>${esc(a.descricao)}</p><p>${esc(a.observacao)}</p></article>`
            )
            .join('')
        : '<p class="form-intro">Nenhum atendimento registrado.</p>';
  }
}
function fieldHTML(field, record) {
  const value = record?.[field.key];
  if (field.type === 'checkbox')
    return `<label class="checkbox full"><input type="checkbox" name="${field.key}" ${(value ?? field.key === 'ativo') ? 'checked' : ''}>${esc(field.label)}</label>`;
  if (field.type === 'image')
    return `<label class="field full">${esc(field.label)}<input type="file" name="${field.key}" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG ou WebP, até 10 MB. ${value ? 'Uma imagem já está cadastrada. Escolha um arquivo para substituí-la.' : ''}</small></label>`;
  const disabled = record?.id && ['beneficiaria_id', 'user_id'].includes(field.key);
  const attrs = `name="${field.key}" ${field.required ? 'required' : ''} ${disabled ? 'disabled' : ''}`;
  let input;
  if (field.type === 'select') {
    const options =
      field.key === 'beneficiaria_id'
        ? linkedBeneficiaries.map((b) => [b.id, b.nome])
        : field.key === 'profissional_id'
          ? professionals
              .filter((p) => p.ativo || p.id === value)
              .map((p) => [p.id, `${p.nome} — ${p.especialidade}`])
          : field.options.map((o) => [o, o]);
    input = `<select ${attrs}><option value="">Selecione</option>${options.map(([v, l]) => `<option value="${esc(v)}" ${value === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  } else if (field.type === 'textarea')
    input = `<textarea ${attrs} maxlength="4000">${esc(value)}</textarea>`;
  else {
    let v = value || '';
    if (v && field.type === 'datetime-local') {
      const d = new Date(v);
      v = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
    input = `<input ${attrs} type="${field.type}" value="${esc(v)}" ${field.type === 'text' ? 'maxlength="250"' : ''}>`;
  }
  return `<label class="field ${field.type === 'textarea' ? 'full' : ''}">${esc(field.label)}${field.required ? ' *' : ''}${input}</label>`;
}
async function uploadFile(file, folder) {
  const mime = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  };
  if (!mime[file.type] || (folder !== 'documentos' && !file.type.startsWith('image/')))
    throw new Error('Formato inválido. Use JPG, PNG, WebP ou PDF (somente para documentos).');
  if (file.size > 10485760) throw new Error('O arquivo deve ter no máximo 10 MB.');
  const path = `${folder}/${crypto.randomUUID()}.${mime[file.type]}`;
  const { error } = await supabase.storage
    .from('casa-mamae-margarida')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error)
    throw new Error('Não foi possível enviar o arquivo. Verifique as permissões do Storage.');
  return path;
}
async function loadAppointmentOptions() {
  linkedBeneficiaries = await readAll('beneficiarias', 'id,nome,created_at');
  professionals = await readAll('profissionais');
}
async function editRecord(record, schema = schemas[schemaPage], defaults = {}) {
  const dialog = showDialog(
    record ? 'Editar registro' : schema.create,
    `<form id="record-form"><div class="form-grid">${schema.fields.map((f) => fieldHTML(f, record || defaults)).join('')}</div><div class="form-actions"><button class="button" type="submit">Salvar ${icon('check')}</button><button class="text-button" id="cancel-edit" type="button">Cancelar</button></div><p class="form-status" role="status"></p></form>`
  );
  dialog.querySelector('#cancel-edit').onclick = () => dialog.close();
  dialog.querySelector('form').onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    const values = {};
    const uploaded = [];
    try {
      for (const field of schema.fields) {
        const input = form.elements[field.key];
        if (input.disabled) continue;
        if (field.type === 'image') {
          if (input.files[0]) {
            values[field.key] = await uploadFile(input.files[0], field.folder);
            uploaded.push(values[field.key]);
          }
        } else if (field.type === 'checkbox') values[field.key] = input.checked;
        else values[field.key] = input.value.trim() || null;
      }
      if (values.data_inicio && values.data_fim && values.data_fim < values.data_inicio)
        throw new Error('A data final deve ser igual ou posterior à data inicial.');
      if (schema.table === 'atendimentos') {
        values.data_atendimento = new Date(values.data_atendimento).toISOString();
        if (!record) values.funcionario_id = user.id;
        if (!record && defaults.solicitacao_id) values.solicitacao_id = defaults.solicitacao_id;
      }
      if (
        page === 'usuarios' &&
        values.user_id &&
        !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(values.user_id)
      )
        throw new Error('Informe o UUID válido de uma conta existente no Supabase Auth.');
      const query = record
        ? supabase.from(schema.table).update(values).eq('id', record.id).select('id').single()
        : supabase.from(schema.table).insert(values).select('id').single();
      const { error } = await query;
      if (error)
        throw new Error(
          schema.table === 'perfis'
            ? 'Não foi possível salvar. Confirme se a conta Auth existe, se o UUID já tem perfil e se você tem permissão.'
            : supabaseErrorMessage(
                error,
                'Não foi possível salvar. Confira os campos e suas permissões.'
              )
        );
      dialog.close();
      notify('Registro salvo com sucesso.');
      try {
        await renderCollection();
      } catch {
        notify('Registro salvo, mas a lista não pôde ser atualizada. Recarregue a página.', true);
      }
    } catch (error) {
      if (uploaded.length) await supabase.storage.from('casa-mamae-margarida').remove(uploaded);
      form.querySelector('.form-status').textContent = error.message;
      form.querySelector('.form-status').classList.add('error');
    } finally {
      button.disabled = false;
    }
  };
}
function deleteRecord(record) {
  const isCourse = page === 'cursos' || page === 'servicos';
  const dialog = showDialog(
    'Excluir este registro?',
    `<p>${isCourse ? 'Esta ação remove permanentemente o curso. Se houver solicitações vinculadas, ele não poderá ser excluído; nesse caso, edite o curso e desmarque “Curso disponível no site” para retirá-lo do catálogo sem apagar o histórico.' : 'Esta ação remove permanentemente o registro selecionado. Beneficiárias com atendimentos vinculados não podem ser excluídas antes de resolver esses vínculos.'}</p><div class="form-actions"><button class="button" id="confirm-delete">Excluir registro</button><button class="text-button" id="cancel-delete">Cancelar</button></div><p class="form-status" role="status"></p>`
  );
  dialog.querySelector('#cancel-delete').onclick = () => dialog.close();
  dialog.querySelector('#confirm-delete').onclick = async (event) => {
    event.currentTarget.disabled = true;
    const { data, error } = await supabase
      .from(schemas[schemaPage].table)
      .delete()
      .eq('id', record.id)
      .select('id');
    if (error || !data?.length) {
      dialog.querySelector('.form-status').textContent =
        error?.code === '23503' && isCourse
          ? 'Este curso tem solicitações vinculadas e não pode ser excluído. Edite-o e desmarque “Curso disponível no site” para removê-lo do catálogo, preservando as solicitações.'
          : 'Não foi possível excluir. Verifique vínculos e permissões.';
      event.target.disabled = false;
      return;
    }
    dialog.close();
    notify('Registro excluído.');
    try {
      await renderCollection();
    } catch {
      notify('Recarregue a página para atualizar a lista.', true);
    }
  };
}
function group(list, key) {
  return list.reduce((acc, row) => {
    const label = row[key] || 'Não informado';
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
}
function chart(name, entries) {
  const max = Math.max(1, ...entries.map(([, value]) => value));
  return `<section class="panel"><h2>${esc(name)}</h2>${entries.length ? entries.map(([label, value]) => `<div class="chart-row"><div class="chart-label"><span>${esc(label)}</span><strong>${value}</strong></div><div class="chart-track" aria-hidden="true"><div class="chart-fill" style="width:${(value / max) * 100}%"></div></div></div>`).join('') : '<p class="form-intro">Ainda não há registros neste período.</p>'}</section>`;
}
async function renderDashboard() {
  const [beneficiaries, appointments, projects, services, donations] = await Promise.all([
    readAll('beneficiarias', 'id,nome,status,tipo_atendimento,created_at'),
    readAll(
      'atendimentos',
      'id,beneficiaria_id,status,tipo_atendimento,data_atendimento,created_at'
    ),
    readAll('projetos', 'id,status,created_at'),
    readAll('servicos', 'id,ativo,created_at,nome,descricao'),
    isAdmin() ? readAll('doacoes', 'id,status,created_at') : Promise.resolve([]),
  ]);
  const report = page === 'relatorios';
  content.innerHTML =
    title(
      report ? 'Relatórios' : `Olá, ${profile.nome.split(' ')[0]}.`,
      report
        ? 'Informações para acompanhar o cuidado e planejar os próximos passos.'
        : 'Cada atendimento faz a diferença. Veja como está o trabalho da Casa.',
      report
        ? '<button class="button button-outline" id="export-report">Exportar resumo CSV</button>'
        : '<a class="button" href="atendimentos.html">Ver atendimentos</a>'
    ) +
    (report
      ? `<form class="report-filters" id="report-filters"><label class="field">Data inicial<input type="date" name="inicio"></label><label class="field">Data final<input type="date" name="fim"></label><label class="field">Status<select name="status"><option value="">Todos</option>${statuses.map((s) => `<option>${s}</option>`).join('')}</select></label><label class="field">Tipo de atendimento<select name="tipo"><option value="">Todos</option>${[
          ...new Set([...beneficiaries, ...appointments].map((r) => r.tipo_atendimento)),
        ]
          .sort()
          .map((t) => `<option>${esc(t)}</option>`)
          .join(
            ''
          )}</select></label></form><p class="form-intro">Solicitações usam a data de cadastro; atendimentos usam a data do atendimento. Projetos e doações são filtrados por data de cadastro, sem filtro de tipo ou status do atendimento.</p>`
      : '') +
    '<div id="metrics" class="metric-grid"></div><div id="charts" class="chart-grid"></div><div id="recent"></div>';
  let summary = [];
  function update() {
    const form = document.querySelector('#report-filters');
    const start = form?.elements.inicio.value;
    const end = form?.elements.fim.value;
    const status = form?.elements.status.value;
    const type = form?.elements.tipo.value;
    if (start && end && start > end) {
      form.elements.fim.setCustomValidity('A data final deve ser igual ou posterior à inicial.');
      form.elements.fim.reportValidity();
      return;
    }
    form?.elements.fim.setCustomValidity('');
    const within = (date) => {
      const day = new Date(date).toLocaleDateString('en-CA');
      return (!start || day >= start) && (!end || day <= end);
    };
    const filter = (rows, key) =>
      rows.filter(
        (r) =>
          within(r[key]) &&
          (!status || r.status === status) &&
          (!type || r.tipo_atendimento === type)
      );
    const b = filter(beneficiaries, 'created_at'),
      a = filter(appointments, 'data_atendimento');
    summary = [
      ['Total de beneficiárias', b.length, 'users-round'],
      ['Solicitações pendentes', b.filter((r) => r.status === 'Pendente').length, 'clock-3'],
      [
        'Atendimentos em andamento',
        a.filter((r) => r.status === 'Em atendimento').length,
        'heart-handshake',
      ],
      [
        'Atendimentos concluídos',
        a.filter((r) => ['Finalizado', 'Realizada'].includes(r.status)).length,
        'circle-check',
      ],
      ['Total de projetos', projects.filter((r) => within(r.created_at)).length, 'sprout'],
      ['Total de cursos', services.filter((r) => within(r.created_at)).length, 'book-open'],
    ];
    if (report)
      summary.push(
        [
          'Mulheres com atendimento',
          new Set(
            a
              .filter((r) => ['Em atendimento', 'Finalizado', 'Realizada'].includes(r.status))
              .map((r) => r.beneficiaria_id)
          ).size,
          'users-round',
        ],
        ['Total de doações', donations.filter((r) => within(r.created_at)).length, 'gift']
      );
    document.querySelector('#metrics').innerHTML = summary
      .map(
        ([label, value, i]) =>
          `<article class="metric"><div class="metric-top">${esc(label)}${icon(i)}</div><strong>${value}</strong></article>`
      )
      .join('');
    const months = {};
    a.forEach((r) => {
      const d = new Date(r.data_atendimento);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = (months[key] || 0) + 1;
    });
    const monthEntries = Object.entries(months).sort(([a], [b]) => a.localeCompare(b));
    document.querySelector('#charts').innerHTML =
      chart(
        'Atendimentos por mês',
        monthEntries.map(([key, n]) => [
          new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(
            new Date(`${key}-01T12:00:00`)
          ),
          n,
        ])
      ) +
      chart(
        'Tipos de atendimento solicitados',
        Object.entries(group(b, 'tipo_atendimento')).sort((a, b) => b[1] - a[1])
      ) +
      chart('Solicitações por status', Object.entries(group(b, 'status')));
    document.querySelector('#recent').innerHTML = report
      ? '<p class="table-footnote">Resumo agregado, sem CPF, endereço ou informações pessoais na exportação.</p>'
      : `<section class="panel"><h2>Solicitações recentes</h2>${
          b.length
            ? `<div class="table-wrap"><table><thead><tr><th>Nome</th><th>Serviço</th><th>Status</th><th>Data</th></tr></thead><tbody>${b
                .slice(0, 5)
                .map(
                  (r) =>
                    `<tr><td>${esc(r.nome)}</td><td>${esc(r.tipo_atendimento)}</td><td>${badge(r.status)}</td><td>${dateBR(r.created_at)}</td></tr>`
                )
                .join('')}</tbody></table></div>`
            : '<p class="form-intro">As novas solicitações aparecerão aqui.</p>'
        }</section>`;
    refreshIcons();
  }
  document.querySelector('#report-filters')?.addEventListener('input', update);
  document.querySelector('#report-filters')?.addEventListener('submit', (e) => e.preventDefault());
  document.querySelector('#export-report')?.addEventListener('click', () => {
    if (!document.querySelector('#report-filters').reportValidity()) return;
    const f = document.querySelector('#report-filters').elements;
    const csv =
      '\uFEFF' +
      [
        ['Filtro', 'Valor'],
        ['Data inicial', f.inicio.value || 'Todas'],
        ['Data final', f.fim.value || 'Todas'],
        ['Status', f.status.value || 'Todos'],
        ['Tipo', f.tipo.value || 'Todos'],
        ['Indicador', 'Quantidade'],
        ...summary.map(([label, value]) => [label, value]),
      ]
        .map((row) =>
          row
            .map(
              (v) =>
                `"${String(v)
                  .replace(/^[=+@-]/, "'$&")
                  .replaceAll('"', '""')}"`
            )
            .join(';')
        )
        .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relatorio-casa-mamae-margarida.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  update();
}
async function renderSettings() {
  content.innerHTML =
    title('Configurações', 'Arquivos institucionais e documentos autorizados.') +
    `<div class="settings-grid"><section class="panel"><h2>Enviar arquivo</h2><p>Imagens editoriais podem ser vistas pelo público. Documentos são privados e acessíveis somente à equipe autorizada.</p><form id="upload-form"><label class="field">Pasta<select name="folder"><option value="institucional">Imagens institucionais</option><option value="documentos">Documentos autorizados (privado)</option><option value="projetos">Imagens de projetos</option><option value="servicos">Imagens de cursos</option></select></label><label class="field">Arquivo<input type="file" name="file" required accept="image/jpeg,image/png,image/webp,application/pdf"><small>Até 10 MB. PDF apenas na pasta de documentos.</small></label><label class="checkbox" style="margin-top:18px"><input type="checkbox" required>Confirmo que tenho autorização para armazenar este arquivo e que documentos pessoais serão enviados somente à pasta privada.</label><button class="button">Enviar para o Storage ${icon('upload')}</button><p class="form-status" role="status"></p></form></section><section class="panel"><h2>Arquivos armazenados</h2><label class="field">Pasta<select id="files-folder"><option value="institucional">Institucional</option><option value="documentos">Documentos privados</option><option value="projetos">Projetos</option><option value="servicos">Cursos</option></select></label><p class="form-intro">Links de visualização expiram em 60 segundos. As imagens cadastradas nos cursos e projetos são publicadas automaticamente.</p><ul id="files-list" class="files-list"></ul></section><section class="panel"><h2>Identidade da instituição</h2><p>O símbolo de flor é um espaço reservado para o logotipo. Para usar o logo oficial, envie a imagem à pasta institucional e substitua o símbolo no componente <code>js/layout.js</code>.</p><p>Os textos institucionais, canais de contato e informações para Pix devem ser confirmados pela instituição antes da publicação.</p></section><section class="panel"><h2>Seu acesso</h2><p>${esc(profile.nome)}<br>${esc(profile.email)}<br>Perfil: administrador</p><p>Use a recuperação de senha para redefinir suas credenciais pelo e-mail cadastrado.</p><a class="button button-outline" href="login.html">Recuperação de senha</a></section></div>`;
  document.querySelector('#files-folder').onchange = loadFiles;
  document.querySelector('#upload-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      await uploadFile(form.elements.file.files[0], form.elements.folder.value);
      document.querySelector('#files-folder').value = form.elements.folder.value;
      form.reset();
      notify('Arquivo enviado.');
      await loadFiles();
    } catch (error) {
      form.querySelector('.form-status').textContent = error.message;
    } finally {
      button.disabled = false;
    }
  };
  refreshIcons();
  await loadFiles();
}
async function loadFiles() {
  const folder = document.querySelector('#files-folder').value;
  const list = document.querySelector('#files-list');
  list.innerHTML = '<li>Carregando…</li>';
  const files = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage
      .from('casa-mamae-margarida')
      .list(folder, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) {
      list.innerHTML = '<li>Não foi possível carregar os arquivos.</li>';
      return;
    }
    files.push(...data);
    if (data.length < 100) break;
    offset += 100;
  }
  list.innerHTML = files.length
    ? files
        .map(
          (f) =>
            `<li><span>${esc(f.name)}</span><button class="text-button" data-file="${esc(`${folder}/${f.name}`)}">Visualizar</button></li>`
        )
        .join('')
    : '<li>Nenhum arquivo nesta pasta.</li>';
  list.querySelectorAll('[data-file]').forEach(
    (button) =>
      (button.onclick = async () => {
        const { data, error } = await supabase.storage
          .from('casa-mamae-margarida')
          .createSignedUrl(button.dataset.file, 60);
        if (error) {
          notify('Não foi possível gerar o link.', true);
          return;
        }
        showDialog(
          'Visualizar arquivo',
          `<p>Este link é temporário e expira em 60 segundos. Documentos pessoais não devem ser compartilhados fora da equipe.</p><a class="button" href="${esc(data.signedUrl)}" target="_blank" rel="noopener noreferrer">Abrir arquivo ${icon('external-link')}</a>`
        );
      })
  );
}
await init();
