// Selector de proyecto del inicio pensado para salas con muchos proyectos (20 o más):
// una lista de una línea por proyecto con búsqueda, los últimos usados arriba y un filtro de
// sala compacto. Es un combobox accesible: flechas, Enter y Escape.
import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../../../shared/components/ui/Icon';

export interface ProyectoOpcion { id: string; nombre: string; salaId?: string | null }
interface Props {
  proyectos: ProyectoOpcion[];
  salas: Array<{ id: string; nombre: string }>;
  activoId: string;
  onElegir: (id: string) => void;
  usuarioId: string;
  /** Sala con la que arranca el filtro (p. ej. la del proyecto abierto); vacío = todas. */
  salaInicial?: string;
  /** Enfoca el campo al montarse (abre la lista). */
  autoEnfocar?: boolean;
}

const SIN_SALA = '__sin-sala__';
const MAX_RECIENTES = 3;
const claveRecientes = (usuarioId: string) => `observatorio-ux-recientes:${usuarioId || 'anonymous'}`;
function leerRecientes(usuarioId: string): string[] {
  try {
    const valor = JSON.parse(localStorage.getItem(claveRecientes(usuarioId)) ?? '[]');
    return Array.isArray(valor) ? valor.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
}
/** Marca un proyecto como usado hace poco (los últimos 3 salen arriba en el selector). */
export function guardarReciente(usuarioId: string, id: string): string[] {
  const nuevos = [id, ...leerRecientes(usuarioId).filter(x => x !== id)].slice(0, MAX_RECIENTES);
  try { localStorage.setItem(claveRecientes(usuarioId), JSON.stringify(nuevos)); } catch { /* sin almacenamiento */ }
  return nuevos;
}
const minusculas = (t: string) => t.toLocaleLowerCase('es');

export function SelectorProyecto({ proyectos, salas, activoId, onElegir, usuarioId, salaInicial = '', autoEnfocar = false }: Props) {
  const [salaFiltro, setSalaFiltro] = useState(salaInicial);
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState('');
  const [resaltado, setResaltado] = useState(0);
  const [recientes, setRecientes] = useState(() => leerRecientes(usuarioId));
  const id = useId();
  const caja = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoEnfocar) entrada.current?.focus(); }, [autoEnfocar]);

  const nombreSala = (salaId?: string | null) => (salaId ? salas.find(s => s.id === salaId)?.nombre ?? 'Sala sin nombre' : 'Sin sala');
  const grupos = new Map<string, number>();
  for (const p of proyectos) grupos.set(p.salaId ?? SIN_SALA, (grupos.get(p.salaId ?? SIN_SALA) ?? 0) + 1);
  const opcionesSala = [...grupos].map(([salaId, cantidad]) => ({ id: salaId, nombre: salaId === SIN_SALA ? 'Sin sala' : nombreSala(salaId), cantidad }))
    .sort((a, b) => (a.id === SIN_SALA ? 1 : b.id === SIN_SALA ? -1 : a.nombre.localeCompare(b.nombre, 'es')));
  const variasSalas = opcionesSala.length > 1;

  const termino = minusculas(consulta.trim());
  const filtrados = proyectos
    .filter(p => !salaFiltro || (p.salaId ?? SIN_SALA) === salaFiltro)
    .filter(p => !termino || minusculas(p.nombre).includes(termino) || minusculas(nombreSala(p.salaId)).includes(termino));
  const recientesVisibles = termino ? [] : recientes.flatMap(rid => filtrados.filter(p => p.id === rid));
  const resto = filtrados.filter(p => !recientesVisibles.includes(p))
    .sort((a, b) => (variasSalas && !salaFiltro ? (a.salaId ? 0 : 1) - (b.salaId ? 0 : 1) || nombreSala(a.salaId).localeCompare(nombreSala(b.salaId), 'es') : 0) || a.nombre.localeCompare(b.nombre, 'es'));
  const items = [
    ...recientesVisibles.map(p => ({ p, grupo: 'Recientes' })),
    ...resto.map(p => ({ p, grupo: variasSalas && !salaFiltro ? nombreSala(p.salaId) : recientesVisibles.length ? 'Todos los proyectos' : '' })),
  ];
  const indice = Math.min(resaltado, Math.max(0, items.length - 1));
  const activo = proyectos.find(p => p.id === activoId);

  useEffect(() => {
    if (abierto) document.getElementById(`${id}-op-${indice}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [abierto, indice, id]);

  function elegir(proyectoId: string) {
    onElegir(proyectoId);
    setRecientes(guardarReciente(usuarioId, proyectoId));
    setAbierto(false);
    setConsulta('');
  }
  function alTeclear(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAbierto(true); setResaltado(Math.min(indice + (abierto ? 1 : 0), items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAbierto(true); setResaltado(Math.max(indice - 1, 0)); }
    else if (e.key === 'Home' && abierto) { e.preventDefault(); setResaltado(0); }
    else if (e.key === 'End' && abierto) { e.preventDefault(); setResaltado(Math.max(0, items.length - 1)); }
    else if (e.key === 'Enter' && abierto && items[indice]) { e.preventDefault(); elegir(items[indice].p.id); }
    else if (e.key === 'Escape' && abierto) { e.preventDefault(); setAbierto(false); setConsulta(''); }
  }

  return (
    <div className="selector-proyecto">
      {variasSalas && (
        <div className="field selector-sala">
          <label htmlFor={`${id}-sala`}>Sala</label>
          <select id={`${id}-sala`} value={salaFiltro} onChange={e => { setSalaFiltro(e.target.value); setResaltado(0); }}>
            <option value="">Todas las salas ({proyectos.length})</option>
            {opcionesSala.map(o => <option key={o.id} value={o.id}>{o.nombre} ({o.cantidad})</option>)}
          </select>
        </div>
      )}
      <div className="field selector-caja" ref={caja} onBlur={e => { if (!caja.current?.contains(e.relatedTarget as Node | null)) { setAbierto(false); setConsulta(''); } }}>
        <label htmlFor={`${id}-entrada`}>Proyecto activo</label>
        <div className="selector-entrada">
          <Icon name="search" />
          <input
            ref={entrada} id={`${id}-entrada`} type="text" role="combobox" autoComplete="off" spellCheck={false}
            aria-expanded={abierto} aria-controls={`${id}-lista`} aria-autocomplete="list"
            aria-activedescendant={abierto && items.length ? `${id}-op-${indice}` : undefined}
            placeholder="Busca o elige un proyecto…"
            value={abierto ? consulta : activo?.nombre ?? ''}
            onFocus={e => { setAbierto(true); setConsulta(''); e.currentTarget.select(); }}
            onClick={() => setAbierto(true)}
            onChange={e => { setConsulta(e.target.value); setAbierto(true); setResaltado(0); }}
            onKeyDown={alTeclear}
          />
          {abierto && consulta && <button type="button" className="selector-limpiar" onMouseDown={e => e.preventDefault()} onClick={() => { setConsulta(''); setResaltado(0); }}>Borrar búsqueda</button>}
        </div>
        {abierto && (
          <ul id={`${id}-lista`} role="listbox" aria-label="Proyectos" className="selector-lista">
            {items.map(({ p, grupo }, i) => (
              <li key={p.id} role="presentation">
                {grupo && grupo !== items[i - 1]?.grupo && <span className="selector-grupo" aria-hidden="true">{grupo}</span>}
                <div
                  id={`${id}-op-${i}`} role="option" aria-selected={p.id === activoId} data-resaltado={i === indice || undefined}
                  className="selector-opcion" onMouseDown={e => e.preventDefault()} onClick={() => elegir(p.id)} onMouseMove={() => setResaltado(i)}
                >
                  <span className="selector-nombre">{p.nombre}</span>
                  {variasSalas && !salaFiltro && grupo !== nombreSala(p.salaId) && <small>{nombreSala(p.salaId)}</small>}
                </div>
              </li>
            ))}
            {items.length === 0 && <li role="presentation" className="selector-vacio">{termino ? 'Ningún proyecto coincide con la búsqueda.' : 'No hay proyectos en esta sala.'}</li>}
          </ul>
        )}
        <p role="status" className="sr-only">{abierto ? `${items.length} ${items.length === 1 ? 'proyecto' : 'proyectos'}` : ''}</p>
      </div>
    </div>
  );
}
