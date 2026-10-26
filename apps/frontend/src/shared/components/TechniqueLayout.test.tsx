import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TechniqueItemActions } from './TechniqueItemActions';
import { TechniqueListHead, TechniqueEmpty } from './TechniqueListParts';
import { TechniqueNewButton } from './TechniqueNewButton';
import { TechniquePage } from './TechniquePage';

describe('TechniquePage', () => {
  it('pinta los slots en el orden estándar aunque se pasen desordenados', () => {
    const { container } = render(
      <TechniquePage
        comentarios={<p>comentarios</p>}
        lista={<p>lista</p>}
        formulario={<p>formulario</p>}
        resumen={<p>resumen</p>}
        proceso={<p>proceso</p>}
        cabecera={<p>cabecera</p>}
      />,
    );
    const orden = Array.from(container.querySelectorAll('p')).map((p) => p.textContent);
    expect(orden).toEqual(['cabecera', 'proceso', 'resumen', 'formulario', 'lista', 'comentarios']);
  });

  it('no pinta los slots vacíos y aplica la clase de la página', () => {
    const { container } = render(<TechniquePage cabecera={<p>cabecera</p>} lista={<p>lista</p>} className="personas-page" />);
    expect(container.querySelectorAll('p')).toHaveLength(2);
    expect(container.firstElementChild).toHaveClass('artifact-page', 'technique-page', 'personas-page');
  });
});

