// Proyectos de una sala en una tabla compacta (una línea por proyecto), pensada para salas con
// muchos: orden por columna, fila clicable, indicadores de avance y «Mostrar más».
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ProyectoEnSala } from '../api/salas.api';

type Columna = 'nombre' | 'integrantes' | 'sesiones' | 'artefactos' | 'actividad';
type Sentido = 'asc' | 'desc';
const POR_PAGINA = 25;

const valor = (p: ProyectoEnSala, c: Columna): string | number | null => {
  switch (c) {
    case 'nombre': return p.nombre.toLocaleLowerCase('es');
    case 'integrantes': return p._count?.miembros ?? 0;
    case 'sesiones': return p._count?.sesiones ?? 0;
    case 'artefactos': return p._count?.artefactos ?? 0;
    default: return p.ultimaActividad ?? null;
  }
};
/** Compara con los vacíos (sin actividad) siempre al final, sea cual sea el sentido. */
function ordenar(lista: ProyectoEnSala[], columna: Columna, sentido: Sentido): ProyectoEnSala[] {
  const signo = sentido === 'asc' ? 1 : -1;
  return [...lista].sort((a, b) => {
    const x = valor(a, columna), y = valor(b, columna);
    if (x === null && y === null) return a.nombre.localeCompare(b.nombre, 'es');
    if (x === null) return 1;
    if (y === null) return -1;
    const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es');
    return r * signo || a.nombre.localeCompare(b.nombre, 'es');
  });
}
const fecha = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString('es-CL', { timeZone: 'America/Santiago', day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin actividad';

const COLUMNAS: Array<{ id: Columna; titulo: string; numerica?: boolean }> = [
  { id: 'nombre', titulo: 'Proyecto' },
  { id: 'integrantes', titulo: 'Integrantes', numerica: true },
  { id: 'sesiones', titulo: 'Sesiones', numerica: true },
  { id: 'artefactos', titulo: 'Artefactos', numerica: true },
  { id: 'actividad', titulo: 'Última actividad' },
];

export function TablaProyectosSala({ proyectos }: { proyectos: ProyectoEnSala[] }) {
  const [columna, setColumna] = useState<Columna>('actividad');
  const [sentido, setSentido] = useState<Sentido>('desc');
  const [mostrados, setMostrados] = useState(POR_PAGINA);
  const navigate = useNavigate();
  const ordenados = ordenar(proyectos, columna, sentido);
  const visibles = ordenados.slice(0, mostrados);

  function ordenarPor(c: Columna) {
    if (c === columna) setSentido(s => (s === 'asc' ? 'desc' : 'asc'));
    else { setColumna(c); setSentido(c === 'nombre' ? 'asc' : 'desc'); }
  }

  return (
    <div className="tabla-proyectos-sala">
      <div className="tabla-proyectos-scroll">
        <table>
          <caption className="sr-only">Proyectos de la sala, ordenados por {COLUMNAS.find(c => c.id === columna)?.titulo.toLowerCase()} de forma {sentido === 'asc' ? 'ascendente' : 'descendente'}</caption>
          <thead>
            <tr>
              {COLUMNAS.map(c => (
                <th key={c.id} scope="col" className={c.numerica ? 'numerica' : undefined} aria-sort={c.id === columna ? (sentido === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => ordenarPor(c.id)}>
                    {c.titulo}{' '}<span aria-hidden="true">{c.id === columna ? (sentido === 'asc' ? '▲' : '▼') : ''}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map(p => (
              <tr key={p.id} onClick={e => { if (!(e.target as HTMLElement).closest('a')) navigate(`/proyectos/${p.id}`); }}>
                <th scope="row">
                  <Link to={`/proyectos/${p.id}`}>{p.nombre}</Link>
                  {p.descripcion && <small>{p.descripcion}</small>}
                </th>
                <td className="numerica">{p._count?.miembros ?? 0}</td>
                <td className="numerica">{p._count?.sesiones ?? 0}</td>
                <td className="numerica">{p._count?.artefactos ?? 0}</td>
                <td className={p.ultimaActividad ? undefined : 'sin-actividad'}>{fecha(p.ultimaActividad)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ordenados.length > mostrados && (
        <div className="tabla-proyectos-pie">
          <span className="text-muted-sm">Mostrando {visibles.length} de {ordenados.length}</span>
          <button type="button" className="secondary" onClick={() => setMostrados(m => m + POR_PAGINA)}>Mostrar {Math.min(POR_PAGINA, ordenados.length - mostrados)} más</button>
        </div>
      )}
    </div>
  );
}
