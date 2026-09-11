import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const pages = [
  'index',
  'login',
  'recuperar-senha',
  'solicitar-atendimento',
  'doacoes',
  'contato',
  'dashboard',
  'beneficiarias',
  'atendimentos',
  'servicos',
  'projetos',
  'relatorios',
  'usuarios',
  'configuracoes',
  'mensagens',
  'gestao-doacoes',
];
export default defineConfig({
  server: { host: '0.0.0.0' },
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((page) => [page, resolve(import.meta.dirname, `${page}.html`)])
      ),
    },
  },
});
