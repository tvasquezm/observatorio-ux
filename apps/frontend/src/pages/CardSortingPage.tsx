import { useState } from 'react';
import { CreateCardSortingSessionPayloadSchema } from '@observatorio-ux/shared-types';
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
  analizarEntrada,
  estadoCantidadTarjetas,
  validarEstudio,
  type AnalisisEntrada,
} from '../features/card-sorting/card-sorting-input';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import { CardSortingTypePicker } from '../features/card-sorting/components/CardSortingTypePicker';
import { CardSortingEntry } from '../features/card-sorting/components/CardSortingEntry';
import { ComentariosTecnica } from '../features/comments/components/ComentariosTecnica';
import { TechniquePageHeader } from '../shared/components/TechniquePageHeader';
import { TechniquePage } from '../shared/components/TechniquePage';
import { TechniqueNewButton } from '../shared/components/TechniqueNewButton';
import { TechniqueItemActions } from '../shared/components/TechniqueItemActions';
import { TechniqueListHead, TechniqueEmpty } from '../shared/components/TechniqueListParts';
import { Icon } from '../shared/components/ui/Icon';
import { PasosTecnica, type PasoTecnica } from '../shared/components/PasosTecnica';
import { TechniqueProcess, type ProcessStep } from '../shared/components/TechniqueProcess';

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
  const [mostrarForm, setMostrarForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
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
  const steps: ProcessStep[] = [
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
      opcional: true,
    },
  ];

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const cards = cardsInfo.items.map((etiqueta) => ({ etiqueta }));
    const categories = categoriesInfo.items.map((nombre) => ({ nombre }));

    const configuration = CreateCardSortingSessionPayloadSchema.safeParse({
      proyectoId, nombre: name, tipo: type, tarjetas: cards,
      categorias: type !== 'ABIERTO' ? categories : undefined,
      preguntas: questionsInfo.items.length ? questionsInfo.items.map((texto) => ({ texto })) : undefined,
    });
    setValidationErrors(configuration.success ? {} : Object.fromEntries(
      configuration.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
    ));
    setFormError(problem ?? (configuration.success ? null : configuration.error.issues.map((issue) => issue.message).join(' ')));
    if (problem || !configuration.success) return;
    createStudy.mutate(configuration.data,
      {
        onSuccess: (study) => {
          navigate(`/proyectos/${proyectoId}/card-sorting/${study.id}`);
        },
      },
    );
  }

  const pasos: PasoTecnica[] = [
    {
      id: 'nombre',
      titulo: 'Nombre y tipo',
      ayuda: 'Dale un nombre al estudio y elige cómo clasificarán los participantes.',
      contenido: (
        <div className="tv-pasos-campos tv-pasos-campos--una">
            <label className="field">
              Nombre del estudio
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. Navegación del portal estudiantil"
                aria-invalid={Boolean(validationErrors.nombre)}
                aria-describedby={validationErrors.nombre ? "cs-configuration-error" : undefined}
                maxLength={120}
                required
              />
            </label>

            <CardSortingTypePicker value={type} onChange={setType} />
            <p className="cs-type-hint" data-testid="cs-type-hint">{TYPE_HINTS[type]}</p>

        </div>
      ),
    },
    {
      id: 'tarjetas',
      titulo: 'Tarjetas',
      ayuda: 'Los elementos que los participantes van a ordenar.',
      contenido: (
            <CardSortingEntry
              error={validationErrors.tarjetas}
              title="Tarjetas"
              singular="tarjeta"
              plural="tarjetas"
              value={cardsText}
              onChange={setCardsText}
              max={MAX_ETIQUETA}
              aviso={AVISO_ETIQUETA}
              defaultMode="lista"
              rules={[
                'Una tarjeta por línea.',
                'Las líneas vacías se ignoran.',
                `Máximo ${MAX_ETIQUETA} caracteres por tarjeta.`,
                'Puedes pegar una columna de Excel o Sheets.',
              ]}
              example={'Inscripción de asignaturas\nCalendario académico\nBiblioteca'}
              addPlaceholder="Escribe una tarjeta y presiona Enter"
              help={<Checklist items={CARD_CHECKLIST} />}
              helpLabel="Ayuda: cómo escribir las tarjetas"
              meta={(
                <>
                  <CardCount count={cardsInfo.items.length} />
                  <InputWarnings info={cardsInfo} noun="tarjeta(s)" max={MAX_ETIQUETA} aviso={AVISO_ETIQUETA} />
                </>
              )}
            />

      ),
    },
    ...(type !== 'ABIERTO'
      ? [{
          id: 'categorias',
          titulo: 'Categorías',
          ayuda: 'Las categorías de partida que usarán los participantes.',
          contenido: (
              <CardSortingEntry
                error={validationErrors.categorias}
                title="Categorías predefinidas"
                singular="categoría"
                plural="categorías"
                value={categoriesText}
                onChange={setCategoriesText}
                max={MAX_CATEGORIA}
                defaultMode="uno"
                rules={[
                  'Una categoría por línea.',
                  'Las líneas vacías se ignoran.',
                  `Máximo ${MAX_CATEGORIA} caracteres por categoría.`,
                ]}
                example={'Información académica\nServicios\nVida universitaria'}
                addPlaceholder="Escribe una categoría y presiona Enter"
                help={<Checklist items={CATEGORY_CHECKLIST} />}
                helpLabel="Ayuda: cómo definir las categorías"
                meta={<InputWarnings info={categoriesInfo} noun="categoría(s)" max={MAX_CATEGORIA} />}
              />
          ),
        }]
      : []),
    {
      id: 'preguntas',
      titulo: 'Preguntas (opcional)',
      ayuda: 'Lo que quieres preguntar al participante al enviar. Puedes saltar este paso.',
      contenido: (
            <CardSortingEntry
              error={validationErrors.preguntas}
              title="Preguntas para el participante (opcional)"
              singular="pregunta"
              plural="preguntas"
              value={questionsText}
              onChange={setQuestionsText}
              max={MAX_PREGUNTA}
              defaultMode="uno"
              rules={[
                'Una pregunta por línea.',
                `Hasta ${MAX_PREGUNTAS} preguntas, de ${MAX_PREGUNTA} caracteres como máximo.`,
              ]}
              example={'¿Qué tarjeta te costó más ubicar?\n¿Echaste de menos alguna categoría?'}
              addPlaceholder="Escribe una pregunta y presiona Enter"
              help="El participante las responde al enviar su clasificación. Son opcionales."
              helpLabel="Ayuda: preguntas para el participante"
              meta={(
                <>
                  <small className="cs-input-count" data-testid="cs-question-count">
                    {questionsInfo.items.length} de {MAX_PREGUNTAS} preguntas
                  </small>
                  <InputWarnings info={questionsInfo} noun="pregunta(s)" max={MAX_PREGUNTA} />
                  {questionsInfo.items.length > MAX_PREGUNTAS && (
                    <small className="cs-input-warn" role="status">El máximo es {MAX_PREGUNTAS} preguntas.</small>
                  )}
                </>
              )}
            />

      ),
    },
  ];

  return (
    <TechniquePage
      cabecera={
        <TechniquePageHeader
          label="TÉCNICA DE INVESTIGACIÓN"
          title="Card Sorting"
          description="Crea estudios abiertos, cerrados o híbridos, compártelos con participantes y analiza cada clasificación como evidencia independiente."
          instructions={(
            <>
              <p>Prepara las tarjetas, invita a los participantes y revisa los resultados. Abre cada paso para ver sus instrucciones.</p>
              <CardSortingGuide />
            </>
          )}
          action={(
            <TechniqueNewButton
              etiqueta="+ Nuevo Card Sorting"
              abierto={mostrarForm}
              puedeEditar
              disabled={createStudy.isPending}
              onClick={() => setMostrarForm((visible) => !visible)}
            />
          )}
        />
      }
      proceso={mostrarForm && (
        <TechniqueProcess
          title="Proceso del estudio"
          textoListo="Estudio completo: ya puedes crearlo"
          steps={steps}
        />
      )}
      formulario={mostrarForm && (
        <form onSubmit={handleSubmit} className="entity-card form cs-study-form" noValidate>
          <h3>Nuevo Card Sorting</h3>

          <PasosTecnica pasos={pasos} acciones={(
            <button type="submit" className="primary" disabled={createStudy.isPending}>
              {createStudy.isPending ? 'Creando estudio…' : 'Crear y abrir el workspace →'}
            </button>
          )} />

          {formError && <p id="cs-configuration-error" role="alert" className="error-text">{formError}</p>}

          {createStudy.error && (
            <p role="alert" className="error-text">{createStudy.error.message}</p>
          )}
        </form>
      )}
      lista={!mostrarForm && (
        <>
          {!loadingStudies && studies.length > 0 && (
            <TechniqueListHead titulo="Continuar un Card Sorting" cantidad={studies.length} />
          )}

          {loadingStudies ? (
            <p className="text-muted-sm">Cargando estudios…</p>
          ) : studies.length === 0 ? (
            <TechniqueEmpty
              icono={<Icon name="card-sorting" size={28} />}
              titulo="Todavía no hay estudios de Card Sorting"
              texto="Usa + Nuevo Card Sorting para crear el primer estudio del proyecto."
            />
          ) : (
            <div className="cs-study-list">
              {studies.map((study) => {
                const abrir = () => navigate(`/proyectos/${proyectoId}/card-sorting/${study.id}`);
                return (
                  <div key={study.id} className="cs-study-row" onClick={abrir}>
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
                    <div onClick={(event) => event.stopPropagation()}>
                      <TechniqueItemActions etiquetaConsultar="Abrir" onConsultar={abrir} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      comentarios={<ComentariosTecnica proyectoId={proyectoId} tecnica="card-sorting" />}
    />
  );
}
