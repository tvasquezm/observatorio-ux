import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadProjectReport, REPORT_METHODS } from './report-data';
import { getProject } from '../projects/api/projects.api';
import { listPersonas } from '../persona/api/persona.api';
import { listJourneys } from '../journey-map/api/journey-map.api';
import { listCriticalMoments } from '../momentos-criticos/api/momentos-criticos.api';
import { getCardSortingEstudiosByProyecto, getCardSortingAnalytics } from '../card-sorting/api/card-sorting.api';
import { listarSesionesHeuristicas } from '../evaluacion-heuristica/api/evaluacion-heuristica.api';
import { buildReportDefinition } from '../../shared/utils/pdf';

vi.mock('../projects/api/projects.api', () => ({ getProject: vi.fn() }));
vi.mock('../persona/api/persona.api', () => ({ listPersonas: vi.fn() }));
vi.mock('../journey-map/api/journey-map.api', () => ({ listJourneys: vi.fn() }));
vi.mock('../momentos-criticos/api/momentos-criticos.api', () => ({ listCriticalMoments: vi.fn() }));
vi.mock('../card-sorting/api/card-sorting.api', () => ({ getCardSortingEstudiosByProyecto: vi.fn(), getCardSortingAnalytics: vi.fn() }));
vi.mock('../evaluacion-heuristica/api/evaluacion-heuristica.api', () => ({ listarSesionesHeuristicas: vi.fn() }));
vi.mock('../auth/store/useAuthStore', () => ({ useAuthStore: { getState: () => ({ user: { id: 'owner', rol: 'DOCENTE' } }) } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getProject).mockResolvedValue({ id: 'p1', nombre: 'Investigación móvil', descripcion: null, creadoPorId: 'owner', createdAt: '2026-09-15' });
  vi.mocked(listPersonas).mockResolvedValue([]);
  vi.mocked(listJourneys).mockResolvedValue([]);
  vi.mocked(listCriticalMoments).mockResolvedValue([]);
  vi.mocked(getCardSortingEstudiosByProyecto).mockResolvedValue([]);
  vi.mocked(listarSesionesHeuristicas).mockResolvedValue([]);
});

describe('informes por técnicas', () => {
  it('una técnica no consulta ni imprime las otras cuatro', async () => {
    const report = await loadProjectReport('p1', ['heuristica']);
    expect(listarSesionesHeuristicas).toHaveBeenCalledWith('p1');
    for (const request of [listPersonas, listJourneys, listCriticalMoments, getCardSortingEstudiosByProyecto]) expect(request).not.toHaveBeenCalled();
    const pdf = JSON.stringify(buildReportDefinition(report));
    expect(pdf).toContain('Evaluación Heurística');
    expect(pdf).toContain('Sin registros guardados');
    expect(pdf).not.toContain('Journey Map');
    expect(pdf).not.toContain('Personas');
  });

  it('el completo consulta las cinco técnicas y conserva un orden estable', async () => {
    const report = await loadProjectReport('p1', REPORT_METHODS.map(({ id }) => id).reverse());
    expect(report.methods.map(({ id }) => id)).toEqual(REPORT_METHODS.map(({ id }) => id));
    for (const request of [listPersonas, listJourneys, listCriticalMoments, getCardSortingEstudiosByProyecto, listarSesionesHeuristicas]) expect(request).toHaveBeenCalledWith('p1');
  });

  it('incorpora la marca sin cambiar las técnicas ni la orientación del recorrido', async () => {
    const report = await loadProjectReport('p1', ['journey']);
    const definition = buildReportDefinition(report, { logo: 'logo-color', logoWhite: 'logo-blanco' });
    expect(definition.images).toEqual({ brandLogo: 'logo-color', brandLogoWhite: 'logo-blanco' });
    const content = JSON.stringify(definition.content);
    expect(content).toContain('Journey Map');
    expect(content).toContain('landscape');
    expect(content).not.toContain('De los datos a las decisiones.');
    expect(content).not.toContain('Evaluación Heurística');
  });

  it('rechaza un informe parcial si falla una técnica elegida', async () => {
    vi.mocked(listJourneys).mockRejectedValue(new Error('Sin acceso'));
    await expect(loadProjectReport('p1', ['personas', 'journey'])).rejects.toThrow('Sin acceso');
  });

  it('no solicita analítica privada de otro evaluador', async () => {
    vi.mocked(getCardSortingEstudiosByProyecto).mockResolvedValue([{ id: 'private', evaluadorId: 'other' }] as never);
    const report = await loadProjectReport('p1', ['cards']);
    expect(report.cards).toEqual([]);
    expect(getCardSortingAnalytics).not.toHaveBeenCalled();
  });
});
