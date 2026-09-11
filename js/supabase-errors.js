// Mensagens úteis sem registrar payloads, senhas ou dados pessoais no console.
export function supabaseErrorMessage(error, fallback = 'Não foi possível concluir a operação.') {
  if (['PGRST205', '42P01', 'PGRST204', '42703'].includes(error?.code)) {
    return 'O banco de dados da instituição ainda precisa ser configurado. Nenhum envio foi confirmado. Tente novamente após a configuração.';
  }
  if (error?.code === '42501') {
    return 'Esta operação não foi autorizada. A administração precisa verificar o perfil e as políticas de acesso.';
  }
  if (['23514', '23502', '22P02'].includes(error?.code)) {
    return 'Confira os campos obrigatórios e os dados informados antes de tentar novamente.';
  }
  if (error?.code === '23505') return 'Já existe um registro com esses dados de identificação.';
  if (error?.code === '23503')
    return 'Um registro relacionado não existe ou ainda está vinculado a outros dados.';
  return fallback;
}
