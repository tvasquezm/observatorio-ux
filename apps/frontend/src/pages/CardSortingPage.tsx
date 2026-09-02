// apps/frontend/src/pages/CardSortingPage.tsx
//
// Vista de EVALUADOR: crea el estudio maestro (tarjetas + categorías
// opcionales) y muestra el resultado. El flujo de PARTICIPANTE (join +
// submit) queda fuera de esta página — vive en shared/api/api-client.ts
// con otro token, y necesitaría su propia ruta pública sin JwtAuthGuard.

import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import { useCreateCardSortingSession } from '../features/card-sorting/hooks/useCardSortingQueries';
import type { TipoCardSorting } from '../features/card-sorting/api/card-sorting.api';

export function CardSortingPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const { mutate: crear, data: sesion, isPending, error } = useCreateCardSortingSession();
  const [tipo, setTipo] = useState<TipoCardSorting>('ABIERTO');
  const [tarjetasTexto, setTarjetasTexto] = useState('');
  const [categoriasTexto, setCategoriasTexto] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tarjetas = tarjetasTexto.split('\n').map((s) => s.trim()).filter(Boolean);
    if (tarjetas.length === 0) return;
    const categorias = categoriasTexto.split('\n').map((s) => s.trim()).filter(Boolean);
    crear({
      proyectoId,
      tipo,
      tarjetas,
      categorias: tipo === 'CERRADO' && categorias.length > 0 ? categorias : undefined,
    });
  }

  return (
    <div className="panel">
      <h2>Card Sorting</h2>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8, maxWidth: 480 }}>
        <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCardSorting)} style={{ padding: 8 }}>
          <option value="ABIERTO">Abierto (el participante crea sus categorías)</option>
          <option value="CERRADO">Cerrado (categorías predefinidas)</option>
        </select>

        <textarea
          placeholder="Tarjetas, una por línea *"
          value={tarjetasTexto}
          onChange={(e) => setTarjetasTexto(e.target.value)}
          required
          style={{ padding: 8, minHeight: 100 }}
        />

        {tipo === 'CERRADO' && (
          <textarea
            placeholder="Categorías predefinidas, una por línea"
            value={categoriasTexto}
            onChange={(e) => setCategoriasTexto(e.target.value)}
            style={{ padding: 8, minHeight: 80 }}
          />
        )}

        <button type="submit" className="primary" disabled={isPending}>
          {isPending ? 'Creando estudio…' : 'Crear estudio de Card Sorting'}
        </button>
      </form>

      {error && <p style={{ color: 'var(--coral)' }}>{(error as Error).message}</p>}

      {sesion && (
        <div style={{ marginTop: 20, padding: 12, border: '1px solid var(--line)', borderRadius: 8 }}>
          <b>Estudio creado</b>
          <p style={{ margin: '6px 0' }}>ID de sesión (compartir con participantes): <code>{sesion.id}</code></p>
          <p style={{ margin: 0 }}>{sesion.cardsDefinidas.length} tarjetas · {sesion.categoriasDefinidas.length} categorías predefinidas</p>
        </div>
      )}
    </div>
  );
}
