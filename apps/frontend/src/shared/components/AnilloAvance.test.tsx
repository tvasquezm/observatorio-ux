import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnilloAvance } from './AnilloAvance';

function arco(container: HTMLElement) {
  return container.querySelector('.tv-anillo-arco') as SVGCircleElement;
}

describe('AnilloAvance', () => {
  it('describe el avance con texto accesible', () => {
    render(<AnilloAvance hecho={3} total={10} />);
    expect(screen.getByRole('img', { name: '3 de 10' })).toBeInTheDocument();
    expect(screen.getByText('3/10')).toBeInTheDocument();
  });

  it('suma la etiqueta al nombre accesible', () => {
    render(<AnilloAvance hecho={2} total={5} etiqueta="preguntas" />);
    expect(screen.getByRole('img', { name: '2 de 5 preguntas' })).toBeInTheDocument();
  });

  it('llena el arco en proporción al avance', () => {
    const { container } = render(<AnilloAvance hecho={1} total={4} />);
    expect(arco(container).getAttribute('stroke-dashoffset')).toBe('0.75');
  });

  it('con total 0 queda vacío y sin dividir por cero', () => {
    const { container } = render(<AnilloAvance hecho={0} total={0} />);
    expect(screen.getByRole('img', { name: '0 de 0' })).toBeInTheDocument();
    expect(arco(container).getAttribute('stroke-dashoffset')).toBe('1');
    expect(container.querySelector('.tv-anillo--completo')).toBeNull();
  });

  it('recorta un avance mayor al total', () => {
    const { container } = render(<AnilloAvance hecho={9} total={4} />);
    expect(screen.getByRole('img', { name: '4 de 4, completo' })).toBeInTheDocument();
    expect(arco(container).getAttribute('stroke-dashoffset')).toBe('0');
  });

  it('en tamaños chicos omite el texto central y conserva el nombre accesible', () => {
    render(<AnilloAvance hecho={1} total={2} tamano={28} />);
    expect(screen.queryByText('1/2')).toBeNull();
    expect(screen.getByRole('img', { name: '1 de 2' })).toBeInTheDocument();
  });

  it('no celebra al abrir algo que ya estaba completo', () => {
    const { container } = render(<AnilloAvance hecho={3} total={3} />);
    expect(container.querySelector('.tv-anillo--completo')).not.toBeNull();
    expect(container.querySelector('.tv-anillo--recien')).toBeNull();
  });

  it('celebra solo al pasar a completo con la pantalla abierta', () => {
    const { container, rerender } = render(<AnilloAvance hecho={2} total={3} />);
    expect(container.querySelector('.tv-anillo--recien')).toBeNull();
    rerender(<AnilloAvance hecho={3} total={3} />);
    expect(container.querySelector('.tv-anillo--recien')).not.toBeNull();
    expect(screen.getByRole('img', { name: '3 de 3, completo' })).toBeInTheDocument();
    rerender(<AnilloAvance hecho={2} total={3} />);
    expect(container.querySelector('.tv-anillo--recien')).toBeNull();
    expect(container.querySelector('.tv-anillo--completo')).toBeNull();
  });
});
