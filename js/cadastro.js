import { publicLayout } from './layout.js';
import { requireConnection } from './supabase.js';
import { validCPF } from './utils.js';
import { signupRedirect } from './auth-routing.js';
publicLayout();
const form = document.querySelector('#signup-form');
form.elements.data_nascimento.max = new Date().toLocaleDateString('en-CA');
form.elements.cpf.addEventListener('input', () => form.elements.cpf.setCustomValidity(''));
for (const name of ['password', 'confirm_password'])
  form.elements[name].addEventListener('input', () =>
    form.elements[name].setCustomValidity('')
  );
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = form.elements.password;
  const confirmation = form.elements.confirm_password;
  for (const input of [password, confirmation]) {
    input.setCustomValidity(
      input.value.length < 6 || input.value.length > 12
        ? 'A senha deve ter entre 6 e 12 caracteres.'
        : ''
    );
    if (!input.checkValidity()) {
      input.reportValidity();
      return;
    }
  }
  const cpf = form.elements.cpf;
  if (!validCPF(cpf.value)) {
    cpf.setCustomValidity('Informe um CPF válido.');
    cpf.reportValidity();
    return;
  }
  if (password.value !== confirmation.value) {
    confirmation.setCustomValidity('As senhas devem ser iguais.');
    confirmation.reportValidity();
    return;
  }
  const button = form.querySelector('button[type="submit"]');
  const message = form.querySelector('.form-status');
  button.disabled = true;
  message.textContent = '';
  try {
    const client = requireConnection();
    const readiness = await client.rpc('cadastro_disponivel');
    if (readiness.error || readiness.data !== true) {
      throw new Error(
        'O cadastro de contas ainda precisa ser habilitado pela instituição. Tente novamente mais tarde.'
      );
    }
    const { data, error } = await client.auth.signUp({
      email: form.elements.email.value.trim(),
      password: form.elements.password.value,
      options: {
        emailRedirectTo: signupRedirect,
        data: {
          cadastro_cmm: true,
          consentimento: form.elements.consentimento.checked,
          nome: form.elements.nome.value.trim(),
          data_nascimento: form.elements.data_nascimento.value,
          cpf: cpf.value.replace(/\D/g, ''),
          telefone: form.elements.telefone.value.trim(),
        },
      },
    });
    if (error) {
      if (error.code === 'over_email_send_rate_limit')
        throw new Error('Aguarde alguns minutos antes de solicitar outro e-mail.');
      if (error.code === 'signup_disabled')
        throw new Error('O cadastro ainda não foi habilitado pela instituição.');
      throw new Error(
        'Não foi possível concluir o cadastro. Confira os dados e tente novamente. Se o problema continuar, entre em contato com a Casa.'
      );
    }
    form.reset();
    if (data.session) {
      location.assign('area-usuario.html');
      return;
    }
    message.className = 'form-status success';
    message.textContent =
      'Confira seu e-mail para confirmar a conta. Se você já tem cadastro, entre com sua senha ou use a recuperação de acesso.';
  } catch (error) {
    message.className = 'form-status error';
    message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
