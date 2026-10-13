import { useEffect, useRef, useState } from 'react';
import type { CardSortingAnalytics } from '../api/card-sorting.api';
import { fichasCategorias, filtrarCategorias, type CartaEnCategoria, type FichaCategoria } from '../card-sorting-views';

interface Props {
  data: CardSortingAnalytics;
  foco?: string;
  onTarjeta: (tarjeta: string) => void;
}

function Cartas({ cartas, color, onTarjeta }: { cartas: CartaEnCategoria[]; color: number; onTarjeta: (tarjeta: string) => void }) {
  return (
    <ul className="cs-cat-cards">
      {cartas.map((carta) => (
        <li key={carta.tarjeta} className={carta.bajoAcuerdo ? 'weak' : ''}>
          <button type="button" className="cs-link" onClick={() => onTarjeta(carta.tarjeta)}>{carta.tarjeta}</button>
          <span className="cs-mini" role="img" aria-label={`${carta.pct}% de los participantes`}>
            <i className={`seg c${color}`} style={{ width: `${carta.pct}%` }} />
          </span>
          <b>{carta.pct}%</b> <small>({carta.frecuencia})</small>
          {carta.bajoAcuerdo && <span className="sr-only"> · bajo acuerdo</span>}
        </li>
      ))}
    </ul>
  );
}

function Ficha({ ficha, enfocada, onTarjeta }: { ficha: FichaCategoria; enfocada: boolean; onTarjeta: (tarjeta: string) => void }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (enfocada) ref.current?.scrollIntoView?.({ block: 'center' });
  }, [enfocada]);
  return (
    <article
      ref={ref}
      className={`cs-cat-card${enfocada ? ' focus' : ''}`}
      data-testid={`cs-cat-${ficha.nombre}`}
      aria-current={enfocada ? 'true' : undefined}
    >
      <header>
        <h4><i className={`dot c${ficha.color}`} aria-hidden="true" /> {ficha.nombre}</h4>
        <span className="cs-cat-meta">
          {ficha.cardsCount} {ficha.cardsCount === 1 ? 'tarjeta' : 'tarjetas'}
          {ficha.usoPct !== null && ` · usada por ${ficha.usoPct}%`}
        </span>
      </header>
      <Cartas cartas={ficha.cartas} color={ficha.color} onTarjeta={onTarjeta} />
      {ficha.subcategorias.length > 0 && (
        <details className="cs-subcats">
          <summary>Ver {ficha.subcategorias.length} {ficha.subcategorias.length === 1 ? 'subcategoría' : 'subcategorías'}</summary>
          {ficha.subcategorias.map((sub) => (
            <div key={sub.nombre}>
              <h5>{sub.nombre}</h5>
              <Cartas cartas={sub.cartas} color={ficha.color} onTarjeta={onTarjeta} />
            </div>
          ))}
        </details>
      )}
    </article>
  );
}

export function CardSortingCategoriesView({ data, foco, onTarjeta }: Props) {
  const [texto, setTexto] = useState('');
  const fichas = fichasCategorias(data);
  const visibles = filtrarCategorias(fichas, texto);
  const conConsenso = fichas.filter((ficha) => ficha.conConsenso).length;

  return (
    <div className="cs-categories-view">
      <p className="cs-summary" data-testid="cs-categories-summary">
        <b>{fichas.length}</b> {fichas.length === 1 ? 'categoría' : 'categorías'} · <b>{conConsenso}</b> con tarjetas de consenso
      </p>
      <div className="cs-toolbar">
        <input
          type="search"
          aria-label="Buscar categoría o tarjeta"
          placeholder="Buscar categoría o tarjeta"
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
        />
      </div>
      {visibles.length === 0 ? (
        <p className="text-muted-sm">Ninguna categoría coincide con la búsqueda.</p>
      ) : (
        <div className="cs-cat-grid">
          {visibles.map((ficha) => (
            <Ficha key={ficha.nombre} ficha={ficha} enfocada={foco === ficha.nombre} onTarjeta={onTarjeta} />
          ))}
        </div>
      )}
    </div>
  );
}
