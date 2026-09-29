import { useId, useMemo, useRef, useState, type DragEvent } from 'react';

export interface CardSortingWorkspaceStudy {
  nombre: string;
  tipoCardSorting: 'ABIERTO' | 'CERRADO' | null;
  cardsDefinidas: Array<{ id: string; etiqueta: string }>;
  categoriasDefinidas: Array<{ id: string; nombre: string }>;
}

export interface CardSortingWorkspaceProps {
  study: CardSortingWorkspaceStudy;
  assignments: Record<string, string>;
  customCategories: string[];
  onAssignmentsChange: (assignments: Record<string, string>) => void;
  onCustomCategoriesChange: (categories: string[]) => void;
  disabled?: boolean;
  onSubmit?: (groups: Array<{ categoriaId?: string; categoriaNombre?: string; cardIds: string[] }>) => void;
  submitting?: boolean;
  submitLabel?: string;
  preview?: boolean;
}

interface WorkspaceCategory {
  key: string;
  value: string;
  name: string;
  custom: boolean;
}

function normalizeCategory(name: string) {
  return name.trim().toLocaleLowerCase('es-CL');
}

export function CardSortingWorkspace({
  study,
  assignments,
  customCategories,
  onAssignmentsChange,
  onCustomCategoriesChange,
  disabled = false,
  onSubmit,
  submitting = false,
  submitLabel = 'Enviar clasificación',
  preview = false,
}: CardSortingWorkspaceProps) {
  const newCategoryId = useId();
  const newCategoryInputRef = useRef<HTMLInputElement>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [announcement, setAnnouncement] = useState('');

  const isClosed = study.tipoCardSorting === 'CERRADO';
  const categories = useMemo<WorkspaceCategory[]>(
    () =>
      isClosed
        ? study.categoriasDefinidas.map((category) => ({
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
    [customCategories, isClosed, study.categoriasDefinidas],
  );

  const cardsById = useMemo(
    () => new Map(study.cardsDefinidas.map((card) => [card.id, card])),
    [study.cardsDefinidas],
  );
  const unassignedCards = useMemo(
    () => study.cardsDefinidas.filter((card) => !assignments[card.id]),
    [assignments, study.cardsDefinidas],
  );
  const allAssigned = study.cardsDefinidas.length > 0 && unassignedCards.length === 0;

  function moveCard(cardId: string, categoryValue: string | null) {
    if (disabled || !cardsById.has(cardId)) return;
    const next = { ...assignments };
    if (categoryValue) next[cardId] = categoryValue;
    else delete next[cardId];
    onAssignmentsChange(next);
    setSelectedCardId(null);
    setDraggedCardId(null);
    const cardName = cardsById.get(cardId)?.etiqueta ?? 'Tarjeta';
    const targetName = categories.find((category) => category.value === categoryValue)?.name;
    setAnnouncement(
      categoryValue ? `${cardName} se movió a ${targetName}.` : `${cardName} volvió al mazo.`,
    );
  }

  function readDraggedCard(event: DragEvent) {
    return event.dataTransfer.getData('text/plain') || draggedCardId;
  }

  function handleDrop(event: DragEvent, categoryValue: string | null) {
    event.preventDefault();
    const cardId = readDraggedCard(event);
    if (cardId) moveCard(cardId, categoryValue);
  }

  function handleDropOnNewCategory(event: DragEvent) {
    event.preventDefault();
    const cardId = readDraggedCard(event);
    if (cardId) setSelectedCardId(cardId);
    requestAnimationFrame(() => newCategoryInputRef.current?.focus());
  }

  function addCategory() {
    const name = newCategory.trim();
    if (!name) {
      setCategoryError('Escribe un nombre para la categoría.');
      return;
    }
    if (customCategories.some((category) => normalizeCategory(category) === normalizeCategory(name))) {
      setCategoryError('Ya existe una categoría con ese nombre.');
      return;
    }
    const nextCategories = [...customCategories, name];
    onCustomCategoriesChange(nextCategories);
    setNewCategory('');
    setCategoryError('');
    if (selectedCardId) {
      const next = { ...assignments, [selectedCardId]: name };
      onAssignmentsChange(next);
      setAnnouncement(`${cardsById.get(selectedCardId)?.etiqueta ?? 'Tarjeta'} se movió a ${name}.`);
      setSelectedCardId(null);
    } else {
      setAnnouncement(`Categoría ${name} creada.`);
    }
  }

  function handleSubmit() {
    if (!onSubmit || !allAssigned) return;
    const groups = categories
      .map((category) => ({
        ...(category.custom
          ? { categoriaNombre: category.name }
          : { categoriaId: category.value }),
        cardIds: study.cardsDefinidas
          .filter((card) => assignments[card.id] === category.value)
          .map((card) => card.id),
      }))
      .filter((group) => group.cardIds.length > 0);
    onSubmit(groups);
  }

  function renderCard(card: { id: string; etiqueta: string }) {
    const selected = selectedCardId === card.id;
    return (
      <button
        key={card.id}
        type="button"
        className={`cs-sort-card${selected ? ' selected' : ''}${draggedCardId === card.id ? ' dragging' : ''}`}
        draggable={!disabled}
        disabled={disabled}
        aria-pressed={selected}
        onClick={() => setSelectedCardId(selected ? null : card.id)}
        onDragStart={(event) => {
          event.dataTransfer.setData('text/plain', card.id);
          setDraggedCardId(card.id);
        }}
        onDragEnd={() => setDraggedCardId(null)}
      >
        <span className="cs-grip" aria-hidden="true">⠿</span>
        <span>{card.etiqueta}</span>
      </button>
    );
  }

  return (
    <section className="cs-workspace" aria-label={`Clasificación de tarjetas: ${study.nombre}`}>
      <p className="cs-workspace-instructions">
        Arrastra una tarjeta o selecciónala y luego usa “Mover aquí”.
        {preview && ' Esta práctica es local y no se incluye en los resultados.'}
      </p>
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>

      <div className="cs-workspace-grid">
        <section
          className="cs-zone cs-deck"
          aria-labelledby="cs-deck-title"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => handleDrop(event, null)}
        >
          <header className="cs-zone-head">
            <h3 id="cs-deck-title">Mazo</h3>
            <span>{unassignedCards.length}</span>
          </header>
          {unassignedCards.length > 0 ? (
            <div className="cs-card-list">{unassignedCards.map(renderCard)}</div>
          ) : (
            <p className="cs-empty">Todas las tarjetas están clasificadas.</p>
          )}
          {selectedCardId && assignments[selectedCardId] && (
            <button type="button" className="ghost cs-move-button" onClick={() => moveCard(selectedCardId, null)}>
              Devolver selección al mazo
            </button>
          )}
        </section>

        <div className="cs-categories" aria-label="Categorías">
          {categories.map((category) => {
            const cards = study.cardsDefinidas.filter(
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

          {!isClosed && (
            <section
              className="cs-zone cs-new-category"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDropOnNewCategory}
            >
              <h3>Nueva categoría</h3>
              <label htmlFor={newCategoryId}>Nombre</label>
              <div className="cs-new-category-row">
                <input
                  ref={newCategoryInputRef}
                  id={newCategoryId}
                  type="text"
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addCategory();
                    }
                  }}
                  disabled={disabled}
                />
                <button type="button" className="secondary" onClick={addCategory} disabled={disabled}>
                  Crear
                </button>
              </div>
              {selectedCardId && <p className="cs-selected-hint">La tarjeta seleccionada se moverá a la categoría nueva.</p>}
              {categoryError && <p role="alert" className="error-text">{categoryError}</p>}
            </section>
          )}
        </div>
      </div>

      <footer className="cs-submit-bar">
        <div>
          <strong>{study.cardsDefinidas.length - unassignedCards.length} de {study.cardsDefinidas.length}</strong>
          <span> tarjetas clasificadas</span>
        </div>
        {onSubmit && (
          <button type="button" className="primary" onClick={handleSubmit} disabled={!allAssigned || submitting || disabled}>
            {submitting ? 'Enviando…' : submitLabel}
          </button>
        )}
      </footer>
    </section>
  );
}
