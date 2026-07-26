// apps/frontend/src/components/CardSorting/useCardSortingStore.ts
import { useState, useCallback } from 'react';

export type AsignacionesMap = Record<string, string>; // { [tarjetaId]: categoriaId }

export const useCardSortingStore = (asignacionesIniciales: AsignacionesMap = {}) => {
  // Estado Normalizado: Búsqueda y actualización inmediata sin recorrer arrays
  const [asignaciones, setAsignaciones] = useState<AsignacionesMap>(asignacionesIniciales);

  // Mover tarjeta es una mutación O(1) limpia
  const moverTarjeta = useCallback((tarjetaId: string, nuevaCategoriaId: string) => {
    setAsignaciones((prev) => ({
      ...prev,
      [tarjetaId]: nuevaCategoriaId,
    }));
  }, []);

  // Desasignar tarjeta (devolver al pozo inicial)
  const desasignarTarjeta = useCallback((tarjetaId: string) => {
    setAsignaciones((prev) => {
      const copia = { ...prev };
      delete copia[tarjetaId];
      return copia;
    });
  }, []);

  return {
    asignaciones,
    moverTarjeta,
    desasignarTarjeta,
  };
};
