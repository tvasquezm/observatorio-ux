import { expect, test } from '@playwright/test';
import { expectInsideViewport, expectNoPageOverflow, loginAsProfessor } from './helpers';

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

test('mantiene la barra abierta hasta cerrarla y conserva la elección al recargar', async ({ page }) => {
  await loginAsProfessor(page);
  const sidebar = page.getByRole('complementary', { name: 'Navegación principal' });
  const minimize = sidebar.getByRole('button', { name: 'Minimizar barra lateral' });
  const expand = sidebar.getByRole('button', { name: 'Expandir barra lateral' });
  await expect(minimize).toHaveAttribute('aria-expanded', 'true');
  await expectInsideViewport(page, sidebar);
  await expectNoPageOverflow(page);
  await page.getByRole('heading', { name: 'Un mapa claro para decidir mejor.' }).click();
  await expect(minimize).toHaveAttribute('aria-expanded', 'true');
  await sidebar.getByRole('link', { name: 'Proyectos', exact: true }).click();
  await expect(minimize).toHaveAttribute('aria-expanded', 'true');
  await expectNoPageOverflow(page);
  await minimize.click();
  await expect(expand).toHaveAttribute('aria-expanded', 'false');
  await page.reload();
  await expect(expand).toHaveAttribute('aria-expanded', 'false');
  await expectNoPageOverflow(page);
  await expand.click();
  await page.reload();
  await expect(minimize).toHaveAttribute('aria-expanded', 'true');
  await expectInsideViewport(page, sidebar);
  await expectNoPageOverflow(page);
});
