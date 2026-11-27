import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PanelAlertas, PanelAporte, PanelAvance, PanelHallazgos, PanelNovedades, desdeVisita } from './ResumenDocente';

vi.mock('../projects/hooks/useProjectsQueries', () => ({ useMembers: vi.fn() }));
vi.mock('../comments/hooks/useCommentsQueries', () => ({ useComments: vi.fn() }));

const montar = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('paneles de la analítica para el profesor', () => {
  it('semáforo con enlace a cada técnica', () => {
    montar(<PanelAvance proyectoId="p1" avance={[
      { id: 'personas', titulo: 'Personas', estado: 'completa', detalle: '2 de 2 personas validadas', ultima: '2026-11-12T10:00:00Z' },
      { id: 'card-sorting', titulo: 'Card Sorting', estado: 'sin-empezar', detalle: 'Sin estudios', ultima: null },
    ]} />);
    expect(screen.getByRole('link', { name: 'Personas' })).toHaveAttribute('href', '/proyectos/p1/personas');
    expect(screen.getByText('1 de 2 completas')).toBeInTheDocument();
    expect(screen.getByText('Sin empezar')).toBeInTheDocument();
  });

  it('muestra seis alertas y despliega el resto', async () => {
    const alertas = Array.from({ length: 8 }, (_, i) => ({ tipo: 'aviso' as const, texto: `Alerta ${i + 1}`, ruta: 'personas' }));
    montar(<PanelAlertas proyectoId="p1" alertas={alertas} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    await userEvent.click(screen.getByRole('button', { name: 'Ver las 8 alertas' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
    expect(screen.getByRole('link', { name: 'Revisar Alerta 8' })).toHaveAttribute('href', '/proyectos/p1/personas');
  });

  it('tabla de aporte por integrante con quien no aportó', () => {
    const vacio = { personas: 0, 'journey-map': 0, 'momentos-criticos': 0, 'card-sorting': 0, 'evaluacion-heuristica': 0 };
    montar(<PanelAporte aportes={[
      { usuarioId: 'a', nombre: 'Ana', porTecnica: { ...vacio, personas: 3 }, total: 3, ultima: '2026-11-12T10:00:00Z' },
      { usuarioId: 'c', nombre: 'Carla', porTecnica: vacio, total: 0, ultima: null },
    ]} />);
    const filas = screen.getAllByRole('row');
    expect(within(filas[2]).getByRole('rowheader', { name: 'Carla' })).toBeInTheDocument();
    expect(within(filas[2]).getByText('Sin actividad')).toBeInTheDocument();
  });

  it('hallazgos y novedades enlazan a su técnica; comentarios sin respuesta', () => {
    montar(<>
      <PanelHallazgos proyectoId="p1" hallazgos={[{ tecnica: 'Fase con peor experiencia', texto: 'Pago', ruta: 'journey-map' }]} />
      <PanelNovedades proyectoId="p1" primeraVisita usuarioId="doc" novedades={[{ fecha: '2026-11-12T10:00:00Z', texto: 'Ana editó personas · Camila', ruta: 'personas' }]}
        datos={{ comentarios: [{ id: 'k1', tecnica: 'personas', texto: 'Falta evidencia', autorId: 'doc', createdAt: '2026-11-09T10:00:00Z', autor: { nombre: 'Profesora' } }] as never }} />
    </>);
    expect(screen.getByRole('link', { name: 'Pago' })).toHaveAttribute('href', '/proyectos/p1/journey-map');
    expect(screen.getByRole('heading', { name: 'Qué cambió en los últimos 7 días' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ana editó personas · Camila' })).toHaveAttribute('href', '/proyectos/p1/personas');
    expect(screen.getByText(/Falta evidencia/)).toBeInTheDocument();
  });

  it('sin visita anterior mira los últimos 7 días', () => {
    const desde = new Date(desdeVisita(null)).getTime();
    expect(Date.now() - desde).toBeGreaterThan(6.9 * 24 * 3600 * 1000);
    expect(desdeVisita('2026-11-01T00:00:00Z')).toBe('2026-11-01T00:00:00Z');
  });
});
