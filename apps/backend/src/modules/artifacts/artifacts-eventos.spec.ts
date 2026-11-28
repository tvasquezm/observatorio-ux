import { avisarArtefacto, avisarProyecto, cambiosDeArtefactos, type CambioDeArtefacto } from './artifacts-eventos.js';

describe('avisos en tiempo real del proyecto', () => {
  it('publica por el mismo canal los cambios de artefactos, de integrantes y de comentarios', () => {
    const recibidos: CambioDeArtefacto[] = [];
    const suscripcion = cambiosDeArtefactos.subscribe((c) => recibidos.push(c));

    avisarArtefacto('p1', 'version', 'u1');
    avisarProyecto('p1', 'miembros', 'u2');
    avisarProyecto('p1', 'comentarios', 'u3');
    suscripcion.unsubscribe();

    expect(recibidos).toEqual([
      { proyectoId: 'p1', tipo: 'version', usuarioId: 'u1' },
      { proyectoId: 'p1', tipo: 'miembros', usuarioId: 'u2' },
      { proyectoId: 'p1', tipo: 'comentarios', usuarioId: 'u3' },
    ]);
  });
});
