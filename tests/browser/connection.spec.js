import { test, expect } from '@playwright/test';

test('configured client reports missing schema without crashing or showing illustrative records', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/js/supabase.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export const configured=true; export const supabase={from(){const q={select(){return q},eq(){return q},order(){return Promise.resolve({data:null,error:{code:'PGRST205'}})}};return q}};`,
    })
  );
  await page.goto('/');
  await expect(page.locator('#catalog-note')).toContainText('banco de dados da instituição');
  await expect(page.locator('.service-card')).toHaveCount(0);
  await expect(page.locator('.project-card')).toHaveCount(0);
  expect(errors).toEqual([]);
});
