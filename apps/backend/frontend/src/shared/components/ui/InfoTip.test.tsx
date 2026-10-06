import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InfoTip } from './InfoTip';

function setup() {
  render(
    <div>
      <InfoTip label="Ayuda de prueba">Texto de ayuda</InfoTip>
      <button type="button">afuera</button>
    </div>,
  );
  return screen.getByRole('button', { name: 'Ayuda de prueba' });
}

describe('InfoTip', () => {
  it('arranca cerrado y deja el contenido en el DOM', () => {
    const btn = setup();
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Texto de ayuda')).toBeInTheDocument();
  });

  it('abre con clic y cierra con un segundo clic', async () => {
    const btn = setup();
    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('abre con hover y cierra al salir', async () => {
    const btn = setup();
    await userEvent.hover(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    await userEvent.unhover(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('abre con foco de teclado y cierra al perderlo', async () => {
    const btn = setup();
    await userEvent.tab();
    expect(btn).toHaveFocus();
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    await userEvent.tab();
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('cierra con Escape', async () => {
    const btn = setup();
    await userEvent.click(btn);
    await userEvent.keyboard('{Escape}');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('cierra con clic fuera', async () => {
    const btn = setup();
    await userEvent.click(btn);
    await userEvent.click(screen.getByRole('button', { name: 'afuera' }));
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('align start ancla el panel a la izquierda', () => {
    render(<InfoTip label="Ayuda" align="start">Hola</InfoTip>);
    expect(screen.getByText('Hola').classList.contains('start')).toBe(true);
  });
});
