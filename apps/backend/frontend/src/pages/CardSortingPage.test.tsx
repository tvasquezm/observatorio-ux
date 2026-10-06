import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { CardSortingPage } from './CardSortingPage';

const mutate = vi.hoisted(() => vi.fn());

vi.mock('../features/card-sorting/hooks/useCardSortingQueries', () => ({
  useCardSortingEstudiosByProyecto: () => ({ data: [], isLoading: false }),
  useCreateCardSortingSession: () => ({ mutate, isPending: false, error: null }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/p']}>
      <Routes>
        <Route element={<Outlet context={{ proyectoId: 'proyecto-1' }} />}>
          <Route path="/p" element={<CardSortingPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

async function pegarTarjetas(texto: string) {
  await userEvent.type(screen.getByLabelText('Pegar lista de tarjetas'), texto);
  await userEvent.click(screen.getByRole('button', { name: /^Agregar \d+ tarjeta/ }));
}

async function agregarUna(etiqueta: string, texto: string) {
  await userEvent.type(screen.getByLabelText(etiqueta), `${texto}{Enter}`);
}

describe('CardSortingPage · guía', () => {
  it('muestra la guía de 8 pasos junto al formulario', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Cómo hacer un card sorting' })).toBeInTheDocument();
    expect(screen.getByText('Extraer conclusiones')).toBeInTheDocument();
  });

  it('explica cuándo usar abierto o cerrado según el tipo elegido', async () => {
    renderPage();
    expect(screen.getByTestId('cs-type-hint')).toHaveTextContent(/descubrir cómo piensan/);

    await userEvent.click(screen.getByRole('radio', { name: /Cerrado/ }));
    expect(screen.getByTestId('cs-type-hint')).toHaveTextContent(/validar una estructura/);
  });
});

describe('CardSortingPage · híbrido', () => {
  it('explica el híbrido y muestra las categorías predefinidas', async () => {
    renderPage();
    expect(screen.queryByRole('group', { name: 'Modo de ingreso de categorías' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: /Híbrido/ }));
    expect(screen.getByTestId('cs-type-hint')).toHaveTextContent(/pueden crear otras/);
    expect(screen.getByRole('group', { name: 'Modo de ingreso de categorías' })).toBeInTheDocument();
  });

  it('sin categorías predefinidas muestra el mínimo de 1', async () => {
    mutate.mockClear();
    renderPage();
    await userEvent.click(screen.getByRole('radio', { name: /Híbrido/ }));
    await userEvent.type(screen.getByLabelText(/Nombre del estudio/), 'Estudio');
    await pegarTarjetas('A{Enter}B');
    await userEvent.click(screen.getByRole('button', { name: /Crear y abrir/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Un estudio híbrido necesita al menos una categoría predefinida.');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('con 1 categoría envía tipo HIBRIDO y las categorías', async () => {
    mutate.mockClear();
    renderPage();
    await userEvent.click(screen.getByRole('radio', { name: /Híbrido/ }));
    await userEvent.type(screen.getByLabelText(/Nombre del estudio/), 'Estudio');
    await pegarTarjetas('A{Enter}B');
    await agregarUna('Agregar categoría', 'Servicios');
    await userEvent.click(screen.getByRole('button', { name: /Crear y abrir/ }));
    expect(mutate.mock.calls[0][0]).toMatchObject({ tipo: 'HIBRIDO', categorias: [{ nombre: 'Servicios' }] });
  });
});

describe('CardSortingPage · intención de tarjetas y categorías', () => {
  async function llenar(nombre: string, tarjetas: string) {
    await userEvent.type(screen.getByLabelText(/Nombre del estudio/), nombre);
    await pegarTarjetas(tarjetas);
  }

  it('cuenta las tarjetas en vivo e indica el rango recomendado', async () => {
    renderPage();
    expect(screen.getByTestId('cs-card-count')).toHaveTextContent('0 tarjetas · 15–40');
    await pegarTarjetas('A{Enter}B{Enter}{Enter}C');
    expect(screen.getByTestId('cs-card-count')).toHaveTextContent('3 tarjetas');
  });

  it('avisa de repetidas sin importar tildes ni mayúsculas, antes de agregarlas', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText('Pegar lista de tarjetas'), 'Navegación{Enter}navegacion');
    expect(screen.getByTestId('cs-paste-preview-tarjetas')).toHaveTextContent('1 por agregar · 1 repetida se omitirá');
  });

  it('muestra un mensaje en vez de no hacer nada cuando el nombre son solo espacios', async () => {
    mutate.mockClear();
    renderPage();
    await llenar('   ', 'Biblioteca');
    await userEvent.click(screen.getByRole('button', { name: /Crear y abrir/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe un nombre para el estudio.');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('al agregar omite las repetidas y deja una sola tarjeta', async () => {
    renderPage();
    await pegarTarjetas('A{Enter}a');
    expect(screen.getAllByRole('button', { name: /^Quitar / })).toHaveLength(1);
    await userEvent.type(screen.getByLabelText('Pegar lista de tarjetas'), 'A');
    expect(screen.getByTestId('cs-paste-preview-tarjetas')).toHaveTextContent('0 por agregar · 1 repetida se omitirá');
  });

  it('un estudio cerrado con 1 categoría muestra el mínimo de 2', async () => {
    mutate.mockClear();
    renderPage();
    await userEvent.click(screen.getByRole('radio', { name: /Cerrado/ }));
    await llenar('Estudio', 'A{Enter}B');
    await agregarUna('Agregar categoría', 'Servicios');
    await userEvent.click(screen.getByRole('button', { name: /Crear y abrir/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Un estudio cerrado necesita al menos 2 categorías.');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('con datos válidos envía las tarjetas recortadas y sin duplicados', async () => {
    mutate.mockClear();
    renderPage();
    await llenar('  Estudio  ', 'A{Enter}  B  ');
    await userEvent.click(screen.getByRole('button', { name: /Crear y abrir/ }));
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toMatchObject({
      nombre: 'Estudio',
      tarjetas: [{ etiqueta: 'A' }, { etiqueta: 'B' }],
    });
  });
});

describe('CardSortingPage · preguntas del evaluador', () => {
  async function base() {
    await userEvent.type(screen.getByLabelText(/Nombre del estudio/), 'Estudio');
    await pegarTarjetas('A{Enter}B');
  }

  it('cuenta las preguntas y envía las no vacías recortadas', async () => {
    mutate.mockClear();
    renderPage();
    await base();
    await agregarUna('Agregar pregunta', '  ¿Qué costó?  ');
    await agregarUna('Agregar pregunta', '¿Faltó algo?');
    expect(screen.getByTestId('cs-question-count')).toHaveTextContent('2 de 5 preguntas');
    await userEvent.click(screen.getByRole('button', { name: /Crear y abrir/ }));
    expect(mutate.mock.calls[0][0].preguntas).toEqual([{ texto: '¿Qué costó?' }, { texto: '¿Faltó algo?' }]);
  });

  it('sin preguntas no envía el campo', async () => {
    mutate.mockClear();
    renderPage();
    await base();
    await userEvent.click(screen.getByRole('button', { name: /Crear y abrir/ }));
    expect(mutate.mock.calls[0][0].preguntas).toBeUndefined();
  });

  it('bloquea más de 5 preguntas', async () => {
    mutate.mockClear();
    renderPage();
    await base();
    for (const n of ['1', '2', '3', '4', '5', '6']) await agregarUna('Agregar pregunta', n);
    await userEvent.click(screen.getByRole('button', { name: /Crear y abrir/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('El máximo es 5 preguntas.');
    expect(mutate).not.toHaveBeenCalled();
  });
});

describe('CardSortingPage · avance del estudio', () => {
  it('parte sin completar y avanza al escribir nombre y tarjetas', async () => {
    renderPage();
    expect(screen.getByTestId('cs-progress-count')).toHaveTextContent('1 de 3');
    expect(screen.getByTestId('cs-progress-status')).toHaveTextContent('Escribe un nombre para el estudio.');
    await userEvent.type(screen.getByLabelText(/Nombre del estudio/), 'Estudio');
    await pegarTarjetas('A{Enter}B');
    expect(screen.getByTestId('cs-progress-count')).toHaveTextContent('3 de 3');
    expect(screen.getByTestId('cs-progress-status')).toHaveTextContent('Listo para crear.');
  });

  it('un estudio cerrado suma el paso de categorías', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('radio', { name: /Cerrado/ }));
    expect(screen.getByTestId('cs-progress-count')).toHaveTextContent('1 de 4');
  });

  it('el botón cambia a "De a una": Enter agrega, y quitar la borra', async () => {
    renderPage();
    const modo = screen.getByRole('group', { name: 'Modo de ingreso de tarjetas' });
    expect(within(modo).getByRole('button', { name: 'Pegar lista' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(within(modo).getByRole('button', { name: 'De a una' }));
    await agregarUna('Agregar tarjeta', 'Biblioteca');
    expect(screen.getByRole('button', { name: 'Quitar Biblioteca' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar Biblioteca' }));
    expect(screen.queryByRole('button', { name: 'Quitar Biblioteca' })).not.toBeInTheDocument();
  });

  it('en modo "De a una" avisa si la tarjeta ya está en la lista', async () => {
    renderPage();
    await userEvent.click(within(screen.getByRole('group', { name: 'Modo de ingreso de tarjetas' })).getByRole('button', { name: 'De a una' }));
    await agregarUna('Agregar tarjeta', 'Becas');
    await agregarUna('Agregar tarjeta', 'becas');
    expect(screen.getByText('«becas» ya está en la lista.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Quitar / })).toHaveLength(1);
  });

  it('el modo lista muestra las reglas del formato', () => {
    renderPage();
    expect(screen.getByText('Una tarjeta por línea.')).toBeInTheDocument();
    expect(screen.getByText(/Puedes pegar una columna de Excel o Sheets/)).toBeInTheDocument();
  });
});
