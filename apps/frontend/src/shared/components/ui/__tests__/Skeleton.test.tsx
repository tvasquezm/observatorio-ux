import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from '../Skeleton';

describe('Skeleton', () => {
  it('anuncia qué se carga y deja las formas fuera del árbol accesible', () => {
    const { container } = render(<Skeleton etiqueta="Cargando proyectos…" variante="tarjetas" cantidad={4} />);
    const estado = screen.getByRole('status', { name: 'Cargando proyectos…' });
    expect(estado).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelectorAll('.skeleton-tarjeta')).toHaveLength(4);
    expect(container.querySelector('.skeleton-tarjetas')?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('cada variante dibuja su forma', () => {
    for (const [variante, clase] of [['lista', '.skeleton-fila'], ['texto', '.skeleton-linea'], ['panel', '.skeleton-titulo'], ['pantalla', '.skeleton-pantalla']] as const) {
      const { container, unmount } = render(<Skeleton etiqueta="Cargando…" variante={variante} />);
      expect(container.querySelector(clase), variante).not.toBeNull();
      unmount();
    }
  });
});
