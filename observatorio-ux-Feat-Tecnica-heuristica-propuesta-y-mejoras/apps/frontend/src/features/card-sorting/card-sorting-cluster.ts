// Clustering jerárquico aglomerativo de enlace promedio (UPGMA) sobre la
// matriz de similitud (0–100). Distancia = 100 − similitud. No replica los
// métodos BMM/AAM de Optimal Workshop: es solo enlace promedio.
export interface NodoCluster {
  // Índices de tarjeta que contiene (en el orden de las hojas).
  tarjetas: number[];
  // Distancia a la que se fusionó (0 en las hojas).
  distancia: number;
  // Posición de fusión (1 = primera). 0 en las hojas.
  paso: number;
  izq?: NodoCluster;
  der?: NodoCluster;
}

const EPS = 1e-9;

export function clusterPromedio(similitud: number[][]): NodoCluster | null {
  const n = similitud.length;
  if (n === 0) return null;

  // Distancia simétrica entre tarjetas.
  const d: number[][] = similitud.map((fila, i) =>
    fila.map((_, j) => (i === j ? 0 : 100 - (similitud[i][j] + similitud[j][i]) / 2)),
  );
  const nodos: Array<NodoCluster | null> = similitud.map((_, i) => ({ tarjetas: [i], distancia: 0, paso: 0 }));
  let paso = 0;

  for (let activos = n; activos > 1; activos--) {
    // Par más cercano; empate -> menor i, luego menor j (resultado determinista).
    let mejor = Infinity;
    let a = -1;
    let b = -1;
    for (let i = 0; i < n; i++) {
      if (!nodos[i]) continue;
      for (let j = i + 1; j < n; j++) {
        if (!nodos[j]) continue;
        if (d[i][j] < mejor - EPS) {
          mejor = d[i][j];
          a = i;
          b = j;
        }
      }
    }
    const na = nodos[a]!;
    const nb = nodos[b]!;
    const tamA = na.tarjetas.length;
    const tamB = nb.tarjetas.length;
    // Enlace promedio (Lance–Williams): promedio ponderado por tamaño.
    for (let k = 0; k < n; k++) {
      if (!nodos[k] || k === a || k === b) continue;
      const nuevo = (tamA * d[a][k] + tamB * d[b][k]) / (tamA + tamB);
      d[a][k] = nuevo;
      d[k][a] = nuevo;
    }
    paso++;
    nodos[a] = { tarjetas: [...na.tarjetas, ...nb.tarjetas], distancia: mejor, paso, izq: na, der: nb };
    nodos[b] = null;
  }
  return nodos.find((nodo) => nodo !== null) ?? null;
}

// Fusiones en orden de creación (la más similar primero).
export function fusiones(raiz: NodoCluster | null): NodoCluster[] {
  const lista: NodoCluster[] = [];
  (function recorrer(nodo: NodoCluster | undefined) {
    if (!nodo || !nodo.izq) return;
    recorrer(nodo.izq);
    recorrer(nodo.der);
    lista.push(nodo);
  })(raiz ?? undefined);
  return lista.sort((x, y) => x.paso - y.paso);
}
