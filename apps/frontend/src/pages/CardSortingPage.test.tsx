import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { CardSortingPage } from './CardSortingPage';

const mutate = vi.hoisted(() => vi.fn());
const estudios = vi.hoisted(() => ({ lista: [] as unknown[] }));

vi.mock('../features/card-sorting/hooks/useCardSortingQueries', () => ({
  useCardSortingEstudiosByProyecto: () => ({ data: estudios.lista, isLoading: false }),
  useCreateCardSortingSession: () => ({ mutate, isPending: false, error: null }),
}));

function renderPage(open = true) {
  const result = render(
    <MemoryRouter initialEntries={['/p']}>
      <Routes>
        <Route element={<Outlet context={{ proyectoId: '11111111-1111-4111-8111-111111111111' }} />}>
          <Route path="/p" element={<CardSortingPage />} />
        </Route>
        <Route path="/proyectos/:pid/card-sorting/:sid" element={<p>Workspace abierto</p>} />
      </Routes>
    </MemoryRouter>,
  );
  if (open) fireEvent.click(screen.getByRole('button', { name: '+ Nuevo Card Sorting' }));
  return result;
}

async function crear() {
  while (screen.queryByRole('button', { name: 'Siguiente' })) await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  await userEvent.click(screen.getByRole('button', { name: /Crear y abrir/ }));
}

async function siguiente(veces = 1) {
  for (let i = 0; i < veces; i += 1) await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
}

async function pegarTarjetas(texto: string) {
  await siguiente();
  await userEvent.type(screen.getByLabelText('Pegar lista de tarjetas'), texto);
  await userEvent.click(screen.getByRole('button', { name: /^Agregar \d+ tarjeta/ }));
}

async function agregarUna(etiqueta: string, texto: string) {
  if (screen.getByLabelText(etiqueta).closest('[hidden]')) await siguiente();
  await userEvent.type(screen.getByLabelText(etiqueta), `${texto}{Enter}`);
}

describe('CardSortingPage · guía', () => {
  it('muestra la guía de 8 pasos en las instrucciones de la cabecera, colapsada', () => {
    renderPage(false);
    const resumen = screen.getByText('Cómo trabajar con Card Sorting');
    const detalle = resumen.closest('details')!;
    expect(detalle).not.toHaveAttribute('open');
    expect(detalle.closest('.page-head')).toBeNull();
    expect(screen.getByText('Extraer conclusiones')).toBeInTheDocument();
    fireEvent.click(resumen);
    expect(screen.getByText('Extraer conclusiones')).toBeVisible();
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
    await siguiente(2);
    expect(screen.getByRole('heading', { name: 'Paso 3 de 4: Categorías' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Modo de ingreso de categorías' })).toBeInTheDocument();
  });

  it('sin categorías predefinidas muestra el mínimo de 1', async () => {
    mutate.mockClear();
    renderPage();
    await userEvent.click(screen.getByRole('radio', { name: /Híbrido/ }));
    await userEvent.type(screen.getByLabelText(/Nombre del estudio/), 'Estudio');
    await pegarTarjetas('A{Enter}B');
    await crear();
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
    await crear();
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
    await siguiente();
    await userEvent.type(screen.getByLabelText('Pegar lista de tarjetas'), 'Navegación{Enter}navegacion');
    expect(screen.getByTestId('cs-paste-preview-tarjetas')).toHaveTextContent('1 por agregar · 1 repetida se omitirá');
  });

  it('muestra un mensaje en vez de no hacer nada cuando el nombre son solo espacios', async () => {
    mutate.mockClear();
    renderPage();
    await llenar('   ', 'Biblioteca');
    await crear();
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
    await crear();
    expect(screen.getByRole('alert')).toHaveTextContent('Un estudio cerrado necesita al menos 2 categorías.');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('con datos válidos envía las tarjetas recortadas y sin duplicados', async () => {
    mutate.mockClear();
    renderPage();
    await llenar('  Estudio  ', 'A{Enter}  B  ');
    await crear();
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
    await crear();
    expect(mutate.mock.calls[0][0].preguntas).toEqual([{ texto: '¿Qué costó?' }, { texto: '¿Faltó algo?' }]);
  });

  it('sin preguntas no envía el campo', async () => {
    mutate.mockClear();
    renderPage();
    await base();
    await crear();
    expect(mutate.mock.calls[0][0].preguntas).toBeUndefined();
  });

  it('bloquea más de 5 preguntas', async () => {
    mutate.mockClear();
    renderPage();
    await base();
    for (const n of ['1', '2', '3', '4', '5', '6']) await agregarUna('Agregar pregunta', n);
    await crear();
    expect(screen.getByRole('alert')).toHaveTextContent('El máximo es 5 preguntas.');
    expect(mutate).not.toHaveBeenCalled();
  });
});

describe('CardSortingPage · avance del estudio', () => {
  it('parte sin completar y avanza al escribir nombre y tarjetas', async () => {
    renderPage();
    expect(screen.getByRole('img', { name: '1 de 3' })).toBeInTheDocument();
    expect(screen.queryByText('Estudio completo: ya puedes crearlo')).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Nombre del estudio/), 'Estudio');
    await pegarTarjetas('A{Enter}B');
    expect(screen.getByRole('img', { name: '3 de 3, completo' })).toBeInTheDocument();
    expect(screen.getByText('Estudio completo: ya puedes crearlo')).toBeInTheDocument();
  });

  it('un estudio cerrado suma el paso de categorías', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('radio', { name: /Cerrado/ }));
    expect(screen.getByRole('img', { name: '1 de 4' })).toBeInTheDocument();
  });

  it('el botón cambia a "De a una": Enter agrega, y quitar la borra', async () => {
    renderPage();
    await siguiente();
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
    await siguiente();
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


describe('CardSortingPage · pasos', () => {
  it('recorre Nombre y tipo, Tarjetas y Preguntas; Crear solo aparece en el último', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Paso 1 de 3: Nombre y tipo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Crear y abrir/ })).not.toBeInTheDocument();
    await siguiente();
    expect(screen.getByRole('heading', { name: 'Paso 2 de 3: Tarjetas' })).toBeInTheDocument();
    await siguiente();
    expect(screen.getByRole('heading', { name: 'Paso 3 de 3: Preguntas (opcional)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Crear y abrir/ })).toBeInTheDocument();
  });

  it('el paso de categorías solo existe en Cerrado e Híbrido', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('radio', { name: /Cerrado/ }));
    await siguiente(2);
    expect(screen.getByRole('heading', { name: 'Paso 3 de 4: Categorías' })).toBeInTheDocument();
  });
});

describe('CardSortingPage · integración de propuestas', () => {
  it('mantiene la configuración cerrada y conserva el borrador al cerrarla', async () => {
    renderPage(false);
    expect(screen.queryByLabelText('Nombre del estudio')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '+ Nuevo Card Sorting' }));
    await userEvent.type(screen.getByLabelText('Nombre del estudio'), 'Borrador');
    await pegarTarjetas('Biblioteca');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByLabelText('Nombre del estudio')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '+ Nuevo Card Sorting' }));
    expect(screen.getByLabelText('Nombre del estudio')).toHaveValue('Borrador');
    expect(screen.getByText('Biblioteca', { selector: '.cs-chip span' })).toBeInTheDocument();
  });
  it('usa el esquema de la API y asocia errores a los campos sin perder datos', async () => {
    mutate.mockClear(); renderPage();
    await userEvent.type(screen.getByLabelText('Nombre del estudio'), '  ');
    await pegarTarjetas('Biblioteca');
    fireEvent.submit(screen.getByLabelText('Nombre del estudio').closest('form')!);
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nombre del estudio')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Nombre del estudio')).toHaveAttribute('aria-describedby', 'cs-configuration-error');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

