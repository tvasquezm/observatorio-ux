import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

function HierarchicalWorkspace({
  type = 'ABIERTO' as 'ABIERTO' | 'HIBRIDO' | 'CERRADO',
  withPadres = true,
  initialPadres = {} as Record<string, string>,
  initialCategories = [] as string[],
  initialAssignments = {} as Record<string, string>,
  onSubmit = vi.fn(),
}) {
  const [assignments, setAssignments] = useState<Record<string, string>>(initialAssignments);
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [padres, setPadres] = useState<Record<string, string>>(initialPadres);
  return (
    <CardSortingWorkspace
      study={{
        nombre: 'Navegación',
        tipoCardSorting: type,
        cardsDefinidas: cards,
        categoriasDefinidas: type === 'ABIERTO' ? [] : [{ id: 'category-1', nombre: 'Servicios' }],
      }}
      assignments={assignments}
      customCategories={categories}
      onAssignmentsChange={setAssignments}
      onCustomCategoriesChange={setCategories}
      padres={padres}
      onPadresChange={withPadres ? setPadres : undefined}
      onSubmit={onSubmit}
    />
  );
}

async function crearCategoria(nombre: string, dentroDe?: string) {
  await userEvent.type(screen.getByLabelText('Nombre'), nombre);
  if (dentroDe) await userEvent.selectOptions(screen.getByLabelText('Dentro de (opcional)'), dentroDe);
  await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
}

describe('CardSortingWorkspace · subcategorías', () => {
  it('sin categorías propias no ofrece el selector; luego lista solo las de nivel 1', async () => {
    render(<HierarchicalWorkspace />);
    expect(screen.queryByLabelText('Dentro de (opcional)')).not.toBeInTheDocument();

    await crearCategoria('Recursos');
    await crearCategoria('Biblioteca', 'Recursos');

    const opciones = within(screen.getByLabelText('Dentro de (opcional)'))
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(opciones).toEqual(['Ninguna: categoría principal', 'Recursos']);
  });

  it('muestra la subcategoría anidada bajo su padre y envía categoriaPadre', async () => {
    const onSubmit = vi.fn();
    render(<HierarchicalWorkspace onSubmit={onSubmit} />);
    await crearCategoria('Recursos');
    await crearCategoria('Biblioteca', 'Recursos');

    const anidadas = screen.getByLabelText('Subcategorías de Recursos');
    expect(within(anidadas).getByRole('heading', { name: 'Biblioteca' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Biblioteca/ }));
    await userEvent.click(within(anidadas).getByRole('button', { name: 'Mover aquí' }));
    await userEvent.click(screen.getByRole('button', { name: /Calendario/ }));
    const zonaPadre = screen.getByRole('heading', { name: 'Recursos' }).closest('section')!;
    await userEvent.click(within(zonaPadre).getByRole('button', { name: 'Mover aquí' }));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar clasificación' }));

    expect(onSubmit).toHaveBeenCalledWith([
      { categoriaNombre: 'Recursos', cardIds: ['card-2'] },
      { categoriaNombre: 'Biblioteca', categoriaPadre: 'Recursos', cardIds: ['card-1'] },
    ]);
  });

  it('un padre sin tarjetas no se envía como grupo; la subcategoría sí, con su padre', async () => {
    const onSubmit = vi.fn();
    render(<HierarchicalWorkspace onSubmit={onSubmit} />);
    await crearCategoria('Recursos');
    await userEvent.click(screen.getByRole('button', { name: /Biblioteca/ }));
    await crearCategoria('Biblioteca', 'Recursos');
    await userEvent.click(screen.getByRole('button', { name: /Calendario/ }));
    const zona = screen.getByRole('heading', { name: 'Biblioteca', level: 3 }).closest('section')!;
    await userEvent.click(within(zona).getByRole('button', { name: 'Mover aquí' }));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar clasificación' }));

    expect(onSubmit).toHaveBeenCalledWith([
      { categoriaNombre: 'Biblioteca', categoriaPadre: 'Recursos', cardIds: ['card-1', 'card-2'] },
    ]);
  });

  it('no permite anidar a 3 niveles: las subcategorías no aparecen como padre', async () => {
    render(<HierarchicalWorkspace />);
    await crearCategoria('A');
    await crearCategoria('B', 'A');
    const opciones = within(screen.getByLabelText('Dentro de (opcional)'))
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(opciones).not.toContain('B');
  });

  it('un padre inválido del caché (nivel 3 o inexistente) se trata como categoría principal', async () => {
    const onSubmit = vi.fn();
    render(
      <HierarchicalWorkspace
        initialCategories={['A', 'B', 'C']}
        initialPadres={{ B: 'A', C: 'B', A: 'Fantasma' }}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByLabelText('Subcategorías de A')).toBeInTheDocument();
    // C cuelga de B, que es subcategoría: queda como principal.
    expect(screen.queryByLabelText('Subcategorías de B')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'C' })).toBeInTheDocument();
  });

  it('híbrido: el selector solo ofrece categorías propias, no las predefinidas', async () => {
    render(<HierarchicalWorkspace type="HIBRIDO" />);
    await crearCategoria('Mía');
    const opciones = within(screen.getByLabelText('Dentro de (opcional)'))
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(opciones).toEqual(['Ninguna: categoría principal', 'Mía']);
  });

  it('cerrado no permite crear ni anidar', () => {
    render(<HierarchicalWorkspace type="CERRADO" />);
    expect(screen.queryByLabelText('Dentro de (opcional)')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Nueva categoría' })).not.toBeInTheDocument();
  });

  it('sin onPadresChange (vista previa) no hay selector y todo es de nivel 1', async () => {
    render(<HierarchicalWorkspace withPadres={false} />);
    await crearCategoria('Recursos');
    await crearCategoria('Otra');
    expect(screen.queryByLabelText('Dentro de (opcional)')).not.toBeInTheDocument();
  });
});


