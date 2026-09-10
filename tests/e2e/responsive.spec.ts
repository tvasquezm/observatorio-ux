import { expect, test } from '@playwright/test';
import { expectNoPageOverflow } from './helpers';

test('adapta el acceso al viewport sin perder contenido', async ({ page }, testInfo) => {
  await page.goto('/login');
  await expectNoPageOverflow(page);
  await expect(page.getByRole('heading', { name: 'Ingresa a tu cuenta' })).toBeVisible();

  if (testInfo.project.name === 'mobile-chromium') {
    await expect(page.locator('input[name="email"]')).toHaveCSS('font-size', '16px');
    await expect(page.locator('.login-art')).toBeHidden();
  } else {
    await expect(page.locator('.login-art')).toBeVisible();
  }
});
