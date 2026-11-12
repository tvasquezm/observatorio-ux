import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SalaBadge } from './SalaBadge';

describe('SalaBadge', () => {
  it('acompaña el color con una inicial y lo mantiene estable para la misma sala', () => {
    const { rerender } = render(<SalaBadge id="sala-1" nombre="Diseño" />);
    const color = screen.getByText('D').getAttribute('style');
    rerender(<SalaBadge id="sala-1" nombre="Investigación" />);
    expect(screen.getByText('I')).toHaveAttribute('style', color);
  });
});
