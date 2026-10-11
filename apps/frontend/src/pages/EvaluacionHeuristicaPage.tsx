// apps/frontend/src/pages/EvaluacionHeuristicaPage.tsx
//
// Módulo de evaluación heurística: registra hallazgos con heurística de
// Nielsen, severidad 0-4, evidencia (texto, enlace, captura), recomendación
// y responsable (lo fija el servidor). Priorizados por severidad.

import { useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { FlujoHeuristicaPage } from '../features/heuristica-flujo/FlujoHeuristicaPage';
import { HEURISTICAS_NIELSEN, SEVERIDADES } from '@observatorio-ux/shared-types';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import { useConfirm } from '../shared/api/confirm';
import { notify } from '../shared/api/toast';
import { useUnsavedChanges } from '../shared/hooks/useUnsavedChanges';
import {
  EvaluacionHeuristicaApiError,
  type HallazgoHeuristica,
} from '../features/evaluacion-heuristica/api/evaluacion-heuristica.api';
import {
  useActualizarHallazgo,
  useCrearSesionHeuristica,
  useEliminarHallazgo,
  useFinalizarSesionHeuristica,
  useRegistrarHallazgo,
  useSesionHeuristica,
  useSesionesHeuristicas,
} from '../features/evaluacion-heuristica/hooks/useEvaluacionHeuristicaQueries';
import {
  FILTROS_INICIALES,
  conteoPorSeveridad,
  filtrarYOrdenar,
  formDesdeHallazgo,
  etiquetaHeuristica,
  formVacio,
  nombreSesion,
  type ErroresForm,
  type FiltrosHallazgos,
  type HallazgoFormValues,
} from '../features/evaluacion-heuristica/heuristica-utils';
import { resumirSesion } from '../features/evaluacion-heuristica/heuristica-resumen';
import { HallazgoCard } from '../features/evaluacion-heuristica/components/HallazgoCard';
import { HallazgoForm } from '../features/evaluacion-heuristica/components/HallazgoForm';
import { SesionesHeuristicas } from '../features/evaluacion-heuristica/components/SesionesHeuristicas';
import { SeveridadBadge } from '../features/evaluacion-heuristica/components/SeveridadBadge';

const CAMPOS_FORM = new Set<string>(Object.keys(formVacio()));

function mensajeDe(err: unknown, porDefecto: string) {
  return err instanceof Error && err.message ? err.message : porDefecto;
}

/** 400 del ValidationPipe → errores por campo para marcar el input exacto. */
function erroresDeServidor(err: unknown): ErroresForm {
  if (!(err instanceof EvaluacionHeuristicaApiError) || !err.details) return {};
  const e: ErroresForm = {};
  for (const d of err.details) if (CAMPOS_FORM.has(d.campo)) e[d.campo as keyof HallazgoFormValues] = d.mensaje;
  return e;
}

export function EvaluacionHeuristicaPage() {
  const [search, setSearch] = useSearchParams();
  return search.get('anteriores') === '1'
    ? <><button type="button" className="text-button" onClick={() => setSearch({})}>← Nuevo flujo de evaluación</button><EvaluacionHeuristicaLegacyPage /></>
    : <FlujoHeuristicaPage />;
}

export function EvaluacionHeuristicaLegacyPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const confirm = useConfirm();

  const [sesionId, setSesionId] = useState<string | null>(null);
  const [nombreNueva, setNombreNueva] = useState('');
  const [nuevo, setNuevo] = useState<HallazgoFormValues>(formVacio());
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<HallazgoFormValues>(formVacio());
  const [erroresServidor, setErroresServidor] = useState<ErroresForm>({});
  const [filtros, setFiltros] = useState<FiltrosHallazgos>(FILTROS_INICIALES);
  const [exportando, setExportando] = useState(false);

  const { data: sesiones = [], isLoading: cargandoSesiones } = useSesionesHeuristicas(proyectoId);
  const { data: sesion, isLoading: cargandoSesion } = useSesionHeuristica(proyectoId, sesionId);
  const { mutate: crearSesion, isPending: creando } = useCrearSesionHeuristica(proyectoId);
  const { mutate: registrar, isPending: guardando } = useRegistrarHallazgo(proyectoId);
  const { mutate: actualizar, isPending: actualizando } = useActualizarHallazgo(proyectoId);
  const { mutate: eliminar } = useEliminarHallazgo(proyectoId);
  const { mutate: finalizar, isPending: finalizando } = useFinalizarSesionHeuristica(proyectoId);

  const hallazgos: HallazgoHeuristica[] = sesion?.resultado ?? [];
  const abierta = sesion?.estado === 'EN_PROGRESO';
  const editando = hallazgos.find((h) => h.id === editandoId) ?? null;
  const edicionModificada =
    !!editando && JSON.stringify(edicion) !== JSON.stringify(formDesdeHallazgo(editando));

  const { confirmDiscard } = useUnsavedChanges(abierta, { nuevo, edicion: edicionModificada ? edicion : null }, guardando || actualizando);

  const visibles = useMemo(() => filtrarYOrdenar(hallazgos, filtros), [hallazgos, filtros]);
  const conteo = useMemo(() => conteoPorSeveridad(hallazgos), [hallazgos]);
  const resumen = useMemo(() => resumirSesion(hallazgos), [hallazgos]);

  function abrirSesion(id: string) {
    setSesionId(id);
    setNuevo(formVacio());
    setEditandoId(null);
    setErroresServidor({});
    setFiltros(FILTROS_INICIALES);
  }

  function iniciarSesion() {
    crearSesion(nombreNueva, {
      onSuccess: (s) => {
        setNombreNueva('');
        abrirSesion(s.id);
      },
      onError: (err) => notify.error(mensajeDe(err, 'No se pudo abrir la sesión.')),
    });
  }

  async function volver() {
    if (!(await confirmDiscard())) return;
    setSesionId(null);
    setEditandoId(null);
  }

  function handleRegistrar(hallazgo: Parameters<typeof registrar>[0]['hallazgo']) {
    if (!sesionId) return;
    setErroresServidor({});
    registrar(
      { sesionId, hallazgo },
      {
        onSuccess: () => {
          setNuevo(formVacio());
          notify.success('Hallazgo agregado.');
        },
        onError: (err) => {
          setErroresServidor(erroresDeServidor(err));
          notify.error(mensajeDe(err, 'No se pudo guardar el hallazgo.'));
        },
      },
    );
  }

  function handleActualizar(hallazgo: Parameters<typeof registrar>[0]['hallazgo']) {
    if (!sesionId || !editandoId) return;
    setErroresServidor({});
    actualizar(
      { sesionId, hallazgoId: editandoId, cambios: hallazgo },
      {
        onSuccess: () => {
          setEditandoId(null);
          notify.success('Hallazgo actualizado.');
        },
        onError: (err) => {
          setErroresServidor(erroresDeServidor(err));
          notify.error(mensajeDe(err, 'No se pudo actualizar el hallazgo.'));
        },
      },
    );
  }

  async function handleEliminar(h: HallazgoHeuristica) {
    if (!sesionId) return;
    if (!(await confirm('¿Eliminar este hallazgo? También se borra su captura de pantalla.'))) return;
    eliminar(
      { sesionId, hallazgoId: h.id },
      {
        onSuccess: () => notify.success('Hallazgo eliminado.'),
        onError: (err) => notify.error(mensajeDe(err, 'No se pudo eliminar el hallazgo.')),
      },
    );
  }

  async function handleDescargarPdf() {
    if (!sesion || exportando) return;
    setExportando(true);
    try {
      // Carga diferida: pdfmake y sus fuentes pesan ~1,8 MB y no se necesitan hasta aquí.
      const { exportarSesionHeuristicaPdf } = await import('../features/evaluacion-heuristica/heuristica-pdf');
      const { sinCaptura } = await exportarSesionHeuristicaPdf(proyectoId, sesion);
      if (sinCaptura > 0) notify.info(`PDF generado. ${sinCaptura} captura(s) no se incluyeron: quedan disponibles en la aplicación.`);
      else notify.success('PDF generado.');
    } catch (err) {
      notify.error(mensajeDe(err, 'No se pudo generar el PDF. Inténtalo nuevamente.'));
    } finally {
      setExportando(false);
    }
  }

  async function handleFinalizar() {
    if (!sesionId) return;
    if (!(await confirmDiscard())) return;
    if (!(await confirm('Al finalizar no podrás agregar, editar ni eliminar hallazgos de esta evaluación. ¿Continuar?'))) return;
    finalizar(sesionId, {
      onSuccess: () => notify.success('Evaluación finalizada.'),
      onError: (err) => notify.error(mensajeDe(err, 'No se pudo finalizar la sesión.')),
    });
  }

  // ---------------------------------------------------------------- Inicio
  if (!sesionId) {
    return (
      <div className="fade">
        <div className="page-head">
          <div>
            <h2>Hallazgos heurísticos</h2>
            <p>Registra problemas de usabilidad según las 10 heurísticas de Nielsen, con evidencia, severidad y una recomendación accionable.</p>
          </div>
        </div>

        <div className="panel mb-16">
          <div className="panel-head"><h2>Nueva evaluación</h2></div>
          <form
            className="hx-new"
            onSubmit={(e) => { e.preventDefault(); iniciarSesion(); }}
          >
            <label className="field">
              Producto o sitio evaluado (opcional)
              <input
                value={nombreNueva}
                onChange={(e) => setNombreNueva(e.target.value)}
                placeholder="Ej. Portal de matrículas"
                maxLength={120}
                className="input-sm"
              />
            </label>
            <button type="submit" className="primary" disabled={creando}>
              {creando ? 'Abriendo sesión…' : 'Abrir nueva evaluación'}
            </button>
          </form>
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Evaluaciones del proyecto</h2></div>
          {cargandoSesiones
            ? <p className="text-muted-xs">Cargando evaluaciones…</p>
            : <SesionesHeuristicas sesiones={sesiones} onAbrir={abrirSesion} />}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- Sesión
  if (cargandoSesion || !sesion) {
    return (
      <div className="fade">
        <button type="button" className="text-button" onClick={volver}>← Evaluaciones</button>
        <p className="text-muted-xs">Cargando evaluación…</p>
      </div>
    );
  }

  return (
    <div className="fade">
      <div className="page-head">
        <div>
          <button type="button" className="text-button" onClick={volver}>← Evaluaciones</button>
          <h2>{nombreSesion(sesion)}</h2>
          <p>
            {abierta
              ? 'Evaluación en progreso. Los hallazgos se ordenan por severidad.'
              : 'Evaluación finalizada. Solo lectura.'}
          </p>
        </div>
        <span className={`badge ${abierta ? 'hx-estado-open' : 'hx-estado-done'}`}>
          {abierta ? 'En progreso' : 'Finalizada'}
        </span>
      </div>

      <div className="panel mb-16" aria-label="Resumen de severidad">
        <div className="panel-head">
          <h2>Resumen</h2>
          <span className="count">{hallazgos.length} hallazgos</span>
          <button type="button" className="text-button" onClick={() => void handleDescargarPdf()} disabled={exportando} aria-busy={exportando}>
            {exportando ? 'Generando PDF…' : 'Descargar PDF'}
          </button>
        </div>
        <ul className="hx-summary">
          {SEVERIDADES.slice().reverse().map((s) => (
            <li key={s.valor}>
              <SeveridadBadge valor={s.valor} />
              <strong>{conteo[s.valor]}</strong>
            </li>
          ))}
        </ul>
        {resumen.total > 0 && (
          <>
            <dl className="hx-stats">
              <div><dt>Mayores o catastróficos</dt><dd>{resumen.criticos}</dd></div>
              <div><dt>Severidad promedio</dt><dd>{String(resumen.promedio).replace('.', ',')}</dd></div>
              <div><dt>Sin evidencia</dt><dd>{resumen.sinEvidencia}</dd></div>
            </dl>
            <ul className="hx-bars" aria-label="Hallazgos por heurística">
              {resumen.porHeuristica.map((p) => (
                <li key={p.heuristicaId}>
                  <span>{etiquetaHeuristica(p.heuristicaId)}</span>
                  <span className="hx-bar" aria-hidden="true"><i style={{ width: `${(p.count / resumen.porHeuristica[0].count) * 100}%` }} /></span>
                  <strong>{p.count}</strong>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {abierta && (
        <div className="panel mb-16">
          <div className="panel-head"><h2>Nuevo hallazgo</h2></div>
          <HallazgoForm
            proyectoId={proyectoId}
            sesionId={sesion.id}
            valores={nuevo}
            onChange={setNuevo}
            onSubmit={handleRegistrar}
            guardando={guardando}
            modo="crear"
            erroresServidor={editandoId ? undefined : erroresServidor}
          />
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <h2>Hallazgos registrados</h2>
          <span className="count">{visibles.length}/{hallazgos.length}</span>
        </div>

        {hallazgos.length > 0 && (
          <div className="hx-filters" role="group" aria-label="Filtros de hallazgos">
            <label className="field">
              Severidad
              <select
                className="input-sm"
                value={String(filtros.severidad)}
                onChange={(e) =>
                  setFiltros({ ...filtros, severidad: e.target.value === 'todas' ? 'todas' : (Number(e.target.value) as 0 | 1 | 2 | 3 | 4) })
                }
              >
                <option value="todas">Todas</option>
                {SEVERIDADES.map((s) => <option key={s.valor} value={s.valor}>{s.valor} — {s.etiqueta}</option>)}
              </select>
            </label>
            <label className="field">
              Heurística
              <select
                className="input-sm"
                value={filtros.heuristica}
                onChange={(e) => setFiltros({ ...filtros, heuristica: e.target.value })}
              >
                <option value="todas">Todas</option>
                {HEURISTICAS_NIELSEN.map((h) => <option key={h.id} value={h.id}>{h.id} — {h.nombre}</option>)}
              </select>
            </label>
            {(filtros.severidad !== 'todas' || filtros.heuristica !== 'todas') && (
              <button type="button" className="text-button" onClick={() => setFiltros(FILTROS_INICIALES)}>Quitar filtros</button>
            )}
          </div>
        )}

        {hallazgos.length === 0 && (
          <div className="empty-state">
            <p>Todavía no hay hallazgos registrados en esta evaluación.</p>
          </div>
        )}
        {hallazgos.length > 0 && visibles.length === 0 && (
          <div className="empty-state"><p>Ningún hallazgo coincide con los filtros.</p></div>
        )}

        {visibles.map((h) =>
          h.id === editandoId ? (
            <div key={h.id} className="finding hx-finding">
              <HallazgoForm
                proyectoId={proyectoId}
                sesionId={sesion.id}
                valores={edicion}
                onChange={setEdicion}
                onSubmit={handleActualizar}
                onCancel={async () => { if (edicionModificada && !(await confirmDiscard())) return; setEditandoId(null); setErroresServidor({}); }}
                guardando={actualizando}
                modo="editar"
                erroresServidor={erroresServidor}
              />
            </div>
          ) : (
            <HallazgoCard
              key={h.id}
              proyectoId={proyectoId}
              sesionId={sesion.id}
              hallazgo={h}
              editable={abierta}
              onEditar={async () => { if (edicionModificada && !(await confirmDiscard())) return; setEdicion(formDesdeHallazgo(h)); setErroresServidor({}); setEditandoId(h.id); }}
              onEliminar={() => void handleEliminar(h)}
            />
          ),
        )}
      </div>

      <div className="mt-16">
        {abierta ? (
          <button type="button" onClick={() => void handleFinalizar()} disabled={finalizando} className="primary">
            {finalizando ? 'Finalizando…' : 'Finalizar evaluación'}
          </button>
        ) : (
          <p className="text-success">✓ Evaluación finalizada.</p>
        )}
      </div>
    </div>
  );
}
