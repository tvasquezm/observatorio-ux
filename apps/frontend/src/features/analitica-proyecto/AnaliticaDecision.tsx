// Paneles de la analítica del proyecto: lo importante de cada técnica.
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../auth/store/useAuthStore';
import { listarEvaluaciones } from '../heuristica-flujo/flujo.api';
import { resumenTecnicas, type DatosTecnicas } from './analitica-proyecto';

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

/** Misma caché que la página de Evaluación Heurística, sin transformar. */
export function useEvaluacionesProyecto(proyectoId: string) {
  const usuarioId = useAuthStore((s) => s.user?.id ?? '');
  return useQuery({ queryKey: ['heuristica-flujo', proyectoId, usuarioId, 'evaluaciones'], queryFn: () => listarEvaluaciones(proyectoId), enabled: !!proyectoId });
}
