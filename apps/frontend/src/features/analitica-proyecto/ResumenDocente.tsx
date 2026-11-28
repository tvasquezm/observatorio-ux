// Paneles de la analítica pensados para el profesor: avance, alertas, aporte del equipo,
// hallazgos clave y novedades desde su última visita.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listArtifacts } from '../../shared/api/artifacts.api';
import { useMembers, useMemberEvents } from '../projects/hooks/useProjectsQueries';
import { useComments } from '../comments/hooks/useCommentsQueries';
import { fechaChile } from '../heuristica-flujo/flujo-utils';
import type { Pendiente } from './analitica-proyecto';
import {
  TECNICAS, comentariosSinRespuesta, type AporteIntegrante, type AvanceTecnica, type DatosDocente, type HallazgoClave, type Novedad, type VersionArtefacto,
} from './resumen-docente';

/** Versiones de todos los artefactos (autoría y actividad), miembros y comentarios del proyecto. */
export function useDatosDocente(proyectoId: string) {
  const versiones = useQuery({ queryKey: ['analitica-docente', proyectoId, 'versiones'], queryFn: () => listArtifacts(proyectoId), enabled: !!proyectoId });
  const miembros = useMembers(proyectoId);
  const comentarios = useComments(proyectoId);
  const eventos = useMemberEvents(proyectoId);
  return {
    isLoading: versiones.isLoading || miembros.isLoading || comentarios.isLoading,
    eventosMiembros: eventos.data ?? [],
    versiones: (versiones.data ?? []) as VersionArtefacto[],
    miembros: miembros.data ?? [],
    comentarios: comentarios.data ?? [],
  };
}

const CLAVE_LEIDO = (usuarioId: string, proyectoId: string) => `observatorio-ux-analitica-leido:${usuarioId}:${proyectoId}`;
const SIETE_DIAS = 7 * 24 * 60 * 60 * 1000;

/**
 * Las novedades muestran siempre lo de los últimos 7 días. «Marcar como leído» oculta lo anterior a ese momento
 * (se recuerda en este navegador) y «Mostrar de nuevo» lo devuelve. Ya no depende de cuándo se abrió la página.
 */
export function useNovedadesLeidas(usuarioId: string, proyectoId: string) {
  const [leidoHasta, setLeidoHasta] = useState<string | null>(() => { try { return localStorage.getItem(CLAVE_LEIDO(usuarioId, proyectoId)); } catch { return null; } });
  const guardar = (valor: string | null) => {
    setLeidoHasta(valor);
    try { if (valor) localStorage.setItem(CLAVE_LEIDO(usuarioId, proyectoId), valor); else localStorage.removeItem(CLAVE_LEIDO(usuarioId, proyectoId)); } catch { /* sin almacenamiento: vale mientras la página siga abierta */ }
  };
  return { leidoHasta, marcarLeido: () => guardar(new Date().toISOString()), mostrarDeNuevo: () => guardar(null) };
}

/** Desde cuándo se muestran las novedades: los últimos 7 días, o desde que se marcaron como leídas si eso es más reciente. */
export const desdeNovedades = (leidoHasta: string | null, ahora = Date.now()) => {
  const sieteDias = new Date(ahora - SIETE_DIAS).toISOString();
  return leidoHasta && leidoHasta > sieteDias ? leidoHasta : sieteDias;
};

const ESTADO: Record<AvanceTecnica['estado'], string> = { completa: 'Completa', 'en-curso': 'En curso', 'sin-empezar': 'Sin empezar' };
const fechaCorta = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('es-CL', { timeZone: 'America/Santiago', day: 'numeric', month: 'short' }) : null;

