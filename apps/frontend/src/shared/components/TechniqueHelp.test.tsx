import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TechniqueHelp } from './TechniqueHelp';
import { TECNICAS_INFO, type TecnicaId } from '../content/tecnicas-info';

const descargar = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('../utils/tecnica-pdf', () => ({ descargarExplicacionPdf: descargar }));
describe('ayuda de las técnicas', () => {
  it.each(['personas', 'journey-map', 'momentos-criticos', 'card-sorting', 'evaluacion-heuristica'] as TecnicaId[])('explica y descarga %s desde la misma fuente', async tecnica => {
    render(<TechniqueHelp tecnica={tecnica} />);
    await userEvent.click(screen.getByText('Ver explicación completa'));
    expect(screen.getByText(TECNICAS_INFO[tecnica].explicacionCompleta.titulo)).toBeVisible();
    expect(screen.getByText('Cómo leer los resultados')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Descargar explicación (PDF)' }));
    expect(descargar).toHaveBeenCalledWith(tecnica);
  });
});
