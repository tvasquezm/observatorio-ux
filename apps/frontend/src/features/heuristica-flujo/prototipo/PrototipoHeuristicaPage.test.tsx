import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { METODOLOGIAS_HEURISTICAS } from '@observatorio-ux/shared-types';
import { describe, expect, it } from 'vitest';
import { PrototipoHeuristicaPage } from './PrototipoHeuristicaPage';

async function iniciar() {
  await userEvent.click(screen.getByRole('button', { name: 'Comenzar revisión' }));
  expect(screen.getByRole('heading', { name: 'Mi evaluación' })).toBeInTheDocument();
}

describe('prototipo local de heurística', () => {
  it('permite comenzar directamente con producto y metodología', async () => {
    render(<PrototipoHeuristicaPage />);
    const editor = screen.getByRole('region', { name: 'Configuración de la evaluación' });
    expect(within(editor).getByLabelText('Producto o sitio')).toBeVisible();
    expect(within(editor).getByRole('combobox', { name: 'Metodología' })).toBeVisible();
    expect(screen.queryByText(/Paso \d/)).toBeNull();
    await iniciar();
    expect(screen.getByRole('group', { name: 'Elige una respuesta' })).toBeVisible();
    expect(screen.getAllByRole('radio').every(r => !(r as HTMLInputElement).checked)).toBe(true);
    expect(screen.queryByRole('combobox', { name: 'Valoración' })).toBeNull();
  });

  it('muestra el avance del equipo sin revelar respuestas de otras personas', async () => {
    render(<PrototipoHeuristicaPage />);
    await iniciar();
    await userEvent.click(screen.getByRole('button', { name: 'Volver al resumen' }));
    expect(screen.getByRole('heading', { name: 'Progreso del equipo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar mi evaluación' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Valoración')).not.toBeInTheDocument();
    expect(screen.getByText(/Los trabajos individuales son privados/)).toBeInTheDocument();
  });

  it('conserva cada respuesta y cuenta no aplica sin pedir motivo', async () => {
    render(<PrototipoHeuristicaPage />);
    await iniciar();
    await userEvent.click(screen.getByRole('radio', { name: METODOLOGIAS_HEURISTICAS[0].escala.niveles[0].etiqueta }));
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente criterio' }));
    await userEvent.click(screen.getByRole('radio', { name: 'No aplica' }));
    expect(screen.queryByLabelText('Valoración')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Motivo de no aplica')).toBeNull();
    expect(screen.getByText('2 de 10 preguntas respondidas')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Anterior criterio' }));
    expect(screen.getByRole('radio', { name: METODOLOGIAS_HEURISTICAS[0].escala.niveles[0].etiqueta })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Volver al resumen' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar mi evaluación' }));
    expect(screen.getByRole('radio', { name: METODOLOGIAS_HEURISTICAS[0].escala.niveles[0].etiqueta })).toBeChecked();
  });

  it('permite saltar entre preguntas desde el mapa sin perder respuestas', async () => {
    render(<PrototipoHeuristicaPage />);
    await iniciar();
    await userEvent.click(screen.getByRole('radio', { name: 'No aplica' }));
    const mapa = screen.getByRole('navigation', { name: 'Preguntas de la revisión' });
    const preguntas = within(mapa).getAllByRole('button');
    expect(preguntas).toHaveLength(10);
    await userEvent.click(preguntas[4]);
    expect(screen.getByText('Pregunta 5 de 10')).toBeVisible();
    await userEvent.click(preguntas[0]);
    expect(screen.getByRole('radio', { name: 'No aplica' })).toBeChecked();
    expect(preguntas[0]).toHaveAttribute('aria-current', 'true');
  });

  it('entrega las diez preguntas marcadas no aplica sin respuestas ni explicaciones', async () => {
    const user = userEvent.setup();
    render(<PrototipoHeuristicaPage />);
    await iniciar();
    for (let i = 0; i < 10; i++) {
      await user.click(screen.getByRole('radio', { name: 'No aplica' }));
      expect(screen.queryByLabelText('Valoración')).toBeNull();
      expect(screen.queryByLabelText('Motivo de no aplica')).toBeNull();
      if (i < 9) await user.click(screen.getByRole('button', { name: 'Siguiente criterio' }));
    }
    expect(screen.getByText('10 de 10 preguntas respondidas')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Entregar mi evaluación' }));
    expect(screen.getByRole('heading', { name: 'Resumen de la evaluación' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Tu revisión ya está entregada.')).toBeInTheDocument();
  });
});
