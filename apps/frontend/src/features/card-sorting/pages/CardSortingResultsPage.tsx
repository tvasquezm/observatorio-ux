import { useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import type {
  CardSortingMatrix,
  CardSortingPorCarta,
  CardSortingPorCategoria,
} from '../api/card-sorting.api';
import { useCardSortingAnalytics } from '../hooks/useCardSortingQueries';

type ResultsTab = 'cards' | 'categories' | 'results' | 'popular' | 'similarity';

const TABS: Array<{ id: ResultsTab; label: string }> = [
  { id: 'cards', label: 'Tarjetas' },
  { id: 'categories', label: 'Categorías' },
  { id: 'results', label: 'Matriz de resultados' },
  { id: 'popular', label: 'Ubicaciones populares' },
  { id: 'similarity', label: 'Similitud' },
];

export function CardSortingResultsPage() {
  const { estudioId } = useParams<{ estudioId: string }>();
  const analyticsQuery = useCardSortingAnalytics(estudioId ?? null);
  const [activeTab, setActiveTab] = useState<ResultsTab>('cards');
  const data = analyticsQuery.data;

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
    <div className="fade">
      <header className="page-head">
        <div>
          <span className="kicker">CARD SORTING · RESULTADOS</span>
          <h1>{data.estudio.nombre}</h1>
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
        <article className="analytics-kpi"><span>PARTICIPANTES</span><strong>{data.participantesCount}</strong><small>clasificaciones completadas</small></article>
        <article className="analytics-kpi"><span>TARJETAS</span><strong>{data.cardsCount}</strong><small>elementos evaluados</small></article>
        <article className="analytics-kpi"><span>ACUERDO GLOBAL</span><strong>{data.acuerdoGlobal}%</strong><small>similitud promedio</small></article>
        <article className="analytics-kpi"><span>CATEGORÍAS</span><strong>{data.categorias.length}</strong><small>nombres consolidados</small></article>
      </section>

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
              <div><span className="kicker">EXPLORAR</span><h2>Vistas del estudio</h2></div>
              <button type="button" className="ghost" onClick={() => analyticsQuery.refetch()}>↺ Actualizar</button>
            </div>

            <div className="cs-analysis-tabs" role="tablist" aria-label="Vistas de resultados">
              {TABS.map((tab) => (
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
                    const index = TABS.findIndex((item) => item.id === activeTab);
                    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
                    if (!offset) return;
                    event.preventDefault();
                    const next = TABS[(index + offset + TABS.length) % TABS.length];
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
              <div className="panel-head"><div><span className="kicker">CATEGORÍAS</span><h2>Frecuencia de uso</h2></div></div>
              {data.frecuenciaPorCategoria.map((category) => (
                <div key={category.nombre} className="frequency-row">
                  <b>{category.nombre}</b>
                  <span><i style={{ width: `${category.porcentaje}%` }} /></span>
                  <strong>{category.porcentaje}%</strong>
                </div>
              ))}
            </article>

            <article className="panel">
              <div className="panel-head"><div><span className="kicker">CONSENSO</span><h2>Agrupaciones dominantes</h2></div></div>
              <div className="clusters">
                {data.clusters.map((cluster) => (
                  <div key={cluster.nombre} className="cluster">
                    <h3>{cluster.nombre}</h3>
                    <strong>{cluster.acuerdo}%</strong>
                    <div className="chip-list">{cluster.tarjetas.map((card) => <span key={card} className="chip">{card}</span>)}</div>
                  </div>
                ))}
              </div>
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
          <td>{row.categorias.map((category) => <span key={category.nombre} className="cs-inline-result">{category.nombre} · {category.frecuencia}</span>)}</td>
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
          <td>{row.cartas.map((card) => <span key={card.tarjeta} className="cs-inline-result">{card.tarjeta} · {card.frecuencia}</span>)}</td>
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
              className={heat && value > 0 ? 'cs-matrix-cell heat' : 'cs-matrix-cell'}
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
