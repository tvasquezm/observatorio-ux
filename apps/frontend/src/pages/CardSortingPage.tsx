import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
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
  MIN_CATEGORIAS_CERRADO,
  MIN_RECOMENDADAS,
  agregarLinea,
  analizarEntrada,
  estadoCantidadTarjetas,
  quitarElemento,
  validarEstudio,
  type AnalisisEntrada,
} from '../features/card-sorting/card-sorting-input';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import { InfoTip } from '../shared/components/ui/InfoTip';
import { CardSortingTypePicker } from '../features/card-sorting/components/CardSortingTypePicker';
import { CardSortingProgress, type ProgressStep } from '../features/card-sorting/components/CardSortingProgress';
import { CardSortingAddOne, CardSortingChips } from '../features/card-sorting/components/CardSortingChips';

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
  const rango = `${MIN_RECOMENDADAS}–${MAX_RECOMENDADAS}`;
  const texto = {
    bajo: rango,
    ok: `en rango · ${rango}`,
    alto: `sobre el rango · ${rango}`,
    excedido: `máximo ${MAX_TARJETAS}`,
  }[estado];
  return (
    <>
      <div className={`cs-meter cs-meter-${estado}`} aria-hidden="true">
        <i className="cs-meter-zone" />
        <i className="cs-meter-fill" style={{ width: `${Math.min(100, (count / MAX_RECOMENDADAS) * 100)}%` }} />
      </div>
      <small className={`cs-input-count cs-count-${estado}`} data-testid="cs-card-count">
        {count} {count === 1 ? 'tarjeta' : 'tarjetas'} · {texto}
      </small>
    </>
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
    <ul className="info-tip-list">
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
  const cardsInfo = analizarEntrada(cardsText, MAX_ETIQUETA, AVISO_ETIQUETA);
  const categoriesInfo = analizarEntrada(categoriesText, MAX_CATEGORIA);
  const questionsInfo = analizarEntrada(questionsText, MAX_PREGUNTA);

  const problem = validarEstudio({
    nombre: name,
    esCerrado: type === 'CERRADO',
    esHibrido: type === 'HIBRIDO',
    tarjetas: cardsInfo,
    categorias: categoriesInfo,
    preguntas: questionsInfo,
  });
  const cardsOk = cardsInfo.items.length > 0 && cardsInfo.items.length <= MAX_TARJETAS
    && cardsInfo.duplicados.length === 0 && cardsInfo.excedidas.length === 0;
  const minCategories = type === 'CERRADO' ? MIN_CATEGORIAS_CERRADO : 1;
  const categoriesOk = categoriesInfo.items.length >= minCategories
    && categoriesInfo.duplicados.length === 0 && categoriesInfo.excedidas.length === 0;
  const steps: ProgressStep[] = [
    { id: 'nombre', label: 'Nombre', detail: name.trim() || 'Sin nombre todavía', done: name.trim().length > 0 },
    { id: 'tipo', label: 'Tipo', detail: TYPE_LABELS[type], done: true },
    {
      id: 'tarjetas',
      label: 'Tarjetas',
      detail: `${cardsInfo.items.length} · recomendado ${MIN_RECOMENDADAS}–${MAX_RECOMENDADAS}`,
      done: cardsOk,
    },
    ...(type !== 'ABIERTO'
      ? [{
          id: 'categorias',
          label: 'Categorías',
          detail: `${categoriesInfo.items.length} · mínimo ${minCategories}`,
          done: categoriesOk,
        }]
      : []),
    {
      id: 'preguntas',
      label: 'Preguntas',
      detail: `${questionsInfo.items.length} de ${MAX_PREGUNTAS}`,
      done: questionsInfo.items.length > 0 && questionsInfo.items.length <= MAX_PREGUNTAS,
      optional: true,
    },
  ];

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(problem);
    if (problem) return;

    const cards = cardsInfo.items.map((etiqueta) => ({ etiqueta }));
    const categories = categoriesInfo.items.map((nombre) => ({ nombre }));

    createStudy.mutate(
      {
        proyectoId,
        nombre: name.trim(),
        tipo: type,
        tarjetas: cards,
        categorias: type !== 'ABIERTO' ? categories : undefined,
        preguntas: questionsInfo.items.length > 0 ? questionsInfo.items.map((texto) => ({ texto })) : undefined,
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

            <CardSortingTypePicker value={type} onChange={setType} />
            <p className="cs-type-hint" data-testid="cs-type-hint">{TYPE_HINTS[type]}</p>

            <div className="cs-field">
              <label className="field">
                Tarjetas (una por línea)
                <textarea
                  placeholder={'Inscripción de asignaturas\nCalendario académico\nBiblioteca'}
                  value={cardsText}
                  onChange={(event) => setCardsText(event.target.value)}
                  required
                  className="textarea-lg"
                />
                <CardCount count={cardsInfo.items.length} />
                <InputWarnings info={cardsInfo} noun="tarjeta(s)" max={MAX_ETIQUETA} aviso={AVISO_ETIQUETA} />
              </label>
              <CardSortingAddOne
                label="Agregar tarjeta"
                placeholder="Agregar una tarjeta y presionar Enter"
                onAdd={(value) => setCardsText((prev) => agregarLinea(prev, value))}
              />
              <CardSortingChips
                info={cardsInfo}
                max={MAX_ETIQUETA}
                aviso={AVISO_ETIQUETA}
                noun="tarjetas"
                onRemove={(index) => setCardsText((prev) => quitarElemento(prev, index))}
              />
              <InfoTip label="Ayuda: cómo escribir las tarjetas" className="cs-field-tip">
                <Checklist items={CARD_CHECKLIST} />
              </InfoTip>
            </div>

            {type !== 'ABIERTO' && (
              <div className="cs-field">
                <label className="field">
                  Categorías predefinidas (una por línea)
                  <textarea
                    placeholder={'Información académica\nServicios\nVida universitaria'}
                    value={categoriesText}
                    onChange={(event) => setCategoriesText(event.target.value)}
                    required
                    className="textarea-md"
                  />
                  <InputWarnings info={categoriesInfo} noun="categoría(s)" max={MAX_CATEGORIA} />
                </label>
                <CardSortingAddOne
                  label="Agregar categoría"
                  placeholder="Agregar una categoría y presionar Enter"
                  onAdd={(value) => setCategoriesText((prev) => agregarLinea(prev, value))}
                />
                <CardSortingChips
                  info={categoriesInfo}
                  max={MAX_CATEGORIA}
                  noun="categorías"
                  onRemove={(index) => setCategoriesText((prev) => quitarElemento(prev, index))}
                />
                <InfoTip label="Ayuda: cómo definir las categorías" className="cs-field-tip">
                  <Checklist items={CATEGORY_CHECKLIST} />
                </InfoTip>
              </div>
            )}

            <div className="cs-field">
              <label className="field">
                Preguntas para el participante (opcional, una por línea)
                <textarea
                  placeholder={'¿Qué tarjeta te costó más ubicar?\n¿Echaste de menos alguna categoría?'}
                  value={questionsText}
                  onChange={(event) => setQuestionsText(event.target.value)}
                  className="textarea-md"
                />
                <small className="cs-input-count" data-testid="cs-question-count">
                  {questionsInfo.items.length} de {MAX_PREGUNTAS} preguntas
                </small>
                <InputWarnings info={questionsInfo} noun="pregunta(s)" max={MAX_PREGUNTA} />
                {questionsInfo.items.length > MAX_PREGUNTAS && (
                  <small className="cs-input-warn" role="status">El máximo es {MAX_PREGUNTAS} preguntas.</small>
                )}
              </label>
              <CardSortingAddOne
                label="Agregar pregunta"
                placeholder="Agregar una pregunta y presionar Enter"
                onAdd={(value) => setQuestionsText((prev) => agregarLinea(prev, value))}
              />
              <CardSortingChips
                info={questionsInfo}
                max={MAX_PREGUNTA}
                noun="preguntas"
                onRemove={(index) => setQuestionsText((prev) => quitarElemento(prev, index))}
              />
              <InfoTip label="Ayuda: preguntas para el participante" className="cs-field-tip">
                El participante las responde al enviar su clasificación. Hasta {MAX_PREGUNTAS}, opcionales.
              </InfoTip>
            </div>

            {formError && <p role="alert" className="error-text">{formError}</p>}

            {createStudy.error && (
              <p role="alert" className="error-text">{createStudy.error.message}</p>
            )}

            <button type="submit" className="primary" disabled={createStudy.isPending}>
              {createStudy.isPending ? 'Creando estudio…' : 'Crear y abrir el workspace →'}
            </button>
          </form>
        </article>

        <div className="cs-side">
          <CardSortingProgress steps={steps} problem={problem} />
          <details className="panel sort-analysis cs-guide-box">
            <summary>
              <h2>Cómo hacer un card sorting</h2>
            </summary>
            <CardSortingGuide />
          </details>
        </div>
      </section>

      <section className="panel mt-16">
        <div className="panel-head">
          <div>
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
