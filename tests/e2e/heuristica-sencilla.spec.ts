import { expect, test } from '@playwright/test';
import { STUDENT_PROJECT_ID, expectNoPageOverflow, loginAsStudent } from './helpers';

test('guía una evaluación desde su creación hasta el informe', async ({ page }, testInfo) => {
  await loginAsStudent(page);
  await page.goto(`/proyectos/${STUDENT_PROJECT_ID}/evaluacion-heuristica`);
  await page.getByRole('button', { name: '+ Nueva evaluación', exact: true }).click();
  await page.getByLabel('Producto o sitio', { exact: true }).fill(`Portal ${testInfo.project.name} ${Date.now()}`);
  await expect(page.getByRole('combobox', { name: 'Metodología', exact: true })).toBeVisible();
  await expect(page.getByText('Personalizar escala', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Comenzar revisión', exact: true }).click();

  const barra = page.getByRole('navigation', { name: 'Preguntas de la revisión' });
  await expect(barra.getByRole('status')).toContainText('preguntas respondidas');
  const total = Number(/de (\d+) preguntas/.exec(await barra.getByRole('status').innerText())![1]);
  // F30: la entrega solo se ofrece en la última sección.
  await expect(page.getByRole('button', { name: 'Entregar mi evaluación', exact: true })).toHaveCount(0);
  let i = 0;
  for (;;) {
    const filas = page.getByRole('row').filter({ has: page.getByRole('radio') });
    const enSeccion = await filas.count();
    for (let k = 0; k < enSeccion; k++, i++) {
      const fila = filas.nth(k);
      if (i === 0) {
        await fila.getByRole('radio', { name: 'No aplica', exact: true }).check();
        await expect(page.getByRole('textbox', { name: 'Motivo de no aplica', exact: true })).toHaveCount(0);
      } else await fila.getByRole('radio').first().check();
      // F31: la evaluación individual ya no registra problemas.
      if (i === 1) await expect(fila.getByRole('button', { name: /^Agregar problema/ })).toHaveCount(0);
    }
    const siguiente = page.getByRole('button', { name: 'Sección siguiente', exact: true });
    if (await siguiente.count() === 0 || await siguiente.isDisabled()) break;
    await siguiente.click();
  }
  expect(i).toBe(total);
  await expectNoPageOverflow(page);
  await page.getByRole('button', { name: 'Entregar mi evaluación', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Acuerdo del equipo ·/ })).toBeVisible();

  await expect(page.getByText(`${total} de ${total} preguntas acordadas`, { exact: true })).toBeVisible();
  await expect(page.getByRole('row').filter({ has: page.getByRole('radio') })).toHaveCount(total);
  await page.getByRole('button', { name: 'Solo diferencias', exact: true }).click();
  await expect(page.getByText('Las respuestas individuales coinciden en todas las preguntas.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ver todo', exact: true }).click();
  await expect(page.getByRole('row').filter({ has: page.getByRole('radio') })).toHaveCount(total);
  await page.getByRole('tab', { name: 'Preparar el informe', exact: true }).click();
  // F31: los problemas se agregan en el acuerdo, con su autor.
  const problemas = page.getByRole('region', { name: 'Problemas que detectó el equipo' });
  await problemas.getByRole('button', { name: 'Agregar problema', exact: true }).click();
  await expect(problemas.getByText(/^Agregado por /)).toBeVisible();
  await problemas.getByRole('textbox', { name: 'Título del problema', exact: true }).fill('El menú es confuso');
  await problemas.getByRole('textbox', { name: 'Descripción del problema', exact: true }).fill('Las opciones no explican a qué sección llevan.');
  await page.getByLabel('Decisión del consenso').selectOption('ACEPTADO');
  await page.getByLabel('Justificación de aceptación, fusión o descarte', { exact: true }).fill('El equipo lo comprobó al navegar.');
  await page.getByRole('tab', { name: 'Preparar el informe', exact: true }).click();
  await page.getByLabel('Conclusión y recomendaciones finales', { exact: true }).fill('La navegación permite encontrar información.');
  await page.getByRole('button', { name: 'Entregar acuerdo', exact: true }).click();
  await page.getByRole('button', { name: 'Preparar informe', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Resultado de la revisión', exact: true })).toBeVisible();
  await expect(page.getByText('La navegación permite encontrar información.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Descargar informe PDF', exact: true })).toBeVisible();
  await expectNoPageOverflow(page);
});
