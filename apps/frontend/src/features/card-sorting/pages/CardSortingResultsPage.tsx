import type { CSSProperties } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type {
  CardSortingMatrix,
  CardSortingParticipante,
  CardSortingPreguntaResultado,
  CardSortingPorCarta,
  CardSortingPorCategoria,
} from '../api/card-sorting.api';
import { useCardSortingAnalytics } from '../hooks/useCardSortingQueries';
import { CardSortingDendrogram } from '../components/CardSortingDendrogram';
import { descargarCsv, matrizACsv, similitudACsv } from '../card-sorting-csv';

type ResultsTab = 'cards' | 'categories' | 'results' | 'popular' | 'similarity' | 'dendrogram' | 'participants' | 'answers';

const TABS: Array<{ id: ResultsTab; label: string }> = [
  { id: 'cards', label: 'Tarjetas' },
  { id: 'categories', label: 'Categorías' },
  { id: 'results', label: 'Matriz de resultados' },
  { id: 'popular', label: 'Ubicaciones populares' },
  { id: 'similarity', label: 'Similitud' },
  { id: 'dendrogram', label: 'Dendrograma' },
  { id: 'participants', label: 'Participantes' },
];

// Solo aparece si el estudio definió preguntas para el participante.
const ANSWERS_TAB: { id: ResultsTab; label: string } = { id: 'answers', label: 'Respuestas' };

const SAMPLE_MESSAGES: Record<'baja' | 'aceptable' | 'estable', (min: number, stable: number) => string> = {
  baja: (min) => `Muestra baja: con menos de ${min} participantes completados los resultados son poco estables.`,
  aceptable: (_min, stable) => `Muestra aceptable: desde ${stable} participantes la similitud se estabiliza.`,
  estable: () => 'Muestra estable: el tamaño de muestra es suficiente para estimar la similitud.',
};

