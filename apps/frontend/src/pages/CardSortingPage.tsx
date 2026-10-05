import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { CreateCardSortingSessionPayloadSchema } from '@observatorio-ux/shared-types';
import {
  useCardSortingEstudiosByProyecto,
  useCreateCardSortingSession,
} from '../features/card-sorting/hooks/useCardSortingQueries';
import type { TipoCardSorting } from '../features/card-sorting/api/card-sorting.api';
import { CardSortingGuide } from '../features/card-sorting/components/CardSortingGuide';
import {
  AVISO_ETIQUETA,
  MAX_CATEGORIA,
  MAX_ETIQUETA,
  MAX_PREGUNTA,
  MAX_PREGUNTAS,
  MAX_RECOMENDADAS,
  MAX_TARJETAS,
  MIN_RECOMENDADAS,
  analizarEntrada,
  estadoCantidadTarjetas,
  validarEstudio,
  type AnalisisEntrada,
} from '../features/card-sorting/card-sorting-input';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';

const TYPE_HINTS: Record<TipoCardSorting, string> = {
  ABIERTO: 'Los participantes crean y nombran sus propias categorías. Úsalo para descubrir cómo piensan tus usuarios.',
  CERRADO: 'Los participantes usan las categorías que defines tú. Úsalo para validar una estructura que ya tienes.',
  HIBRIDO: 'Defines pocas categorías de partida y los participantes pueden crear otras. Úsalo para validar una estructura y descubrir lo que le falta.',
};

const TYPE_LABELS: Record<TipoCardSorting, string> = {
  ABIERTO: 'Abierto',
  CERRADO: 'Cerrado',
  HIBRIDO: 'Híbrido',
};

const CARD_CHECKLIST = [
  'Una idea por tarjeta, un módulo o concepto.',
  'Todas al mismo nivel de detalle.',
  'En el lenguaje de tus usuarios, sin jerga interna.',
  'Sin pistas de la categoría en el texto.',
];

const CATEGORY_CHECKLIST = [
  'Nombres distintos entre sí.',
  'Todas al mismo nivel de detalle.',
  'Suficientes para que cada tarjeta tenga un lugar.',
  'Evita "Otros" como categoría comodín.',
];

function CardCount({ count }: { count: number }) {
  const estado = estadoCantidadTarjetas(count);
  const rango = `${MIN_RECOMENDADAS} a ${MAX_RECOMENDADAS}`;
  const texto = {
    bajo: `recomendado: entre ${MIN_RECOMENDADAS} y ${MAX_RECOMENDADAS}`,
    ok: `dentro del rango recomendado (${rango})`,
    alto: `sobre el rango recomendado (${rango})`,
    excedido: `el máximo es ${MAX_TARJETAS}`,
  }[estado];
  return (
    <small className={`cs-input-count cs-count-${estado}`} data-testid="cs-card-count">
      {count} {count === 1 ? 'tarjeta' : 'tarjetas'} · {texto}
    </small>
  );
}

