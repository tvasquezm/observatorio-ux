import { expect, test } from '@playwright/test';
import {
  PROJECT_ID,
  STUDENT_PROJECT_ID,
  expectInsideViewport,
  expectNoPageOverflow,
  loginAsProfessor,
  loginAsStudent,
} from './helpers';

test('recorre login, proyecto y las cinco técnicas UX', async ({ page }, testInfo) => {
  await loginAsProfessor(page);
  await page.getByRole('link', { name: /Proyectos/ }).first().click();
  await page.getByRole('link', { name: /Proyecto Demo Profesor/ }).first().click();
  await expect(page).toHaveURL(`/proyectos/${PROJECT_ID}`);
  await expect(page.getByRole('heading', { name: 'Proyecto Demo Profesor' })).toBeVisible();

  const techniques = [
    ['Personas', 'Personas'],
    ['Journey Map', 'Journey Maps'],
    ['Momentos Críticos', 'Momentos críticos'],
    ['Card Sorting', 'Card sorting'],
    ['Evaluación Heurística', 'Hallazgos heurísticos'],
  ] as const;

  for (const [linkName, headingName] of techniques) {
    await page.getByRole('link', { name: linkName, exact: true }).click();
    await expect(page.getByRole('heading', { name: headingName, exact: true }).first()).toBeVisible();
    await expectNoPageOverflow(page);
  }

  await page.getByRole('link', { name: 'Analítica', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Analítica general' })).toBeVisible();
  await expectNoPageOverflow(page);

  await page.getByRole('link', { name: /Salas/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Salas de Proyecto UX' })).toBeVisible();
  await expectNoPageOverflow(page);

  if (testInfo.project.name === 'mobile-chromium') {
    const sidebar = page.getByRole('complementary', { name: 'Navegación principal' });
    await expectInsideViewport(page, sidebar.getByRole('img', { name: 'UXLab' }));
    await expectInsideViewport(page, sidebar.getByRole('button', { name: 'Salir' }));

    for (const name of ['Dashboard', 'Proyectos', 'Salas']) {
      const link = sidebar.getByRole('link', { name: new RegExp(name) });
      const box = await link.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      await expectInsideViewport(page, link);
    }

    const createRoom = page.getByRole('button', { name: '+ Crear sala' });
    await expect(createRoom).toBeVisible();
    expect((await createRoom.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
});

test('impide que un estudiante abra la analítica restringida', async ({ page }) => {
  await loginAsStudent(page);
  await page.goto(`/proyectos/${STUDENT_PROJECT_ID}/analitica`);
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Un mapa claro para decidir mejor.' })).toBeVisible();
});
