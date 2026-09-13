import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCardSortingAnalytics } from '../hooks/useCardSortingQueries';
import type { CardSortingMatrix, CardSortingPorCarta, CardSortingPorCategoria } from '../api/card-sorting.api';

type Tab = 'cards' | 'categories' | 'results-matrix' | 'popular-placements';

const TABS: { id: Tab; label: string }[] = [
  { id: 'cards', label: 'Cards' },
  { id: 'categories', label: 'Categories' },
  { id: 'results-matrix', label: 'Results matrix' },
  { id: 'popular-placements', label: 'Popular placements matrix' },
];

export function CardSortingResultsPage() {
  const { estudioId } = useParams<{ estudioId: string }>();
  const { data, isLoading, error } = useCardSortingAnalytics(estudioId ?? null);
  const [tab, setTab] = useState<Tab>('cards');

  if (isLoading) {
    return <div className="panel">Cargando resultados del Card Sorting…</div>;
  }

  if (error || !data) {
    return (
      <div className="panel">
        <span className="kicker">RESULTADOS</span>
        <h2>No se pudieron cargar los resultados</h2>
        <p className="error-text">
          {error instanceof Error ? error.message : 'La técnica no existe o no tienes acceso.'}
        </p>
      </div>
    );
  }

  return (
    <div className="fade">
      <div className="page-head">
        <div>
          <span className="kicker">CARD SORTING · RESULTADOS</span>
          <h1>{data.estudio.nombre}</h1>
          <p>
            Analiza las clasificaciones enviadas por los participantes y utiliza estos resultados
            como evidencia para tus decisiones de arquitectura de información.
          </p>
        </div>
      </div>

      <section className="analytics-kpis">
        <article className="analytics-kpi">
          <span>PARTICIPANTES</span>
          <strong>{data.participantesCount}</strong>
          <small>clasificaciones completadas</small>
        </article>
        <article className="analytics-kpi">
          <span>TARJETAS</span>
          <strong>{data.cardsCount}</strong>
          <small>tarjetas del estudio</small>
        </article>
        <article className="analytics-kpi">
          <span>ACUERDO GLOBAL</span>
          <strong>{data.acuerdoGlobal}%</strong>
          <small>similitud promedio entre pares</small>
        </article>
        <article className="analytics-kpi">
          <span>CATEGORÍAS USADAS</span>
          <strong>{data.categorias.length}</strong>
          <small>categorías con resultados</small>
        </article>
      </section>

      {data.participantesCount === 0 ? (
        <article className="panel">
          <div className="panel-head">
            <div>
              <span className="kicker">SIN RESPUESTAS</span>
              <h2>La técnica todavía no tiene resultados</h2>
            </div>
          </div>
          <p className="text-muted-sm">
            Comparte el enlace de participación para que los participantes completen el Card Sorting.
            Cuando envíen sus clasificaciones, la analítica aparecerá automáticamente aquí.
          </p>
        </article>
      ) : (
        <>
          <article className="panel">
            <div className="panel-head">
              <div>
                <span className="kicker">ANÁLISIS</span>
                <h2>Vistas del estudio</h2>
              </div>
            </div>

            <div className="cs-analysis-tabs">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={t.id === tab ? 'cs-analysis-tab active' : 'cs-analysis-tab'}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'cards' && <CardsTab data={data.porCarta} />}
            {tab === 'categories' && <CategoriesTab data={data.porCategoria} />}
            {tab === 'results-matrix' && (
              <MatrixTab matrix={data.resultsMatrix} format={(v) => String(v)} />
            )}
            {tab === 'popular-placements' && (
              <MatrixTab matrix={data.popularPlacementsMatrix} format={(v) => `${v}%`} heat />
            )}
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <span className="kicker">CATEGORÍAS</span>
                <h2>Frecuencia de agrupación</h2>
              </div>
              <span className="count">{data.frecuenciaPorCategoria.length}</span>
            </div>

            <div className="cs-results-list">
              {data.frecuenciaPorCategoria.map((categoria) => (
                <div key={categoria.nombre} className="cs-result-row">
                  <div className="cs-result-row-head">
                    <strong>{categoria.nombre}</strong>
                    <span>{categoria.porcentaje}% · {categoria.count} tarjetas asignadas</span>
                  </div>
                  <div className="cs-result-bar">
                    <i style={{ width: `${categoria.porcentaje}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <span className="kicker">AGRUPACIONES</span>
                <h2>Consenso por grupo</h2>
              </div>
            </div>
            <div className="cs-results-grid">
              {data.clusters.map((cluster) => (
                <div key={cluster.nombre} className="cs-result-card">
                  <strong>{cluster.nombre}</strong>
                  <span>{cluster.acuerdo}% de acuerdo</span>
                  <small>{cluster.tarjetas.join(' · ')}</small>
                </div>
              ))}
            </div>
          </article>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// Tab "Cards" — por cada tarjeta: en cuántas categorías terminó y con
// qué frecuencia en cada una. Igual al tab "Cards" de Optimal Workshop.
// ---------------------------------------------------------------

function CardsTab({ data }: { data: CardSortingPorCarta[] }) {
  return (
    <div className="cs-table-wrap">
      <table className="cs-table">
        <thead>
          <tr>
            <th>Card</th>
            <th>Sorted into</th>
            <th>Categories</th>
            <th>Frequency</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.tarjeta}>
              <td><span className="cs-chip">{row.tarjeta}</span></td>
              <td>{row.categoriasCount} categor{row.categoriasCount === 1 ? 'ía' : 'ías'}</td>
              <td>
                {row.categorias.map((c) => (
                  <div key={c.nombre} className="cs-table-subrow">📁 {c.nombre}</div>
                ))}
              </td>
              <td>
                {row.categorias.map((c) => (
                  <div key={c.nombre} className="cs-table-subrow">{c.frecuencia}</div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------
// Tab "Categories" — por cada categoría: cuántas tarjetas distintas
// contiene y con qué frecuencia cada una. Igual al tab "Categories".
// ---------------------------------------------------------------

function CategoriesTab({ data }: { data: CardSortingPorCategoria[] }) {
  return (
    <div className="cs-table-wrap">
      <table className="cs-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Contains</th>
            <th>Cards</th>
            <th>Freq</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.nombre}>
              <td><strong>{row.nombre}</strong></td>
              <td>{row.cardsCount} different card{row.cardsCount === 1 ? '' : 's'}</td>
              <td>
                {row.cartas.map((c) => (
                  <div key={c.tarjeta} className="cs-table-subrow">{c.tarjeta}</div>
                ))}
              </td>
              <td>
                {row.cartas.map((c) => (
                  <div key={c.tarjeta} className="cs-table-subrow">{c.frecuencia}</div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------
// Results matrix / Popular placements matrix — grilla carta×categoría.
// `heat` activa un color de fondo proporcional al valor (pensado para
// el % de la popular placements matrix).
// ---------------------------------------------------------------

function MatrixTab({
  matrix,
  format,
  heat = false,
}: {
  matrix: CardSortingMatrix;
  format: (value: number) => string;
  heat?: boolean;
}) {
  if (matrix.categorias.length === 0) {
    return <p className="text-muted-sm">Todavía no hay categorías con resultados.</p>;
  }

  return (
    <div className="cs-table-wrap">
      <table className="cs-table cs-matrix">
        <thead>
          <tr>
            <th />
            {matrix.categorias.map((cat) => (
              <th key={cat}>{cat}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.filas.map((fila) => (
            <tr key={fila.tarjeta}>
              <td className="cs-matrix-rowhead">{fila.tarjeta}</td>
              {fila.valores.map((valor, i) => (
                <td
                  key={matrix.categorias[i]}
                  className="cs-matrix-cell"
                  style={
                    valor > 0
                      ? {
                          backgroundColor: heat
                            ? `rgba(37, 99, 235, ${Math.min(valor / 100, 1) * 0.5 + 0.08})`
                            : 'rgba(37, 99, 235, 0.12)',
                        }
                      : undefined
                  }
                >
                  {valor > 0 ? format(valor) : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
