import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  useCardSortingEstudiosByProyecto,
  useCreateCardSortingSession,
} from '../features/card-sorting/hooks/useCardSortingQueries';
import type { TipoCardSorting } from '../features/card-sorting/api/card-sorting.api';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function CardSortingPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const navigate = useNavigate();
  const { data: studies = [], isLoading: loadingStudies } =
    useCardSortingEstudiosByProyecto(proyectoId);
  const createStudy = useCreateCardSortingSession();
  const [name, setName] = useState('');
  const [type, setType] = useState<TipoCardSorting>('ABIERTO');
  const [cardsText, setCardsText] = useState('');
  const [categoriesText, setCategoriesText] = useState('');

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const cards = cardsText
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((etiqueta) => ({ etiqueta }));
    const categories = categoriesText
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((nombre) => ({ nombre }));

    if (!name.trim() || cards.length === 0 || (type === 'CERRADO' && categories.length === 0)) {
      return;
    }

    createStudy.mutate(
      {
        proyectoId,
        nombre: name.trim(),
        tipo: type,
        tarjetas: cards,
        categorias: type === 'CERRADO' ? categories : undefined,
      },
      {
        onSuccess: (study) => {
          navigate(`/proyectos/${proyectoId}/card-sorting/${study.id}`);
        },
      },
    );
  }

  return (
    <div className="fade">
      <header className="page-head">
        <div>
          <span className="kicker">ARQUITECTURA DE INFORMACIÓN</span>
          <h2>Card Sorting</h2>
          <p>
            Crea estudios abiertos o cerrados, compártelos con participantes y analiza cada
            clasificación como evidencia independiente.
          </p>
        </div>
      </header>

      <section className="sort-layout">
        <article className="panel sort-board">
          <div className="panel-head">
            <div>
              <span className="kicker">NUEVO ESTUDIO</span>
              <h2>Configurar tarjetas y categorías</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="form-grid cs-study-form">
            <label className="field">
              Nombre del estudio
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. Navegación del portal estudiantil"
                maxLength={120}
                required
              />
            </label>

            <label className="field">
              Tipo de estudio
              <select value={type} onChange={(event) => setType(event.target.value as TipoCardSorting)}>
                <option value="ABIERTO">Abierto — cada participante crea sus categorías</option>
                <option value="CERRADO">Cerrado — usa categorías predefinidas</option>
              </select>
            </label>

            <label className="field">
              Tarjetas (una por línea)
              <textarea
                placeholder={'Inscripción de asignaturas\nCalendario académico\nBiblioteca'}
                value={cardsText}
                onChange={(event) => setCardsText(event.target.value)}
                required
                className="textarea-lg"
              />
            </label>

            {type === 'CERRADO' && (
              <label className="field">
                Categorías predefinidas (una por línea)
                <textarea
                  placeholder={'Información académica\nServicios\nVida universitaria'}
                  value={categoriesText}
                  onChange={(event) => setCategoriesText(event.target.value)}
                  required
                  className="textarea-md"
                />
              </label>
            )}

            {createStudy.error && (
              <p role="alert" className="error-text">{createStudy.error.message}</p>
            )}

            <button type="submit" className="primary" disabled={createStudy.isPending}>
              {createStudy.isPending ? 'Creando estudio…' : 'Crear y abrir el workspace →'}
            </button>
          </form>
        </article>

        <aside className="panel sort-analysis">
          <span className="kicker">FLUJO</span>
          <h2>De la configuración a la evidencia</h2>
          <ol className="cs-flow-list">
            <li><span>1</span><p><strong>Configura</strong> las tarjetas y el tipo de estudio.</p></li>
            <li><span>2</span><p><strong>Prueba</strong> la interacción antes de compartir.</p></li>
            <li><span>3</span><p><strong>Comparte</strong> el enlace con consentimiento informado.</p></li>
            <li><span>4</span><p><strong>Analiza</strong> matrices, categorías y consenso.</p></li>
          </ol>
        </aside>
      </section>

      <section className="panel mt-16">
        <div className="panel-head">
          <div>
            <span className="kicker">ESTUDIOS DEL PROYECTO</span>
            <h2>Continuar un Card Sorting</h2>
          </div>
          <span className="count">{studies.length}</span>
        </div>

        {loadingStudies ? (
          <p className="text-muted-sm">Cargando estudios…</p>
        ) : studies.length === 0 ? (
          <p className="text-muted-sm">Todavía no hay estudios de Card Sorting.</p>
        ) : (
          <div className="cs-study-list">
            {studies.map((study) => (
              <button
                key={study.id}
                type="button"
                className="cs-study-row"
                onClick={() => navigate(`/proyectos/${proyectoId}/card-sorting/${study.id}`)}
              >
                <span>
                  <strong>{study.nombre}</strong>
                  <small>
                    {study.tipoCardSorting === 'CERRADO' ? 'Cerrado' : 'Abierto'} ·{' '}
                    {study.cardsDefinidas.length} tarjetas · {study.respuestasCount ?? 0}{' '}
                    {(study.respuestasCount ?? 0) === 1 ? 'respuesta' : 'respuestas'}
                  </small>
                </span>
                <span className={`cs-status${study.cerrado ? ' closed' : ''}`}>
                  {study.cerrado ? 'Cerrado' : 'Recibiendo respuestas'}
                </span>
                <time dateTime={study.createdAt}>{formatDate(study.createdAt)}</time>
                <span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
