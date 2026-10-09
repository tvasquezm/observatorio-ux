import type { IncidenteCritico } from '../api/momentos-criticos.api';
import {
  calorCelda,
  distribucionPrioridad,
  FRECUENCIAS,
  IMPACTOS,
  prioridad,
  type IncidenteConPerfil,
} from '../momentos-visual';

const NIVEL: Record<string, number> = { Bajo: 1, Baja: 1, Medio: 2, Media: 2, Alto: 3, Alta: 3 };

function Pips({ nivel }: { nivel: number }) {
  return (
    <span className="tv-pips">
      {[1, 2, 3].map((n) => <i key={n} className={n <= nivel ? 'on' : undefined} />)}
    </span>
  );
}

export function IncidentMeters({ inc }: { inc: IncidenteCritico }) {
  return (
    <div className="tv-meters" aria-hidden="true">
      <span className="tv-meter"><span>Impacto</span><Pips nivel={NIVEL[inc.impacto]} /></span>
      <span className="tv-meter"><span>Frecuencia</span><Pips nivel={NIVEL[inc.frecuencia]} /></span>
    </div>
  );
}

const SEGMENTOS = [
  { campo: 'alta', etiqueta: 'Alta', clase: 'alta' },
  { campo: 'media', etiqueta: 'Media', clase: 'media' },
  { campo: 'baja', etiqueta: 'Baja', clase: 'baja' },
  { campo: 'positivos', etiqueta: 'Positivas', clase: 'pos' },
] as const;

export function MomentosDistribucion({ incidentes }: { incidentes: IncidenteCritico[] }) {
  const dist = distribucionPrioridad(incidentes);
  if (incidentes.length === 0) return null;
  return (
    <section className="panel tv-dist" aria-label="Distribución por prioridad">
      <span className="kicker">Distribución por prioridad</span>
      <div className="tv-dist-bar" aria-hidden="true">
        {SEGMENTOS.filter((s) => dist[s.campo] > 0).map((s) => (
          <span key={s.campo} className={`tv-dist-seg tv-dist-seg--${s.clase}`} style={{ flex: dist[s.campo] }} />
        ))}
      </div>
      <ul className="tv-dist-legend">
        {SEGMENTOS.map((s) => (
          <li key={s.campo}>
            <i className={`tv-dist-seg--${s.clase}`} aria-hidden="true" />
            {s.etiqueta} <strong>{dist[s.campo]}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MomentosMatrix({ incidentes }: { incidentes: IncidenteConPerfil[] }) {
  return (
    <div className="matrix-wrap">
      <table className="mc-matrix tv-matrix">
        <caption>Impacto y frecuencia de los incidentes filtrados</caption>
        <thead>
          <tr>
            <th scope="col">Frecuencia / Impacto</th>
            {IMPACTOS.map((imp) => <th scope="col" key={imp}>Impacto {imp}</th>)}
          </tr>
        </thead>
        <tbody>
          {FRECUENCIAS.map((frec, fi) => (
            <tr key={frec}>
              <th scope="row">Frecuencia {frec}</th>
              {IMPACTOS.map((imp, ii) => {
                const celda = incidentes.filter((inc) => inc.impacto === imp && inc.frecuencia === frec);
                return (
                  <td key={imp} data-testid={`celda-${imp}-${frec}`} className={`tv-heat tv-heat--${calorCelda(ii, fi)}`}>
                    {celda.length === 0 ? (
                      <span className="text-muted">Sin incidentes</span>
                    ) : (
                      celda.map((inc) => (
                        <details
                          key={inc.key}
                          className={`mc-matrix-incident ${inc.tipo === 'Negativo' ? 'mc-negative' : 'mc-positive'}`}
                        >
                          <summary>
                            <span className={`tv-bubble ${inc.tipo === 'Negativo' ? 'tv-bubble--neg' : 'tv-bubble--pos'}`} aria-hidden="true">
                              {incidentes.indexOf(inc) + 1}
                            </span>
                            <strong>{inc.nombre}</strong>
                            <span>{inc.perfilNombre} · {inc.tipo}</span>
                            <span>{prioridad(inc)}</span>
                          </summary>
                          <p>{inc.descripcion}</p>
                          <p><b>Causa:</b> {inc.causa}</p>
                          <ul>{inc.accionesSugeridas.map((a, i) => <li key={i}>{a}</li>)}</ul>
                        </details>
                      ))
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-muted-sm tv-matrix-legend">
        El color de fondo indica la prioridad orientativa de la celda; el número de cada burbuja sigue el orden de los incidentes filtrados.
      </p>
    </div>
  );
}
