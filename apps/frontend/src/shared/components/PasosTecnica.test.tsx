import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormEvent } from 'react';
import { PasosTecnica } from './PasosTecnica';

const pasos = [
  { id: 'a', titulo: 'Perfil', ayuda: 'Quién es.', contenido: <label>Nombre<input /></label> },
  { id: 'b', titulo: 'Objetivo', ayuda: 'Qué busca.', contenido: <p>Contenido del objetivo</p> },
  { id: 'c', titulo: 'Evidencia', ayuda: 'De dónde sale.', contenido: <p>Contenido de evidencia</p> },
];

describe('PasosTecnica', () => {
  it('marca (opcional) en el título de un paso opcional', async () => {
    render(<PasosTecnica pasos={pasos.map((p) => (p.id === 'b' ? { ...p, opcional: true } : p))} />);
    expect(screen.getByRole('heading', { name: 'Paso 1 de 3: Perfil' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('heading', { name: 'Paso 2 de 3: Objetivo (opcional)' })).toBeInTheDocument();
  });

  it('avisa el paso abierto al montar y al cambiar', async () => {
    const alCambiar = vi.fn();
    render(<PasosTecnica pasos={pasos} onCambioPaso={alCambiar} />);
    expect(alCambiar).toHaveBeenLastCalledWith(0);
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(alCambiar).toHaveBeenLastCalledWith(1);
    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(alCambiar).toHaveBeenLastCalledWith(0);
  });

  it('muestra un paso a la vez con su título y ayuda', () => {
    render(<PasosTecnica pasos={pasos} />);
    expect(screen.getByRole('heading', { name: 'Paso 1 de 3: Perfil' })).toBeInTheDocument();
    expect(screen.getByText('Quién es.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toBeVisible();
    expect(screen.getByText('Contenido del objetivo')).not.toBeVisible();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  });

  it('avanza y retrocede conservando lo escrito en los pasos ocultos', async () => {
    render(<PasosTecnica pasos={pasos} />);
    await userEvent.type(screen.getByLabelText('Nombre'), 'Ana');
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('heading', { name: 'Paso 2 de 3: Objetivo' })).toHaveFocus();
    expect(screen.getByText('Contenido del objetivo')).toBeVisible();
    expect(screen.getByLabelText('Nombre', { selector: 'input' })).toHaveValue('Ana');
    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(screen.getByLabelText('Nombre')).toBeVisible();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana');
  });

  it('muestra las acciones finales solo en el último paso', async () => {
    render(<PasosTecnica pasos={pasos} acciones={<button type="submit">Guardar</button>} />);
    expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('heading', { name: 'Paso 3 de 3: Evidencia' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Siguiente' })).toBeNull();
  });

  it('con accionesDesde muestra las acciones desde ese paso, junto a Siguiente', async () => {
    render(<PasosTecnica pasos={pasos} accionesDesde={1} acciones={<button type="submit">Guardar</button>} />);
    expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('heading', { name: 'Paso 2 de 3: Objetivo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Siguiente' })).toBeNull();
  });

  it('con accionesDesde, avanzar con Siguiente no envía el formulario', async () => {
    const onSubmit = vi.fn((e: FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <PasosTecnica pasos={pasos} accionesDesde={1} acciones={<button type="submit">Guardar</button>} />
      </form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('no envía el formulario al pasar al último paso, solo al pulsar la acción final', async () => {
    const onSubmit = vi.fn((e: FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <PasosTecnica pasos={pasos} acciones={<button type="submit">Guardar</button>} />
      </form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('heading', { name: 'Paso 3 de 3: Evidencia' })).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
