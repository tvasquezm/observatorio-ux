import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PerspectivePreviewNotice } from '../PerspectivePreviewNotice';

describe('PerspectivePreviewNotice', () => {
  it('no se muestra cuando la perspectiva coincide con el rol de la cuenta', () => {
    const { container } = render(
      <PerspectivePreviewNotice accountRole="ADMIN" activeRole="ADMIN" onRestore={() => {}} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('explica la vista temporal y permite volver al rol de la cuenta', () => {
    const onRestore = vi.fn();
    render(
      <PerspectivePreviewNotice accountRole="ADMIN" activeRole="ESTUDIANTE" onRestore={onRestore} />,
    );

    expect(screen.getByText('Vista previa: Estudiante')).toBeInTheDocument();
    expect(screen.getByText('Tu cuenta sigue siendo Administrador.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver a Administrador' }));
    expect(onRestore).toHaveBeenCalledOnce();
  });
});
