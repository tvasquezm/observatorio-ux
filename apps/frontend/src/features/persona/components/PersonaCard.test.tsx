import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PersonaSchema } from '@observatorio-ux/shared-types';
import { PersonaCard } from './PersonaCard';

const persona = {
  id: 'a1', version: 3,
  contenido: PersonaSchema.parse({
    nombreCompleto: 'Camila Rojas', ocupacion: 'Estudiante', edad: 21,
    acercaDe: 'Usa el portal desde el celular.',
    objetivos: ['Renovar préstamos'], frustraciones: ['Menú confuso'], comportamientos: ['Busca en Google primero'],
    evidencia: ['Entrevista 1'], estadoValidacion: 'VALIDADA',
  }),
} as Parameters<typeof PersonaCard>[0]['persona'];

describe('PersonaCard', () => {
  it('muestra identidad, estado, versión y el proceso', () => {
    render(<PersonaCard persona={persona} />);
    const card = screen.getByRole('article', { name: 'Camila Rojas' });
    expect(within(card).getByText('Estudiante · 21 años')).toBeInTheDocument();
    expect(within(card).getByText('Validada')).toBeInTheDocument();
    expect(within(card).getByText('Versión 3')).toBeInTheDocument();
    expect(within(card).getByRole('region', { name: 'Proceso de la persona' })).toBeInTheDocument();
  });

  it('agrupa los datos en columnas y deja la evidencia en el perfil completo', () => {
    render(<PersonaCard persona={persona} />);
    expect(screen.getByRole('heading', { name: 'Quiere lograr' })).toBeInTheDocument();
    expect(screen.getByText('Renovar préstamos')).toBeInTheDocument();
    expect(screen.getByText('Menú confuso')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Ver perfil completo'));
    expect(screen.getByText('Entrevista 1')).toBeVisible();
  });

  it('renderiza las acciones recibidas', () => {
    render(<PersonaCard persona={persona} acciones={<button type="button">Editar</button>} />);
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });
});
