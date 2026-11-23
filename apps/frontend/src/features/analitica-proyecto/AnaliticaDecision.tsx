// Paneles de la analítica que ayudan a decidir: qué hacer ahora, matriz de prioridad
// y calidad de la evaluación heurística.
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { EvaluacionFlujo } from '@observatorio-ux/shared-types';
import { useAuthStore } from '../auth/store/useAuthStore';
import { listarEvaluaciones } from '../heuristica-flujo/flujo.api';
import { coincidenciaEquipo, matrizPrioridad, pendientesProyecto, principiosIncumplidos, PRIORIDADES, resumenTecnicas, type DatosTecnicas, type Zona } from './analitica-proyecto';

/** Lo más importante de cada técnica, para leer el proyecto completo de un vistazo. */
export function PanelTecnicas({ proyectoId, datos }: { proyectoId: string; datos: DatosTecnicas }) {
  const tecnicas = resumenTecnicas(datos);
  return (
    <section className="analitica-tecnicas" aria-labelledby="analitica-tecnicas-titulo">
      <h3 id="analitica-tecnicas-titulo" className="analitica-tecnicas-titulo">Lo importante de cada técnica</h3>
      <div className="analitica-tecnicas-grid">
        {tecnicas.map(t => (
          <article key={t.id} className="panel analitica-tecnica" aria-labelledby={`analitica-tecnica-${t.id}`}>
            <div className="analitica-tecnica-head">
              <h4 id={`analitica-tecnica-${t.id}`}>{t.titulo}</h4>
              <Link to={`/proyectos/${proyectoId}/${t.id}`}>Abrir{' '}<span className="sr-only">{t.titulo}</span></Link>
            </div>
            {t.vacio ? <p className="text-muted-sm">{t.vacio}</p> : (
              <>
                <dl className="analitica-cifras">
                  {t.cifras.map(c => <div key={c.etiqueta}><dt>{c.etiqueta}</dt><dd>{c.valor}</dd></div>)}
                </dl>
                {t.destacado && (
                  <div>
                    <p className="analitica-tecnica-sub">{t.destacado.titulo}</p>
                    <ul>{t.destacado.items.map(item => <li key={item}>{item}</li>)}</ul>
                  </div>
                )}
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

const ZONA: Record<Zona, string> = { ya: 'Arreglar ya', planificar: 'Planificar', vigilar: 'Vigilar' };
const SEVERIDAD: Record<number, string> = { 4: 'Catastrófico', 3: 'Mayor', 2: 'Menor', 1: 'Cosmético' };
const PRIORIDAD: Record<string, string> = { URGENTE: 'Urgente', ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' };

/** Misma caché que la página de Evaluación Heurística, sin transformar. */
export function useEvaluacionesProyecto(proyectoId: string) {
  const usuarioId = useAuthStore((s) => s.user?.id ?? '');
  return useQuery({ queryKey: ['heuristica-flujo', proyectoId, usuarioId, 'evaluaciones'], queryFn: () => listarEvaluaciones(proyectoId), enabled: !!proyectoId });
}

export function PanelPendientes({ proyectoId, datos }: { proyectoId: string; datos: Parameters<typeof pendientesProyecto>[0] }) {
  const lista = pendientesProyecto(datos);
  return (
    <article className="panel analitica-pendientes" aria-labelledby="analitica-pendientes-titulo">
      <div className="panel-head">
        <div><span className="kicker">AVANCE</span><h3 id="analitica-pendientes-titulo">Qué falta por hacer</h3></div>
        <span className="count">{lista.length ? `${lista.length} pendiente${lista.length === 1 ? '' : 's'}` : 'Al día'}</span>
      </div>
      {lista.length ? (
        <ul className="analitica-lista">
          {lista.map((p) => (
            <li key={p.texto} data-tipo={p.tipo}>
              <span className="analitica-marca" aria-hidden="true" />
              <span>{p.tipo === 'falta' ? <strong>Falta: </strong> : null}{p.texto}</span>
              <Link to={`/proyectos/${proyectoId}/${p.ruta}`}>Ir{' '}<span className="sr-only">a resolverlo</span></Link>
            </li>
          ))}
        </ul>
      ) : <p className="text-muted-sm">Todas las técnicas tienen evidencia y las evaluaciones están finalizadas.</p>}
    </article>
  );
}

export function PanelPrioridad({ evaluaciones }: { evaluaciones: EvaluacionFlujo[] }) {
  const m = matrizPrioridad(evaluaciones);
  return (
    <article className="panel analitica-prioridad" aria-labelledby="analitica-prioridad-titulo">
      <div className="panel-head">
        <div><span className="kicker">HALLAZGOS</span><h3 id="analitica-prioridad-titulo">Matriz de prioridad</h3></div>
        <span className="count">{m.total} problema{m.total === 1 ? '' : 's'} acordado{m.total === 1 ? '' : 's'}</span>
      </div>
      {m.total === 0 ? <p className="text-muted-sm">Todavía no hay problemas acordados en las evaluaciones heurísticas.</p> : (
        <>
          <p className="text-muted-sm">Cruza la severidad con la prioridad que acordó el equipo. Lo grave y urgente va primero.</p>
          <div className="analitica-zonas" aria-label="Problemas por zona">
            {(['ya', 'planificar', 'vigilar'] as const).map(z => <span key={z} data-zona={z}><strong>{m.porZona[z]}</strong> {ZONA[z]}</span>)}
          </div>
          <div className="analitica-matriz-scroll">
            <table className="analitica-matriz">
              <caption className="sr-only">Cantidad de problemas por severidad (filas) y prioridad (columnas)</caption>
              <thead><tr><th scope="col">Severidad</th>{PRIORIDADES.map(p => <th key={p} scope="col">{PRIORIDAD[p]}</th>)}</tr></thead>
              <tbody>
                {m.filas.map(f => (
                  <tr key={f.severidad}>
                    <th scope="row">{f.severidad} · {SEVERIDAD[f.severidad]}</th>
                    {f.celdas.map(c => (
                      <td key={c.prioridad} data-zona={c.zona} data-vacia={c.problemas.length ? undefined : true} title={c.problemas.map(p => p.titulo).join('\n') || undefined}>
                        {c.problemas.length || '·'}<span className="sr-only"> problemas, zona {ZONA[c.zona]}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {m.arreglarYa.length > 0 && (
            <>
              <h4 className="analitica-subtitulo">Arreglar ya</h4>
              <ol className="analitica-lista analitica-lista--numerada">
                {m.arreglarYa.slice(0, 6).map(p => <li key={p.id}><span><strong>{p.titulo}</strong> <small>Severidad {p.severidad} · {PRIORIDAD[p.prioridad]} · {p.evaluacion}</small></span></li>)}
              </ol>
            </>
          )}
        </>
      )}
    </article>
  );
}

export function PanelCalidadHeuristica({ evaluaciones }: { evaluaciones: EvaluacionFlujo[] }) {
  const principios = principiosIncumplidos(evaluaciones);
  const coincidencia = coincidenciaEquipo(evaluaciones);
  const maximo = Math.max(1, ...principios.map(p => p.problemas));
  return (
    <article className="panel analitica-calidad" aria-labelledby="analitica-calidad-titulo">
      <div className="panel-head">
        <div><span className="kicker">EVALUACIÓN HEURÍSTICA</span><h3 id="analitica-calidad-titulo">Principios más incumplidos y coincidencia del equipo</h3></div>
      </div>
      <h4 className="analitica-subtitulo">Principios con más problemas</h4>
      {principios.length ? principios.map(p => (
        <div className="coverage-row" key={p.nombre}>
          <span>{p.nombre}{p.categoria ? <small> · {p.categoria}</small> : null}</span>
          <div aria-hidden="true"><i style={{ width: `${(p.problemas / maximo) * 100}%` }} /></div>
          <strong>{p.problemas}</strong>
        </div>
      )) : <p className="text-muted-sm">Sin problemas acordados todavía.</p>}
      <h4 className="analitica-subtitulo">Coincidencia entre evaluadores</h4>
      {coincidencia.length ? (
        <ul className="analitica-lista">
          {coincidencia.map(c => (
            <li key={c.evaluacion} data-tipo={c.coincidencia >= 70 ? 'ok' : 'aviso'}>
              <span className="analitica-marca" aria-hidden="true" />
              <span><strong>{c.coincidencia}%</strong> en "{c.evaluacion}" <small>· {c.comparables} criterios comparados entre {c.evaluadores} evaluadores{c.coincidencia < 70 ? ' · conviene revisar las diferencias en el acuerdo' : ''}</small></span>
            </li>
          ))}
        </ul>
      ) : <p className="text-muted-sm">Se calcula cuando dos o más evaluadores responden los mismos criterios.</p>}
    </article>
  );
}
