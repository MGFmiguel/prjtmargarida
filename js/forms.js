import { publicLayout } from './layout.js';
import { requireConnection, supabase } from './supabase.js';
import { services } from './catalog.js';
import { validCPF } from './utils.js';
import { supabaseErrorMessage } from './supabase-errors.js';
publicLayout();
const form = document.querySelector('#public-form');
const serviceSelect = form.querySelector('[name="tipo_atendimento"]');
if (serviceSelect) {
  let list = services;
  if (supabase) {
    const { data, error } = await supabase.from('servicos').select('nome').eq('ativo', true);
    list = error ? [] : data;
  }
  for (const service of list) serviceSelect.add(new Option(service.nome, service.nome));
  serviceSelect.add(new Option('Preciso de orientação', 'Preciso de orientação'));
  serviceSelect.value = new URLSearchParams(location.search).get('servico') || '';
}
const subject = form.querySelector('[name="assunto"]');
if (subject) subject.value = new URLSearchParams(location.search).get('assunto') || '';
const birthday = form.querySelector('[name="data_nascimento"]');
if (birthday) birthday.max = new Date().toLocaleDateString('en-CA');
const cpf = form.querySelector('[name="cpf"]');
cpf?.addEventListener('input', () => {
  cpf.setCustomValidity('');
  const digits = cpf.value.replace(/\D/g, '').slice(0, 11);
  cpf.value = digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
});
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (cpf && !validCPF(cpf.value)) {
    cpf.setCustomValidity('Informe um CPF válido.');
    cpf.reportValidity();
    return;
  }
  const status = form.querySelector('.form-status');
  const button = form.querySelector('[type="submit"]');
  status.textContent = '';
  button.disabled = true;
  try {
    const client = requireConnection();
    const values = Object.fromEntries(new FormData(form));
    delete values.website; // Honeypot: accidental bots never reach the database.
    if (form.elements.website?.value)
      throw new Error('Não foi possível enviar. Recarregue a página.');
    for (const key in values)
      values[key] = typeof values[key] === 'string' ? values[key].trim() || null : values[key];
    if (values.cpf) values.cpf = values.cpf.replace(/\D/g, '');
    values.consentimento = form.elements.consentimento.checked;
    const { error } = await client.from(form.dataset.table).insert(values);
    if (error)
      throw new Error(
        supabaseErrorMessage(
          error,
          'Não foi possível enviar agora. Confira os dados e tente novamente.'
        )
      );
    form.reset();
    status.className = 'form-status success';
    status.textContent =
      'Recebemos sua solicitação. A equipe poderá entrar em contato pelos dados informados. Obrigada!';
  } catch (error) {
    status.className = 'form-status error';
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