export function PanelAvance({ proyectoId, avance }: { proyectoId: string; avance: AvanceTecnica[] }) {
  return (
    <section className="panel docente-avance" aria-labelledby="docente-avance-titulo">
      <div className="panel-head"><div><span className="kicker">AVANCE</span><h3 id="docente-avance-titulo">Cómo va el equipo</h3></div>
        <span className="count">{avance.filter(a => a.estado === 'completa').length} de {avance.length} completas</span></div>
      <ul className="docente-semaforo">
        {avance.map(a => (
          <li key={a.id} data-estado={a.estado}>
            <span className="docente-luz" aria-hidden="true" />
            <div>
              <Link to={`/proyectos/${proyectoId}/${a.id}`}>{a.titulo}</Link>
              <small>{a.detalle}</small>
            </div>
            <span className="docente-estado">{ESTADO[a.estado]}{a.ultima && <small>Últ. cambio {fechaCorta(a.ultima)}</small>}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PanelAlertas({ proyectoId, alertas }: { proyectoId: string; alertas: Pendiente[] }) {
  const [todas, setTodas] = useState(false);
  const visibles = todas ? alertas : alertas.slice(0, 6);
  return (
    <section className="panel docente-alertas" aria-labelledby="docente-alertas-titulo">
      <div className="panel-head"><div><span className="kicker">PARA REVISAR</span><h3 id="docente-alertas-titulo">Qué conviene revisar</h3></div>
        <span className="count">{alertas.length} {alertas.length === 1 ? 'alerta' : 'alertas'}</span></div>
      {alertas.length === 0 ? <p className="text-muted-sm">No hay alertas: el trabajo del equipo está completo y consistente.</p> : (
        <ul className="analitica-lista">
          {visibles.map(a => (
            <li key={a.texto} data-tipo={a.tipo}>
              <span className="analitica-marca" aria-hidden="true" />
              <span>{a.texto}</span>
              <Link to={`/proyectos/${proyectoId}/${a.ruta}`}>Revisar{' '}<span className="sr-only">{a.texto}</span></Link>
            </li>
          ))}
        </ul>
      )}
      {alertas.length > 6 && <button type="button" className="ghost" onClick={() => setTodas(v => !v)}>{todas ? 'Ver menos' : `Ver las ${alertas.length} alertas`}</button>}
    </section>
  );
}

export function PanelAporte({ aportes }: { aportes: AporteIntegrante[] }) {
  const maximo = Math.max(1, ...aportes.map(a => a.total));
  return (
    <section className="panel docente-aporte" aria-labelledby="docente-aporte-titulo">
      <div className="panel-head"><div><span className="kicker">EQUIPO</span><h3 id="docente-aporte-titulo">Aporte de cada integrante</h3></div></div>
      {aportes.length === 0 ? <p className="text-muted-sm">El proyecto todavía no tiene integrantes ni aportes registrados.</p> : (
        <div className="docente-aporte-scroll">
          <table className="docente-aporte-tabla">
            <caption className="sr-only">Aportes por integrante y técnica: versiones guardadas, estudios creados y revisiones heurísticas</caption>
            <thead><tr><th scope="col">Integrante</th>{TECNICAS.map(t => <th key={t.id} scope="col">{t.titulo}</th>)}<th scope="col">Total</th><th scope="col">Última actividad</th></tr></thead>
            <tbody>
              {aportes.map(a => (
                <tr key={a.usuarioId} data-sin-aporte={a.total === 0 || undefined}>
                  <th scope="row">{a.nombre}</th>
                  {TECNICAS.map(t => <td key={t.id}>{a.porTecnica[t.id] || '·'}</td>)}
                  <td><span className="docente-barra" aria-hidden="true"><i style={{ width: `${(a.total / maximo) * 100}%` }} /></span><strong>{a.total}</strong></td>
                  <td>{a.ultima ? fechaCorta(a.ultima) : 'Sin actividad'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-muted-sm">Cuenta versiones guardadas de personas, journeys y momentos, card sorting creados y revisiones heurísticas guardadas.</p>
    </section>
  );
}

export function PanelHallazgos({ proyectoId, hallazgos }: { proyectoId: string; hallazgos: HallazgoClave[] }) {
  return (
    <section className="panel docente-hallazgos" aria-labelledby="docente-hallazgos-titulo">
      <div className="panel-head"><div><span className="kicker">RESUMEN</span><h3 id="docente-hallazgos-titulo">Hallazgos clave del proyecto</h3></div></div>
      {hallazgos.length === 0 ? <p className="text-muted-sm">Aún no hay hallazgos suficientes para resumir.</p> : (
        <ol className="docente-hallazgos-lista">
          {hallazgos.map(h => (
            <li key={`${h.tecnica}-${h.texto}`}>
              <small>{h.tecnica}</small>
              <Link to={`/proyectos/${proyectoId}/${h.ruta}`}>{h.texto}</Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function PanelNovedades({ proyectoId, novedades, leidoHasta, onLeido, onMostrarDeNuevo, datos, usuarioId }: { proyectoId: string; novedades: Novedad[]; leidoHasta: string | null; onLeido: () => void; onMostrarDeNuevo: () => void; datos: Pick<DatosDocente, 'comentarios'>; usuarioId: string }) {
  const pendientes = comentariosSinRespuesta(datos.comentarios, usuarioId);
  const [todasNovedades, setTodasNovedades] = useState(false);
  const [todosComentarios, setTodosComentarios] = useState(false);
  const visiblesNovedades = todasNovedades ? novedades : novedades.slice(0, 8);
  const visiblesComentarios = todosComentarios ? pendientes : pendientes.slice(0, 5);
  return (
    <section className="panel docente-novedades" aria-labelledby="docente-novedades-titulo">
      <div className="panel-head"><div><span className="kicker">NOVEDADES</span><h3 id="docente-novedades-titulo">Qué cambió en los últimos 7 días</h3></div>
        {novedades.length > 0 && <button type="button" className="secondary" onClick={onLeido}>Marcar como leído</button>}</div>
      {leidoHasta && <p className="text-muted-sm" role="status">Marcaste las novedades como leídas el {fechaChile(leidoHasta)}: solo ves lo que pasó después. <button type="button" className="link-btn" onClick={onMostrarDeNuevo}>Mostrar de nuevo los últimos 7 días</button></p>}
      {novedades.length === 0 ? <p className="text-muted-sm">Sin cambios del equipo en este período.</p> : (
        <ul className="docente-novedades-lista">
          {visiblesNovedades.map(n => (
            <li key={`${n.fecha}-${n.texto}`}>
              <time dateTime={n.fecha}>{fechaChile(n.fecha)}</time>
              <Link to={`/proyectos/${proyectoId}/${n.ruta}`}>{n.texto}</Link>
            </li>
          ))}
        </ul>
      )}
      {novedades.length > 8 && <button type="button" className="ghost" onClick={() => setTodasNovedades(v => !v)}>{todasNovedades ? 'Ver menos' : `Ver las ${novedades.length} novedades`}</button>}
      <h4 className="analitica-subtitulo">Tus comentarios sin respuesta del equipo</h4>
      <p className="text-muted-sm">Un comentario tuyo queda respondido cuando cualquier otra persona del proyecto escribe algo en los comentarios después del tuyo.</p>
      {pendientes.length === 0 ? <p className="text-muted-sm">El equipo respondió todos tus comentarios.</p> : (
        <ul className="analitica-lista">
          {visiblesComentarios.map(c => (
            <li key={c.id} data-tipo="aviso">
              <span className="analitica-marca" aria-hidden="true" />
              <span>"{c.texto.length > 90 ? `${c.texto.slice(0, 89)}…` : c.texto}" <small>· {fechaChile(c.createdAt)}</small></span>
              <Link to={`/proyectos/${proyectoId}/${c.tecnica ?? 'comentarios'}`}>Ver{' '}<span className="sr-only">comentario</span></Link>
            </li>
          ))}
        </ul>
      )}
      {pendientes.length > 5 && <button type="button" className="ghost" onClick={() => setTodosComentarios(v => !v)}>{todosComentarios ? 'Ver menos' : `Ver los ${pendientes.length} comentarios sin respuesta`}</button>}
    </section>
  );
}
