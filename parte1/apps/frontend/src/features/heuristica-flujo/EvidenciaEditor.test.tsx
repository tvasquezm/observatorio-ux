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
});
