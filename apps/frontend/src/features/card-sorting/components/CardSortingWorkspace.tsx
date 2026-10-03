import { useEffect, useId, useMemo, useRef, useState, type DragEvent } from 'react';

const COARSE_POINTER_QUERY = '(pointer: coarse)';

/** true en pantallas táctiles, donde arrastrar no es la vía principal. */
function useCoarsePointer(): boolean {
  const supported = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  const [coarse, setCoarse] = useState(() => supported && window.matchMedia(COARSE_POINTER_QUERY).matches);
  useEffect(() => {
    if (!supported) return;
    const query = window.matchMedia(COARSE_POINTER_QUERY);
    const onChange = (event: MediaQueryListEvent) => setCoarse(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [supported]);
  return coarse;
}

export interface CardSortingWorkspaceStudy {
  nombre: string;
  tipoCardSorting: 'ABIERTO' | 'CERRADO' | 'HIBRIDO' | null;
  cardsDefinidas: Array<{ id: string; etiqueta: string }>;
  categoriasDefinidas: Array<{ id: string; nombre: string }>;
  preguntas?: Array<{ id: string; texto: string }>;
}

export interface CardSortingWorkspaceProps {
  study: CardSortingWorkspaceStudy;
  assignments: Record<string, string>;
  customCategories: string[];
  onAssignmentsChange: (assignments: Record<string, string>) => void;
  onCustomCategoriesChange: (categories: string[]) => void;
  // Subcategorías (2 niveles; solo ABIERTO/HIBRIDO): nombre de la categoría
  // propia -> nombre de su categoría padre. El selector "Dentro de" solo se
  // muestra si se pasa `onPadresChange` (no en la vista previa del evaluador).
  padres?: Record<string, string>;
  onPadresChange?: (padres: Record<string, string>) => void;
  // Respuestas a las preguntas del evaluador (questionId -> texto). Solo se
  // muestran si se pasa `onAnswersChange` (no en la vista previa del evaluador).
  answers?: Record<string, string>;
  onAnswersChange?: (answers: Record<string, string>) => void;
  disabled?: boolean;
  onSubmit?: (
    groups: Array<{
      categoriaId?: string;
      categoriaNombre?: string;
      categoriaPadre?: string;
      cardIds: string[];
    }>,
  ) => void;
  submitting?: boolean;
  submitLabel?: string;
  preview?: boolean;
}

interface WorkspaceCategory {
  key: string;
  value: string;
  name: string;
  custom: boolean;
  // Nombre de la categoría de nivel 1 que la contiene (solo propias).
  parent?: string;
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
  padres = {},
  onPadresChange,
  answers = {},
  onAnswersChange,
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
  const [newParent, setNewParent] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const coarsePointer = useCoarsePointer();

  const isClosed = study.tipoCardSorting === 'CERRADO';
  const isHybrid = study.tipoCardSorting === 'HIBRIDO';
  const categories = useMemo<WorkspaceCategory[]>(() => {
    const predefined = study.categoriasDefinidas.map((category) => ({
      key: `predefined:${category.id}`,
      value: category.id,
      name: category.nombre,
      custom: false,
    }));
    // Solo vale un padre que exista, sea propio y sea de nivel 1 (máx. 2 niveles).
    const level1Custom = new Set(
      customCategories.filter((name) => !padres[name] || !customCategories.includes(padres[name])),
    );
    const custom = customCategories.map((name) => ({
      key: `custom:${normalizeCategory(name)}`,
      value: name,
      name,
      custom: true,
      parent:
        !level1Custom.has(name) && level1Custom.has(padres[name]) ? padres[name] : undefined,
    }));
    if (isClosed) return predefined;
    return isHybrid ? [...predefined, ...custom] : custom;
  }, [customCategories, isClosed, isHybrid, padres, study.categoriasDefinidas]);
  const topLevel = categories.filter((category) => !category.parent);
  const parentOptions = categories.filter((category) => category.custom && !category.parent);

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
    const taken = [...customCategories, ...(isHybrid ? study.categoriasDefinidas.map((category) => category.nombre) : [])];
    if (taken.some((category) => normalizeCategory(category) === normalizeCategory(name))) {
      setCategoryError('Ya existe una categoría con ese nombre.');
      return;
    }
    const nextCategories = [...customCategories, name];
    onCustomCategoriesChange(nextCategories);
    if (onPadresChange && newParent && parentOptions.some((option) => option.name === newParent)) {
      onPadresChange({ ...padres, [name]: newParent });
    }
    setNewCategory('');
    setNewParent('');
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
          ? {
              categoriaNombre: category.name,
              ...(category.parent ? { categoriaPadre: category.parent } : {}),
            }
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

  function renderZone(category: WorkspaceCategory) {
    const cards = study.cardsDefinidas.filter((card) => assignments[card.id] === category.value);
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
          <p className="cs-empty">{coarsePointer ? 'Selecciona una tarjeta para moverla aquí.' : 'Suelta aquí una tarjeta.'}</p>
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
  }

  return (
    <section className="cs-workspace" aria-label={`Clasificación de tarjetas: ${study.nombre}`}>
      <p className="cs-workspace-instructions">
        {coarsePointer ? 'Selecciona una tarjeta y luego usa “Mover aquí”.' : 'Arrastra una tarjeta o selecciónala y luego usa “Mover aquí”.'}{' '}
        {isClosed
          ? 'Usa las categorías que se muestran.'
          : isHybrid
            ? 'Usa las categorías que se muestran o crea las tuyas con el panel “Nueva categoría”.'
            : 'Puedes crear tus propias categorías con el panel “Nueva categoría”.'}
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
          {topLevel.map((category) => (
            <div key={category.key} className="cs-category-group">
              {renderZone(category)}
              {categories.some((child) => child.parent === category.name) && (
                <div className="cs-subcategories" aria-label={`Subcategorías de ${category.name}`}>
                  {categories.filter((child) => child.parent === category.name).map(renderZone)}
                </div>
              )}
            </div>
          ))}

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
              {onPadresChange && parentOptions.length > 0 && (
                <>
                  <label htmlFor={`${newCategoryId}-parent`}>Dentro de (opcional)</label>
                  <select
                    id={`${newCategoryId}-parent`}
                    value={newParent}
                    onChange={(event) => setNewParent(event.target.value)}
                    disabled={disabled}
                  >
                    <option value="">Ninguna: categoría principal</option>
                    {parentOptions.map((option) => (
                      <option key={option.key} value={option.name}>{option.name}</option>
                    ))}
                  </select>
                </>
              )}
              {selectedCardId && <p className="cs-selected-hint">La tarjeta seleccionada se moverá a la categoría nueva.</p>}
              {categoryError && <p role="alert" className="error-text">{categoryError}</p>}
            </section>
          )}
        </div>
      </div>

      {onAnswersChange && (study.preguntas?.length ?? 0) > 0 && (
        <section className="cs-zone cs-questions" aria-label="Preguntas del estudio">
          <h3>Preguntas (opcionales)</h3>
          <p className="cs-selected-hint">No escribas datos personales: tu participación es anónima.</p>
          {study.preguntas!.map((question) => (
            <label key={question.id} className="field">
              {question.texto}
              <textarea
                value={answers[question.id] ?? ''}
                maxLength={1000}
                disabled={disabled}
                onChange={(event) => onAnswersChange({ ...answers, [question.id]: event.target.value })}
              />
            </label>
          ))}
        </section>
      )}

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
