import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadProjectReport, REPORT_METHODS } from './report-data';
import { getProject } from '../projects/api/projects.api';
import { listPersonas } from '../persona/api/persona.api';
import { listJourneys } from '../journey-map/api/journey-map.api';
import { listCriticalMoments } from '../momentos-criticos/api/momentos-criticos.api';
import { getCardSortingEstudiosByProyecto, getCardSortingAnalytics } from '../card-sorting/api/card-sorting.api';
import { listarEvaluaciones } from '../heuristica-flujo/flujo.api';
import { buildReportDefinition } from '../../shared/utils/pdf';

vi.mock('../projects/api/projects.api', () => ({ getProject: vi.fn() }));
vi.mock('../persona/api/persona.api', () => ({ listPersonas: vi.fn() }));
vi.mock('../journey-map/api/journey-map.api', () => ({ listJourneys: vi.fn() }));
vi.mock('../momentos-criticos/api/momentos-criticos.api', () => ({ listCriticalMoments: vi.fn() }));
vi.mock('../card-sorting/api/card-sorting.api', () => ({ getCardSortingEstudiosByProyecto: vi.fn(), getCardSortingAnalytics: vi.fn() }));
vi.mock('../heuristica-flujo/flujo.api', () => ({ listarEvaluaciones: vi.fn() }));
vi.mock('../auth/store/useAuthStore', () => ({ useAuthStore: { getState: () => ({ user: { id: 'owner', rol: 'DOCENTE' } }) } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getProject).mockResolvedValue({ id: 'p1', nombre: 'Investigación móvil', descripcion: null, creadoPorId: 'owner', createdAt: '2026-09-15' });
  vi.mocked(listPersonas).mockResolvedValue([]);
  vi.mocked(listJourneys).mockResolvedValue([]);
  vi.mocked(listCriticalMoments).mockResolvedValue([]);
  vi.mocked(getCardSortingEstudiosByProyecto).mockResolvedValue([]);
  vi.mocked(listarEvaluaciones).mockResolvedValue([]);
});