const ESTUDIO = {
  id: 's1', nombre: 'Portal estudiantil', tipoCardSorting: 'ABIERTO', cardsDefinidas: ['A', 'B'],
  respuestasCount: 3, cerrado: false, createdAt: '2026-10-01T10:00:00.000Z',
};

describe('CardSortingPage: esqueleto estándar', () => {
  it('pone el primario en la cabecera y el proceso a nivel de página, fuera del formulario', () => {
    renderPage(false);
    const nuevo = screen.getByRole('button', { name: '+ Nuevo Card Sorting' });
    expect(nuevo).toHaveClass('primary');
    expect(nuevo.closest('.page-head')).not.toBeNull();
    expect(screen.queryByRole('region', { name: 'Proceso del estudio' })).toBeNull();
    fireEvent.click(nuevo);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveClass('secondary');
    const proceso = screen.getByRole('region', { name: 'Proceso del estudio' });
    expect(proceso.closest('form')).toBeNull();
  });

  it('oculta la lista con el formulario abierto', () => {
    estudios.lista = [ESTUDIO];
    renderPage(false);
    expect(screen.getByText('Portal estudiantil')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '+ Nuevo Card Sorting' }));
    expect(screen.queryByText('Portal estudiantil')).toBeNull();
    estudios.lista = [];
  });
});

describe('CardSortingPage: lista estándar', () => {
  it('muestra título con contador y Abrir secundario en las acciones de la fila', () => {
    estudios.lista = [ESTUDIO];
    renderPage(false);
    const titulo = screen.getByRole('heading', { name: 'Continuar un Card Sorting' });
    expect(titulo.closest('.technique-list-head')?.textContent).toContain('1');
    const abrir = screen.getByRole('button', { name: 'Abrir' });
    expect(abrir).toHaveClass('secondary');
    expect(abrir.closest('.technique-item-actions')).not.toBeNull();
    estudios.lista = [];
  });

  it('Abrir y el clic en la fila llevan al workspace', async () => {
    estudios.lista = [ESTUDIO];
    const { unmount } = renderPage(false);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(screen.getByText('Workspace abierto')).toBeInTheDocument();
    unmount();
    renderPage(false);
    await userEvent.click(screen.getByText('Portal estudiantil'));
    expect(screen.getByText('Workspace abierto')).toBeInTheDocument();
    estudios.lista = [];
  });

  it('sin estudios muestra el vacío estándar y no el encabezado de lista', () => {
    renderPage(false);
    const vacio = screen.getByText('Todavía no hay estudios de Card Sorting');
    expect(vacio.closest('.technique-empty')).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'Continuar un Card Sorting' })).toBeNull();
  });
});
