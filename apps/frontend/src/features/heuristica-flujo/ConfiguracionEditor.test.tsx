import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { copiarMetodologia, METODOLOGIAS_HEURISTICAS } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo } from '@observatorio-ux/shared-types';
import { ConfiguracionEditor } from './ConfiguracionEditor';

let actual: ConfiguracionFlujo;
function Editor() {
  const [value, setValue] = useState<ConfiguracionFlujo>({ nombre: '', producto: { nombre: '', clave: '', version: '', dispositivo: '', url: '' }, objetivo: '', tareas: '', pantallas: '', exclusiones: '', evaluadorIds: ['yo'], lectorIds: [], metodologia: copiarMetodologia(METODOLOGIAS_HEURISTICAS[0]) });
  actual = value;
  return <ConfiguracionEditor value={value} onChange={setValue} biblioteca={METODOLOGIAS_HEURISTICAS} equipo={[{ id: 'yo', nombre: 'Ana', rol: 'ESTUDIANTE' }]} />;
}
describe('configuración breve para estudiantes', () => {
  it('ofrece seleccionar una metodología, sin creación por pasos ni personalización', () => {
    render(<Editor />);
    expect(screen.getByLabelText('Producto o sitio')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Metodología' })).toBeInTheDocument();
    expect(screen.queryByText(/Paso \d/)).toBeNull();
    expect(screen.queryByText('Personalizar escala')).toBeNull();
    expect(screen.queryByLabelText('Lista de criterios')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Empezar de cero' })).toBeNull();
  });
  it('genera el nombre y el identificador sin exigir datos descriptivos', async () => {
    render(<Editor />);
    await userEvent.type(screen.getByLabelText('Producto o sitio'), 'Portal de matrícula');
    expect(actual.nombre).toBe('Portal de matrícula');
    expect(actual.producto.clave).toBe('portal-de-matricula');
    expect(actual.objetivo).toBe('');
    expect(actual.producto.version).toBe('');
  });
  it('cambia la guía completa y conserva la escala que viene definida en ella', async () => {
    render(<Editor />);
    const otra = METODOLOGIAS_HEURISTICAS[1];
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Metodología' }), otra.id);
    expect(actual.metodologia.criterios).toEqual(otra.criterios);
    expect(actual.metodologia.escala).toEqual(otra.escala);
    expect(actual.metodologia.protegida).toBe(false);
  });
});

describe('escala de respuesta de la revisión', () => {
  const selector = () => screen.getByRole('combobox', { name: 'Escala de respuesta' });
  it('parte con la escala de la metodología y muestra sus niveles', () => {
    render(<Editor />);
    expect(selector()).toHaveValue('metodologia');
    expect(screen.getByLabelText('Niveles de la escala elegida')).toHaveTextContent(actual.metodologia.escala.niveles[0].etiqueta);
  });
  it.each([['si_no', ['Sí', 'No']], ['likert_1_5', ['No cumple', 'Cumple totalmente']], ['nielsen_0_4', ['Sin problema', 'Catastrófico']], ['operativa', ['Cumple', 'No cumple']]])('aplica %s a toda la revisión y limpia escalas propias', async (opcion, etiquetas) => {
    render(<Editor />);
    await userEvent.selectOptions(selector(), opcion);
    expect(actual.metodologia.criterios.every(c => c.escala === undefined)).toBe(true);
    const textos = actual.metodologia.escala.niveles.map(n => n.etiqueta);
    for (const e of etiquetas) expect(textos.some(t => t.includes(e))).toBe(true);
    // la primera metodología ya usa la escala operativa: ahí el selector marca "La de la metodología"
    expect(selector()).toHaveValue(opcion === 'operativa' ? 'metodologia' : opcion);
  });
  it('vuelve a la escala de la metodología', async () => {
    render(<Editor />);
    const original = structuredClone(actual.metodologia.escala);
    await userEvent.selectOptions(selector(), 'likert_1_5');
    await userEvent.selectOptions(selector(), 'metodologia');
    expect(actual.metodologia.escala).toEqual(original);
  });
});
