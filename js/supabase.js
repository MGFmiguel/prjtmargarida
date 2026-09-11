import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured = Boolean(supabaseUrl && supabaseKey);
// Only a publishable/anon key belongs in this file. Access is enforced by RLS.
const storage = {
  getItem: (key) => localStorage.getItem(key) ?? sessionStorage.getItem(key),
  setItem: (key, value) => {
    const persistent = localStorage.getItem('cmm-remember') === 'true';
    (persistent ? sessionStorage : localStorage).removeItem(key);
    (persistent ? localStorage : sessionStorage).setItem(key, value);
  },
  removeItem: (key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};
export const supabase = configured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage },
    })
  : null;
export function requireConnection() {
  if (!supabase)
    throw new Error(
      'O envio ainda não está disponível. A instituição precisa configurar a conexão com o Supabase. Nenhum dado foi enviado.'
    );
  return supabase;
}
