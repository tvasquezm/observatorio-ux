import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { CreateCardSortingSessionPayloadSchema } from '@observatorio-ux/shared-types';
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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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

    const configuration = CreateCardSortingSessionPayloadSchema.safeParse({
      proyectoId, nombre: name, tipo: type, tarjetas: cards,
      categorias: type === 'CERRADO' ? categories : undefined,
    });
    if (!configuration.success) {
      setValidationErrors(Object.fromEntries(
        configuration.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ));
      return;
    }
    setValidationErrors({});
    createStudy.mutate(
      configuration.data,
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
          <h2>Card Sorting</h2>
        </div>
      </header>

      <details className="panel cs-disclosure">
        <summary>Nuevo estudio</summary>

          <form onSubmit={handleSubmit} className="form-grid cs-study-form">
            <label className="field">
              Nombre del estudio
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. Navegación del portal estudiantil"
                maxLength={120}
                required
                aria-invalid={!!validationErrors.nombre}
                aria-describedby={validationErrors.nombre ? 'cs-configuration-error' : undefined}
              />
            </label>

            <label className="field">
              Tipo de estudio
              <select value={type} onChange={(event) => setType(event.target.value as TipoCardSorting)}>
                <option value="ABIERTO">Abierto</option>
                <option value="CERRADO">Cerrado</option>
              </select>
            </label>

            <details className="cs-help">
              <summary>¿Qué tipo elegir?</summary>
              <p className="text-muted-sm">Abierto: los participantes crean las categorías. Cerrado: tú las defines.</p>
            </details>

            <label className="field">
              Tarjetas (una por línea)
              <textarea
                placeholder={'Inscripción de asignaturas\nCalendario académico\nBiblioteca'}
                value={cardsText}
                onChange={(event) => setCardsText(event.target.value)}
                required
                className="textarea-lg"
                aria-invalid={!!validationErrors.tarjetas}
                aria-describedby={validationErrors.tarjetas ? 'cs-configuration-error' : undefined}
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
                  aria-invalid={!!validationErrors.categorias}
                  aria-describedby={validationErrors.categorias ? 'cs-configuration-error' : undefined}
                />
              </label>
            )}

            {Object.keys(validationErrors).length > 0 && (
              <p id="cs-configuration-error" role="alert" className="error-text">
                {Object.values(validationErrors).join(' ')}
              </p>
            )}
            {createStudy.error && Object.keys(validationErrors).length === 0 && (
              <p role="alert" className="error-text">{createStudy.error.message}</p>
            )}

            <button type="submit" className="primary" disabled={createStudy.isPending}>
              {createStudy.isPending ? 'Creando estudio…' : 'Crear estudio'}
            </button>
          </form>
      </details>

      <section className="panel mt-16">
        <div className="panel-head">
          <div>
            <h2>Estudios</h2>
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
