import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CardSortingWorkspace } from './CardSortingWorkspace';

const cards = [
  { id: 'card-1', etiqueta: 'Biblioteca' },
  { id: 'card-2', etiqueta: 'Calendario' },
];

function ControlledWorkspace({ open = false, hybrid = false, onSubmit = vi.fn() }) {
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<string[]>([]);
  return (
    <CardSortingWorkspace
      study={{
        nombre: 'Navegación',
        tipoCardSorting: hybrid ? 'HIBRIDO' : open ? 'ABIERTO' : 'CERRADO',
        cardsDefinidas: cards,
        categoriasDefinidas: open ? [] : [{ id: 'category-1', nombre: 'Servicios' }],
      }}
      assignments={assignments}
      customCategories={categories}
      onAssignmentsChange={setAssignments}
      onCustomCategoriesChange={setCategories}
      onSubmit={onSubmit}
    />
  );
}

describe('CardSortingWorkspace', () => {
  it('permite clasificar sin arrastrar usando selección y botones', async () => {
    const onSubmit = vi.fn();
    render(<ControlledWorkspace onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /Biblioteca/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Mover aquí' }));
    await userEvent.click(screen.getByRole('button', { name: /Calendario/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Mover aquí' }));

    const category = screen.getByRole('heading', { name: 'Servicios' }).closest('section');
    expect(category).not.toBeNull();
    expect(within(category!).getByRole('button', { name: /Biblioteca/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar clasificación' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Enviar clasificación' }));
    expect(onSubmit).toHaveBeenCalledWith([
      { categoriaId: 'category-1', cardIds: ['card-1', 'card-2'] },
    ]);
  });

  it('crea categorías abiertas y mueve en la misma acción la tarjeta seleccionada', async () => {
    render(<ControlledWorkspace open />);

    await userEvent.click(screen.getByRole('button', { name: /Biblioteca/ }));
    await userEvent.type(screen.getByLabelText('Nombre'), 'Recursos');
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));

    const category = screen.getByRole('heading', { name: 'Recursos' }).closest('section');
    expect(category).not.toBeNull();
    expect(within(category!).getByRole('button', { name: /Biblioteca/ })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Biblioteca se movió a Recursos.');
  });

  it('híbrido muestra las predefinidas y permite crear otras, enviando ambas', async () => {
    const onSubmit = vi.fn();
    render(<ControlledWorkspace hybrid onSubmit={onSubmit} />);
    expect(screen.getByRole('heading', { name: 'Servicios' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Biblioteca/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Mover aquí' }));
    await userEvent.click(screen.getByRole('button', { name: /Calendario/ }));
    await userEvent.type(screen.getByLabelText('Nombre'), 'Mi grupo');
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));

    await userEvent.click(screen.getByRole('button', { name: 'Enviar clasificación' }));
    expect(onSubmit).toHaveBeenCalledWith([
      { categoriaId: 'category-1', cardIds: ['card-1'] },
      { categoriaNombre: 'Mi grupo', cardIds: ['card-2'] },
    ]);
  });

  it('híbrido rechaza crear una categoría con el nombre de una predefinida', async () => {
    render(<ControlledWorkspace hybrid />);
    await userEvent.type(screen.getByLabelText('Nombre'), 'servicios');
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Ya existe una categoría con ese nombre.');
  });

  it('muestra una ayuda distinta según el tipo de estudio', () => {
    const { unmount } = render(<ControlledWorkspace />);
    expect(screen.getByText(/Usa las categorías que se muestran/)).toBeInTheDocument();
    unmount();
    render(<ControlledWorkspace open />);
    expect(screen.getByText(/Puedes crear tus propias categorías/)).toBeInTheDocument();
  });
});
