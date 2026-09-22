import { useMemo, useState } from 'react';
import type { Card, Category, CardSortingSession } from '../api/card-sorting.api';

interface CardSortingWorkspaceProps {
  session: CardSortingSession;
  participantMode?: boolean;
  onSubmit?: (groups: Array<{ categoriaId?: string; categoriaNombre?: string; cardIds: string[] }>) => void;
  submitting?: boolean;
  submitTitle?: string;
  submitHint?: string;
  submitLabel?: string;
}

type LocalCategory = Category & { local?: boolean };

function getStudy(session: CardSortingSession): CardSortingSession {
  return session.actor === 'PARTICIPANTE' && session.estudio ? session.estudio : session;
}

export function CardSortingWorkspace({
  session,
  participantMode = false,
  onSubmit,
  submitting = false,
  submitTitle = '¿Terminaste de organizar las tarjetas?',
  submitHint,
  submitLabel = 'Enviar clasificación',
}: CardSortingWorkspaceProps) {
  const study = getStudy(session);
  const cards = study.cardsDefinidas;
  const [categories, setCategories] = useState<LocalCategory[]>(study.categoriasDefinidas ?? []);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [categoryError, setCategoryError] = useState('');

<<<<<<< Updated upstream
  const unassignedCards = useMemo(
    () => cards.filter((card) => !assignments[card.id]),
    [cards, assignments],
  );
=======
  const isClosed = study.tipoCardSorting === 'CERRADO';
  const categoriasDefinidas = study.categoriasDefinidas ?? [];
  const cardsDefinidas = study.cardsDefinidas ?? [];
  const categories = useMemo<WorkspaceCategory[]>(
    () =>
      isClosed
        ? categoriasDefinidas.map((category) => ({
            key: `predefined:${category.id}`,
            value: category.id,
            name: category.nombre,
            custom: false,
          }))
        : customCategories.map((name) => ({
            key: `custom:${normalizeCategory(name)}`,
            value: name,
            name,
            custom: true,
          })),
    [customCategories, isClosed, categoriasDefinidas],
  );

  const cardsById = useMemo(
    () => new Map(cardsDefinidas.map((card) => [card.id, card])),
    [cardsDefinidas],
  );
  const unassignedCards = useMemo(
    () => cardsDefinidas.filter((card) => !assignments[card.id]),
    [assignments, cardsDefinidas],
  );
  const allAssigned = cardsDefinidas.length > 0 && unassignedCards.length === 0;
>>>>>>> Stashed changes

  const cardsByCategory = useMemo(() => {
    const map = new Map<string, Card[]>();
    categories.forEach((category) => map.set(category.id, []));
    cards.forEach((card) => {
      const categoryId = assignments[card.id];
      if (categoryId && map.has(categoryId)) map.get(categoryId)!.push(card);
    });
    return map;
  }, [cards, categories, assignments]);

  function moveCard(cardId: string, categoryId: string | null) {
    setAssignments((current) => {
      const next = { ...current };
      if (categoryId) next[cardId] = categoryId;
      else delete next[cardId];
      return next;
    });
    setDraggedCardId(null);
  }

  function addCategory() {
    const name = newCategory.trim();
    if (!name) return;
    if (categories.some((category) => category.nombre.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setCategoryError('Ya existe una categoría con ese nombre.');
      return;
    }
    if (study.tipoCardSorting !== 'ABIERTO') {
      setCategoryError('Este estudio es cerrado y usa categorías predefinidas.');
      return;
    }

    const localCategory: LocalCategory = {
      id: `local-${crypto.randomUUID()}`,
      sessionId: study.id,
      nombre: name,
      esPredefinida: false,
      creadaPorParticipanteId: null,
      createdAt: new Date().toISOString(),
      local: true,
    };
    setCategories((current) => [...current, localCategory]);
    setNewCategory('');
    setCategoryError('');
  }

  function handleSubmit() {
    if (!onSubmit) return;
    if (unassignedCards.length > 0) return;

    const groups = categories
      .map((category) => ({
<<<<<<< Updated upstream
        ...(category.local || category.id.startsWith('local-')
          ? { categoriaNombre: category.nombre }
          : { categoriaId: category.id }),
        cardIds: cardsByCategory.get(category.id)?.map((card) => card.id) ?? [],
=======
        ...(category.custom
          ? { categoriaNombre: category.name }
          : { categoriaId: category.value }),
        cardIds: cardsDefinidas
          .filter((card) => assignments[card.id] === category.value)
          .map((card) => card.id),
>>>>>>> Stashed changes
      }))
      .filter((group) => group.cardIds.length > 0);

    if (groups.length === 0) return;
    onSubmit(groups);
  }

  return (
    <section className="cs-execution">
      <div className="cs-instructions panel">
        <div>
          <span className="kicker">APLICACIÓN DE LA TÉCNICA</span>
          <h1>Card Sorting {study.tipoCardSorting === 'ABIERTO' ? 'abierto' : 'cerrado'}</h1>
          <p>
            {study.tipoCardSorting === 'ABIERTO'
              ? 'Agrupa las tarjetas según la relación que encuentres entre ellas. Puedes crear tus propias categorías.'
              : 'Organiza las tarjetas dentro de las categorías definidas para este estudio.'}
          </p>
        </div>
        <div className="cs-progress">
          <strong>{cards.length - unassignedCards.length}/{cards.length}</strong>
          <span>tarjetas clasificadas</span>
        </div>
      </div>

      <div className="cs-board">
        <article
          className="cs-deck panel"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (draggedCardId) moveCard(draggedCardId, null);
          }}
        >
          <div className="cs-panel-title">
            <div>
              <span className="kicker">TARJETAS</span>
              <h2>Sin clasificar</h2>
            </div>
            <span className="count">{unassignedCards.length}</span>
          </div>

<<<<<<< Updated upstream
          <div className="cs-card-list">
            {unassignedCards.length === 0 ? (
              <div className="cs-empty">Todas las tarjetas están clasificadas.</div>
            ) : (
              unassignedCards.map((card) => (
                <div
                  key={card.id}
                  className={`cs-sort-card${draggedCardId === card.id ? ' dragging' : ''}`}
                  draggable
                  onDragStart={() => setDraggedCardId(card.id)}
                  onDragEnd={() => setDraggedCardId(null)}
                >
                  <span className="cs-grip" aria-hidden="true">⠿</span>
                  <span>{card.etiqueta}</span>
                </div>
              ))
            )}
          </div>
        </article>
=======
        <div className="cs-categories" aria-label="Categorías">
          {categories.map((category) => {
            const cards = cardsDefinidas.filter(
              (card) => assignments[card.id] === category.value,
            );
            return (
              <section
                key={category.key}
                className="cs-zone"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(event, category.value)}
              >
                <header className="cs-zone-head">
                  <h3>{category.name}</h3>
                  <span>{cards.length}</span>
                </header>
                {cards.length > 0 ? (
                  <div className="cs-card-list">{cards.map(renderCard)}</div>
                ) : (
                  <p className="cs-empty">Suelta aquí una tarjeta.</p>
                )}
                {selectedCardId && assignments[selectedCardId] !== category.value && (
                  <button
                    type="button"
                    className="ghost cs-move-button"
                    onClick={() => moveCard(selectedCardId, category.value)}
                  >
                    Mover aquí
                  </button>
                )}
              </section>
            );
          })}
