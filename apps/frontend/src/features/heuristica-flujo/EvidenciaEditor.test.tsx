import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EVIDENCIA_MAX_BYTES } from '@observatorio-ux/shared-types';
import { EvidenciaEditor } from './EvidenciaEditor';

const api = vi.hoisted(() => ({ cargarEvidencia: vi.fn(), subirEvidenciaFlujo: vi.fn(), guardarAnotaciones: vi.fn() }));
vi.mock('./evidencia.api', () => api);
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const png = (name = 'a.png') => new File([new Uint8Array(PNG)], name, { type: 'image/png' });
const meta = { id: 'cap1', evaluacionId: 'ev1', autorId: 'u1', mimeType: 'image/png', tamano: 5, anotaciones: [], revision: 0, createdAt: '2026-10-09' };
function abrir(editable = true, onPendingChange = vi.fn()) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <EvidenciaEditor proyectoId="p1" evaluacionId="ev1" evidenciaIds={['cap1']} editable={editable} onChange={vi.fn()} onPendingChange={onPendingChange} />
  </QueryClientProvider>);
}
/** Dibuja sobre la captura simulando el puntero; el lienzo se mide como 1000×1000 para usar coordenadas ‰. */
function dibujar(de: [number, number], a: [number, number]) {
  const svg = screen.getByLabelText('Vista de las anotaciones');
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000, x: 0, y: 0, toJSON: () => ({}) });
  const evento = (tipo: string, [x, y]: [number, number]) => act(() => { svg.dispatchEvent(new MouseEvent(tipo, { clientX: x, clientY: y, bubbles: true })); });
  evento('pointerdown', de); evento('pointermove', a); evento('pointerup', a);
}
const rectangulo = () => dibujar([100, 100], [500, 500]);
beforeEach(() => {
  vi.resetAllMocks();
  Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:captura'), configurable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
  api.cargarEvidencia.mockResolvedValue({ meta, blob: new Blob(['png'], { type: 'image/png' }) });
  api.guardarAnotaciones.mockImplementation(async (_p, _e, _i, anotaciones, revision) => ({ ...meta, anotaciones, revision: revision + 1 }));
});
describe('EvidenciaEditor', () => {
  it('anota dibujando, permite deshacer y guarda separado de la imagen original', async () => {
    const pending = vi.fn();
    abrir(true, pending);
    await screen.findByAltText('Captura de evidencia');
    rectangulo();
    expect(screen.getByLabelText('Anotaciones de la captura')).toHaveTextContent('Rectángulo');
    expect(pending).toHaveBeenLastCalledWith(true);
    await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(screen.queryByRole('button', { name: 'Eliminar anotación 1' })).not.toBeInTheDocument();
    rectangulo();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar anotaciones' }));
    expect(api.guardarAnotaciones).toHaveBeenCalledWith('p1', 'ev1', 'cap1', [expect.objectContaining({ tipo: 'rectangulo', x: 0.1, y: 0.1, x2: 0.5, y2: 0.5 })], 0);
    await screen.findByText('Anotaciones guardadas.');
    expect(api.subirEvidenciaFlujo).not.toHaveBeenCalled();
  });
  it('dibujar crea la anotación con la forma y el color elegidos', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    await userEvent.click(screen.getByRole('button', { name: 'Flecha' }));
    expect(screen.getByRole('button', { name: 'Flecha' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByLabelText('Color'), { target: { value: '#00ff00' } });
    dibujar([200, 300], [600, 700]);
    expect(screen.getByLabelText('Forma de la anotación 1')).toHaveValue('flecha');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar anotaciones' }));
    expect(api.guardarAnotaciones).toHaveBeenCalledWith('p1', 'ev1', 'cap1', [expect.objectContaining({ tipo: 'flecha', color: '#00ff00', x: 0.2, y: 0.3, x2: 0.6, y2: 0.7 })], 0);
  });
  it('un clic sin arrastrar abre la captura en grande y no crea anotación', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    dibujar([300, 300], [300, 300]);
    expect(screen.getByRole('dialog', { name: 'Captura ampliada' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar anotación 1' })).not.toBeInTheDocument();
  });
  it('ya no ofrece campos de posición, herramienta Texto ni agregar manual', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    expect(screen.queryByLabelText(/Inicio horizontal|Fin vertical/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Texto' })).not.toBeInTheDocument();
    expect(screen.queryByText('Agregar o editar anotaciones')).not.toBeInTheDocument();
    expect(screen.getByText('Dibuja sobre la captura para marcar el problema')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Rectángulo|Círculo|Flecha|Destacado/ })).toHaveLength(4);
  });
  it('cambia color y forma desde la tarjeta, entra al Deshacer y se guarda', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    rectangulo();
    fireEvent.change(screen.getByLabelText('Color de la anotación 1'), { target: { value: '#0000ff' } });
    await userEvent.selectOptions(screen.getByLabelText('Forma de la anotación 1'), 'circulo');
    expect(screen.getByLabelText('Forma de la anotación 1')).toHaveValue('circulo');
    await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(screen.getByLabelText('Forma de la anotación 1')).toHaveValue('rectangulo');
    await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(screen.getByLabelText('Color de la anotación 1')).toHaveValue('#d83232');
    fireEvent.change(screen.getByLabelText('Color de la anotación 1'), { target: { value: '#0000ff' } });
    await userEvent.selectOptions(screen.getByLabelText('Forma de la anotación 1'), 'destacado');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar anotaciones' }));
    expect(api.guardarAnotaciones).toHaveBeenCalledWith('p1', 'ev1', 'cap1', [expect.objectContaining({ tipo: 'destacado', color: '#0000ff' })], 0);
  });
  it('resalta la marca al enfocar su tarjeta y lo quita al salir', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    rectangulo();
    const svg = screen.getByLabelText('Vista de las anotaciones');
    const tarjeta = screen.getByRole('listitem', { name: 'Anotación 1' });
    expect(svg.querySelector('.evidencia-marca--resaltada')).toBeNull();
    act(() => tarjeta.focus());
    expect(svg.querySelector('.evidencia-marca--resaltada')).not.toBeNull();
    act(() => tarjeta.blur());
    expect(svg.querySelector('.evidencia-marca--resaltada')).toBeNull();
    await userEvent.hover(tarjeta);
    expect(svg.querySelector('.evidencia-marca--resaltada')).not.toBeNull();
  });
  const guardada = async (i = 0) => {
    await userEvent.click(screen.getByRole('button', { name: 'Guardar anotaciones' }));
    const llamada = api.guardarAnotaciones.mock.calls.at(-1)!;
    return llamada[3][i] as { x: number; y: number; x2: number; y2: number; tipo: string };
  };
  const tiradores = () => screen.getByLabelText('Vista de las anotaciones').querySelectorAll('.evidencia-tirador');
  it('un clic sobre una marca la selecciona con tiradores y no abre la captura en grande', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    rectangulo();
    expect(tiradores()).toHaveLength(0);
    dibujar([300, 300], [300, 300]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tiradores()).toHaveLength(4);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    dibujar([800, 800], [800, 800]);
    expect(screen.getByRole('dialog', { name: 'Captura ampliada' })).toBeInTheDocument();
    expect(tiradores()).toHaveLength(0);
  });
  it('mueve una anotación arrastrándola con el ratón', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    rectangulo();
    dibujar([300, 300], [400, 350]);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    const a = await guardada();
    expect(a.x).toBeCloseTo(0.2); expect(a.y).toBeCloseTo(0.15); expect(a.x2).toBeCloseTo(0.6); expect(a.y2).toBeCloseTo(0.55);
  });
  it('al mover, la marca no sale de la captura (0–1) y conserva su tamaño', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    rectangulo();
    dibujar([300, 300], [900, 900]);
    const a = await guardada();
    expect(a.x2).toBeCloseTo(1); expect(a.y2).toBeCloseTo(1); expect(a.x).toBeCloseTo(0.6); expect(a.y).toBeCloseTo(0.6);
  });
  it('redimensiona una forma con el tirador de su esquina', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    rectangulo();
    dibujar([300, 300], [300, 300]);
    dibujar([500, 500], [700, 800]);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    const a = await guardada();
    expect([a.x, a.y, a.x2, a.y2]).toEqual([0.1, 0.1, 0.7, 0.8]);
  });
  it('redimensiona desde la esquina superior izquierda manteniendo fija la opuesta', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    rectangulo();
    dibujar([300, 300], [300, 300]);
    dibujar([100, 100], [2000, -50]);
    const a = await guardada();
    expect(a.x).toBe(0.5); expect(a.y).toBe(0.5); expect(a.x2).toBe(1); expect(a.y2).toBe(0);
  });
  it('redimensiona una flecha moviendo su inicio o su fin', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    await userEvent.click(screen.getByRole('button', { name: 'Flecha' }));
    dibujar([200, 300], [600, 700]);
    dibujar([400, 500], [400, 500]);
    expect(tiradores()).toHaveLength(2);
    dibujar([600, 700], [800, 900]);
    dibujar([200, 300], [100, 100]);
    const a = await guardada();
    expect([a.x, a.y, a.x2, a.y2]).toEqual([0.1, 0.1, 0.8, 0.9]);
  });
  it('cada gesto de mover o redimensionar es un solo paso de Deshacer', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    rectangulo();
    dibujar([300, 300], [400, 300]);
    dibujar([600, 500], [700, 700]);
    await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    const a = await guardada();
    expect(a.x).toBeCloseTo(0.2); expect(a.x2).toBeCloseTo(0.6); expect(a.y2).toBeCloseTo(0.5);
  });
  it('deshacer paso a paso vuelve de redimensionar a mover, al trazo original y a vacío', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    rectangulo();
    dibujar([300, 300], [400, 300]);
    dibujar([600, 500], [700, 700]);
    const deshacer = screen.getByRole('button', { name: 'Deshacer' });
    await userEvent.click(deshacer);
    await userEvent.click(deshacer);
    const a = await guardada();
    expect([a.x, a.y, a.x2, a.y2]).toEqual([0.1, 0.1, 0.5, 0.5]);
  });
  it('un gesto de arrastre completo agrega un solo paso al historial', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    rectangulo();
    dibujar([300, 300], [400, 300]);
    const deshacer = screen.getByRole('button', { name: 'Deshacer' });
    await userEvent.click(deshacer);
    await userEvent.click(deshacer);
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    expect(deshacer).toBeDisabled();
  });
  it('dibujar en vacío con una marca existente crea una nueva sin mover la anterior', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    rectangulo();
    dibujar([700, 700], [900, 900]);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    const primera = await guardada(0);
    expect([primera.x, primera.y, primera.x2, primera.y2]).toEqual([0.1, 0.1, 0.5, 0.5]);
  });
  const tarjeta = (n = 1) => screen.getByRole('listitem', { name: `Anotación ${n}` });
  it('con la tarjeta enfocada, las flechas mueven la anotación y entran al Deshacer', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    rectangulo();
    act(() => tarjeta().focus());
    fireEvent.keyDown(tarjeta(), { key: 'ArrowRight' });
    fireEvent.keyDown(tarjeta(), { key: 'ArrowDown' });
    expect(tiradores()).toHaveLength(4);
    await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    const a = await guardada();
    expect(a.x).toBeCloseTo(0.11); expect(a.y).toBeCloseTo(0.1); expect(a.x2).toBeCloseTo(0.51); expect(a.y2).toBeCloseTo(0.5);
  });
  it('Mayús+flechas redimensionan sin mover el origen y respetan los bordes', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    rectangulo();
    act(() => tarjeta().focus());
    fireEvent.keyDown(tarjeta(), { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(tarjeta(), { key: 'ArrowUp', shiftKey: true });
    let a = await guardada();
    expect(a.x).toBeCloseTo(0.1); expect(a.y).toBeCloseTo(0.1); expect(a.x2).toBeCloseTo(0.51); expect(a.y2).toBeCloseTo(0.49);
    for (let i = 0; i < 100; i++) fireEvent.keyDown(tarjeta(), { key: 'ArrowRight', shiftKey: true });
    for (let i = 0; i < 100; i++) fireEvent.keyDown(tarjeta(), { key: 'ArrowUp', shiftKey: true });
    a = await guardada();
    expect(a.x2).toBe(1); expect(a.y2).toBeCloseTo(0.11); expect(a.y).toBe(0.1);
  });
  it('Mayús+flechas mueven el fin de una flecha y las flechas la desplazan entera', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    await userEvent.click(screen.getByRole('button', { name: 'Flecha' }));
    dibujar([200, 300], [600, 700]);
    act(() => tarjeta().focus());
    fireEvent.keyDown(tarjeta(), { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyDown(tarjeta(), { key: 'ArrowLeft' });
    const a = await guardada();
    expect(a.x).toBeCloseTo(0.19); expect(a.y).toBeCloseTo(0.3); expect(a.x2).toBeCloseTo(0.59); expect(a.y2).toBeCloseTo(0.71);
  });
  it('las flechas en el color o la forma de la tarjeta no mueven la anotación', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    rectangulo();
    fireEvent.keyDown(screen.getByLabelText('Forma de la anotación 1'), { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByLabelText('Color de la anotación 1'), { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: 'Deshacer' }).getAttribute('disabled')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
  it('Tab no queda atrapado: la tarjeta no intercepta otras teclas', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    rectangulo();
    act(() => tarjeta().focus());
    expect(fireEvent.keyDown(tarjeta(), { key: 'Tab' })).toBe(true);
    expect(fireEvent.keyDown(tarjeta(), { key: 'ArrowLeft', ctrlKey: true })).toBe(true);
    expect(fireEvent.keyDown(tarjeta(), { key: 'ArrowLeft' })).toBe(false);
  });
  it('en solo lectura y con anotaciones de texto las flechas no cambian nada', async () => {
    api.cargarEvidencia.mockResolvedValue({ meta: { ...meta, anotaciones: [{ id: 't1', tipo: 'texto', x: 0.2, y: 0.2, x2: 0.2, y2: 0.2, color: '#d83232', texto: 'Revisar' }] }, blob: new Blob(['png'], { type: 'image/png' }) });
    abrir();
    await screen.findByAltText('Captura de evidencia');
    act(() => tarjeta().focus());
    fireEvent.keyDown(tarjeta(), { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: 'Guardar anotaciones' })).toBeDisabled();
  });
  it('el teclado marca cambios sin guardar, avisa al salir y deja de avisar al guardar', async () => {
    const pending = vi.fn();
    abrir(true, pending);
    await screen.findByAltText('Captura de evidencia');
    rectangulo();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar anotaciones' }));
    await screen.findByText('Anotaciones guardadas.');
    expect(pending).toHaveBeenLastCalledWith(false);
    act(() => tarjeta().focus());
    fireEvent.keyDown(tarjeta(), { key: 'ArrowRight' });
    expect(pending).toHaveBeenLastCalledWith(true);
    expect(screen.getByText('Anotaciones pendientes de guardar.')).toBeInTheDocument();
    const salir = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(salir);
    expect(salir.defaultPrevented).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar anotaciones' }));
    await screen.findByText('Anotaciones guardadas.');
    const libre = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(libre);
    expect(libre.defaultPrevented).toBe(false);
  });
  it('con 50 anotaciones no se crea la 51 pero sí se puede mover con teclado', async () => {
    const cincuenta = Array.from({ length: 50 }, (_, i) => ({ id: `a${i}`, tipo: 'rectangulo' as const, x: 0.1, y: 0.1, x2: 0.2, y2: 0.2, color: '#d83232', texto: '' }));
    api.cargarEvidencia.mockResolvedValue({ meta: { ...meta, anotaciones: cincuenta }, blob: new Blob(['png'], { type: 'image/png' }) });
    abrir();
    await screen.findByAltText('Captura de evidencia');
    dibujar([700, 700], [900, 900]);
    expect(screen.getByRole('alert')).toHaveTextContent('Máximo 50 anotaciones por captura.');
    expect(screen.getAllByRole('listitem')).toHaveLength(50);
    act(() => tarjeta(50).focus());
    fireEvent.keyDown(tarjeta(50), { key: 'ArrowRight' });
    expect(screen.getAllByRole('listitem')).toHaveLength(50);
    expect(screen.getByText('Anotaciones pendientes de guardar.')).toBeInTheDocument();
  });
  it('el historial de Deshacer conserva solo 50 pasos con el teclado', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    rectangulo();
    act(() => tarjeta().focus());
    for (let i = 0; i < 60; i++) fireEvent.keyDown(tarjeta(), { key: i % 2 ? 'ArrowLeft' : 'ArrowRight' });
    const deshacer = screen.getByRole('button', { name: 'Deshacer' });
    for (let i = 0; i < 50; i++) await userEvent.click(deshacer);
    expect(deshacer).toBeDisabled();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });
  it('una anotación antigua de texto se muestra y se puede eliminar, pero no editar', async () => {
    api.cargarEvidencia.mockResolvedValue({ meta: { ...meta, anotaciones: [{ id: 't1', tipo: 'texto', x: 0.2, y: 0.2, x2: 0.2, y2: 0.2, color: '#d83232', texto: 'Revisar botón' }] }, blob: new Blob(['png'], { type: 'image/png' }) });
    abrir();
    await screen.findByAltText('Captura de evidencia');
    const tarjeta = screen.getByRole('listitem', { name: 'Anotación 1' });
    expect(tarjeta).toHaveTextContent('Texto: Revisar botón');
    expect(screen.getByLabelText('Vista de las anotaciones')).toHaveTextContent('Revisar botón');
    expect(within(tarjeta).queryByLabelText('Forma de la anotación 1')).not.toBeInTheDocument();
    expect(within(tarjeta).queryByLabelText('Color de la anotación 1')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar anotación 1' }));
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar anotaciones' }));
    expect(api.guardarAnotaciones).toHaveBeenCalledWith('p1', 'ev1', 'cap1', [], 0);
  });
  it('conserva las anotaciones cuando falla el guardado y permite reintentar', async () => {
    api.guardarAnotaciones.mockRejectedValueOnce(new Error('Sin conexión'));
    abrir();
    await screen.findByAltText('Captura de evidencia');
    rectangulo();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar anotaciones' }));
    await screen.findByText('Sin conexión');
    expect(screen.getByRole('button', { name: 'Eliminar anotación 1' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar anotaciones' }));
    await screen.findByText('Anotaciones guardadas.');
  });
  it('solo lectura permite alternar el original pero no editar ni subir', async () => {
    abrir(false);
    await screen.findByAltText('Captura de evidencia');
    expect(screen.queryByRole('toolbar', { name: 'Herramientas de anotación' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Adjuntar captura')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Mostrar imagen original' }));
  });
  it('conserva el borrador y su revisión ante conflicto con otra pestaña', async () => {
    api.guardarAnotaciones.mockRejectedValue(new Error('La captura cambió. Recupera las anotaciones guardadas.'));
    abrir();
    await screen.findByAltText('Captura de evidencia');
    rectangulo();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar anotaciones' }));
    await screen.findByText('La captura cambió. Recupera las anotaciones guardadas.');
    expect(screen.getByRole('button', { name: 'Eliminar anotación 1' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar anotaciones' }));
    expect(api.guardarAnotaciones).toHaveBeenLastCalledWith('p1', 'ev1', 'cap1', expect.any(Array), 0);
  });
  it('sinAnotar permite subir y quitar capturas sin herramientas de anotación', async () => {
    const onChange = vi.fn();
    api.subirEvidenciaFlujo.mockResolvedValue({ ...meta, id: 'cap2' });
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <EvidenciaEditor proyectoId="p1" evaluacionId="ev1" evidenciaIds={['cap1']} editable sinAnotar etiqueta="antes de la mejora 1" onChange={onChange} />
    </QueryClientProvider>);
    await screen.findByAltText('Captura de evidencia');
    expect(screen.queryByRole('toolbar', { name: 'Herramientas de anotación' })).not.toBeInTheDocument();
    await userEvent.upload(screen.getByLabelText(/Adjuntar captura antes de la mejora 1/), png());
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['cap1', 'cap2']));
    await userEvent.click(screen.getByRole('button', { name: 'Quitar captura antes de la mejora 1' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
  it('respeta el máximo de capturas indicado', async () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <EvidenciaEditor proyectoId="p1" evaluacionId="ev1" evidenciaIds={['cap1']} editable sinAnotar max={1} onChange={vi.fn()} />
    </QueryClientProvider>);
    await screen.findByAltText('Captura de evidencia');
    expect(screen.getByLabelText(/Adjuntar captura/)).toBeDisabled();
  });
  function abrirVacio(props: { max?: number; editable?: boolean; onChange?: (ids: string[]) => void } = {}) {
    const onChange = props.onChange ?? vi.fn();
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <EvidenciaEditor proyectoId="p1" evaluacionId="ev1" evidenciaIds={[]} editable={props.editable ?? true} sinAnotar max={props.max} onChange={onChange} />
    </QueryClientProvider>);
    return { onChange, zona: () => screen.getByRole('group', { name: /Zona de capturas/ }) };
  }
  it('indica el límite real de tamaño y las formas de adjuntar', () => {
    abrirVacio();
    expect(screen.getByText(/Máximo 4 MB por imagen/)).toBeInTheDocument();
    expect(screen.getByText(/arrastrar la imagen aquí o pegarla con Ctrl\+V/)).toBeInTheDocument();
  });
  it('sube una captura pegada y no hace nada si solo se pega texto', async () => {
    api.subirEvidenciaFlujo.mockResolvedValue({ ...meta, id: 'cap2' });
    const { onChange, zona } = abrirVacio();
    fireEvent.paste(zona(), { clipboardData: { files: [] } });
    expect(api.subirEvidenciaFlujo).not.toHaveBeenCalled();
    fireEvent.paste(zona(), { clipboardData: { files: [png('image.png')] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['cap2']));
  });
  it('sube en serie las capturas soltadas y respeta el cupo', async () => {
    api.subirEvidenciaFlujo.mockResolvedValueOnce({ ...meta, id: 'a' }).mockResolvedValueOnce({ ...meta, id: 'b' });
    const { onChange, zona } = abrirVacio({ max: 2 });
    fireEvent.drop(zona(), { dataTransfer: { files: [png('1.png'), png('2.png'), png('3.png')] } });
    await screen.findByText('Máximo 2 capturas en este problema.');
    expect(api.subirEvidenciaFlujo).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b']);
  });
  it('rechaza SVG y archivos disfrazados sin subirlos', async () => {
    const { zona } = abrirVacio();
    fireEvent.drop(zona(), { dataTransfer: { files: [new File(['<svg></svg>'], 'a.svg', { type: 'image/svg+xml' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/SVG/);
    fireEvent.drop(zona(), { dataTransfer: { files: [new File(['<script>x</script>'], 'a.png', { type: 'image/png' })] } });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Formato no permitido/));
    expect(api.subirEvidenciaFlujo).not.toHaveBeenCalled();
  });
  it('ignora una segunda subida mientras hay una en curso', async () => {
    let terminar: (v: unknown) => void = () => {};
    api.subirEvidenciaFlujo.mockImplementation(() => new Promise(resolve => { terminar = resolve; }));
    const { zona } = abrirVacio();
    fireEvent.paste(zona(), { clipboardData: { files: [png()] } });
    await waitFor(() => expect(api.subirEvidenciaFlujo).toHaveBeenCalledTimes(1));
    fireEvent.paste(zona(), { clipboardData: { files: [png()] } });
    fireEvent.drop(zona(), { dataTransfer: { files: [png()] } });
    terminar({ ...meta, id: 'cap9' });
    await waitFor(() => expect(screen.queryByText(/Subiendo captura/)).not.toBeInTheDocument());
    expect(api.subirEvidenciaFlujo).toHaveBeenCalledTimes(1);
  });
  it('en solo lectura no acepta pegar ni soltar', () => {
    const { onChange } = abrirVacio({ editable: false });
    expect(screen.queryByRole('group', { name: /Zona de capturas/ })).not.toBeInTheDocument();
    const raiz = document.body.firstElementChild!.firstElementChild!;
    fireEvent.paste(raiz, { clipboardData: { files: [png()] } });
    fireEvent.drop(raiz, { dataTransfer: { files: [png()] } });
    expect(api.subirEvidenciaFlujo).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
  it('muestra un cartel rojo con el peso real cuando la imagen supera el máximo', async () => {
    const { zona } = abrirVacio();
    const grande = new Uint8Array(EVIDENCIA_MAX_BYTES + 1024 * 1024); grande.set(PNG);
    fireEvent.drop(zona(), { dataTransfer: { files: [new File([grande], 'grande.png', { type: 'image/png' })] } });
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveClass('evidencia-alerta');
    expect(alerta).toHaveTextContent(/Imagen demasiado pesada/);
    expect(alerta).toHaveTextContent(/pesa 5,0 MB y supera el máximo de 4 MB/);
    expect(api.subirEvidenciaFlujo).not.toHaveBeenCalled();
  });
  it('traduce un 413 del servidor al mismo aviso de tamaño', async () => {
    api.subirEvidenciaFlujo.mockRejectedValue(Object.assign(new Error('Error HTTP 413'), { status: 413 }));
    const { zona } = abrirVacio();
    fireEvent.drop(zona(), { dataTransfer: { files: [png()] } });
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveClass('evidencia-alerta');
    expect(alerta).toHaveTextContent(/supera el máximo de 4 MB/);
  });
  it('quita la captura con un ícono accesible', async () => {
    const onChange = vi.fn();
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <EvidenciaEditor proyectoId="p1" evaluacionId="ev1" evidenciaIds={['cap1']} editable onChange={onChange} />
    </QueryClientProvider>);
    await screen.findByAltText('Captura de evidencia');
    const quitar = screen.getByRole('button', { name: 'Quitar captura del problema' });
    expect(quitar.textContent).toBe('');
    expect(quitar.querySelector('svg')).not.toBeNull();
    await userEvent.click(quitar);
    expect(onChange).toHaveBeenCalledWith([]);
  });
  it('no deja quitar una captura con anotaciones pendientes y explica por qué', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    rectangulo();
    const quitar = screen.getByRole('button', { name: 'Quitar captura del problema' });
    expect(quitar).toBeDisabled();
    expect(quitar).toHaveAttribute('title', expect.stringMatching(/anotaciones pendientes/));
  });
  it('abre la captura en grande desde la lupa y se cierra con Esc', async () => {
    abrir();
    await screen.findByAltText('Captura de evidencia');
    await userEvent.click(screen.getByRole('button', { name: 'Ampliar captura' }));
    expect(screen.getByRole('dialog', { name: 'Captura ampliada' })).toBeInTheDocument();
    expect(screen.getByAltText('Captura de evidencia ampliada')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('en solo lectura, un clic sobre la captura la abre en grande y un clic en el fondo la cierra', async () => {
    abrir(false);
    await screen.findByAltText('Captura de evidencia');
    await userEvent.click(screen.getByLabelText('Vista de las anotaciones'));
    await userEvent.click(screen.getByRole('dialog', { name: 'Captura ampliada' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  describe('visor ampliado editable', () => {
    async function visor() {
      abrir();
      await screen.findByAltText('Captura de evidencia');
      await userEvent.click(screen.getByRole('button', { name: 'Ampliar captura' }));
      return screen.getByRole('dialog', { name: 'Captura ampliada' });
    }
    function gesto(de: [number, number], a: [number, number]) {
      const svg = screen.getByLabelText('Anotaciones de la captura ampliada');
      svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000, x: 0, y: 0, toJSON: () => ({}) });
      const ev = (tipo: string, [x, y]: [number, number]) => act(() => { svg.dispatchEvent(new MouseEvent(tipo, { clientX: x, clientY: y, bubbles: true })); });
      ev('pointerdown', de); ev('pointermove', a); ev('pointerup', a);
    }
    const guardadaVisor = async () => { await userEvent.keyboard('{Escape}'); await userEvent.click(screen.getByRole('button', { name: 'Guardar anotaciones' })); return api.guardarAnotaciones.mock.calls[0][3][0]; };
    it('dibuja en el visor, aparece en el editor y un clic sin arrastrar no hace nada', async () => {
      const d = await visor();
      gesto([300, 300], [300, 300]);
      expect(screen.getByRole('dialog', { name: 'Captura ampliada' })).toBeInTheDocument();
      expect(screen.queryAllByRole('listitem')).toHaveLength(0);
      gesto([100, 100], [500, 500]);
      expect(within(d).getByLabelText('Anotaciones de la captura ampliada')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
      expect(screen.getByRole('listitem')).toHaveTextContent('Rectángulo');
    });
    it('usa la forma y el color elegidos en la barra del visor', async () => {
      await visor();
      await userEvent.click(screen.getByRole('button', { name: 'Flecha (captura ampliada)' }));
      fireEvent.change(screen.getByLabelText('Color (captura ampliada)'), { target: { value: '#00ff00' } });
      gesto([200, 300], [600, 700]);
      const a = await guardadaVisor();
      expect(a).toMatchObject({ tipo: 'flecha', color: '#00ff00', x: 0.2, y: 0.3, x2: 0.6, y2: 0.7 });
    });
    it('cambia forma y color de la anotación seleccionada', async () => {
      await visor();
      gesto([100, 100], [500, 500]);
      gesto([300, 300], [300, 300]);
      await userEvent.click(screen.getByRole('button', { name: 'Círculo (captura ampliada)' }));
      fireEvent.change(screen.getByLabelText('Color (captura ampliada)'), { target: { value: '#0000ff' } });
      const a = await guardadaVisor();
      expect(a).toMatchObject({ tipo: 'circulo', color: '#0000ff' });
    });
    it('mueve y redimensiona con el ratón en el visor', async () => {
      await visor();
      gesto([100, 100], [500, 500]);
      gesto([300, 300], [400, 350]);
      gesto([600, 550], [700, 650]);
      const a = await guardadaVisor();
      expect(a.x).toBeCloseTo(0.2); expect(a.y).toBeCloseTo(0.15); expect(a.x2).toBeCloseTo(0.7); expect(a.y2).toBeCloseTo(0.65);
    });
    it('elimina la seleccionada y Deshacer del visor comparte el historial del editor', async () => {
      await visor();
      gesto([100, 100], [500, 500]);
      gesto([300, 300], [300, 300]);
      await userEvent.click(screen.getByRole('button', { name: 'Eliminar anotación seleccionada' }));
      expect(screen.queryAllByRole('listitem')).toHaveLength(0);
      await userEvent.click(screen.getByRole('button', { name: 'Deshacer (captura ampliada)' }));
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
      await userEvent.click(screen.getByRole('button', { name: 'Deshacer (captura ampliada)' }));
      expect(screen.queryAllByRole('listitem')).toHaveLength(0);
      expect(screen.getByRole('button', { name: 'Deshacer (captura ampliada)' })).toBeDisabled();
    });
    it('muestra una anotación antigua de texto y no ofrece eliminarla sin selección', async () => {
      api.cargarEvidencia.mockResolvedValue({ meta: { ...meta, anotaciones: [{ id: 't1', tipo: 'texto', x: 0.2, y: 0.2, x2: 0.2, y2: 0.2, color: '#d83232', texto: 'Revisar botón' }] }, blob: new Blob(['png'], { type: 'image/png' }) });
      await visor();
      expect(screen.getByLabelText('Anotaciones de la captura ampliada')).toHaveTextContent('Revisar botón');
      expect(screen.getByRole('button', { name: 'Eliminar anotación seleccionada' })).toBeDisabled();
      await userEvent.keyboard('{Escape}');
      await userEvent.click(screen.getByRole('button', { name: 'Eliminar anotación 1' }));
      expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    });
    it('con el teclado, flechas mueven y Mayús+flechas redimensionan la seleccionada, y Deshacer lo revierte', async () => {
      await visor();
      gesto([100, 100], [500, 500]);
      gesto([300, 300], [300, 300]);
      const dialogo = screen.getByRole('dialog', { name: 'Captura ampliada' });
      fireEvent.keyDown(dialogo.querySelector('.evidencia-visor-caja')!, { key: 'ArrowRight' });
      fireEvent.keyDown(dialogo.querySelector('.evidencia-visor-caja')!, { key: 'ArrowDown', shiftKey: true });
      await userEvent.click(screen.getByRole('button', { name: 'Guardar anotaciones (captura ampliada)' }));
      const a = api.guardarAnotaciones.mock.calls[0][3][0];
      expect(a.x).toBeCloseTo(0.11); expect(a.y).toBeCloseTo(0.1); expect(a.x2).toBeCloseTo(0.51); expect(a.y2).toBeCloseTo(0.51);
    });
    it('Esc sigue cerrando el visor y avisa si quedan cambios sin guardar', async () => {
      await visor();
      gesto([100, 100], [500, 500]);
      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Cerraste la captura ampliada con anotaciones pendientes de guardar.');
      expect(screen.getByRole('button', { name: 'Guardar anotaciones' })).toBeEnabled();
    });
    it('guarda desde el visor sin tocar el original y sin aviso al cerrar', async () => {
      await visor();
      gesto([100, 100], [500, 500]);
      await userEvent.click(screen.getByRole('button', { name: 'Guardar anotaciones (captura ampliada)' }));
      expect(api.guardarAnotaciones).toHaveBeenCalledTimes(1);
      expect(api.subirEvidenciaFlujo).not.toHaveBeenCalled();
      await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar anotaciones (captura ampliada)' })).toBeDisabled());
      await userEvent.keyboard('{Escape}');
      expect(screen.getByRole('status')).not.toHaveTextContent('pendientes');
      expect(screen.getByRole('button', { name: 'Guardar anotaciones' })).toBeDisabled();
    });
    it('lo hecho en el editor llega al visor', async () => {
      abrir();
      await screen.findByAltText('Captura de evidencia');
      rectangulo();
      await userEvent.click(screen.getByRole('button', { name: 'Ampliar captura' }));
      expect(screen.getByLabelText('Anotaciones de la captura ampliada').querySelectorAll('rect')).toHaveLength(1);
    });
    it('en solo lectura el visor no ofrece herramientas', async () => {
      abrir(false);
      await screen.findByAltText('Captura de evidencia');
      await userEvent.click(screen.getByRole('button', { name: 'Ampliar captura' }));
      expect(screen.queryByRole('toolbar', { name: /ampliada/ })).not.toBeInTheDocument();
    });
  });
});
