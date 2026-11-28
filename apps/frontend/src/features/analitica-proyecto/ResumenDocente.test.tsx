import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PanelAlertas, PanelAporte, PanelAvance, PanelHallazgos, PanelNovedades, desdeNovedades } from './ResumenDocente';

vi.mock('../projects/hooks/useProjectsQueries', () => ({ useMembers: vi.fn(), useMemberEvents: vi.fn() }));
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
      <PanelNovedades proyectoId="p1" leidoHasta={null} onLeido={vi.fn()} onMostrarDeNuevo={vi.fn()} usuarioId="doc" novedades={[{ fecha: '2026-11-12T10:00:00Z', texto: 'Ana editó personas · Camila', ruta: 'personas' }]}
        datos={{ comentarios: [{ id: 'k1', tecnica: 'personas', texto: 'Falta evidencia', autorId: 'doc', createdAt: '2026-11-09T10:00:00Z', autor: { nombre: 'Profesora' } }] as never }} />
    </>);
    expect(screen.getByRole('link', { name: 'Pago' })).toHaveAttribute('href', '/proyectos/p1/journey-map');
    expect(screen.getByRole('heading', { name: 'Qué cambió en los últimos 7 días' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ana editó personas · Camila' })).toHaveAttribute('href', '/proyectos/p1/personas');
    expect(screen.getByText(/Falta evidencia/)).toBeInTheDocument();
  });

  it('las novedades miran siempre los últimos 7 días, o desde que se marcaron como leídas si es más reciente', () => {
    const ahora = new Date('2026-11-20T12:00:00Z').getTime();
    expect(desdeNovedades(null, ahora)).toBe('2026-11-13T12:00:00.000Z');
    expect(desdeNovedades('2026-11-18T09:00:00.000Z', ahora)).toBe('2026-11-18T09:00:00.000Z');
    expect(desdeNovedades('2026-10-01T00:00:00.000Z', ahora)).toBe('2026-11-13T12:00:00.000Z');
  });

  it('«Marcar como leído» limpia las novedades y «Mostrar de nuevo» las devuelve', async () => {
    const onLeido = vi.fn(); const onMostrar = vi.fn();
    const novedades = [{ fecha: '2026-11-12T10:00:00Z', texto: 'Ana editó personas · Camila', ruta: 'personas' as const }];
    const { rerender } = montar(<PanelNovedades proyectoId="p1" leidoHasta={null} onLeido={onLeido} onMostrarDeNuevo={onMostrar} usuarioId="doc" novedades={novedades} datos={{ comentarios: [] as never }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Marcar como leído' }));
    expect(onLeido).toHaveBeenCalledTimes(1);
    rerender(<MemoryRouter><PanelNovedades proyectoId="p1" leidoHasta="2026-11-15T10:00:00.000Z" onLeido={onLeido} onMostrarDeNuevo={onMostrar} usuarioId="doc" novedades={[]} datos={{ comentarios: [] as never }} /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'Marcar como leído' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar de nuevo los últimos 7 días' }));
    expect(onMostrar).toHaveBeenCalledTimes(1);
  });

  it('muestra todas las novedades y todos los comentarios sin respuesta, no solo los primeros', async () => {
    const novedades = Array.from({ length: 12 }, (_, i) => ({ fecha: `2026-11-${String(10 + i).padStart(2, '0')}T10:00:00Z`, texto: `Cambio ${i + 1}`, ruta: 'personas' as const }));
    const comentarios = Array.from({ length: 7 }, (_, i) => ({ id: `k${i}`, tecnica: i % 2 ? 'personas' : 'card-sorting', texto: `Comentario ${i + 1}`, autorId: 'doc', createdAt: `2026-11-0${i + 1}T10:00:00Z`, autor: { nombre: 'Profesora' } }));
    montar(<PanelNovedades proyectoId="p1" leidoHasta={null} onLeido={vi.fn()} onMostrarDeNuevo={vi.fn()} usuarioId="doc" novedades={novedades} datos={{ comentarios: comentarios as never }} />);
    expect(screen.getAllByText(/^Cambio \d+$/)).toHaveLength(8);
    await userEvent.click(screen.getByRole('button', { name: 'Ver las 12 novedades' }));
    expect(screen.getAllByText(/^Cambio \d+$/)).toHaveLength(12);
    await userEvent.click(screen.getByRole('button', { name: 'Ver los 7 comentarios sin respuesta' }));
    expect(screen.getAllByText(/Comentario \d/)).toHaveLength(7);
  });
});
