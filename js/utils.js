import { createIcons, icons } from 'lucide';
export const icon = (name, cls = '') =>
  `<i data-lucide="${name}" class="${cls}" aria-hidden="true"></i>`;
export function refreshIcons() {
  createIcons({ icons, attrs: { 'stroke-width': 1.65 } });
}
export const escapeHTML = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
  );
export const dateBR = (value) =>
  value
    ? new Intl.DateTimeFormat('pt-BR').format(
        new Date(value.length === 10 ? `${value}T12:00:00` : value)
      )
    : '—';
export function notify(message, error = false) {
  let el = document.querySelector('#notification');
  if (!el) {
    el = document.createElement('div');
    el.id = 'notification';
    el.setAttribute('role', 'status');
    document.body.append(el);
  }
  el.className = `notification ${error ? 'error' : ''}`;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(window.noticeTimeout);
  window.noticeTimeout = setTimeout(() => {
    el.hidden = true;
  }, 9000);
}
export function showDialog(title, body) {
  document.querySelector('#detail-dialog')?.remove();
  const dialog = document.createElement('dialog');
  dialog.id = 'detail-dialog';
  dialog.innerHTML = `<button class="dialog-close icon-button" aria-label="Fechar">${icon('x')}</button><div class="eyebrow">CASA MAMÃE MARGARIDA</div><h2>${escapeHTML(title)}</h2>${body}`;
  document.body.append(dialog);
  dialog.querySelector('.dialog-close').onclick = () => dialog.close();
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        dialog.close();
    }
  });
  dialog.showModal();
  refreshIcons();
  return dialog;
}
export function validCPF(value) {
  const cpf = value.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  return [9, 10].every((length) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    return Number(cpf[length]) === ((sum * 10) % 11) % 10;
  });
}
