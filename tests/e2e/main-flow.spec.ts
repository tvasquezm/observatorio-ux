import { expect, test } from '@playwright/test';
import {
  PROJECT_ID,
  STUDENT_PROJECT_ID,
  expectInsideViewport,
  expectNoPageOverflow,
  loginAsProfessor,
  loginAsStudent,
} from './helpers';

test('clasifica y consulta resultados sin confundir evaluador y participante', async ({ page }, testInfo) => {
  await loginAsStudent(page);
  await page.goto(`/proyectos/${STUDENT_PROJECT_ID}/card-sorting`);
  await page.locator('summary').filter({ hasText: 'Nuevo estudio' }).click();
  const nombre = `Card Sorting E2E ${testInfo.project.name}`;
  await page.getByLabel('Nombre del estudio', { exact: true }).fill(nombre);
  await page.getByLabel('Pegar lista de tarjetas', { exact: true }).fill('Biblioteca\nCalendario\nAsignaturas');
  await page.getByRole('button', { name: 'Agregar 3 tarjetas', exact: true }).click();
  await page.getByRole('button', { name: 'Crear y abrir el workspace →', exact: true }).click();
  await expect(page.getByRole('heading', { name: nombre, exact: true })).toBeVisible();
  const workspaceUrl = page.url();
  await page.locator('summary').filter({ hasText: 'Ver enlace' }).click();
  const enlace = await page.locator('code').innerText();
  // La cookie del evaluador sigue presente en este mismo navegador.
  await page.goto(enlace);
  await page.getByRole('button', { name: 'Continuar al consentimiento', exact: true }).click();
  await page.getByRole('button', { name: 'Acepto participar', exact: true }).click();
  await page.getByRole('button', { name: 'Comenzar', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Servicios');
  await page.getByRole('button', { name: 'Crear', exact: true }).click();
  for (const tarjeta of ['Biblioteca', 'Calendario', 'Asignaturas']) {
    await page.getByRole('button', { name: tarjeta, exact: true }).click();
    await page.getByRole('button', { name: 'Mover aquí', exact: true }).click();
  }
  await expectNoPageOverflow(page);
  await page.getByRole('button', { name: 'Enviar clasificación', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('3 tarjetas');
  await page.getByRole('button', { name: 'Enviar ahora', exact: true }).click();
  await expect(page.getByText('Gracias por participar. Tu participación es anónima y ya puedes cerrar esta ventana.', { exact: true })).toBeVisible();
  await page.goto(`${workspaceUrl}/resultados`);
  await expect(page.getByRole('tab', { name: 'Tarjetas', exact: true })).toBeVisible();
  await expect(page.getByText('Biblioteca', { exact: true }).first()).toBeVisible();
  await expectNoPageOverflow(page);
});

test('recorre login, proyecto y las cinco técnicas UX', async ({ page }, testInfo) => {
  await loginAsProfessor(page);
  await page.getByRole('link', { name: /Proyectos/ }).first().click();
  await page.getByRole('link', { name: /Proyecto Demo Profesor/ }).first().click();
  await expect(page).toHaveURL(`/proyectos/${PROJECT_ID}`);
  await expect(page.getByRole('heading', { name: 'Proyecto Demo Profesor' })).toBeVisible();

  const techniques = [
    ['Personas', 'Personas'],
    ['Journey Map', 'Journey Maps'],
    ['Momentos críticos', 'Momentos críticos'],
    ['Card Sorting', 'Card Sorting'],
    ['Evaluación heurística', 'Hallazgos heurísticos'],
  ] as const;

  const projectMenu = page.locator('.project-menu');
  const mobile = testInfo.project.name === 'mobile-chromium';
  for (const [linkName, headingName] of techniques) {
    if (mobile) await projectMenu.locator('summary').click();
    await projectMenu.getByRole('link', { name: linkName, exact: true }).click();
    if (mobile) await expect(projectMenu).not.toHaveAttribute('open', '');
    else await expect(projectMenu).toHaveAttribute('open', '');
    await expect(page.getByRole('heading', { name: headingName, exact: true }).first()).toBeVisible();
    await expectNoPageOverflow(page);
  }

  if (mobile) await projectMenu.locator('summary').click();
  await projectMenu.getByRole('link', { name: 'Analítica', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Analítica general' })).toBeVisible();
  await expectNoPageOverflow(page);

  await page.getByRole('link', { name: /Salas/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Salas de Proyecto UX' })).toBeVisible();
  await expectNoPageOverflow(page);

  if (testInfo.project.name === 'mobile-chromium') {
    const sidebar = page.getByRole('complementary', { name: 'Navegación principal' });
    await expectInsideViewport(page, sidebar.getByRole('img', { name: 'UXLab' }));
    await expectInsideViewport(page, sidebar.getByRole('button', { name: 'Salir' }));

    for (const name of ['Inicio', 'Proyectos', 'Salas']) {
      const link = sidebar.getByRole('link', { name: new RegExp(name) });
      const box = await link.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      await expectInsideViewport(page, link);
    }

    const createRoom = page.getByRole('button', { name: 'Crear sala', exact: true });
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

test('restringe el panel y las cuentas administrativas a usuarios ADMIN', async ({ page }) => {
  await loginAsStudent(page);

  const accountsStatus = await page.evaluate(async () => {
    const response = await fetch('/api/users/accounts', { credentials: 'include' });
    return response.status;
  });
  expect(accountsStatus).toBe(403);

  await page.goto('/admin');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Un mapa claro para decidir mejor.' })).toBeVisible();
});
test('crea, lee y edita un momento crítico con la API real', async ({ page }, testInfo) => {
  await loginAsStudent(page);
  await page.goto(`/proyectos/${STUDENT_PROJECT_ID}/momentos-criticos`);
  await page.getByRole('button', { name: '+ Nuevo momento crítico' }).click();
  await page.getByRole('button', { name: 'Guardar momento crítico' }).click();
  await expect(page.getByRole('alert')).toContainText('Revisa los campos');
  await page.getByLabel('Nombre del perfil de usuario', { exact: true }).fill('Perfil E2E');
  await page.getByLabel('Rol', { exact: true }).fill('Solicitante');
  const nombre = `Incidente de prueba ${testInfo.project.name} ${Date.now()}`;
  await page.getByLabel('Nombre del incidente 1', { exact: true }).fill(nombre);
  await page.getByLabel('Descripción incidente 1', { exact: true }).fill('No logra completar la tarea.');
  await page.getByLabel('Causa incidente 1', { exact: true }).fill('Hipótesis: instrucciones confusas.');
  await page.getByLabel('Acciones sugeridas incidente 1', { exact: true }).fill('Revisar el texto, sin cambiar la tarea\nValidar con usuarios');
  await page.getByLabel('Impacto incidente 1').selectOption('Alto');
  await page.getByLabel('Frecuencia incidente 1').selectOption('Alta');
  await page.getByRole('button', { name: 'Guardar momento crítico' }).click();
  const ficha = page.getByRole('article', { name: 'Perfil E2E', exact: true }).filter({ hasText: nombre });
  await expect(ficha.getByText(nombre, { exact: true })).toBeVisible();
  await expect(ficha.getByText('Prioridad alta', { exact: true })).toBeVisible();
  await ficha.getByText('Ver causa y acciones').click();
  await expect(ficha.getByText('Revisar el texto, sin cambiar la tarea')).toBeVisible();
  await expectNoPageOverflow(page);
  await page.getByRole('button', { name: 'Ver Matriz 3x3' }).click();
  await expect(page.getByTestId('celda-Alto-Alta').getByText(nombre, { exact: true })).toBeVisible();
  await expectNoPageOverflow(page);
  await page.getByRole('button', { name: 'Ver Lista' }).click();
  await ficha.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Nombre del incidente 1', { exact: true }).fill(`${nombre} actualizado`);
  await page.getByRole('button', { name: 'Actualizar momento crítico' }).click();
  await expect(ficha.getByText(`${nombre} actualizado`, { exact: true })).toBeVisible();
  await expect(ficha.getByText('Versión 2', { exact: false })).toBeVisible();
});
