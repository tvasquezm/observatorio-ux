import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { copiarMetodologia, escalaPredefinida, METODOLOGIAS_HEURISTICAS } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo } from '@observatorio-ux/shared-types';
import { ConfiguracionEditor } from './ConfiguracionEditor';
import { useAuthStore } from '../auth/store/useAuthStore';

vi.mock('./flujo.api', () => ({ flujoRequest: vi.fn() }));
vi.mock('../../shared/api/confirm', () => ({ useConfirm: () => vi.fn() }));
vi.mock('./EvidenciaEditor', () => ({ EvidenciaEditor: () => <span>Evidencias</span> }));

function config(): ConfiguracionFlujo {
  const metodologia = copiarMetodologia(METODOLOGIAS_HEURISTICAS[0]);
  metodologia.criterios = metodologia.criterios.slice(0, 2);
  return { nombre: 'Portal', producto: { clave: 'portal', nombre: 'Portal', version: '1', url: '', dispositivo: 'Web' }, objetivo: '', tareas: '', pantallas: '', exclusiones: '', metodologia, evaluadorIds: [], lectorIds: [] };
}
let latest: ConfiguracionFlujo;
function Editor({ initial = config(), onSaveMethod = vi.fn(), biblioteca = [METODOLOGIAS_HEURISTICAS[0]] }: { initial?: ConfiguracionFlujo; onSaveMethod?: () => Promise<void>; biblioteca?: typeof METODOLOGIAS_HEURISTICAS }) {
  const [v, setV] = useState(initial);
  latest = v;
  return <ConfiguracionEditor value={v} onChange={setV} biblioteca={biblioteca} equipo={[]} onSaveMethod={onSaveMethod} />;
}
beforeEach(() => { useAuthStore.setState({ user: { id: 'u1', nombre: 'Ana', email: 'ana@example.org', rol: 'ESTUDIANTE' }, isAuthenticated: true }); });

