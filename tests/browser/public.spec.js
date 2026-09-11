import { test, expect } from '@playwright/test';

// Mantém testes ilustrativos isolados do banco real, mesmo com .env configurado.
test.beforeEach(async ({ page }) => {
  await page.route('**/js/supabase.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export const configured=false; export const supabase=null; export function requireConnection(){throw new Error('Conexão não configurada. Nenhum dado foi enviado.');}`,
    })
  );
});
test('home loads, service expansion, details and tabs work', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Acolher');
  await expect(page.locator('.service-card')).toHaveCount(4);
  await page.locator('#projetos').scrollIntoViewIfNeeded();
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.project-image img')].every(
      (img) => img.complete && img.naturalWidth > 0
    )
  );
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: `test-results/home-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Conheça todos os serviços' }).click();
  await expect(page.locator('.service-card')).toHaveCount(8);
  await page.getByRole('button', { name: 'Saiba mais' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('link', { name: 'Solicitar atendimento' }).click();
  await expect(page.locator('[name="tipo_atendimento"]')).toHaveValue('Atendimento social');
  await page.goto('/');
  await page.getByRole('tab', { name: 'Nossos valores' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Respeito');
  expect(errors).toEqual([]);
});
test('contact form does not simulate success when Supabase is not configured', async ({ page }) => {
  await page.goto('/contato.html');
  await page.getByLabel('Nome *', { exact: true }).fill('Pessoa de teste');
  await page.getByLabel('E-mail *').fill('teste@example.com');
  await page.getByLabel('Assunto *').fill('Teste de contato');
  await page.getByLabel('Mensagem *').fill('Gostaria de conhecer os projetos.');
  await page.getByLabel('Autorizo o uso').check();
  await page.getByRole('button', { name: 'Enviar mensagem' }).click();
  await expect(page.locator('.form-status')).toContainText('Nenhum dado foi enviado');
});
test('login toggles password and dashboard does not expose data without configuration', async ({
  page,
}) => {
  await page.goto('/login.html');
  await page.getByRole('button', { name: 'Mostrar senha' }).click();
  await expect(page.locator('[name="password"]')).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Ocultar senha' }).click();
  await expect(page.locator('[name="password"]')).toHaveAttribute('type', 'password');
  await page.goto('/dashboard.html');
  await expect(page.locator('h1')).toHaveText('Conexão não configurada');
  await expect(page.locator('table')).toHaveCount(0);
});
test('all pages fit viewport and mobile navigation opens', async ({ page, isMobile }) => {
  for (const path of [
    '/',
    '/doacoes.html',
    '/contato.html',
    '/solicitar-atendimento.html',
    '/login.html',
    '/recuperar-senha.html',
    '/dashboard.html',
  ]) {
    await page.goto(path);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      path
    ).toBeTruthy();
  }
  if (isMobile) {
    await page.goto('/');
    await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
    await page.locator('nav').getByRole('link', { name: 'Doações', exact: true }).click();
    await expect(page).toHaveURL(/doacoes.html/);
  }
});
