import { expect, test } from '@playwright/test';
import { PROJECT_ID, expectNoPageOverflow, loginAsProfessor } from './helpers';

test('guía una evaluación desde su creación hasta el informe', async ({ page }, testInfo) => {
  await loginAsProfessor(page);
  await page.goto(`/proyectos/${PROJECT_ID}/evaluacion-heuristica`);
  await page.getByRole('button', { name: '+ Nueva evaluación', exact: true }).click();
  await page.getByLabel('Producto o sitio', { exact: true }).fill(`Portal ${testInfo.project.name} ${Date.now()}`);
  await expect(page.getByRole('combobox', { name: 'Metodología', exact: true })).toBeVisible();
  await expect(page.getByText('Personalizar escala', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Comenzar revisión', exact: true }).click();

  const preguntas = page.getByRole('navigation', { name: 'Preguntas de la revisión' }).getByRole('button', { name: /^Pregunta \d+:/ });
  await expect(preguntas.first()).toBeVisible();
  const total = await preguntas.count();
  await page.getByRole('button', { name: 'Entregar mi evaluación', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Pregunta 1: elige una respuesta');
  await page.getByRole('button', { name: 'Ver todo', exact: true }).click();
  const filas = page.getByRole('row').filter({ has: page.getByRole('radio') });
  await expect(filas).toHaveCount(total);
  for (let i = 0; i < total; i++) {
    const fila = filas.nth(i);
    if (i === 0) {
      await fila.getByRole('radio', { name: 'No aplica', exact: true }).check();
      await expect(page.getByRole('textbox', { name: 'Motivo de no aplica', exact: true })).toHaveCount(0);
    } else await fila.getByRole('radio').first().check();
    if (i === 1) {
      await fila.getByRole('button', { name: /^Agregar problema/ }).click();
      await page.getByRole('textbox', { name: 'Título del problema', exact: true }).fill('El menú es confuso');
      await page.getByRole('textbox', { name: 'Descripción del problema', exact: true }).fill('Las opciones no explican a qué sección llevan.');
    }
  }
  await expectNoPageOverflow(page);
  await page.getByRole('button', { name: 'Entregar mi evaluación', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Acuerdo del equipo ·/ })).toBeVisible();

  await expect(page.getByText(`${total} de ${total} preguntas acordadas`, { exact: true })).toBeVisible();
  await expect(page.getByRole('row').filter({ has: page.getByRole('radio') })).toHaveCount(total);
  await page.getByRole('button', { name: 'Solo diferencias', exact: true }).click();
  await expect(page.getByText('Las respuestas individuales coinciden en todas las preguntas.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ver todo', exact: true }).click();
  await expect(page.getByRole('row').filter({ has: page.getByRole('radio') })).toHaveCount(total);
  await page.getByRole('tab', { name: 'Revisar los problemas', exact: true }).click();
  await page.getByRole('checkbox', { name: /El menú es confuso/ }).check();
  await page.getByRole('button', { name: 'Crear decisión de los originales seleccionados', exact: true }).click();
  await page.getByLabel('Decisión del consenso').selectOption('ACEPTADO');
  await page.getByLabel('Justificación de aceptación, fusión o descarte', { exact: true }).fill('El equipo lo comprobó al navegar.');
  await page.getByRole('tab', { name: 'Preparar el informe', exact: true }).click();
  await page.getByLabel('Conclusión y recomendaciones finales', { exact: true }).fill('La navegación permite encontrar información.');
  await page.getByRole('button', { name: 'Confirmar acuerdo', exact: true }).click();
  await page.getByRole('button', { name: 'Preparar informe', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Resultado de la revisión', exact: true })).toBeVisible();
  await expect(page.getByText('La navegación permite encontrar información.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Descargar informe PDF', exact: true })).toBeVisible();
  await expectNoPageOverflow(page);
});
