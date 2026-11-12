import { brand } from './layout.js';
import { requireConnection } from './supabase.js';
import { supabaseErrorMessage } from './supabase-errors.js';
import { refreshIcons, icon } from './utils.js';
import { destinationForRole, passwordRedirect } from './auth-routing.js';
document.querySelector('#auth-brand').innerHTML = brand;
refreshIcons();
const form = document.querySelector('#auth-form');
const status = document.querySelector('#auth-status');
document.querySelector('#toggle-password').onclick = () => {
  const input = form.elements.password;
  const visible = input.type === 'password';
  input.type = visible ? 'text' : 'password';
  const button = document.querySelector('#toggle-password');
  button.innerHTML = icon(visible ? 'eye-off' : 'eye');
  button.setAttribute('aria-label', visible ? 'Ocultar senha' : 'Mostrar senha');
  refreshIcons();
};
form.elements.password.addEventListener('input', () => form.elements.password.setCustomValidity(''));
form.onsubmit = async (e) => {
  e.preventDefault();
  if (form.dataset.mode === 'reset') {
    const password = form.elements.password;
    if (password.value.length < 6 || password.value.length > 12) {
      password.setCustomValidity('A senha deve ter entre 6 e 12 caracteres.');
      password.reportValidity();
      return;
    }
  }
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  status.textContent = '';
  try {
    const client = requireConnection();
    if (form.dataset.mode === 'reset') {
      const {
        data: { session },
      } = await client.auth.getSession();
      if (!session)
        throw new Error(
          'Abra o link de recuperação enviado ao seu e-mail antes de definir uma nova senha.'
        );
      const { error } = await client.auth.updateUser({ password: form.elements.password.value });
      if (error)
        throw new Error(
          'Não foi possível alterar a senha. Solicite um novo link ou use uma senha mais forte.'
        );
      await client.auth.signOut();
      status.textContent = 'Senha atualizada. Você já pode entrar com a nova senha.';
      form.reset();
    } else {
      localStorage.setItem('cmm-remember', String(form.elements.remember.checked));
      const { data, error } = await client.auth.signInWithPassword({
        email: form.elements.email.value.trim(),
        password: form.elements.password.value,
      });
      if (error) throw new Error('Não foi possível entrar. Confira seu e-mail e senha.');
      const { data: profile, error: profileError } = await client
        .from('perfis')
        .select('role')
        .eq('user_id', data.user.id)
        .maybeSingle();
      if (profileError || !destinationForRole(profile?.role)) {
        await client.auth.signOut();
        if (profileError) throw new Error(supabaseErrorMessage(profileError));
        throw new Error('Seu acesso à equipe ainda não foi autorizado. Fale com a administração.');
      }
      location.assign(destinationForRole(profile.role));
    }
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
};
document.querySelector('#forgot-password')?.addEventListener('click', async () => {
  const email = form.elements.email;
  if (!email.value || !email.checkValidity()) {
    email.reportValidity();
    email.focus();
    status.textContent = 'Informe seu e-mail para receber o link de recuperação.';
    return;
  }
  const button = document.querySelector('#forgot-password');
  button.disabled = true;
  try {
    const { error } = await requireConnection().auth.resetPasswordForEmail(email.value.trim(), {
      redirectTo: passwordRedirect,
    });
    if (error)
      throw new Error('Não foi possível solicitar a recuperação. Tente novamente mais tarde.');
    status.textContent =
      'Se houver uma conta com esse e-mail, você receberá um link para redefinir a senha.';
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