describe('constructor guiado de métodos', () => {
  it('numera los cuatro pasos con una línea de ayuda', () => {
    render(<Editor />);
    for (const [n, titulo] of [[1, 'Partir de una metodología'], [2, 'Criterios de esta copia'], [3, 'Escala de valoración'], [4, 'Vista previa del evaluador']] as const)
      expect(screen.getByRole('heading', { name: `Paso ${n} de 4 · ${titulo}` })).toBeInTheDocument();
  });
  it('pega una lista, agrega los criterios y avisa de los repetidos', async () => {
    render(<Editor />);
    await userEvent.type(screen.getByLabelText('Lista de criterios'), 'Menús: Nombres conocidos{enter}Botones visibles{enter}Menús: nombres CONOCIDOS');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar criterios de la lista' }));
    expect(latest.metodologia.criterios.slice(-2).map(c => [c.categoria, c.nombre])).toEqual([['Menús', 'Nombres conocidos'], ['Personalizado', 'Botones visibles']]);
    expect(latest.metodologia.criterios).toHaveLength(4);
    expect(screen.getByText('✓ Se agregaron 2 criterios.')).toBeInTheDocument();
    expect(screen.getByText(/repite un criterio/)).toBeInTheDocument();
    expect(screen.getByLabelText('Lista de criterios')).toHaveValue('');
  });
  it('empieza de cero, explica qué falta y no deja guardar vacío', async () => {
    const guardar = vi.fn().mockResolvedValue(undefined);
    render(<Editor onSaveMethod={guardar} />);
    await userEvent.click(screen.getByRole('button', { name: 'Empezar de cero' }));
    expect(latest.metodologia.criterios).toEqual([]);
    expect(latest.metodologia.protegida).toBe(false);
    expect(within(screen.getByRole('alert')).getByText('Agrega al menos un criterio.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar metodología reutilizable' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Lista de criterios'), 'Uno');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar criterios de la lista' }));
    expect(screen.getByText('✓ La metodología está lista para usar.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar metodología reutilizable' }));
    expect(guardar).toHaveBeenCalledTimes(1);
  });
  it('aplica una escala predefinida a todos los criterios y limpia las propias', async () => {
    const inicial = config();
    inicial.metodologia.criterios[0] = { ...inicial.metodologia.criterios[0], escala: escalaPredefinida('nielsen_0_4') };
    render(<Editor initial={inicial} />);
    await userEvent.selectOptions(screen.getByLabelText('Usar una escala predefinida en todos los criterios'), 'si_no');
    expect(latest.metodologia.escala.niveles.map(n => n.id)).toEqual(['si', 'no']);
    expect(latest.metodologia.criterios.every(c => c.escala === undefined)).toBe(true);
  });
  it('permite una escala distinta por criterio y la vista previa la usa', async () => {
    render(<Editor />);
    expect(screen.getByLabelText('Escala del criterio 1')).toHaveValue('base');
    await userEvent.selectOptions(screen.getByLabelText('Escala del criterio 2'), 'si_no');
    expect(latest.metodologia.criterios[0].escala).toBeUndefined();
    expect(latest.metodologia.criterios[1].escala?.niveles.map(n => n.id)).toEqual(['si', 'no']);
    const preview = screen.getAllByLabelText('Valoración');
    expect(within(preview[0]).getByRole('option', { name: /^Cumple —/ })).toBeInTheDocument();
    expect(within(preview[1]).getByRole('option', { name: /^Sí —/ })).toBeInTheDocument();
    expect(within(preview[1]).queryByRole('option', { name: /^Cumple —/ })).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText('Escala del criterio 2'), 'base');
    expect(latest.metodologia.criterios[1]).not.toHaveProperty('escala');
  });
  it('conserva una escala propia no predefinida y la vista previa no guarda nada', async () => {
    const inicial = config();
    const propia = escalaPredefinida('si_no'); propia.niveles[0].etiqueta = 'Correcto';
    inicial.metodologia.criterios[0] = { ...inicial.metodologia.criterios[0], escala: propia };
    render(<Editor initial={inicial} />);
    expect(screen.getByLabelText('Escala del criterio 1')).toHaveValue('propia');
    await userEvent.selectOptions(screen.getAllByLabelText('Valoración')[0], 'si');
    expect(latest.metodologia.criterios[0].escala).toEqual(propia);
  });
  it('una configuración antigua sin escala por criterio sigue funcionando', () => {
    render(<Editor />);
    expect(latest.metodologia.criterios.some(c => c.escala)).toBe(false);
    expect(screen.getByText('✓ La metodología está lista para usar.')).toBeInTheDocument();
    expect(screen.getByText('2 criterios en total.')).toBeInTheDocument();
  });
});

describe('biblioteca unificada: usar o marcar criterios', () => {
  const [a, b] = METODOLOGIAS_HEURISTICAS;
  it('marca criterios de dos metodologías en sus tarjetas y los carga en el paso 2', async () => {
    render(<Editor biblioteca={[a, b]} />);
    expect(screen.queryByRole('button', { name: 'Crear metodología con los seleccionados' })).toBeNull();
    await userEvent.click(screen.getByLabelText(`Criterio: ${a.criterios[0].nombre} (${a.nombre})`));
    await userEvent.click(screen.getByLabelText(`Criterio: ${b.criterios[0].nombre} (${b.nombre})`));
    expect(screen.getByText('2 criterios de 2 metodologías seleccionados.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Crear metodología con los seleccionados' }));
    expect(latest.metodologia.criterios.map(c => c.nombre)).toEqual([a.criterios[0].nombre, b.criterios[0].nombre]);
    expect(screen.getByText('✓ Se cargaron 2 criterios de 2 metodologías en el paso 2.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crear metodología con los seleccionados' })).toBeNull();
  });
  it('"Todos" marca una metodología completa y Usar copia la metodología sin marcar nada', async () => {
    render(<Editor biblioteca={[a, b]} />);
    await userEvent.click(screen.getByLabelText(`Todos los criterios de ${b.nombre}`));
    expect(screen.getByText(`${b.criterios.length} criterios de 1 metodologías seleccionados.`)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(`Todos los criterios de ${b.nombre}`));
    expect(screen.queryByRole('button', { name: 'Crear metodología con los seleccionados' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: `Usar copia de ${b.nombre}` }));
    expect(latest.metodologia.criterios).toHaveLength(b.criterios.length);
    expect(latest.metodologia.nombre).toBe(`${b.nombre} (copia)`);
  });
});
