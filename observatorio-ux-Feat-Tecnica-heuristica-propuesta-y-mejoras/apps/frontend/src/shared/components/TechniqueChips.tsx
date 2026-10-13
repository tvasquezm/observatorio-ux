interface Props {
  items: string[];
  tono: string;
  vacio?: string;
}

export function TechniqueChips({ items, tono, vacio = 'Sin información registrada.' }: Props) {
  if (items.length === 0) {
    return (
      <>
        <span className="tv-empty" aria-hidden="true">—</span>
        <span className="sr-only">{vacio}</span>
      </>
    );
  }
  return (
    <ul className="tv-chips" style={{ ['--tv-tone' as string]: tono }}>
      {items.map((item, index) => <li key={index} className="tv-chip">{item}</li>)}
    </ul>
  );
}
