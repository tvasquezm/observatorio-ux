import { useMemo } from 'react';
import { clusterPromedio, fusiones, type NodoCluster } from '../card-sorting-cluster';

const FILA = 20;
const ETIQUETA_W = 190;
const GRAFICO_W = 420;
const MARGEN = 16;
const EJE_H = 34;
const MAX_ETIQUETA = 28;
const MARCAS = [100, 75, 50, 25, 0];

function recortar(texto: string) {
  return texto.length > MAX_ETIQUETA ? `${texto.slice(0, MAX_ETIQUETA - 1)}…` : texto;
}

function resumen(nombres: string[]) {
  return nombres.length > 3 ? `${nombres.slice(0, 3).join(', ')} y ${nombres.length - 3} más` : nombres.join(', ');
}

// Similitud (0–100) -> posición horizontal. 100% = hojas, 0% = borde derecho.
function posX(distancia: number) {
  return ETIQUETA_W + (distancia / 100) * GRAFICO_W;
}

export function CardSortingDendrogram({ tarjetas, similitud }: { tarjetas: string[]; similitud: number[][] }) {
  const raiz = useMemo(() => clusterPromedio(similitud), [similitud]);
  const lista = useMemo(() => fusiones(raiz), [raiz]);

  if (!raiz || tarjetas.length < 2) {
    return <p className="text-muted-sm">Se necesitan al menos 2 tarjetas para armar el dendrograma.</p>;
  }

  const orden = raiz.tarjetas;
  const yHoja = new Map(orden.map((indice, posicion) => [indice, MARGEN / 2 + posicion * FILA + FILA / 2]));
  const alto = MARGEN / 2 + orden.length * FILA + EJE_H;
  const ancho = ETIQUETA_W + GRAFICO_W + MARGEN;
  const trazos: string[] = [];

  function colocar(nodo: NodoCluster): { x: number; y: number } {
    if (!nodo.izq || !nodo.der) return { x: posX(0), y: yHoja.get(nodo.tarjetas[0]) ?? 0 };
    const izq = colocar(nodo.izq);
    const der = colocar(nodo.der);
    const x = posX(nodo.distancia);
    trazos.push(`M${izq.x} ${izq.y}H${x}V${der.y}H${der.x}`);
    return { x, y: (izq.y + der.y) / 2 };
  }
  colocar(raiz);

  const yEje = alto - EJE_H + 6;
  const nombres = (indices: number[]) => indices.map((indice) => tarjetas[indice]);

  return (
    <div className="cs-dendrogram">
      <p className="text-muted-sm">
        Agrupamiento jerárquico por enlace promedio sobre la similitud entre tarjetas. Cuanto más a la izquierda se
        unen dos grupos, más veces los participantes los agruparon juntos.
      </p>
      <div className="cs-table-wrap">
        <svg
          role="img"
          aria-label={`Dendrograma de ${tarjetas.length} tarjetas, enlace promedio`}
          viewBox={`0 0 ${ancho} ${alto}`}
          width={ancho}
          height={alto}
        >
          {orden.map((indice) => (
            <text key={indice} x={ETIQUETA_W - 8} y={(yHoja.get(indice) ?? 0) + 4} textAnchor="end" className="cs-dendro-label">
              <title>{tarjetas[indice]}</title>
              {recortar(tarjetas[indice])}
            </text>
          ))}
          {trazos.map((d) => <path key={d} d={d} className="cs-dendro-line" fill="none" />)}
          <line x1={ETIQUETA_W} x2={ETIQUETA_W + GRAFICO_W} y1={yEje} y2={yEje} className="cs-dendro-axis" />
          {MARCAS.map((marca) => (
            <g key={marca}>
              <line x1={posX(100 - marca)} x2={posX(100 - marca)} y1={yEje} y2={yEje + 4} className="cs-dendro-axis" />
              <text x={posX(100 - marca)} y={yEje + 17} textAnchor="middle" className="cs-dendro-tick">{marca}%</text>
            </g>
          ))}
        </svg>
      </div>
      <p className="text-muted-sm">Eje: similitud al unirse los grupos.</p>

      <details className="cs-dendro-merges">
        <summary>Ver las {lista.length} uniones en texto</summary>
        <ol>
          {lista.map((nodo) => (
            <li key={nodo.paso}>
              {resumen(nombres(nodo.izq!.tarjetas))} + {resumen(nombres(nodo.der!.tarjetas))} — similitud {Math.round(100 - nodo.distancia)}%
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
