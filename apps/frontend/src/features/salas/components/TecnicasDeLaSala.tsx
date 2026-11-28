import { useState } from 'react';
import { TECNICAS, tecnicasHabilitadas, type RutaTecnica } from '../../analitica-proyecto/resumen-docente';

interface Guardado { mutate: (datos: { tecnicasAnalizadas: string[] }) => void; isPending: boolean }

/**
 * Qué técnicas se muestran en la «Analítica general» de los proyectos de la sala. Se elige una vez aquí y vale para
 * todos sus proyectos. Desmarcar una técnica no borra nada: solo deja de contarse y de generar alertas.
 */
export function TecnicasDeLaSala({ tecnicasAnalizadas, guardar }: { tecnicasAnalizadas?: string[]; guardar: Guardado }) {
  const actuales = tecnicasHabilitadas(tecnicasAnalizadas);
  const [elegidas, setElegidas] = useState<RutaTecnica[]>(actuales);
  const cambio = elegidas.length !== actuales.length || elegidas.some(t => !actuales.includes(t));
  const alternar = (id: RutaTecnica) => setElegidas(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  return (
    <section className="panel analitica-config" aria-labelledby="tecnicas-sala-titulo">
      <h3 id="tecnicas-sala-titulo">Técnicas que se muestran en la analítica de los proyectos <span className="count">{actuales.length} de {TECNICAS.length}</span></h3>
      <p className="text-muted-sm">Marca las técnicas que usarán los estudiantes. Solo esas cuentan en la «Analítica general» de todos los proyectos de esta sala. Las que desmarques no se borran: simplemente se ocultan del análisis y no generan alertas.</p>
      <fieldset className="analitica-config-lista">
        <legend className="sr-only">Técnicas que se analizan en la sala</legend>
        {TECNICAS.map(t => (
          <label key={t.id} className="analitica-config-opcion">
            <input type="checkbox" checked={elegidas.includes(t.id)} onChange={() => alternar(t.id)} />
            <span>{t.titulo}</span>
          </label>
        ))}
      </fieldset>
      {!elegidas.length && <p role="alert" className="error-text">Elige al menos una técnica.</p>}
      <div className="analitica-config-acciones">
        <button type="button" className="primary" disabled={!cambio || !elegidas.length || guardar.isPending}
          onClick={() => guardar.mutate({ tecnicasAnalizadas: TECNICAS.map(t => t.id).filter(id => elegidas.includes(id)) })}>
          {guardar.isPending ? 'Guardando…' : 'Guardar técnicas'}
        </button>
      </div>
    </section>
  );
}