function InputWarnings({ info, noun, max, aviso }: { info: AnalisisEntrada; noun: string; max: number; aviso?: number }) {
  return (
    <>
      {info.duplicados.length > 0 && (
        <small className="cs-input-warn" role="status">
          Duplicadas: {info.duplicados.slice(0, 3).join(', ')}
          {info.duplicados.length > 3 ? ` y ${info.duplicados.length - 3} más` : ''}.
        </small>
      )}
      {info.excedidas.length > 0 && (
        <small className="cs-input-warn" role="status">
          {info.excedidas.length} {noun} supera(n) los {max} caracteres.
        </small>
      )}
      {aviso !== undefined && info.largas.length > 0 && (
        <small className="cs-input-note" role="status">
          {info.largas.length} {noun} de {aviso} caracteres o más: conviene acortar(las).
        </small>
      )}
    </>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="cs-checklist">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

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
  const [questionsText, setQuestionsText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const cardsInfo = analizarEntrada(cardsText, MAX_ETIQUETA, AVISO_ETIQUETA);
  const categoriesInfo = analizarEntrada(categoriesText, MAX_CATEGORIA);
  const questionsInfo = analizarEntrada(questionsText, MAX_PREGUNTA);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const problem = validarEstudio({
      nombre: name,
      esCerrado: type === 'CERRADO',
      esHibrido: type === 'HIBRIDO',
      tarjetas: cardsInfo,
      categorias: categoriesInfo,
      preguntas: questionsInfo,
    });
    const cards = cardsInfo.items.map((etiqueta) => ({ etiqueta }));
    const categories = categoriesInfo.items.map((nombre) => ({ nombre }));

    const configuration = CreateCardSortingSessionPayloadSchema.safeParse({
      proyectoId, nombre: name, tipo: type, tarjetas: cards,
      categorias: type !== 'ABIERTO' ? categories : undefined,
      preguntas: questionsInfo.items.length > 0 ? questionsInfo.items.map((texto) => ({ texto })) : undefined,
    });
    setValidationErrors(configuration.success ? {} : Object.fromEntries(
      configuration.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
    ));
    setFormError(problem ?? (configuration.success ? null : configuration.error.issues.map((issue) => issue.message).join(' ')));
    if (problem || !configuration.success) return;

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
                <option value="HIBRIDO">Híbrido</option>
              </select>
            </label>

            <details className="cs-help">
              <summary>¿Qué tipo elegir?</summary>
              <p className="text-muted-sm" data-testid="cs-type-hint">{TYPE_HINTS[type]}</p>
            </details>

            <label className="field">
              Tarjetas (una por línea)
              <textarea
                placeholder={'Inscripción de asignaturas\nCalendario académico\nBiblioteca'}
                aria-label="Tarjetas (una por línea)"
                value={cardsText}
                onChange={(event) => setCardsText(event.target.value)}
                required
                className="textarea-lg"
                aria-invalid={!!validationErrors.tarjetas}
                aria-describedby={validationErrors.tarjetas ? 'cs-configuration-error' : undefined}
              />
              <CardCount count={cardsInfo.items.length} />
              <InputWarnings info={cardsInfo} noun="tarjeta(s)" max={MAX_ETIQUETA} aviso={AVISO_ETIQUETA} />
              <Checklist items={CARD_CHECKLIST} />
            </label>

            {type !== 'ABIERTO' && (
              <label className="field">
                Categorías predefinidas (una por línea)
                <textarea
                  placeholder={'Información académica\nServicios\nVida universitaria'}
                  aria-label="Categorías predefinidas (una por línea)"
                  value={categoriesText}
                  onChange={(event) => setCategoriesText(event.target.value)}
                  required
                  className="textarea-md"
                  aria-invalid={!!validationErrors.categorias}
                  aria-describedby={validationErrors.categorias ? 'cs-configuration-error' : undefined}
                />
                <InputWarnings info={categoriesInfo} noun="categoría(s)" max={MAX_CATEGORIA} />
                <Checklist items={CATEGORY_CHECKLIST} />
              </label>
            )}

            <label className="field">
              Preguntas para el participante (opcional, una por línea)
              <textarea
                placeholder={'¿Qué tarjeta te costó más ubicar?\n¿Echaste de menos alguna categoría?'}
                aria-label="Preguntas para el participante (opcional, una por línea)"
                aria-invalid={!!validationErrors.preguntas}
                aria-describedby={validationErrors.preguntas ? 'cs-configuration-error' : undefined}
                value={questionsText}
                onChange={(event) => setQuestionsText(event.target.value)}
                className="textarea-md"
              />
              <small className="cs-input-count" data-testid="cs-question-count">
                {questionsInfo.items.length} de {MAX_PREGUNTAS} preguntas · el participante las responde al enviar
              </small>
              <InputWarnings info={questionsInfo} noun="pregunta(s)" max={MAX_PREGUNTA} />
              {questionsInfo.items.length > MAX_PREGUNTAS && (
                <small className="cs-input-warn" role="status">El máximo es {MAX_PREGUNTAS} preguntas.</small>
              )}
            </label>

            {formError && <p id="cs-configuration-error" role="alert" className="error-text">{formError}</p>}

            {createStudy.error && !formError && (
              <p role="alert" className="error-text">{createStudy.error.message}</p>
            )}

            <button type="submit" className="primary" disabled={createStudy.isPending}>
              {createStudy.isPending ? 'Creando estudio…' : 'Crear estudio'}
            </button>
          </form>
        <details className="cs-help">
          <summary>Cómo hacer un card sorting</summary>
          <CardSortingGuide />
        </details>
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
                    {TYPE_LABELS[study.tipoCardSorting ?? 'ABIERTO']} ·{' '}
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
