import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CardSortingPdfDialog } from './CardSortingPdfDialog';

describe('exportación configurable', () => {
  it('actualiza el resumen y envía únicamente las secciones elegidas', async () => {
    const generate = vi.fn();
    render(<CardSortingPdfDialog tabs={[{ id: 'cards', label: 'Tarjetas' }, { id: 'categories', label: 'Categorías' }]} busy={false} onClose={vi.fn()} onGenerate={generate} />);
    expect(screen.getByText(/^Tu PDF incluirá:/)).toHaveTextContent('Tarjetas');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Tarjetas' }));
    expect(screen.getByText(/^Tu PDF incluirá:/)).not.toHaveTextContent('Tarjetas');
    await userEvent.click(screen.getByRole('radio', { name: 'Blanco y negro' }));
    await userEvent.click(screen.getByRole('button', { name: 'Generar PDF' }));
    expect(generate).toHaveBeenCalledWith(['categories'], { resumen: true, color: false, separarSecciones: true });
  });
  it('impide generar un documento sin contenido', async () => {
    render(<CardSortingPdfDialog tabs={[]} busy={false} onClose={vi.fn()} onGenerate={vi.fn()} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Portada y resumen' }));
    expect(screen.getByRole('button', { name: 'Generar PDF' })).toBeDisabled();
  });
  it('muestra el progreso y permite reintentar después de un error', () => {
    const props = { tabs: [], onClose: vi.fn(), onGenerate: vi.fn() };
    const { rerender } = render(<CardSortingPdfDialog {...props} busy />);
    expect(screen.getByRole('button', { name: 'Generando…' })).toBeDisabled();
    rerender(<CardSortingPdfDialog {...props} busy={false} error="No pudimos generar el PDF. Vuelve a intentarlo." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Vuelve a intentarlo');
    expect(screen.getByRole('button', { name: 'Generar PDF' })).toBeEnabled();
  });
});