export function CardSortingResultsPage() {
  const { estudioId } = useParams<{ estudioId: string }>();
  const analyticsQuery = useCardSortingAnalytics(estudioId ?? null);
  const [searchParams, setSearchParams] = useSearchParams();
  const data = analyticsQuery.data;
  const withAnswers = data && data.preguntas?.length > 0 ? [...TABS, ANSWERS_TAB] : TABS;
  // El dendrograma necesita al menos 2 tarjetas.
  const tabs = data && data.tarjetas.length < 2 ? withAnswers.filter((tab) => tab.id !== 'dendrogram') : withAnswers;
  const requestedTab = searchParams.get('vista');
  const activeTab: ResultsTab = tabs.some((tab) => tab.id === requestedTab)
    ? (requestedTab as ResultsTab)
    : 'cards';
  const setActiveTab = (tab: ResultsTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'cards') next.delete('vista');
    else next.set('vista', tab);
    setSearchParams(next, { replace: true });
  };

  if (analyticsQuery.isLoading) return <div className="panel">Calculando resultados…</div>;

  if (analyticsQuery.error || !data) {
    return (
      <section className="panel">
        <h2>No se pudieron cargar los resultados</h2>
        <p role="alert" className="error-text">
          {analyticsQuery.error instanceof Error
            ? analyticsQuery.error.message
            : 'El estudio no existe o no tienes acceso.'}
        </p>
      </section>
    );
  }

  return (
    <div className="fade cs-results">
      <header className="page-head">
        <div>
          <span className="kicker">CARD SORTING · RESULTADOS</span>
          <h2>{data.estudio.nombre}</h2>
          <p>Compara patrones de clasificación y usa la evidencia para decidir la arquitectura de información.</p>
        </div>
        <Link
          className="secondary button-like"
          to={`/proyectos/${data.estudio.proyectoId}/card-sorting/${data.estudio.id}`}
        >
          ← Volver al workspace
        </Link>
      </header>

      <section className="analytics-kpis" aria-label="Resumen del estudio">
        <article className="analytics-kpi"><span>Participantes</span><strong>{data.participantesCount}</strong><small>clasificaciones completadas</small></article>
        <article className="analytics-kpi"><span>Tarjetas</span><strong>{data.cardsCount}</strong><small>elementos evaluados</small></article>
        <article className="analytics-kpi"><span>Acuerdo global</span><strong>{data.acuerdoGlobal}%</strong><small>similitud promedio</small></article>
        <article className="analytics-kpi"><span>Categorías</span><strong>{data.categorias.length}</strong><small>nombres consolidados</small></article>
      </section>

      <p
        className={`cs-sample-note cs-sample-${data.muestra}`}
        role="status"
        data-testid="cs-sample-note"
      >
        {SAMPLE_MESSAGES[data.muestra](data.umbrales.muestraMinima, data.umbrales.muestraEstable)}
      </p>

      {data.participantesCount === 0 ? (
        <article className="panel">
          <span className="kicker">SIN RESPUESTAS</span>
          <h2>Aún no hay resultados</h2>
          <p className="text-muted-sm">Comparte el enlace del workspace. Las visualizaciones aparecerán cuando llegue la primera clasificación.</p>
        </article>
      ) : (
        <>
          <article className="panel">
            <div className="panel-head">
              <h2>Vistas del estudio</h2>
              <div className="cs-panel-actions">
                <button type="button" className="ghost" onClick={() => descargarCsv('card-sorting-matriz-resultados.csv', matrizACsv(data.resultsMatrix))}>
                  Descargar CSV · resultados
                </button>
                <button type="button" className="ghost" onClick={() => descargarCsv('card-sorting-similitud.csv', similitudACsv(data.tarjetas, data.matrizSimilitud))}>
                  Descargar CSV · similitud
                </button>
                <button type="button" className="ghost" onClick={() => analyticsQuery.refetch()}>↺ Actualizar</button>
              </div>
            </div>

            <div className="cs-analysis-tabs" role="tablist" aria-label="Vistas de resultados">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  id={`card-sorting-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`card-sorting-panel-${tab.id}`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  className={`cs-analysis-tab${activeTab === tab.id ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(event) => {
                    const index = tabs.findIndex((item) => item.id === activeTab);
                    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
                    if (!offset) return;
                    event.preventDefault();
                    const next = tabs[(index + offset + tabs.length) % tabs.length];
                    setActiveTab(next.id);
                    requestAnimationFrame(() => document.getElementById(`card-sorting-tab-${next.id}`)?.focus());
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div
              id={`card-sorting-panel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`card-sorting-tab-${activeTab}`}
              tabIndex={0}
            >
              {activeTab === 'cards' && <CardsTable data={data.porCarta} />}
              {activeTab === 'dendrogram' && <CardSortingDendrogram tarjetas={data.tarjetas} similitud={data.matrizSimilitud} />}
              {activeTab === 'participants' && <ParticipantsList data={data.participantes ?? []} />}
              {activeTab === 'answers' && <AnswersList data={data.preguntas} />}
              {activeTab === 'categories' && <CategoriesTable data={data.porCategoria} />}
              {activeTab === 'results' && <MatrixTable title="Cantidad de ubicaciones" matrix={data.resultsMatrix} format={String} />}
              {activeTab === 'popular' && <MatrixTable title="Porcentaje de participantes" matrix={data.popularPlacementsMatrix} format={(value) => `${value}%`} heat />}
              {activeTab === 'similarity' && (
                <MatrixTable
                  title="Similitud entre tarjetas"
                  matrix={{
                    categorias: data.tarjetas,
                    filas: data.tarjetas.map((tarjeta, index) => ({ tarjeta, valores: data.matrizSimilitud[index] })),
                  }}
                  format={(value) => `${value}%`}
                  heat
                />
              )}
            </div>
          </article>

          <section className="sort-layout mt-16">
            <article className="panel">
              <div className="panel-head"><h2>Frecuencia de uso</h2></div>
              {data.frecuenciaPorCategoria.map((category) => (
                <div key={category.nombre} className="frequency-row">
                  <b>{category.nombre}</b>
                  <span><i style={{ width: `${category.porcentaje}%` }} /></span>
                  <strong>{category.porcentaje}%</strong>
                </div>
              ))}
            </article>

            <article className="panel">
              <div className="panel-head"><h2>Agrupaciones dominantes</h2></div>
              <p className="text-muted-sm">
                Una tarjeta tiene consenso cuando más del {data.umbrales.consenso}% de los participantes la ubicó en la misma categoría (criterio del curso).
              </p>
              <div className="clusters">
                {data.clusters.map((cluster) => (
                  <div key={cluster.nombre} className="cluster">
                    <h3>{cluster.nombre}</h3>
                    <strong>{cluster.acuerdo}%</strong>
                    <div className="chip-list">{cluster.tarjetas.map((card) => <span key={card} className="chip">{card}</span>)}</div>
                  </div>
                ))}
              </div>
              {data.sinConsenso.length > 0 && (
                <div className="cs-no-consensus">
                  <h3>Sin consenso (≤{data.umbrales.consenso}%)</h3>
                  <div className="chip-list">{data.sinConsenso.map((card) => <span key={card} className="chip">{card}</span>)}</div>
                </div>
              )}
            </article>
          </section>
        </>
      )}
    </div>
  );
}

function CardsTable({ data }: { data: CardSortingPorCarta[] }) {
  return (
    <div className="cs-table-wrap"><table className="cs-table">
      <caption className="sr-only">Categorías utilizadas para cada tarjeta</caption>
      <thead><tr><th>Tarjeta</th><th>Categorías distintas</th><th>Distribución</th></tr></thead>
      <tbody>{data.map((row) => (
        <tr key={row.tarjeta}>
          <th scope="row">{row.tarjeta}</th>
          <td>{row.categoriasCount}</td>
          <td>{row.categorias.map((category) => <span key={category.nombre} className="cs-inline-result">{category.nombre} ({category.frecuencia})</span>)}</td>
        </tr>
      ))}</tbody>
    </table></div>
  );
}

function CategoriesTable({ data }: { data: CardSortingPorCategoria[] }) {
  return (
    <div className="cs-table-wrap"><table className="cs-table">
      <caption className="sr-only">Tarjetas incluidas en cada categoría</caption>
      <thead><tr><th>Categoría</th><th>Tarjetas distintas</th><th>Distribución</th></tr></thead>
      <tbody>{data.map((row) => (
        <tr key={row.nombre}>
          <th scope="row">{row.nombre}</th>
          <td>{row.cardsCount}</td>
          <td>{row.cartas.map((card) => <span key={card.tarjeta} className="cs-inline-result">{card.tarjeta} ({card.frecuencia})</span>)}</td>
        </tr>
      ))}</tbody>
    </table></div>
  );
}

function MatrixTable({
  title,
  matrix,
  format,
  heat = false,
}: {
  title: string;
  matrix: CardSortingMatrix;
  format: (value: number) => string;
  heat?: boolean;
}) {
  if (matrix.categorias.length === 0) return <p className="text-muted-sm">No hay categorías para esta vista.</p>;
  return (
    <div className="cs-table-wrap"><table className="cs-table cs-matrix">
      <caption className="sr-only">{title}</caption>
      <thead><tr><th>Tarjeta</th>{matrix.categorias.map((category) => <th key={category}>{category}</th>)}</tr></thead>
      <tbody>{matrix.filas.map((row) => (
        <tr key={row.tarjeta}>
          <th scope="row">{row.tarjeta}</th>
          {row.valores.map((value, index) => (
            <td
              key={matrix.categorias[index]}
              className={[
                'cs-matrix-cell',
                heat && value > 0 ? 'heat' : '',
                heat && row.tarjeta === matrix.categorias[index] ? 'cs-matrix-diag' : '',
              ].filter(Boolean).join(' ')}
              style={heat ? ({ '--cell-intensity': value / 100 } as CSSProperties) : undefined}
            >
              {value > 0 || row.tarjeta === matrix.categorias[index] ? format(value) : '—'}
            </td>
          ))}
        </tr>
      ))}</tbody>
    </table></div>
  );
}

function AnswersList({ data }: { data: CardSortingPreguntaResultado[] }) {
  return (
    <div className="cs-answers">
      {data.map((question) => (
        <section key={question.id} className="cs-answer-block">
          <h3>{question.texto}</h3>
          <p className="text-muted-sm">
            {question.respuestas.length} {question.respuestas.length === 1 ? 'respuesta' : 'respuestas'} · anónimas
          </p>
          {question.respuestas.length === 0 ? (
            <p className="text-muted-sm">Nadie respondió esta pregunta todavía.</p>
          ) : (
            <ul>{question.respuestas.map((answer, index) => <li key={index}>{answer}</li>)}</ul>
          )}
        </section>
      ))}
    </div>
  );
}

function ParticipantsList({ data }: { data: CardSortingParticipante[] }) {
  return (
    <div className="cs-table-wrap"><table className="cs-table">
      <caption className="sr-only">Clasificación de cada participante (anónima)</caption>
      <thead><tr><th>Participante</th><th>Categorías</th><th>Grupos</th></tr></thead>
      <tbody>{data.map((participante) => (
        <tr key={participante.orden}>
          <th scope="row">Participante {participante.orden}</th>
          <td>{participante.categoriasCount}</td>
          <td>{participante.grupos.map((grupo) => <span key={grupo.categoria} className="cs-inline-result">{grupo.categoria}: {grupo.tarjetas.join(', ')}</span>)}</td>
        </tr>
      ))}</tbody>
    </table></div>
  );
}
