// apps/frontend/src/features/card-sorting/useCardSortingStore.ts
//
// Estado normalizado para Card Sorting (ADR Master, patrón de estado
// aislado del schema de persistencia): un mapa tarjetaId -> categoriaId
// permite mover una tarjeta en O(1), en vez de buscar/mutar arrays
// anidados por categoría. toPayload() es la única función responsable
// de convertir al formato exacto que exige CardSortingResultSchema.

import { useState, useCallback } from 'react';

type Tarjeta = { id: string; etiqueta: string; descripcion?: string };
type Categoria = { id: string; nombre: string; esPredefinida: boolean };
type EstadoAsignaciones = Record<string, string | null>; // tarjetaId -> categoriaId | null

export function useCardSortingStore(tarjetasIniciales: Tarjeta[], categoriasIniciales: Categoria[]) {
  const [tarjetas] = useState(tarjetasIniciales);
  const [categorias, setCategorias] = useState(categoriasIniciales);
  const [asignaciones, setAsignaciones] = useState<EstadoAsignaciones>(
    Object.fromEntries(tarjetasIniciales.map((t) => [t.id, null])),
  );

  // O(1): una sola clave del objeto cambia, sin buscar en arrays anidados.
  const moverTarjeta = useCallback((tarjetaId: string, categoriaId: string | null) => {
    setAsignaciones((prev) => ({ ...prev, [tarjetaId]: categoriaId }));
  }, []);

  const crearCategoria = useCallback((nombre: string) => {
    const nueva: Categoria = { id: crypto.randomUUID(), nombre, esPredefinida: false };
    setCategorias((prev) => [...prev, nueva]);
    return nueva.id;
  }, []);

  // Única función de transformación al formato de persistencia — se
  // llama justo antes de cada PATCH. El estado "de trabajo" en memoria
  // nunca es igual al formato que exige el schema Zod.
  const toPayload = useCallback(() => ({
    tipoEstudio: 'HIBRIDO' as const,
    tarjetas,
    categorias,
    asignaciones: Object.entries(asignaciones)
      .filter(([, categoriaId]) => categoriaId !== null)
      .map(([tarjetaId, categoriaId]) => ({ tarjetaId, categoriaId: categoriaId! })),
  }), [tarjetas, categorias, asignaciones]);

  return { tarjetas, categorias, asignaciones, moverTarjeta, crearCategoria, toPayload };
}
