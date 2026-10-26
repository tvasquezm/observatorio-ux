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
  it('muestra identidad, estado y versión, con el proceso en el detalle', () => {
    render(<PersonaCard persona={persona} />);
    const card = screen.getByRole('article', { name: 'Camila Rojas' });
    expect(within(card).getByText('Estudiante · 21 años')).toBeInTheDocument();
    expect(within(card).getByText('Validada')).toBeInTheDocument();
    expect(within(card).getByText('Versión 3')).toBeInTheDocument();
    expect(within(card).getByRole('region', { name: 'Proceso de la persona' })).not.toBeVisible();
    fireEvent.click(within(card).getByText('Ver perfil completo'));
    expect(within(card).getByRole('region', { name: 'Proceso de la persona' })).toBeVisible();
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

  it('ubica las acciones en la cabecera de la tarjeta', () => {
    render(<PersonaCard persona={persona} acciones={<button type="button">Editar</button>} />);
    const boton = screen.getByRole('button', { name: 'Editar' });
    expect(boton.closest('header')).toBe(screen.getByRole('heading', { name: 'Camila Rojas' }).closest('header'));
  });

  it('no pinta contenedor de acciones si no hay acciones', () => {
    const { container } = render(<PersonaCard persona={persona} acciones={false} />);
    expect(container.querySelector('.tv-persona-actions')).toBeNull();
  });

  it('abre un detalle útil aunque el perfil no tenga campos adicionales', () => {
    const minimal = { ...persona, contenido: PersonaSchema.parse({ nombreCompleto: 'Perfil nuevo' }) };
    render(<PersonaCard persona={minimal} />);
    fireEvent.click(screen.getByText('Ver perfil completo'));
    const detail = screen.getByText('Ver perfil completo').closest('details')!;
    expect(detail).toHaveAttribute('open');
    expect(within(detail).getByText('Contexto de uso')).toBeVisible();
    expect(within(detail).getAllByText('Sin registrar.').length).toBeGreaterThan(0);
  });
});
