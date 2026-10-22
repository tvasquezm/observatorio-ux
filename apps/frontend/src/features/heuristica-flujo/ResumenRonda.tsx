import { textoProblemas } from './flujo-utils';

/** Pausa al terminar una ronda, o revision final antes de entregar. */
export function ResumenRonda({ numero, total, final, respondidas, noAplican, problemas, pendientes, onSeguir, onVolver }: { numero: number; total: number; final: boolean; respondidas: number; noAplican: number; problemas: number; pendientes: number; onSeguir: () => void; onVolver: () => void }) {
  const titulo = final ? 'Revisión final' : `Terminaste la ronda ${numero} de ${total}`;
  return <section className="hf-resumen-ronda" aria-label={titulo}>
    <h3>{titulo}</h3>
    <ul>
      <li>{respondidas} {respondidas === 1 ? 'pregunta respondida' : 'preguntas respondidas'}</li>
      <li>{noAplican} no {noAplican === 1 ? 'aplica' : 'aplican'}</li>
      <li>{textoProblemas(problemas, final ? 'toda la revisión' : 'esta ronda')}</li>
      <li>{pendientes === 0 ? 'Sin preguntas pendientes.' : `${pendientes} ${pendientes === 1 ? 'pregunta pendiente' : 'preguntas pendientes'}.`}</li>
    </ul>
    {final && pendientes === 0 && <p role="status">Todo respondido. Usa «Entregar mi evaluación».</p>}
    <div className="hf-actions">
      {!final && <button type="button" className="primary" onClick={onSeguir}>Seguir con la ronda siguiente</button>}
      {final && pendientes > 0 && <button type="button" className="primary" onClick={onSeguir}>Ir a lo pendiente</button>}
      <button type="button" className="secondary" onClick={onVolver}>{final ? 'Volver a la revisión' : 'Volver a esta ronda'}</button>
    </div>
  </section>;
}
