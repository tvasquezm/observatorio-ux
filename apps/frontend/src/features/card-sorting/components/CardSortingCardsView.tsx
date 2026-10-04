import { useEffect, useRef, useState } from 'react';
import type { CardSortingAnalytics } from '../api/card-sorting.api';
import {
  filasTarjetas,
  filtrarTarjetas,
  resumenTarjetas,
  type FilaTarjeta,
  type OrdenTarjetas,
} from '../card-sorting-views';

const ESTADOS = {
  consenso: 'Consenso',
  'sin-consenso': 'Sin consenso',
  'sin-datos': 'Sin asignaciones',
} as const;

interface Props {
  data: CardSortingAnalytics;
  foco?: string;
  onCategoria: (nombre: string) => void;
}

function Fila({ fila, enfocada, onCategoria }: { fila: FilaTarjeta; enfocada: boolean; onCategoria: (nombre: string) => void }) {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (enfocada) ref.current?.scrollIntoView?.({ block: 'center' });
  }, [enfocada]);
  const descripcion = fila.segmentos.map((segmento) => `${segmento.nombre} ${segmento.pct}%`).join(', ');
  return (
    <li
      ref={ref}
      className={`cs-card-row ${fila.estado}${enfocada ? ' focus' : ''}`}
      data-testid={`cs-card-row-${fila.tarjeta}`}
      aria-current={enfocada ? 'true' : undefined}
    >
      <div className="cs-card-row-head">
        <strong>{fila.tarjeta}</strong>
        <span className={`cs-badge ${fila.estado}`}>
          {ESTADOS[fila.estado]}{fila.lider && fila.estado !== 'sin-datos' ? ` · ${fila.lider.pct}%` : ''}
        </span>
      </div>
      {fila.segmentos.length > 0 ? (
        <>
          <div className="cs-stack" role="img" aria-label={`${fila.tarjeta}: ${descripcion}`}>
            {fila.segmentos.map((segmento) => (
              <i key={segmento.nombre} className={`seg c${segmento.color}`} style={{ width: `${segmento.pct}%` }} />
            ))}
          </div>
          <ul className="cs-legend">
            {fila.segmentos.map((segmento) => (
              <li key={segmento.nombre}>
                <i className={`dot c${segmento.color}`} aria-hidden="true" />
                <button type="button" className="cs-link" onClick={() => onCategoria(segmento.nombre)}>
                  {segmento.nombre}
                </button>{' '}
                <b>{segmento.pct}%</b> <small>({segmento.frecuencia})</small>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-muted-sm">Nadie ubicó esta tarjeta todavía.</p>
      )}
    </li>
  );
}

export function CardSortingCardsView({ data, foco, onCategoria }: Props) {
  const [texto, setTexto] = useState('');
  const [orden, setOrden] = useState<OrdenTarjetas>('estudio');
  const [soloSin, setSoloSin] = useState(false);
  const filas = filasTarjetas(data);
  const resumen = resumenTarjetas(filas);
  const visibles = filtrarTarjetas(filas, { texto, orden, soloSinConsenso: soloSin });

  return (
    <div className="cs-cards-view">
      <p className="cs-summary" data-testid="cs-cards-summary">
        <b>{resumen.consenso}</b> con consenso · <b>{resumen.sinConsenso}</b> sin consenso
        {resumen.sinDatos > 0 && <> · <b>{resumen.sinDatos}</b> sin asignaciones</>}
      </p>
      <div className="cs-toolbar">
        <input
          type="search"
          aria-label="Buscar tarjeta"
          placeholder="Buscar tarjeta"
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
        />
        <select aria-label="Ordenar tarjetas" value={orden} onChange={(event) => setOrden(event.target.value as OrdenTarjetas)}>
          <option value="estudio">Orden del estudio</option>
          <option value="menor">Menor consenso primero</option>
          <option value="mayor">Mayor consenso primero</option>
          <option value="nombre">Nombre (A–Z)</option>
        </select>
        <label className="cs-check">
          <input type="checkbox" checked={soloSin} onChange={(event) => setSoloSin(event.target.checked)} />
          Solo sin consenso
        </label>
      </div>
      {visibles.length === 0 ? (
        <p className="text-muted-sm">Ninguna tarjeta coincide con el filtro.</p>
      ) : (
        <ul className="cs-card-rows" aria-label="Tarjetas">
          {visibles.map((fila) => (
            <Fila key={fila.tarjeta} fila={fila} enfocada={foco === fila.tarjeta} onCategoria={onCategoria} />
          ))}
        </ul>
      )}
    </div>
  );
}
