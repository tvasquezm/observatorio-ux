import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RecorridoSencillo } from './RecorridoSencillo';

describe('recorrido en el mismo espacio', () => {
  it('cambia de vista con teclado y conserva lo escrito sin desmontar el editor', async () => {
    render(<RecorridoSencillo pasos={[
      { titulo: 'Respuestas', ayuda: 'Revisa las respuestas.', contenido: <label>Nota<input /></label> },
      { titulo: 'Problemas', ayuda: 'Revisa los problemas.', contenido: <p>Lista de problemas</p> },
    ]} acciones={<button>Terminar</button>} />);
    await userEvent.type(screen.getByLabelText('Nota'), 'Texto conservado');
    const primera = screen.getByRole('tab', { name: 'Respuestas' });
    primera.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Problemas' })).toHaveFocus();
    expect(screen.getByRole('tabpanel', { name: 'Problemas' })).toBeVisible();
    expect(screen.queryByRole('textbox', { name: 'Nota' })).toBeNull();
    await userEvent.keyboard('{Home}');
    expect(screen.getByLabelText('Nota')).toHaveValue('Texto conservado');
    expect(screen.queryByText(/Paso \d/)).toBeNull();
  });
});
