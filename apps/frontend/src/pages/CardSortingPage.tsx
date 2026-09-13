// apps/frontend/src/pages/CardSortingPage.tsx
//
// Vista de EVALUADOR: crea el estudio maestro (tarjetas + categorías
// opcionales), comparte el link de acceso y muestra el resultado/analítica.
// El flujo de PARTICIPANTE vive en features/onboarding (OnboardingPage +
// ParticipantCardSortingPage), con su propio token (jwt-participante).

import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import {
  useCardSortingAnalytics,
  useCreateCardSortingSession,
  useCerrarCardSortingEstudio,
} from '../features/card-sorting/hooks/useCardSortingQueries';
import type { TipoCardSorting } from '../features/card-sorting/api/card-sorting.api';
import { notify } from '../shared/api/toast';

export function CardSortingPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const { mutate: crear, data: sesion, isPending, error } = useCreateCardSortingSession();
  const { mutate: cerrarEstudio, isPending: cerrando } = useCerrarCardSortingEstudio();
  const { data: analytics, isLoading: cargandoAnalytics, refetch: refetchAnalytics } = useCardSortingAnalytics(
    sesion?.id ?? null,
  );
  const [tipo, setTipo] = useState<TipoCardSorting>('ABIERTO');
  const [tarjetasTexto, setTarjetasTexto] = useState('');
  const [categoriasTexto, setCategoriasTexto] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tarjetas = tarjetasTexto
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((etiqueta) => ({ etiqueta }));
    if (tarjetas.length === 0) return;
    const categorias = categoriasTexto
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((nombre) => ({ nombre }));
    crear({
      proyectoId,
      tipo,
      tarjetas,
      categorias: tipo === 'CERRADO' && categorias.length > 0 ? categorias : undefined,
    });
  }

  async function copiarLinkParticipante() {
    if (!sesion) return;
    const link = `${window.location.origin}/participar/${proyectoId}?estudio=${sesion.id}`;
    try {
      await navigator.clipboard.writeText(link);
      notify.success('Link copiado al portapapeles.');
    } catch {
      notify.error('No se pudo copiar. Copia el link manualmente.');
    }
  }

  return (
    <div className="fade">
      <div className="page-head">
        <div>
          <span className="kicker">ARQUITECTURA DE INFORMACIÓN</span>
          <h1>Card sorting</h1>
          <p>Define las tarjetas (y, si el estudio es cerrado, las categorías) que los participantes van a ordenar.</p>
        </div>
      </div>

      <section className="sort-layout">
        <article className="panel sort-board">
          <div className="panel-head">
            <div>
              <span className="kicker">NUEVO ESTUDIO</span>
              <h2>Configurar tarjetas y categorías</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="form-grid" style={{ maxWidth: 480 }}>
            <label className="field">
              Tipo de estudio
              <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCardSorting)}>
                <option value="ABIERTO">Abierto (el participante crea sus categorías)</option>
                <option value="CERRADO">Cerrado (categorías predefinidas)</option>
              </select>
            </label>

            <label className="field">
              Tarjetas (una por línea)
              <textarea
                placeholder={'Inscripción de asignaturas\nCalendario académico\nBiblioteca'}
                value={tarjetasTexto}
                onChange={(e) => setTarjetasTexto(e.target.value)}
                required
                className="textarea-lg"
              />
            </label>

            {tipo === 'CERRADO' && (
              <label className="field">
                Categorías predefinidas (una por línea)
                <textarea
                  placeholder={'Información académica\nServicios\nVida universitaria'}
                  value={categoriasTexto}
                  onChange={(e) => setCategoriasTexto(e.target.value)}
                  className="textarea-md"
                />
              </label>
            )}

            <button type="submit" className="primary" disabled={isPending}>
              {isPending ? 'Creando estudio…' : '+ Crear estudio de card sorting'}
            </button>
          </form>

          {error && <p className="error-text mt-16">{(error as Error).message}</p>}
        </article>

        <aside className="panel sort-analysis">
          <span className="kicker">CÓMO FUNCIONA</span>
          <h2>Del estudio a la evidencia</h2>
          <p className="hint-text">
            Al crear el estudio, cada participante recibe el ID de sesión para unirse y clasificar
            las tarjetas. Los resultados quedan disponibles en la sesión maestra.
          </p>
          <div className="sort-stat">
            <div>
              <strong>{sesion?.cardsDefinidas.length ?? 0}</strong>
              <small>tarjetas definidas</small>
            </div>
            <div>
              <strong>{sesion?.categoriasDefinidas.length ?? 0}</strong>
              <small>categorías predefinidas</small>
            </div>
            <div>
              <strong>{sesion?.tipoCardSorting === 'CERRADO' ? 'Cerrado' : sesion ? 'Abierto' : '—'}</strong>
              <small>tipo de estudio</small>
            </div>
          </div>
        </aside>
      </section>

      {sesion && (
        <section className="sort-layout mt-16">
          <article className="panel sort-board">
            <div className="panel-head">
              <div>
                <span className="kicker">VISTA PREVIA DEL ESTUDIO</span>
                <h2>Lo que verá cada participante</h2>
              </div>
              <span className="count">{sesion.cardsDefinidas.length} tarjetas</span>
            </div>
            <div className="sort-workspace">
              <div className="deck">
                <div className="zone-head"><b>Mazo inicial</b><span>{sesion.cardsDefinidas.length}</span></div>
                <p className="drop-hint">Cada tarjeta arranca sin clasificar</p>
                {sesion.cardsDefinidas.map((c) => (
                  <div key={c.id} className="sort-card">
                    <span className="grip">⠿</span>
                    <b>{c.etiqueta}</b>
                  </div>
                ))}
              </div>
              <div className="drop-zones">
                {sesion.categoriasDefinidas.length > 0 ? (
                  sesion.categoriasDefinidas.map((cat) => (
                    <div key={cat.id} className="drop-zone">
                      <div className="zone-head"><b>{cat.nombre}</b><span>0</span></div>
                      <p className="drop-hint">Zona de destino</p>
                    </div>
                  ))
                ) : (
                  <div className="drop-zone">
                    <div className="zone-head"><b>Sin categorías predefinidas</b></div>
                    <p className="drop-hint">Estudio abierto: cada participante crea sus propias categorías.</p>
                  </div>
                )}
              </div>
            </div>
          </article>

          <aside className="panel sort-analysis">
            <span className="kicker">COMPARTIR</span>
            <h2>Link para participantes</h2>
            <p className="hint-text">Comparte este link con cada participante para que se una al estudio.</p>
            <div className="callout" style={{ wordBreak: 'break-all' }}>
              {window.location.origin}/participar/{proyectoId}?estudio={sesion.id}
            </div>
            <button type="button" className="secondary mt-8" onClick={copiarLinkParticipante}>
              Copiar link para participantes
            </button>
            <button
              type="button"
              className={sesion.cerrado ? 'secondary mt-8' : 'danger mt-8'}
              disabled={cerrando}
              onClick={() => cerrarEstudio({ estudioId: sesion.id, cerrado: !sesion.cerrado })}
            >
              {cerrando ? 'Guardando…' : sesion.cerrado ? 'Reabrir estudio' : 'Cerrar estudio'}
            </button>
            {sesion.cerrado && (
              <p className="hint-text mt-8">
                Estudio cerrado: nadie puede unirse ni enviar resultados nuevos.
              </p>
            )}
          </aside>
        </section>
      )}

      {sesion && (
        <article className="panel mt-16">
          <div className="panel-head">
            <div>
              <span className="kicker">ANALÍTICA DEL ESTUDIO</span>
              <h2>Consenso entre participantes</h2>
            </div>
            <button type="button" className="ghost" onClick={() => refetchAnalytics()}>
              ↺ Actualizar
            </button>
          </div>

          {cargandoAnalytics && <p>Calculando…</p>}

          {analytics && analytics.participantesCount === 0 && (
            <p className="text-muted-sm">
              Todavía no hay participantes que hayan completado el estudio. La analítica se calcula
              en tiempo real a partir de sus resultados.
            </p>
          )}

          {analytics && analytics.participantesCount > 0 && (
            <>
              <div className="sort-stat">
                <div>
                  <strong>{analytics.participantesCount}</strong>
                  <small>participantes completados</small>
                </div>
                <div>
                  <strong>{analytics.acuerdoGlobal}%</strong>
                  <small>acuerdo global</small>
                </div>
                <div>
                  <strong>{analytics.clusters.length}</strong>
                  <small>categorías con resultados</small>
                </div>
              </div>

              {analytics.tarjetas.length > 0 && (
                <div className="table-wrap">
                  <table className="heat-table">
                    <thead>
                      <tr>
                        <th>Tarjeta / tarjeta</th>
                        {analytics.tarjetas.map((t) => (
                          <th key={t}>{t}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.matrizSimilitud.map((fila, i) => (
                        <tr key={analytics.tarjetas[i]}>
                          <th>{analytics.tarjetas[i]}</th>
                          {fila.map((v, j) => (
                            <td key={j} className={v >= 75 ? 'hot' : v >= 40 ? 'warm' : ''}>
                              {v}%
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {analytics.frecuenciaPorCategoria.length > 0 && (
                <div className="mt-16">
                  {analytics.frecuenciaPorCategoria.map((f) => (
                    <div key={f.nombre} className="frequency-row">
                      <b>{f.nombre}</b>
                      <span><i style={{ width: `${f.porcentaje}%` }} /></span>
                      <strong>{f.porcentaje}%</strong>
                    </div>
                  ))}
                </div>
              )}

              {analytics.clusters.length > 0 && (
                <div className="clusters mt-16">
                  {analytics.clusters.map((c) => (
                    <div key={c.nombre} className="cluster">
                      <h3>{c.nombre}</h3>
                      <strong>{c.acuerdo}%</strong>
                      <div className="chip-list">
                        {c.tarjetas.map((t) => (
                          <span key={t} className="chip">{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </article>
      )}
    </div>
  );
}