describe('CardSortingWorkspace · límites y nombres normalizados', () => {
  it('rechaza una categoría propia equivalente sin tilde, incluso al anidarla', async () => {
    render(<HierarchicalWorkspace />);
    await crearCategoria('Menú');
    await crearCategoria('Menu', 'Menú');
    expect(screen.getByRole('alert')).toHaveTextContent('Ya existe una categoría con ese nombre.');
    expect(screen.queryByRole('heading', { name: 'Menu' })).not.toBeInTheDocument();
  });

  it('rechaza la variante con tilde de una categoría híbrida predefinida', async () => {
    render(<ControlledWorkspace hybrid />);
    await crearCategoria('Sérvicios');
    expect(screen.getByRole('alert')).toHaveTextContent('Ya existe una categoría con ese nombre.');
  });

  it('rechaza nombres nuevos de 61 caracteres y acepta el límite de 60', async () => {
    render(<HierarchicalWorkspace />);
    const input = screen.getByLabelText('Nombre');
    expect(input).toHaveAttribute('maxlength', '60');
    fireEvent.change(input, { target: { value: 'a'.repeat(61) } });
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    expect(screen.getByRole('alert')).toHaveTextContent('El máximo es 60 caracteres');
    fireEvent.change(input, { target: { value: 'a'.repeat(60) } });
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    expect(screen.getByRole('heading', { name: 'a'.repeat(60) })).toBeInTheDocument();
  });

  it('permite reparar un padre largo del caché sin perder tarjetas ni subcategorías', async () => {
    const longName = 'a'.repeat(61);
    const onSubmit = vi.fn();
    render(<HierarchicalWorkspace
      initialCategories={[longName, 'Sub']}
      initialPadres={{ Sub: longName }}
      initialAssignments={{ 'card-1': longName, 'card-2': 'Sub' }}
      onSubmit={onSubmit}
    />);
    await userEvent.click(screen.getByRole('button', { name: 'Enviar clasificación' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Acorta las categorías');
    const input = screen.getByLabelText('Acorta el nombre de la categoría');
    await userEvent.clear(input);
    await userEvent.type(input, 'Recursos');
    await userEvent.tab();
    expect(screen.getByLabelText('Subcategorías de Recursos')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar clasificación' }));
    expect(onSubmit).toHaveBeenCalledWith([
      { categoriaNombre: 'Recursos', cardIds: ['card-1'] },
      { categoriaNombre: 'Sub', categoriaPadre: 'Recursos', cardIds: ['card-2'] },
    ]);
  });
});
