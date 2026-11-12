import { test, expect } from '@playwright/test';
import { userFixture } from './user-fixture.js';

test('signup does not create an Auth account before migration is ready', async ({ page }) => {
  await userFixture(page, 'usuario', false);
  await page.goto('/cadastro.html');
  for (const [name, value] of Object.entries({
    nome: 'Alice Teste',
    data_nascimento: '1990-01-01',
    cpf: '52998224725',
    telefone: '92999999999',
    email: 'alice@example.invalid',
    password: 'Senha1234',
    confirm_password: 'Senha1234',
  })) {
    await page.locator(`[name="${name}"]`).fill(value);
  }
  await page.getByLabel('Autorizo o uso').check();
  await page.getByRole('button', { name: 'Criar minha conta' }).click();
  await expect(page.locator('.form-status')).toContainText('ainda precisa ser habilitado');
  expect(await page.evaluate(() => window.signupPayload)).toBeUndefined();
});

test('public signup validates confirmation and sends no role or password in metadata', async ({
  page,
}) => {
  await userFixture(page);
  await page.goto('/cadastro.html');
  await page.getByLabel('Nome completo').fill('Alice Teste');
  await page.getByLabel('Data de nascimento').fill('1990-01-01');
  await page.getByLabel('CPF', { exact: false }).fill('52998224725');
  await page.getByLabel('Telefone').fill('92999999999');
  await page.getByLabel('E-mail').fill('alice@example.invalid');
  await page.getByLabel('Senha *', { exact: true }).fill('Senha1234');
  await page.getByLabel('Confirmar senha').fill('Outra123');
  await page.getByLabel('Autorizo o uso').check();
  await page.getByRole('button', { name: 'Criar minha conta' }).click();
  expect(
    await page.getByLabel('Confirmar senha').evaluate((el) => el.validity.customError)
  ).toBeTruthy();
  await page.getByLabel('Confirmar senha').fill('Senha1234');
  await page.getByRole('button', { name: 'Criar minha conta' }).click();
  await expect(page.locator('.form-status')).toContainText('Confira seu e-mail');
  const options = await page.evaluate(() => window.signupPayload.options);
  expect(options.emailRedirectTo).toBe('https://prjtmargarida.vercel.app/area-usuario.html');
  expect(options.data.role).toBeUndefined();
  expect(options.data.password).toBeUndefined();
  expect(options.data.cadastro_cmm).toBe(true);
});
test('user login routes to individual dashboard and admin URL redirects back', async ({
  page,
}, testInfo) => {
  await userFixture(page);
  await page.goto('/login.html');
  await page.getByLabel('E-mail').fill('alice@example.invalid');
  await page.locator('[name=password]').fill('Senha1234');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/area-usuario.html/);
  await expect(page.locator('h1')).toContainText('Alice');
  await expect(page.locator('.metric')).toHaveCount(4);
  const infoWidth = await page
    .locator('.appointment-info')
    .first()
    .evaluate((el) => el.getBoundingClientRect().width);
  expect(infoWidth).toBeGreaterThan(100);
  await page.screenshot({
    path: `test-results/usuario-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.goto('/dashboard.html');
  await expect(page).toHaveURL(/area-usuario.html/);
});
test('user submits service request and follows it in own request list', async ({ page }) => {
  await userFixture(page);
  await page.goto('/nova-solicitacao.html');
  await page.getByLabel('Serviço desejado').selectOption('s1');
  await page.getByLabel('Motivo').fill('Gostaria de orientação social.');
  const future = await page.evaluate(() =>
    new Date(Date.now() + 86400000).toLocaleDateString('en-CA')
  );
  await page.getByLabel('Data de preferência').fill(future);
  await page.getByLabel('Horário de preferência').fill('10:00');
  await page.getByRole('button', { name: 'Enviar solicitação' }).click();
  await expect(page).toHaveURL(/minhas-solicitacoes.html/);
  await expect(page.getByRole('cell', { name: 'Atendimento social' })).toBeVisible();
  const { table, payload } = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem('user-last-insert'))
  );
  expect(table).toBe('solicitacoes');
  expect(payload.usuario_id).toBe('44444444-4444-4444-8444-444444444444');
  expect(payload.status).toBeUndefined();
});
test('profile identity is read-only and notifications can be marked read', async ({ page }) => {
  await userFixture(page);
  await page.goto('/perfil.html');
  await expect(page.getByLabel('CPF')).toHaveAttribute('readonly', '');
  await expect(page.getByLabel('E-mail')).toHaveAttribute('readonly', '');
  await expect(page.locator('[name=role]')).toHaveCount(0);
  await page.getByLabel('Telefone').fill('92988888888');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.locator('.form-status')).toContainText('sucesso');
  await page.goto('/notificacoes.html');
  await expect(page.locator('#notification-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Marcar como lida' }).click();
  await expect(page.locator('#notification-count')).toBeHidden();
});
test('consultation updates appear automatically and history shows only completed visits', async ({
  page,
}) => {
  await page.clock.install();
  await userFixture(page);
  await page.goto('/minhas-consultas.html');
  await expect(page.locator('.badge').filter({ hasText: 'Confirmada' })).toHaveCount(1);
  await page.evaluate(() => {
    const db = JSON.parse(sessionStorage.getItem('user-test-db'));
    db.consultas[0].status = 'Reagendada';
    sessionStorage.setItem('user-test-db', JSON.stringify(db));
  });
  await page.clock.fastForward(31000);
  await expect(page.locator('.badge').filter({ hasText: 'Reagendada' })).toHaveCount(1);
  await page.goto('/historico.html');
  await expect(page.locator('.appointment-card')).toHaveCount(1);
  await expect(page.locator('.badge')).toHaveText('Realizada');
});
test('new pages fit mobile and menu opens; recovery points at production', async ({
  page,
  isMobile,
}) => {
  await userFixture(page);
  for (const route of [
    'area-usuario',
    'minhas-consultas',
    'agenda',
    'minhas-solicitacoes',
    'nova-solicitacao',
    'historico',
    'perfil',
    'notificacoes',
  ]) {
    await page.goto(`/${route}.html`);
    await expect(page.locator('h1')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      route
    ).toBeTruthy();
  }
  if (isMobile) {
    await page.getByRole('button', { name: 'Abrir menu da usuária' }).click();
    await expect(page.getByRole('navigation', { name: 'Menu da usuária' })).toBeVisible();
  }
  await page.goto('/login.html');
  await page.getByLabel('E-mail').fill('alice@example.invalid');
  await page.getByRole('button', { name: 'Esqueci minha senha' }).click();
  await expect(page.locator('#auth-status')).toContainText('link');
  expect(await page.evaluate(() => window.resetOptions.redirectTo)).toBe(
    'https://prjtmargarida.vercel.app/redefinir-senha.html'
  );
});
