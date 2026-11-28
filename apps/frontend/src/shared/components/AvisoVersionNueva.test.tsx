import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// En las pruebas la versión del paquete no está definida ('desarrollo'): se simula una compilación publicada.
vi.mock('../version', () => ({ VERSION_APP: 'abc1234', FECHA_COMPILACION: '2026-11-28', ETIQUETA_VERSION: 'abc1234 · 2026-11-28' }));

import { AvisoVersionNueva } from './AvisoVersionNueva';

describe('AvisoVersionNueva', () => {
  it('invita a actualizar cuando el servidor publicó otra versión', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'zzz9999' }) }));
    render(<AvisoVersionNueva />);
    expect(await screen.findByRole('status')).toHaveTextContent(/versión nueva/i);
    expect(screen.getByRole('button', { name: 'Actualizar ahora' })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('no muestra nada si la versión es la misma o no se pudo consultar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'abc1234' }) }));
    const { container, rerender } = render(<AvisoVersionNueva />);
    await Promise.resolve();
    expect(container).toBeEmptyDOMElement();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')));
    rerender(<AvisoVersionNueva />);
    await Promise.resolve();
    expect(container).toBeEmptyDOMElement();
    vi.unstubAllGlobals();
  });
});
