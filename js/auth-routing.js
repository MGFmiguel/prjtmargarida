// URL pública confirmada pela instituição. Não depende de hosts de preview da Vercel.
export const productionUrl = 'https://prjtmargarida.vercel.app';
export const passwordRedirect = `${productionUrl}/redefinir-senha.html`;
export const signupRedirect = `${productionUrl}/area-usuario.html`;
export function courseRegistrationPath(value) {
  if (typeof value !== 'string') return null;
  try {
    const target = new URL(value, productionUrl);
    if (target.origin !== productionUrl) return null;
    if (!target.pathname.endsWith('/nova-solicitacao.html')) return null;
    const serviceId = target.searchParams.get('servico_id') || '';
    if (!/^[0-9a-f-]{36}$/i.test(serviceId)) return null;
    return `nova-solicitacao.html?servico_id=${encodeURIComponent(serviceId)}`;
  } catch {
    return null;
  }
}
export function destinationForRole(role, requestedPath) {
  if (role === 'usuario') return courseRegistrationPath(requestedPath) || 'area-usuario.html';
  if (role === 'admin' || role === 'funcionario') return 'dashboard.html';
  return null;
}
