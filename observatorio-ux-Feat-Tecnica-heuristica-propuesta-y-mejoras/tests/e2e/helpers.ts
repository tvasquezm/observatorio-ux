import { expect, type Locator, type Page } from '@playwright/test';

export const PROJECT_ID = 'f1e1b6a1-0001-4a11-9c00-000000000002';
export const STUDENT_PROJECT_ID = '2220b224-865d-4230-a484-19338c66b9e6';

export async function loginAsProfessor(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.E2E_PROFESSOR_EMAIL ?? 'profesor@test.com');
  await page.getByLabel('Contraseña').fill(process.env.E2E_PROFESSOR_PASSWORD ?? 'profesor123');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Un mapa claro para decidir mejor.' })).toBeVisible();
}

export async function loginAsStudent(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.E2E_STUDENT_EMAIL ?? 'estudiante2@ux.utem.cl');
  await page.getByLabel('Contraseña').fill(process.env.E2E_STUDENT_PASSWORD ?? 'Demo1234!');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL('/');
}

export async function expectNoPageOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(widths.scroll, `La página mide ${widths.scroll}px dentro de ${widths.client}px`).toBeLessThanOrEqual(
    widths.client + 1,
  );
}

export async function expectInsideViewport(page: Page, selector: Locator) {
  const box = await selector.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
}
