// URL pública confirmada pela instituição. Não depende de hosts de preview da Vercel.
export const productionUrl = 'https://prjtmargarida.vercel.app';
export const passwordRedirect = `${productionUrl}/redefinir-senha.html`;
export const signupRedirect = `${productionUrl}/area-usuario.html`;
export function destinationForRole(role) {
  if (role === 'usuario') return 'area-usuario.html';
  if (role === 'admin' || role === 'funcionario') return 'dashboard.html';
  return null;
}
