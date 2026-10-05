import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type {
  CardSortingMatrix,
  CardSortingParticipante,
  CardSortingPreguntaResultado,
} from '../api/card-sorting.api';
import { useCardSortingAnalytics } from '../hooks/useCardSortingQueries';
import { CardSortingDendrogram } from '../components/CardSortingDendrogram';
import { CardSortingCardsView } from '../components/CardSortingCardsView';
import { CardSortingCategoriesView } from '../components/CardSortingCategoriesView';
import { descargarCsv, tablaACsv } from '../card-sorting-csv';
import { nombreArchivo, tablaDeVista } from '../card-sorting-export';
import { filasTarjetas } from '../card-sorting-views';
import { Icon } from '../../../shared/components/ui/Icon';
import { InfoTip } from '../../../shared/components/ui/InfoTip';

type ResultsTab = 'cards' | 'categories' | 'results' | 'popular' | 'similarity' | 'dendrogram' | 'participants' | 'answers';

const TABS: Array<{ id: ResultsTab; label: string }> = [
  { id: 'cards', label: 'Tarjetas' },
  { id: 'categories', label: 'Categorías' },
  { id: 'results', label: 'Matriz' },
  { id: 'popular', label: 'Populares' },
  { id: 'similarity', label: 'Similitud' },
  { id: 'dendrogram', label: 'Dendrograma' },
  { id: 'participants', label: 'Participantes' },
];

// Solo aparece si el estudio definió preguntas para el participante.
const ANSWERS_TAB: { id: ResultsTab; label: string } = { id: 'answers', label: 'Respuestas' };

// Título corto y ayuda de cada vista. Dendrograma, participantes y respuestas llevan el suyo.
const VIEW_HELP: Partial<Record<ResultsTab, { title: string; help: string }>> = {
  cards: { title: 'Distribución de cada tarjeta', help: 'Cada barra muestra en qué categorías ubicaron la tarjeta los participantes. Hay consenso cuando más del umbral del curso la puso en la misma categoría (ver "Agrupaciones dominantes"). Toca una categoría para verla en detalle.' },
  categories: { title: 'Tarjetas por categoría', help: 'Para cada categoría, las tarjetas que contiene y el porcentaje de participantes que la ubicó ahí. Las más atenuadas tienen bajo acuerdo. Toca una tarjeta para ver toda su distribución.' },
  results: { title: 'Cantidad de ubicaciones', help: 'Cuántas veces cada tarjeta se ubicó en cada categoría.' },
  popular: { title: 'Porcentaje de participantes', help: 'Qué porcentaje de los participantes ubicó cada tarjeta en cada categoría. Más oscuro, más acuerdo.' },
  similarity: { title: 'Similitud entre tarjetas', help: 'Qué tan seguido los participantes agruparon cada par de tarjetas en la misma categoría (100% = siempre juntas).' },
};

const UMBRAL_MIN = 50;
const UMBRAL_MAX = 95;

const SAMPLE_LABELS: Record<'baja' | 'aceptable' | 'estable', string> = {
  baja: 'Muestra baja',
  aceptable: 'Muestra aceptable',
  estable: 'Muestra estable',
};

const SAMPLE_MESSAGES: Record<'baja' | 'aceptable' | 'estable', (min: number, stable: number) => string> = {
  baja: (min) => `Muestra baja: con menos de ${min} participantes completados los resultados son poco estables.`,
  aceptable: (_min, stable) => `Muestra aceptable: desde ${stable} participantes la similitud se estabiliza.`,
  estable: () => 'Muestra estable: el tamaño de muestra es suficiente para estimar la similitud.',
};

