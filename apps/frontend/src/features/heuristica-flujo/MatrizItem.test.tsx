import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { copiarMetodologia, escalaPredefinida, METODOLOGIAS_HEURISTICAS } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, MetodologiaFlujo, RespuestaCriterio } from '@observatorio-ux/shared-types';
import { MatrizItem } from './MatrizItem';
import type { EstadoGuardado } from './MatrizItem';

const metodo = (id: string) => copiarMetodologia(METODOLOGIAS_HEURISTICAS.find(m => m.id === id)!);
const configDe = (m: MetodologiaFlujo): ConfiguracionFlujo => ({ nombre: 'R', producto: { clave: 'p', nombre: 'P', version: '1', url: '', dispositivo: 'web' }, objetivo: '', tareas: '', pantallas: '', exclusiones: '', metodologia: m, evaluadorIds: [], lectorIds: [] });
function Harness({ m, guardado, inicial = [], editable = true }: { m: MetodologiaFlujo; guardado?: EstadoGuardado; inicial?: RespuestaCriterio[]; editable?: boolean }) {
  const [rs, setRs] = useState<RespuestaCriterio[]>(inicial);
  return <MatrizItem criterios={m.criterios} config={configDe(m)} respuestas={rs} modo="individual" editable={editable} guardado={guardado} onAddHallazgo={vi.fn()} onChange={r => setRs(p => [...p.filter(x => x.criterioId !== r.criterioId), r])} />;
}

function ConGuardado({ m }: { m: MetodologiaFlujo }) {
  const [dirty, setDirty] = useState(true);
  return <><button type="button" onClick={() => setDirty(false)}>simular guardado</button><Harness m={m} guardado={{ dirty, saving: false, error: '' }} /></>;
}

