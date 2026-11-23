import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import { askConfirm } from '../../api/confirm';
import { ConfirmDialog } from './ConfirmDialog';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function close() { this.removeAttribute('open'); };
});

function Harness({ texto }: { texto?: string }) {
  const [resultado, setResultado] = useState('pendiente');
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const etiquetas = texto ? { requireText: texto, confirmLabel: 'Eliminar' } : {};
          setResultado(String(await askConfirm('¿Eliminar la sala "Sala Demo 2026"? Se puede recuperar dentro de 20 días.', etiquetas)));
        }}
      >
        Eliminar sala
      </button>
      <output aria-label="resultado">{resultado}</output>
      <ConfirmDialog />
    </>
  );
}

function montar(texto?: string) {
  render(<Harness texto={texto} />);
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar sala' }));
}

describe('diálogo de confirmación simple', () => {
  it('mantiene el diálogo de siempre, con el foco en Cancelar', async () => {
    montar();
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveTextContent('¿Eliminar la sala "Sala Demo 2026"?');
    expect(screen.queryByLabelText(/Escribe «/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(screen.getByLabelText('resultado')).toHaveTextContent('true'));
  });

  it('cancela con Escape sin pedir texto', async () => {
    montar();
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true }));
    await waitFor(() => expect(screen.getByLabelText('resultado')).toHaveTextContent('false'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('confirmación escrita', () => {
  it('muestra la instrucción, enfoca el campo y deshabilita el botón hasta que coincide', async () => {
    montar('Sala Demo 2026');
    expect(screen.getByText('¿Eliminar la sala "Sala Demo 2026"? Se puede recuperar dentro de 20 días.')).toBeVisible();
    const campo = screen.getByLabelText('Escribe «Sala Demo 2026» para confirmar');
    expect(campo).toHaveFocus();
    expect(campo).toHaveAttribute('aria-describedby');
    const confirmar = screen.getByRole('button', { name: 'Eliminar' });
    expect(confirmar).toBeDisabled();

    await userEvent.type(campo, 'Sala Demo');
    expect(confirmar).toBeDisabled();

    await userEvent.type(campo, ' 2026');
    expect(confirmar).toBeEnabled();
    await userEvent.click(confirmar);
    await waitFor(() => expect(screen.getByLabelText('resultado')).toHaveTextContent('true'));
  });

  it('distingue mayúsculas y minúsculas', async () => {
    montar('Sala Demo 2026');
    await userEvent.type(screen.getByLabelText('Escribe «Sala Demo 2026» para confirmar'), 'sala demo 2026');
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled();
  });

  it('ignora los espacios sobrantes y confirma con Enter solo si coincide', async () => {
    montar('Sala Demo 2026');
    const campo = screen.getByLabelText('Escribe «Sala Demo 2026» para confirmar');
    await userEvent.type(campo, '  Sala Demo 2026  ');
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeEnabled();
    await userEvent.type(campo, '{Enter}');
    await waitFor(() => expect(screen.getByLabelText('resultado')).toHaveTextContent('true'));
  });

  it('con texto incompleto, Enter no confirma', async () => {
    montar('Sala Demo 2026');
    await userEvent.type(screen.getByLabelText('Escribe «Sala Demo 2026» para confirmar'), 'Sala{Enter}');
    expect(screen.getByLabelText('resultado')).toHaveTextContent('pendiente');
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it('Escape cancela y deja el campo vacío para la próxima vez', async () => {
    montar('Sala Demo 2026');
    await userEvent.type(screen.getByLabelText('Escribe «Sala Demo 2026» para confirmar'), 'Sala Demo');
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true }));
    await waitFor(() => expect(screen.getByLabelText('resultado')).toHaveTextContent('false'));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar sala' }));
    expect(await screen.findByLabelText('Escribe «Sala Demo 2026» para confirmar')).toHaveValue('');
  });
});