>>>>>>> Stashed changes

        <div className="cs-categories">
          <div className="cs-categories-header">
            <div>
              <span className="kicker">CATEGORÍAS</span>
              <h2>{study.tipoCardSorting === 'ABIERTO' ? 'Crea y organiza tus grupos' : 'Organiza los grupos'}</h2>
            </div>
          </div>

          {categories.map((category) => (
            <article
              key={category.id}
              className="cs-category panel"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (draggedCardId) moveCard(draggedCardId, category.id);
              }}
            >
              <div className="cs-category-title">
                <div>
                  <span className="cs-category-dot" />
                  <strong>{category.nombre}</strong>
                </div>
                <span>{cardsByCategory.get(category.id)?.length ?? 0}</span>
              </div>
              <div className="cs-category-body">
                {(cardsByCategory.get(category.id)?.length ?? 0) === 0 ? (
                  <span className="cs-drop-placeholder">Suelta aquí una tarjeta</span>
                ) : (
                  cardsByCategory.get(category.id)!.map((card) => (
                    <div
                      key={card.id}
                      className="cs-sort-card assigned"
                      draggable
                      onDragStart={() => setDraggedCardId(card.id)}
                      onDragEnd={() => setDraggedCardId(null)}
                    >
                      <span className="cs-grip" aria-hidden="true">⠿</span>
                      <span>{card.etiqueta}</span>
                    </div>
                  ))
                )}
              </div>
            </article>
          ))}

          {study.tipoCardSorting === 'ABIERTO' && (
            <div className="cs-new-category panel">
              <div>
                <strong>Nueva categoría</strong>
                <span>El participante puede definir la estructura que considere adecuada.</span>
              </div>
              <div className="cs-new-category-form">
                <input
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addCategory();
                    }
                  }}
                  placeholder="Ej: Vida universitaria"
                  aria-label="Nombre de nueva categoría"
                />
                <button type="button" className="primary" onClick={addCategory}>+ Crear categoría</button>
              </div>
              {categoryError && <p className="error-text">{categoryError}</p>}
            </div>
          )}
        </div>
      </div>

<<<<<<< Updated upstream
      {participantMode && (
        <div className="cs-submit-bar panel">
          <div>
            <strong>{submitTitle}</strong>
            <span>
              {unassignedCards.length
                ? `Aún faltan ${unassignedCards.length} tarjeta(s) por clasificar.`
                : submitHint ?? 'Ya puedes enviar tu clasificación.'}
            </span>
          </div>
          <button
            type="button"
            className="primary"
            disabled={submitting || unassignedCards.length > 0}
            onClick={handleSubmit}
          >
=======
      <footer className="cs-submit-bar">
        <div>
          <strong>{cardsDefinidas.length - unassignedCards.length} de {cardsDefinidas.length}</strong>
          <span> tarjetas clasificadas</span>
        </div>
        {onSubmit && (
          <button type="button" className="primary" onClick={handleSubmit} disabled={!allAssigned || submitting || disabled}>
>>>>>>> Stashed changes
            {submitting ? 'Enviando…' : submitLabel}
          </button>
        </div>
      )}
    </section>
  );
}
