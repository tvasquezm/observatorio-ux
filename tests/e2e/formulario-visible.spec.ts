import { expect, test } from '@playwright/test';
import { STUDENT_PROJECT_ID, expectInsideViewport, loginAsStudent } from './helpers';

const tecnicas = [
  ['personas', '+ Nueva persona'],
  ['journey-map', '+ Nuevo Journey Map'],
  ['momentos-criticos', '+ Nuevo momento crítico'],
  ['card-sorting', '+ Nuevo Card Sorting'],
  ['evaluacion-heuristica', '+ Nueva evaluación'],
] as const;

for (const [ruta, etiqueta] of tecnicas) {
  test(`${etiqueta} deja el formulario visible y con foco en su título`, async ({ page }) => {
    await loginAsStudent(page);
    await page.goto(`/proyectos/${STUDENT_PROJECT_ID}/${ruta}`);
    await page.getByRole('button', { name: etiqueta, exact: true }).click();

    const ancla = page.locator('.technique-form-anchor');
    await expect(ancla).toBeVisible();
    const titulo = ancla.locator('h2, h3').first();
    await expect(titulo).toBeFocused();

    // El desplazamiento es suave: se espera a que el título quede por debajo de la barra fija.
    const barra = page.locator('.top');
    await expect.poll(async () => {
      const [t, b] = await Promise.all([titulo.boundingBox(), barra.boundingBox()]);
      return t && b ? t.y - (b.y + b.height) : -1;
    }).toBeGreaterThanOrEqual(0);
    await expectInsideViewport(page, titulo);
  });
}