describe('TechniqueNewButton', () => {
  it('ofrece crear como acción primaria y llama a onClick', () => {
    const onClick = vi.fn();
    render(<TechniqueNewButton etiqueta="+ Nuevo Card Sorting" abierto={false} puedeEditar onClick={onClick} />);
    const boton = screen.getByRole('button', { name: '+ Nuevo Card Sorting' });
    expect(boton).toHaveClass('primary');
    fireEvent.click(boton);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
  it('pasa a Cancelar secundario con el formulario abierto', () => {
    render(<TechniqueNewButton etiqueta="+ Nuevo" abierto puedeEditar onClick={() => {}} />);
    const boton = screen.getByRole('button', { name: 'Cancelar' });
    expect(boton).toHaveClass('secondary');
    expect(screen.queryByRole('button', { name: '+ Nuevo' })).not.toBeInTheDocument();
  });
  it('muestra Solo lectura y ningún botón sin permiso de edición', () => {
    render(<TechniqueNewButton etiqueta="+ Nuevo" abierto={false} puedeEditar={false} onClick={() => {}} />);
    expect(screen.getByText('Solo lectura')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('respeta disabled', () => {
    render(<TechniqueNewButton etiqueta="+ Nuevo" abierto={false} puedeEditar disabled onClick={() => {}} />);
    expect(screen.getByRole('button', { name: '+ Nuevo' })).toBeDisabled();
  });
});

describe('TechniqueItemActions', () => {
  it('ordena Consultar, Editar y Eliminar y usa secundario y peligro', () => {
    render(<TechniqueItemActions onEliminar={() => {}} onEditar={() => {}} onConsultar={() => {}} />);
    const botones = screen.getAllByRole('button');
    expect(botones.map((b) => b.textContent)).toEqual(['Consultar', 'Editar', 'Eliminar']);
    expect(botones[0]).toHaveClass('secondary');
    expect(botones[1]).toHaveClass('secondary');
    expect(botones[2]).toHaveClass('danger');
  });
  it('muestra solo las acciones que recibe', () => {
    render(<TechniqueItemActions onConsultar={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Consultar' })).toBeInTheDocument();
  });
  it('permite otra etiqueta de consulta, estado abierto y eliminando', () => {
    const { rerender } = render(<TechniqueItemActions onConsultar={() => {}} etiquetaConsultar="Abrir" />);
    expect(screen.getByRole('button', { name: 'Abrir' })).toBeInTheDocument();
    rerender(<TechniqueItemActions onConsultar={() => {}} consultando />);
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    rerender(<TechniqueItemActions onEliminar={() => {}} eliminando />);
    expect(screen.getByRole('button', { name: 'Eliminando…' })).toBeInTheDocument();
  });
  it('desactiva todas las acciones con disabled y llama a cada callback', () => {
    const onEditar = vi.fn();
    const { rerender } = render(<TechniqueItemActions onEditar={onEditar} onEliminar={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(onEditar).toHaveBeenCalledTimes(1);
    rerender(<TechniqueItemActions onEditar={onEditar} onEliminar={() => {}} disabled />);
    screen.getAllByRole('button').forEach((b) => expect(b).toBeDisabled());
  });
});

describe('TechniqueListParts', () => {
  it('muestra título, contador y control de vista', () => {
    render(<TechniqueListHead titulo="Perfiles" cantidad={3} vista={<button type="button" className="secondary">Ver Matriz</button>} />);
    expect(screen.getByRole('heading', { name: 'Perfiles' })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver Matriz' })).toBeInTheDocument();
  });
  it('omite contador y vista si no se pasan', () => {
    const { container } = render(<TechniqueListHead titulo="Perfiles" />);
    expect(container.querySelector('.short-id')).toBeNull();
    expect(container.querySelector('.technique-list-view')).toBeNull();
  });
  it('presenta el vacío estándar con icono, título y frase', () => {
    const { container } = render(<TechniqueEmpty titulo="Sin datos" texto="Crea el primero." icono={<span data-testid="icono" />} />);
    const vacio = container.querySelector('.empty-state') as HTMLElement;
    expect(within(vacio).getByText('Sin datos')).toBeInTheDocument();
    expect(within(vacio).getByText('Crea el primero.')).toBeInTheDocument();
    expect(within(vacio).getByTestId('icono')).toBeInTheDocument();
  });
});

describe('TechniquePage: baja al formulario', () => {
  const scrollIntoView = vi.fn();
  const matchMedia = vi.fn();
  const formulario = <form><h2>Nueva persona</h2><input aria-label="nombre" /></form>;
  const pagina = (f?: React.ReactNode) => <TechniquePage cabecera={<p>cabecera</p>} formulario={f} lista={<p>lista</p>} />;

  beforeEach(() => {
    scrollIntoView.mockReset();
    matchMedia.mockReset().mockReturnValue({ matches: false });
    Element.prototype.scrollIntoView = scrollIntoView;
    window.matchMedia = matchMedia as unknown as typeof window.matchMedia;
  });
  afterEach(() => { delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView; delete (window as { matchMedia?: unknown }).matchMedia; });

  it('no baja en el primer montaje aunque el formulario ya esté presente', () => {
    render(pagina(formulario));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
  it('baja con movimiento suave al pasar de vacío a presente y deja el foco en el título', () => {
    const { rerender } = render(pagina(false));
    expect(scrollIntoView).not.toHaveBeenCalled();
    rerender(pagina(formulario));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
    expect(screen.getByRole('heading', { name: 'Nueva persona' })).toHaveFocus();
  });
  it('usa behavior auto con prefers-reduced-motion', () => {
    matchMedia.mockReturnValue({ matches: true });
    const { rerender } = render(pagina());
    rerender(pagina(formulario));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
  });
  it('deja el foco en el ancla si el formulario aún no tiene título', () => {
    const { rerender, container } = render(pagina(null));
    rerender(pagina(<form aria-label="cargando" />));
    expect(container.querySelector('.technique-form-anchor')).toHaveFocus();
  });
  it('no vuelve a bajar si el formulario sigue presente tras un rerender', () => {
    const { rerender } = render(pagina(false));
    rerender(pagina(formulario));
    rerender(pagina(<form><h2>Nueva persona</h2><input aria-label="nombre" defaultValue="x" /></form>));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
  it('sin formulario no agrega el ancla y conserva el orden de los slots', () => {
    const { container } = render(pagina());
    expect(container.querySelector('.technique-form-anchor')).toBeNull();
  });
});
