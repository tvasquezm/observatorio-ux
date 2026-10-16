import { useOutletContext, useSearchParams } from 'react-router-dom';
import { TECNICAS_COMENTARIO } from '@observatorio-ux/shared-types';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import { ComentariosPanel } from '../features/comments/components/ComentariosPanel';

const FILTRO_GENERAL = 'general';
const FILTRO_TODOS = 'todos';

export function ProjectCommentsPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const [searchParams, setSearchParams] = useSearchParams();

  const param = searchParams.get('tecnica');
  const esValido = param === FILTRO_TODOS || TECNICAS_COMENTARIO.some((t) => t.clave === param);
  const seleccion = esValido ? (param as string) : FILTRO_GENERAL;

  function seleccionar(valor: string) {
    if (valor === FILTRO_GENERAL) setSearchParams({}, { replace: true });
    else setSearchParams({ tecnica: valor }, { replace: true });
  }

  const opciones = [
    { valor: FILTRO_GENERAL, etiqueta: 'General' },
    ...TECNICAS_COMENTARIO.map((t) => ({ valor: t.clave as string, etiqueta: t.etiqueta })),
    { valor: FILTRO_TODOS, etiqueta: 'Todos' },
  ];

  return (
    <div className="comments-page">
      <section className="comments-intro">
        <span className="eyebrow">Conversación del proyecto</span>
        <h2>Comentarios</h2>
        <p>Deja decisiones, preguntas o contexto para que el equipo pueda retomarlos después.</p>
      </section>

      <div className="chip-list" role="group" aria-label="Filtrar comentarios por técnica">
        {opciones.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            className={`chip chip-button${seleccion === opcion.valor ? ' chip-selected' : ''}`}
            aria-pressed={seleccion === opcion.valor}
            onClick={() => seleccionar(opcion.valor)}
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>

      <ComentariosPanel
        proyectoId={proyectoId}
        filtro={seleccion === FILTRO_TODOS ? undefined : seleccion}
        publicarEn={seleccion === FILTRO_GENERAL || seleccion === FILTRO_TODOS ? undefined : seleccion}
        mostrarOrigen={seleccion === FILTRO_TODOS}
      />
    </div>
  );
}
