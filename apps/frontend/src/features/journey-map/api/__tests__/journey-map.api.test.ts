import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getJourney, listJourneys } from '../journey-map.api';
import { getArtifact, listArtifacts } from '../../../../shared/api/artifacts.api';

vi.mock('../../../../shared/api/artifacts.api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../../shared/api/artifacts.api')>(),
  getArtifact: vi.fn(), listArtifacts: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe('Journey Map — compatibilidad de lectura', () => {
  it.each([true, false])('normaliza los campos ausentes al listar y consultar, con listas anteriores: %s', async (hasOldLists) => {
    const phase = {
      nombre: 'Descubrimiento', emocion: 'Neutral',
      ...(hasOldLists ? { touchpoints: ['Portal'], pensamientos: ['Quiero información'], oportunidades: ['Aclarar pasos'] } : {}),
    };
    const legacy = {
      id: 'a1', artefactoLogicoId: 'logical', version: 1,
      contenido: { perfilUsuario: { id: 'u1', nombre: 'Ana', rol: 'Solicitante' }, fases: [phase, phase, phase] },
    };
    vi.mocked(listArtifacts).mockResolvedValue([legacy] as never);
    vi.mocked(getArtifact).mockResolvedValue(legacy as never);
    const [listed] = await listJourneys('p1');
    const fetched = await getJourney('p1', 'a1');
    for (const artifact of [listed, fetched]) {
      expect(artifact.contenido.evidencia).toEqual([]);
      expect(artifact.contenido.fases).toHaveLength(3);
      expect(artifact.contenido.fases[0]).toEqual({
        nombre: 'Descubrimiento', emocion: 'Neutral', actividades: [], dificultades: [], ganancias: [],
        touchpoints: hasOldLists ? ['Portal'] : [], pensamientos: hasOldLists ? ['Quiero información'] : [],
        oportunidades: hasOldLists ? ['Aclarar pasos'] : [],
      });
    }
    expect(legacy.contenido).not.toHaveProperty('evidencia');
    expect(phase).not.toHaveProperty('actividades');
  });
});
