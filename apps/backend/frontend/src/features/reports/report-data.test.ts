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

  it('incluye los nuevos campos de Personas en el informe descargable', async () => {
    vi.mocked(listPersonas).mockResolvedValue([{
      version: 2,
      contenido: {
        nombreCompleto: 'Ana', rolEnServicio: 'Usuaria principal',
        relacionConServicio: 'Consulta semanal', caracteristicasDistintivas: ['Usa lector de pantalla'],
        evidencia: ['Entrevista del 15 de septiembre'], estadoValidacion: 'VALIDADA',
        observacionesValidacion: 'Revisada con el equipo',
      },
    }] as never);
    const report = await loadProjectReport('p1', ['personas']);
    const content = JSON.stringify(buildReportDefinition(report).content);
    for (const value of ['Usuaria principal', 'Consulta semanal', 'Usa lector de pantalla',
      'Entrevista del 15 de septiembre', 'Validada', 'Revisada con el equipo']) expect(content).toContain(value);
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

  it('Card Sorting del informe usa las vistas nuevas: tarjetas con barras, sin consenso y categorías', async () => {
    vi.mocked(getCardSortingEstudiosByProyecto).mockResolvedValue([{
      id: 's1', evaluadorId: 'owner', nombre: 'Portal', cerrado: false, createdAt: '2026-09-01',
      tipoCardSorting: 'ABIERTO', cardsDefinidas: [], categoriasDefinidas: [],
    }] as never);
    vi.mocked(getCardSortingAnalytics).mockResolvedValue({
      participantesCount: 4, cardsCount: 2, acuerdoGlobal: 60, categorias: ['A', 'B'], clusters: [],
      umbrales: { consenso: 50, muestraMinima: 15, muestraEstable: 30 },
      porCarta: [
        { tarjeta: 'Becas', categoriasCount: 2, categorias: [{ nombre: 'A', frecuencia: 3 }, { nombre: 'B', frecuencia: 1 }] },
        { tarjeta: 'Libro', categoriasCount: 2, categorias: [{ nombre: 'A', frecuencia: 2 }, { nombre: 'B', frecuencia: 2 }] },
      ],
      porCategoria: [{ nombre: 'A', cardsCount: 2, cartas: [{ tarjeta: 'Becas', frecuencia: 3 }], subcategorias: [] }],
      frecuenciaPorCategoria: [{ nombre: 'A', count: 3, porcentaje: 75 }],
    } as never);
    const report = await loadProjectReport('p1', ['cards']);
    const content = JSON.stringify(buildReportDefinition(report).content);
    for (const value of ['Distribución', 'Tarjetas sin consenso', 'Sin consenso', 'Categorías', 'Becas']) expect(content).toContain(value);
    expect(content).not.toContain('Asignaciones');
  });
});