describe('MatrizItem', () => {
  it('Rúbrica UTEM: 22 preguntas en 6 tablas con columnas 1 a 5 y título arriba', async () => {
    const m = metodo('rubrica-utem-eval-heuristica');
    render(<Harness m={m} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ver todo' }));
    expect(screen.getAllByRole('table', { hidden: true })).toHaveLength(6);
    expect(screen.getAllByRole('row').filter(r => within(r).queryAllByRole('radio').length > 0)).toHaveLength(22);
    const t = screen.getAllByRole('table')[0];
    expect(within(t).getAllByRole('columnheader').map(c => c.textContent)).toEqual(expect.arrayContaining([expect.stringContaining('1'), expect.stringContaining('5'), 'No aplica']));
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(6);
  });
  it('checklist Hassan: 71 preguntas en 11 tablas con columnas Sí y No', async () => {
    render(<Harness m={metodo('hassan-checklist-2003')} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ver todo' }));
    expect(screen.getAllByRole('table')).toHaveLength(11);
    expect(screen.getAllByRole('rowheader')).toHaveLength(71);
    expect(within(screen.getAllByRole('table')[0]).getAllByRole('columnheader').map(c => c.textContent)).toEqual(expect.arrayContaining([expect.stringContaining('Sí'), expect.stringContaining('No')]));
  });
  it('Nielsen: título y enunciado arriba de cada ítem; por grupo 4 preguntas y en Ver todo 10 tablas con 39 filas', async () => {
    const m = metodo('nielsen10');
    render(<Harness m={m} />);
    expect(screen.getByRole('heading', { name: 'Estado visible' })).toBeInTheDocument();
    expect(screen.getByText(m.enunciados!['Estado visible'])).toBeInTheDocument();
    expect(screen.getAllByRole('table')).toHaveLength(1);
    expect(screen.getAllByRole('rowheader')).toHaveLength(4);
    await userEvent.click(screen.getByRole('button', { name: 'Ver todo' }));
    expect(screen.getAllByRole('table')).toHaveLength(10);
    expect(screen.getAllByRole('rowheader')).toHaveLength(39);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(10);
  });
  it('enunciado y título siempre visibles; "Por grupo" muestra un ítem y "Ver todo" todos', async () => {
    const m = metodo('nielsen10');
    m.criterios = m.criterios.flatMap(c => [{ ...c, id: `${c.id}a`, nombre: `${c.nombre} 1`, categoria: c.nombre }, { ...c, id: `${c.id}b`, nombre: `${c.nombre} 2`, categoria: c.nombre }]).slice(0, 6);
    m.enunciados = { 'Estado visible': 'El sistema informa lo que ocurre.', 'Lenguaje del usuario': 'Habla como la persona.', 'Control y salida': 'La persona manda.' };
    render(<Harness m={m} />);
    expect(screen.getByRole('heading', { name: 'Estado visible' })).toBeInTheDocument();
    expect(screen.getByText('El sistema informa lo que ocurre.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Control y salida' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Grupo siguiente' }));
    expect(screen.getByText('Habla como la persona.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver todo' }));
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
  });
  it('escalas mezcladas: un ítem con dos escalas muestra dos tablas con su propia cabecera', () => {
    const m = metodo('rubrica-utem-eval-heuristica');
    const cat = m.criterios[0].categoria;
    const dentro = m.criterios.filter(c => c.categoria === cat);
    m.criterios = dentro.map((c, i) => i === 0 ? { ...c, escala: escalaPredefinida('si_no') } : c);
    render(<Harness m={m} />);
    expect(screen.getAllByRole('table')).toHaveLength(2);
    expect(within(screen.getAllByRole('table')[0]).getAllByRole('columnheader').map(c => c.textContent)).toEqual(expect.arrayContaining([expect.stringContaining('Sí')]));
  });
  it('califica una fila y cuenta el avance', async () => {
    const m = metodo('rubrica-utem-eval-heuristica');
    render(<Harness m={m} />);
    const fila = screen.getAllByRole('row').find(r => within(r).queryAllByRole('radio').length)!;
    await userEvent.click(within(fila).getByRole('radio', { name: 'No aplica' }));
    expect(within(fila).getByRole('radio', { name: 'No aplica' })).toBeChecked();
    expect(screen.getByText(/^1 de \d+ respondidos/)).toBeInTheDocument();
  });
  it('comentario: colapsable, marca gris pendiente, verde guardado y reapertura', async () => {
    const m = metodo('nielsen10');
    render(<ConGuardado m={m} />);
    expect(screen.queryByRole('textbox')).toBeNull();
    await userEvent.click(screen.getAllByRole('button', { name: /^Comentario/ })[0]);
    await userEvent.type(screen.getByRole('textbox'), 'Nota larga');
    await userEvent.click(screen.getByRole('button', { name: /^Listo/ }));
    expect(screen.queryByRole('textbox')).toBeNull();
    const marca = screen.getByRole('button', { name: /Comentario agregado, pendiente de guardar/ });
    expect(marca).toHaveAttribute('title', 'Nota larga');
    await userEvent.click(marca);
    expect(screen.getByRole('textbox')).toHaveValue('Nota larga');
    await userEvent.click(screen.getByRole('button', { name: /^Listo/ }));
    await userEvent.click(screen.getByRole('button', { name: 'simular guardado' }));
    expect(screen.getByRole('button', { name: /Comentario guardado/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pendiente de guardar/ })).toBeNull();
  });
  it('comentario guardado y comentario con error de guardado', () => {
    const m = metodo('nielsen10');
    const r: RespuestaCriterio[] = [{ criterioId: m.criterios[0].id, valor: null, noAplica: false, motivo: '', notas: 'Viene del servidor' }];
    const { unmount } = render(<Harness m={m} inicial={r} guardado={{ dirty: false, saving: false, error: '' }} />);
    expect(screen.getByRole('button', { name: /Comentario guardado/ })).toBeInTheDocument();
    unmount();
    render(<Harness m={m} inicial={r} guardado={{ dirty: true, saving: false, error: 'Falló' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar el comentario');
  });
  it('sin permiso de edición no se puede calificar ni agregar problema', () => {
    render(<Harness m={metodo('nielsen10')} editable={false} />);
    expect(screen.getAllByRole('radio').every(r => (r as HTMLInputElement).disabled)).toBe(true);
    expect(screen.queryByRole('button', { name: /^Agregar problema/ })).toBeNull();
  });
});
