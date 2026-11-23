// Inicio: "Continuar donde quedaste" con lo que espera a la persona en el proyecto activo.
import { Link } from 'react-router-dom';
import { useAuthStore } from '../auth/store/useAuthStore';
import { usePersonas } from '../persona/hooks/usePersonaQueries';
import { useJourneys } from '../journey-map/hooks/useJourneyMapQueries';
import { useCriticalMoments } from '../momentos-criticos/hooks/useMomentosCriticosQueries';
import { useCardSortingEstudiosByProyecto } from '../card-sorting/hooks/useCardSortingQueries';
import { useEvaluacionesProyecto } from './AnaliticaDecision';
import { pendientesProyecto, trabajoEnCurso } from './analitica-proyecto';

export function PanelContinuar({ proyectoId }: { proyectoId: string }) {
  const usuarioId = useAuthStore(s => s.user?.id ?? '');
  const personas = usePersonas(proyectoId);
  const journeys = useJourneys(proyectoId);
  const momentos = useCriticalMoments(proyectoId);
  const estudios = useCardSortingEstudiosByProyecto(proyectoId);
  const evaluaciones = useEvaluacionesProyecto(proyectoId);
  const cargando = [personas, journeys, momentos, estudios, evaluaciones].some(q => q.isLoading);
  if (cargando) return <section className="panel continuar" aria-labelledby="continuar-titulo"><h2 id="continuar-titulo" className="step-title">Continuar donde quedaste</h2><p role="status" className="text-muted-sm">Revisando tu proyecto…</p></section>;
  const propios = trabajoEnCurso(evaluaciones.data ?? [], usuarioId);
  const proyecto = pendientesProyecto({
    personas: personas.data?.length ?? 0, journeys: journeys.data?.length ?? 0, momentos: momentos.data?.length ?? 0,
    estudios: estudios.data ?? [], evaluaciones: evaluaciones.data ?? [],
  }).filter(p => p.tipo === 'falta');
  const lista = [...propios, ...proyecto].slice(0, 4);
  return (
    <section className="panel continuar" aria-labelledby="continuar-titulo">
      <div className="panel-head">
        <h2 id="continuar-titulo" className="step-title">Continuar donde quedaste</h2>
        <Link to={`/proyectos/${proyectoId}/analitica`} className="ghost">Ver avance del proyecto</Link>
      </div>
      {lista.length ? (
        <ul className="analitica-lista">
          {lista.map(p => (
            <li key={p.texto} data-tipo={p.tipo}>
              <span className="analitica-marca" aria-hidden="true" />
              <span>{p.texto}</span>
              <Link to={`/proyectos/${proyectoId}/${p.ruta}`}>Abrir{' '}<span className="sr-only">{p.texto}</span></Link>
            </li>
          ))}
        </ul>
      ) : <p className="text-muted-sm">No tienes trabajo pendiente en este proyecto. Elige una técnica para seguir.</p>}
    </section>
  );
}