export function CardSortingResultsPage() {
  const { estudioId } = useParams<{ estudioId: string }>();
  const analyticsQuery = useCardSortingAnalytics(estudioId ?? null);
  const [searchParams, setSearchParams] = useSearchParams();
  const servidor = analyticsQuery.data;
  const umbralCurso = servidor?.umbrales.consenso;
  const umbralParam = Number(searchParams.get('umbral'));
  const umbral =
    umbralCurso !== undefined && Number.isInteger(umbralParam) && umbralParam >= UMBRAL_MIN && umbralParam <= UMBRAL_MAX
      ? umbralParam
      : umbralCurso;
  // Con otro umbral se recalculan consenso, filtros, CSV y PDF en el navegador; no se guarda.
  const data = useMemo(
    () => (servidor && umbral !== undefined && umbral !== servidor.umbrales.consenso
      ? { ...servidor, umbrales: { ...servidor.umbrales, consenso: umbral } }
      : servidor),
    [servidor, umbral],
  );
  const umbralEditado = Boolean(servidor && data && data.umbrales.consenso !== servidor.umbrales.consenso);
  const cambiarUmbral = (valor: number) => {
    const next = new URLSearchParams(searchParams);
    if (valor === umbralCurso) next.delete('umbral');
    else next.set('umbral', String(valor));
    setSearchParams(next, { replace: true });
  };
  const withAnswers = data && data.preguntas?.length > 0 ? [...TABS, ANSWERS_TAB] : TABS;
  // El dendrograma necesita al menos 2 tarjetas.
  const tabs = data && data.tarjetas.length < 2 ? withAnswers.filter((tab) => tab.id !== 'dendrogram') : withAnswers;
  const requestedTab = searchParams.get('vista');
  const activeTab: ResultsTab = tabs.some((tab) => tab.id === requestedTab)
    ? (requestedTab as ResultsTab)
    : 'cards';
  const tabsRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  const updateEdges = () => {
    const el = tabsRef.current;
    if (!el) return;
    const start = el.scrollLeft > 4;
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  };
  useEffect(() => {
    const list = tabsRef.current;
    const tab = document.getElementById(`card-sorting-tab-${activeTab}`);
    if (list && tab) {
      if (tab.offsetLeft < list.scrollLeft) list.scrollLeft = tab.offsetLeft - 8;
      else if (tab.offsetLeft + tab.offsetWidth > list.scrollLeft + list.clientWidth) {
        list.scrollLeft = tab.offsetLeft + tab.offsetWidth - list.clientWidth + 8;
      }
    }
    updateEdges();
  }, [activeTab, data]);
  useEffect(() => {
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, []);
  const [exportando, setExportando] = useState(false);
  const [errorPdf, setErrorPdf] = useState<string | null>(null);
  const exportarPdf = async (vistas: ResultsTab[], alcance: 'vista' | 'todas') => {
    if (!data) return;
    setExportando(true);
    setErrorPdf(null);
    try {
      const { exportarEstudioPdf } = await import('../card-sorting-pdf');
      await exportarEstudioPdf(data, vistas, alcance);
    } catch (error) {
      setErrorPdf(error instanceof Error ? error.message : 'No pudimos generar el PDF. Inténtalo nuevamente.');
    } finally {
      setExportando(false);
    }
  };
  const foco = searchParams.get('foco') ?? undefined;
  const setActiveTab = (tab: ResultsTab, nuevoFoco?: string) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'cards') next.delete('vista');
    else next.set('vista', tab);
    if (nuevoFoco) next.set('foco', nuevoFoco);
    else next.delete('foco');
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

  const sinConsenso = umbralEditado
    ? filasTarjetas(data).filter((fila) => fila.estado === 'sin-consenso').map((fila) => fila.tarjeta)
    : data.sinConsenso;

  return (
    <div className="fade cs-results">
      <header className="page-head">
        <div>
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
        <article className="analytics-kpi"><span>Participantes</span><strong>{data.participantesCount}</strong></article>
        <article className="analytics-kpi"><span>Tarjetas</span><strong>{data.cardsCount}</strong></article>
        <article className="analytics-kpi">
          <div className="cs-kpi-label">
            <span>Acuerdo global</span>
            <InfoTip label="Ayuda: acuerdo global" align="start">Similitud promedio entre todas las tarjetas, calculada con las clasificaciones completadas.</InfoTip>
          </div>
          <strong>{data.acuerdoGlobal}%</strong>
        </article>
        <article className="analytics-kpi"><span>Categorías</span><strong>{data.categorias.length}</strong></article>
      </section>

      <p
        className={`cs-sample-note cs-sample-${data.muestra}`}
        role="status"
        data-testid="cs-sample-note"
      >
        <span>{SAMPLE_LABELS[data.muestra]}</span>
        <InfoTip label="Ayuda: tamaño de muestra" align="start">
          {SAMPLE_MESSAGES[data.muestra](data.umbrales.muestraMinima, data.umbrales.muestraEstable)}
        </InfoTip>
      </p>

      {data.participantesCount > 0 && (
        <div className="cs-threshold" data-testid="cs-threshold">
          <label htmlFor="cs-umbral">Umbral de consenso</label>
          <input
            id="cs-umbral"
            type="range"
            min={UMBRAL_MIN}
            max={UMBRAL_MAX}
            step={5}
            value={data.umbrales.consenso}
            aria-valuetext={`más del ${data.umbrales.consenso}%`}
            onChange={(event) => cambiarUmbral(Number(event.target.value))}
          />
          <strong>&gt; {data.umbrales.consenso}%</strong>
          <InfoTip label="Ayuda: umbral de consenso" align="start">
            Porcentaje de participantes que deben ubicar la tarjeta en la misma categoría para que cuente como consenso. El valor del curso es {servidor!.umbrales.consenso}%. Al cambiarlo se recalculan las vistas, el CSV y el PDF en tu navegador; no se guarda en el estudio.
          </InfoTip>
          {umbralEditado && (
            <button type="button" className="ghost" onClick={() => cambiarUmbral(servidor!.umbrales.consenso)}>
              Restablecer ({servidor!.umbrales.consenso}%)
            </button>
          )}
        </div>
      )}

      {data.participantesCount === 0 ? (
        <article className="panel">
          <h2>Aún no hay resultados</h2>
          <p className="text-muted-sm">Comparte el enlace del workspace. Las visualizaciones aparecerán cuando llegue la primera clasificación.</p>
        </article>
      ) : (
        <>
          <article className="panel">
            <div className="panel-head">
              <h2>Vistas del estudio</h2>
              <div className="cs-panel-actions">
                <button
                  type="button"
                  className="ghost cs-icon-btn"
                  aria-label="Descargar CSV de esta vista"
                  title="CSV de esta vista (Excel)"
                  onClick={() => descargarCsv(nombreArchivo(data.estudio.nombre, activeTab, 'csv'), tablaACsv(tablaDeVista(activeTab, data)))}
                >
                  <Icon name="download" size={16} /><span className="cs-icon-btn-text">CSV</span>
                </button>
                <button
                  type="button"
                  className="ghost cs-icon-btn"
                  aria-label="Descargar PDF de esta vista"
                  title="PDF de esta vista"
                  disabled={exportando}
                  onClick={() => exportarPdf([activeTab], 'vista')}
                >
                  <Icon name="download" size={16} /><span className="cs-icon-btn-text">{exportando ? 'Preparando…' : 'PDF'}</span>
                </button>
                <button
                  type="button"
                  className="ghost cs-icon-btn"
                  aria-label="Descargar PDF de todas las vistas"
                  title="PDF con todas las vistas"
                  disabled={exportando}
                  onClick={() => exportarPdf(tabs.map((tab) => tab.id), 'todas')}
                >
                  <Icon name="download" size={16} /><span className="cs-icon-btn-text">PDF completo</span>
                </button>
                <button
                  type="button"
                  className="ghost cs-icon-btn"
                  aria-label="Actualizar resultados"
                  title="Actualizar resultados"
                  onClick={() => analyticsQuery.refetch()}
                >
                  <Icon name="refresh" size={16} />
                </button>
              </div>
            </div>

            {errorPdf && <p role="alert" className="error-text">{errorPdf}</p>}

            <div className={`cs-tabs-wrap${edges.start ? ' has-start' : ''}${edges.end ? ' has-end' : ''}`}>
            <div className="cs-analysis-tabs" role="tablist" aria-label="Vistas de resultados" ref={tabsRef} onScroll={updateEdges}>
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
            </div>

            <div
              id={`card-sorting-panel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`card-sorting-tab-${activeTab}`}
              tabIndex={0}
            >
              {VIEW_HELP[activeTab] && (
                <div className="cs-view-head">
                  <h3>{VIEW_HELP[activeTab]!.title}</h3>
                  <InfoTip label={`Ayuda: ${VIEW_HELP[activeTab]!.title}`} align="start">{VIEW_HELP[activeTab]!.help}</InfoTip>
                </div>
              )}
              {activeTab === 'cards' && <CardSortingCardsView data={data} foco={foco} onCategoria={(nombre) => setActiveTab('categories', nombre)} />}
              {activeTab === 'dendrogram' && <CardSortingDendrogram tarjetas={data.tarjetas} similitud={data.matrizSimilitud} />}
              {activeTab === 'participants' && (
                <div className="cs-view-head">
                  <h3>Clasificación de cada participante</h3>
                  <InfoTip label="Ayuda: clasificación de cada participante" align="start">Las clasificaciones son anónimas: cada fila es un participante y sus grupos.</InfoTip>
                </div>
              )}
              {activeTab === 'participants' && <ParticipantsList data={data.participantes ?? []} />}
              {activeTab === 'answers' && <AnswersList data={data.preguntas} />}
              {activeTab === 'categories' && <CardSortingCategoriesView data={data} foco={foco} onTarjeta={(tarjeta) => setActiveTab('cards', tarjeta)} />}
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
                  umbralFuerte={data.umbrales.consenso}
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
              <div className="panel-head">
                <div className="cs-view-head">
                  <h2>Agrupaciones dominantes</h2>
                  <InfoTip label="Ayuda: agrupaciones dominantes" align="start">
                    Una tarjeta tiene consenso cuando más del {data.umbrales.consenso}% de los participantes la ubicó en la misma categoría (criterio del curso).
                  </InfoTip>
                </div>
              </div>
              <div className="clusters">
                {data.clusters.map((cluster) => (
                  <div key={cluster.nombre} className="cluster">
                    <h3>{cluster.nombre}</h3>
                    <strong>{cluster.acuerdo}%</strong>
                    <div className="chip-list">{cluster.tarjetas.map((card) => <span key={card} className="chip">{card}</span>)}</div>
                  </div>
                ))}
              </div>
              {sinConsenso.length > 0 && (
                <div className="cs-no-consensus">
                  <h3>Sin consenso (≤{data.umbrales.consenso}%)</h3>
                  <div className="chip-list">{sinConsenso.map((card) => <span key={card} className="chip">{card}</span>)}</div>
                </div>
              )}
            </article>
          </section>
        </>
      )}
    </div>
  );
}

function MatrixTable({
  title,
  matrix,
  format,
  heat = false,
  umbralFuerte,
}: {
  title: string;
  matrix: CardSortingMatrix;
  format: (value: number) => string;
  heat?: boolean;
  // Marca con borde los pares (fuera de la diagonal) con más de este % de similitud.
  umbralFuerte?: number;
}) {
  if (matrix.categorias.length === 0) return <p className="text-muted-sm">No hay categorías para esta vista.</p>;
  return (
    <>
    {umbralFuerte !== undefined && <p className="text-muted-sm cs-matrix-legend">Borde: pares con más de {umbralFuerte}% de similitud.</p>}
    <div className="cs-table-wrap"><table className="cs-table cs-matrix">
      <caption className="sr-only">{title}</caption>
      <thead><tr><th scope="col">Tarjeta</th>{matrix.categorias.map((category) => <th scope="col" key={category}>{category}</th>)}</tr></thead>
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
                umbralFuerte !== undefined && row.tarjeta !== matrix.categorias[index] && value > umbralFuerte ? 'cs-matrix-strong' : '',
              ].filter(Boolean).join(' ')}
              style={heat ? ({ '--cell-intensity': value / 100 } as CSSProperties) : undefined}
            >
              {value > 0 || row.tarjeta === matrix.categorias[index] ? format(value) : '—'}
            </td>
          ))}
        </tr>
      ))}</tbody>
    </table></div>
    </>
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
      <thead><tr><th scope="col">Participante</th><th scope="col">Categorías</th><th scope="col">Grupos</th></tr></thead>
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