describe('informes por técnicas', () => {
  it('no reserva una página por cada técnica vacía y restaura el formato tras el Journey', async () => {
    const report = await loadProjectReport('p1', REPORT_METHODS.map(({ id }) => id));
    const sections = (buildReportDefinition(report).content as Array<{ stack?: Array<{ text?: string }>; pageBreak?: string; pageOrientation?: string }>).filter(node => node.stack?.[0].text?.startsWith('SECCIÓN'));
    expect(sections).toHaveLength(5);
    expect(sections[1]).toMatchObject({ pageBreak: 'before', pageOrientation: 'landscape' });
    expect(sections[2]).toMatchObject({ pageBreak: 'before', pageOrientation: 'portrait' });
    expect(sections[3].pageBreak).toBeUndefined();
    expect(sections[4].pageBreak).toBeUndefined();
  });
  it('una técnica no consulta ni imprime las otras cuatro', async () => {
    const report = await loadProjectReport('p1', ['heuristica']);
    expect(listarEvaluaciones).toHaveBeenCalledWith('p1');
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
    for (const request of [listPersonas, listJourneys, listCriticalMoments, getCardSortingEstudiosByProyecto, listarEvaluaciones]) expect(request).toHaveBeenCalledWith('p1');
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

    const parcial = await loadProjectReport('p1', ['personas', 'journey'], { personas: ['necesidades'], journey: [] });
    expect(parcial.partes).toEqual({ personas: ['necesidades'] });
    expect(parcial.methods.map(method => method.id)).toEqual(['personas']);
    expect(listJourneys).not.toHaveBeenCalled();
    const recortado = JSON.stringify(buildReportDefinition(parcial).content);
    expect(recortado).toContain('Ana');
    expect(recortado).toContain('Usuaria principal');
    expect(recortado).not.toContain('Entrevista del 15 de septiembre');
    expect(recortado).not.toContain('Hobbies');

    const todas = await loadProjectReport('p1', ['personas'], { personas: ['visual', 'perfil', 'necesidades', 'validacion'] });
    expect(JSON.stringify(buildReportDefinition({ ...todas, generatedAt: report.generatedAt })))
      .toBe(JSON.stringify(buildReportDefinition(report)));
  });

  it('incluye el contexto, la evidencia y los nuevos campos de cada fase del Journey Map', async () => {
    vi.mocked(listJourneys).mockResolvedValue([{
      version: 1,
      contenido: {
        perfilUsuario: { id: 'user', nombre: 'Ana', rol: 'Solicitante' },
        objetivo: 'Obtener una cita', eventoInicio: 'Recibe una derivación', evidencia: ['Entrevista 7'],
        fases: [{
          nombre: 'Reserva', actividades: ['Escoge horario'], touchpoints: ['Portal'],
          pensamientos: ['¿Habrá cupo?'], emocion: 'Neutral', dificultades: ['No hay fechas'],
          ganancias: ['Confirmación inmediata'], oportunidades: ['Ofrecer lista de espera'],
        }],
      },
    }] as never);
    const report = await loadProjectReport('p1', ['journey']);
    const content = JSON.stringify(buildReportDefinition(report).content);
    for (const value of ['Obtener una cita', 'Recibe una derivación', 'Entrevista 7', 'Escoge horario',
      'No hay fechas', 'Confirmación inmediata', 'Portal', '¿Habrá cupo?', 'Ofrecer lista de espera']) {
      expect(content).toContain(value);
    }
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

  it('incluye los problemas acordados de la evaluación heurística nueva y omite la versión anterior', async () => {
    const config = { nombre: 'Revisión del portal', producto: { nombre: 'Portal' }, metodologia: { nombre: 'Nielsen', criterios: [{ id: 'c1', nombre: 'Visibilidad del estado' }], escala: { tipo: 'cualitativa', sentido: 'sin_orden', niveles: [{ id: 'ok', etiqueta: 'Cumple' }] } }, evaluadorIds: [] };
    const informe = (titulo: string) => ({ version: 1, configuracion: config, evaluadores: [], finalizadoEn: '2026-10-01', consenso: { criterios: [], aprobadoPor: [], hallazgos: [{ id: 'h1', titulo, criterioIds: ['c1'], pantalla: 'Inicio', descripcion: 'No se ve el avance', recomendacion: 'Mostrar una barra de progreso', severidad: 3, prioridad: 'ALTA', decision: 'ACEPTADO', origenIds: [], justificacion: '', notas: '', evidenciaIds: [] }] } });
    vi.mocked(listarEvaluaciones).mockResolvedValue([
      { id: 'v1', anteriorId: null, version: 1, fase: 'FINALIZADA', configuracion: config, informe: informe('Problema antiguo') },
      { id: 'v2', anteriorId: 'v1', version: 2, fase: 'FINALIZADA', configuracion: config, informe: informe('Falta barra de progreso') },
    ] as never);
    const report = await loadProjectReport('p1', ['heuristica']);
    expect(report.heuristics).toHaveLength(1);
    const content = JSON.stringify(buildReportDefinition(report).content);
    for (const value of ['Revisión del portal', 'Falta barra de progreso', 'Mostrar una barra de progreso', 'Visibilidad del estado']) expect(content).toContain(value);
    expect(content).not.toContain('Problema antiguo');
  });
});

describe('card sorting en el informe del proyecto', () => {
  const tarjetas = ['Becas', 'Matrícula', 'Horario', 'Notas', 'Biblioteca', 'Casino', 'Deportes', 'Salud'];
  const categorias = ['Trámites', 'Académico', 'Vida', 'Servicios', 'Pagos', 'Ayuda', 'Otros'];
  const analytics = {
    estudio: { id: 'e1', proyectoId: 'p1', nombre: 'Menú del portal', cerrado: true, createdAt: '2026-10-01' },
    participantesCount: 5, cardsCount: 8, acuerdoGlobal: 62, tarjetas,
    matrizSimilitud: tarjetas.map((_, i) => tarjetas.map((__, j) => (i === j ? 100 : 20 + ((i + j) % 5) * 15))),
    frecuenciaPorCategoria: [], clusters: [{ nombre: 'Grupo 1', tarjetas: 'Becas, Matrícula', acuerdo: 80 }], sinConsenso: [],
    muestra: 'baja', umbrales: { consenso: 50, muestraMinima: 15, muestraEstable: 30 }, categorias,
    resultsMatrix: { categorias, filas: tarjetas.map((tarjeta, i) => ({ tarjeta, valores: categorias.map((_, j) => (i + j) % 4) })) },
    popularPlacementsMatrix: { categorias, filas: tarjetas.map((tarjeta, i) => ({ tarjeta, valores: categorias.map((_, j) => ((i + j) % 5) * 20) })) },
    porCarta: [], porCategoria: [], participantes: [], preguntas: [],
  };
  beforeEach(() => {
    vi.mocked(getCardSortingEstudiosByProyecto).mockResolvedValue([{ id: 'e1', nombre: 'Menú del portal', evaluadorId: 'owner', cerrado: true, createdAt: '2026-10-01', tipoCardSorting: 'ABIERTO', cardsDefinidas: [], categoriasDefinidas: [] }] as never);
    vi.mocked(getCardSortingAnalytics).mockResolvedValue(analytics as never);
  });

  it('incluye los mapas de calor y el dendrograma, y las matrices anchas van apaisadas', async () => {
    const report = await loadProjectReport('p1', ['cards', 'heuristica'], { cards: ['matriz', 'similitud', 'dendrograma', 'agrupaciones'] });
    const nodos = buildReportDefinition(report).content as Array<{ stack?: Array<{ stack?: Array<{ text?: string }>; text?: string }>; pageBreak?: string; pageOrientation?: string }>;
    const titulo = (texto: string) => nodos.find(n => n.stack?.[0]?.stack?.[0]?.text === texto);
    expect(titulo('Matriz de ubicaciones')).toMatchObject({ pageBreak: 'before', pageOrientation: 'landscape' });
    expect(titulo('Similitud entre tarjetas')?.pageBreak).toBeUndefined();
    expect(titulo('Dendrograma')).toMatchObject({ pageBreak: 'before', pageOrientation: 'portrait' });
    const pdf = JSON.stringify(nodos);
    expect(pdf).toContain('"svg"');
    expect(pdf).toContain('#253ff6');
    expect(pdf).toContain('Agrupaciones sugeridas');
    expect(pdf).not.toContain('Tarjetas populares');
    const secciones = nodos.filter(n => n.stack?.[0]?.text?.startsWith('SECCIÓN'));
    expect(secciones[1]).toMatchObject({ pageBreak: 'before', pageOrientation: 'portrait' });
  });

  it('una elección guardada con "Resultados detallados" sigue trayendo Tarjetas y Categorías', async () => {
    const report = await loadProjectReport('p1', ['cards'], { cards: ['resultados'] });
    const pdf = JSON.stringify(buildReportDefinition(report).content);
    expect(pdf).toContain('"Tarjetas"');
    expect(pdf).toContain('"Categorías"');
    expect(pdf).not.toContain('Dendrograma');
  });
});
