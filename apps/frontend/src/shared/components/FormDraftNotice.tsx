export function FormDraftNotice({ draft }: { draft: { restored: boolean; error: string; discard: () => void } }) {
  return <>{draft.restored && <p role="status">Recuperamos tu borrador. <button type="button" className="secondary" onClick={draft.discard}>Descartar</button></p>}{draft.error && <p role="alert">{draft.error}</p>}</>;
}
