import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampoUrl, partesUrl, urlCompleta } from './CampoUrl';

function Controlado({ inicial = '', onValor }: { inicial?: string; onValor: (v: string) => void }) {
  const [v, setV] = useState(inicial);
  return <label>Sitio<CampoUrl value={v} onChange={(x) => { setV(x); onValor(x); }} /></label>;
}

describe('partesUrl y urlCompleta', () => {
  it('separa el esquema y asume https si falta', () => {
    expect(partesUrl('https://www.utem.cl')).toEqual({ esquema: 'https://', resto: 'www.utem.cl' });
    expect(partesUrl('HTTP://utem.cl/a')).toEqual({ esquema: 'http://', resto: 'utem.cl/a' });
    expect(partesUrl('www.utem.cl')).toEqual({ esquema: 'https://', resto: 'www.utem.cl' });
    expect(partesUrl('')).toEqual({ esquema: 'https://', resto: '' });
  });
  it('arma la URL completa, respeta un esquema pegado y devuelve vacío sin texto', () => {
    expect(urlCompleta('www.utem.cl')).toBe('https://www.utem.cl');
    expect(urlCompleta(' www.utem.cl ')).toBe('https://www.utem.cl');
    expect(urlCompleta('http://utem.cl')).toBe('http://utem.cl');
    expect(urlCompleta('   ')).toBe('');
    expect(urlCompleta('utem.cl', 'http://')).toBe('http://utem.cl');
  });
});

describe('CampoUrl', () => {
  it('muestra https:// como prefijo y entrega la URL completa al escribir solo el dominio', async () => {
    const onValor = vi.fn();
    render(<Controlado onValor={onValor} />);
    expect(screen.getByText('https://')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox'), 'www.utem.cl');
    expect(onValor).toHaveBeenLastCalledWith('https://www.utem.cl');
    expect(screen.getByRole('textbox')).toHaveValue('www.utem.cl');
  });
  it('si se pega una URL con esquema no duplica el prefijo', async () => {
    const onValor = vi.fn();
    render(<Controlado onValor={onValor} />);
    await userEvent.click(screen.getByRole('textbox'));
    await userEvent.paste('https://www.utem.cl/portal');
    expect(onValor).toHaveBeenLastCalledWith('https://www.utem.cl/portal');
    expect(screen.getByRole('textbox')).toHaveValue('www.utem.cl/portal');
  });
  it('muestra una URL guardada sin el esquema y vacía el valor al borrar', async () => {
    const onValor = vi.fn();
    render(<Controlado inicial="http://utem.cl" onValor={onValor} />);
    expect(screen.getByText('http://')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('utem.cl');
    await userEvent.clear(screen.getByRole('textbox'));
    expect(onValor).toHaveBeenLastCalledWith('');
  });
});
