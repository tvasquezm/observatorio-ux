import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { copiarMetodologia, METODOLOGIAS_HEURISTICAS } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, EvaluacionFlujo } from '@observatorio-ux/shared-types';
import { TrabajoEditor } from './TrabajoEditor';
import { ConsensoEditor } from './ConsensoEditor';
import { InformeView } from './InformeView';
import { ConfiguracionEditor } from './ConfiguracionEditor';
import { FlujoHeuristicaPage } from './FlujoHeuristicaPage';
import { pendientesTrabajo, textoCumplimiento } from './flujo-utils';
import { armarRondas } from './rondas';
import { useAuthStore } from '../auth/store/useAuthStore';

const api = vi.hoisted(() => vi.fn());
const confirm = vi.hoisted(() => vi.fn());
vi.mock('./flujo.api', () => ({ flujoRequest: api }));
vi.mock('../../shared/api/confirm', () => ({ useConfirm: () => confirm }));
vi.mock('./EvidenciaEditor', () => ({ EvidenciaEditor: ({ etiqueta }: { etiqueta?: string }) => <span>Evidencias{etiqueta ? ` · ${etiqueta}` : ''}</span> }));

function config(): ConfiguracionFlujo {
  const metodologia = copiarMetodologia(METODOLOGIAS_HEURISTICAS[0]);
  metodologia.criterios = metodologia.criterios.slice(0, 1);
  return { nombre: 'Portal', producto: { clave: 'portal', nombre: 'Portal', version: '1', url: 'https://example.org', dispositivo: 'Web' }, objetivo: 'Evaluar', tareas: 'Inscribir', pantallas: 'Inicio', exclusiones: '', metodologia, evaluadorIds: ['u1'], lectorIds: [] };
}
function evaluation(over: Partial<EvaluacionFlujo> = {}): EvaluacionFlujo {
  return { id: 'e1', proyectoId: 'p1', coordinadorId: 'u1', revision: 1, version: 1, anteriorId: null, fase: 'EN_EVALUACION', configuracion: config(), trabajos: [{ evaluadorId: 'u1', nombre: 'Ana', respuestas: [], hallazgos: [], entregadoEn: null, guardadoEn: null }], consenso: { criterios: [], hallazgos: [], aprobadoPor: [] }, informe: null, comparacion: null, createdAt: '2026-10-09T12:00:00Z', updatedAt: '2026-10-09T12:00:00Z', iniciadoEn: '2026-10-09T12:00:00Z', consolidadoEn: null, finalizadoEn: null, ...over };
}
function final(id: string): EvaluacionFlujo {
  const e = evaluation({ id, fase: 'FINALIZADA' });
  e.consenso.hallazgos = [{ id: `${id}-problema`, criterioIds: [e.configuracion.metodologia.criterios[0].id], titulo: `Problema de ${id}`, pantalla: 'Inicio', descripcion: 'Error observado', recomendacion: 'Corregir', severidad: 2, prioridad: 'MEDIA', notas: '', evidenciaIds: [], origenIds: [`${id}-original`], decision: 'ACEPTADO', justificacion: 'Acuerdo de expertos' }];
  e.informe = { version: 1, configuracion: e.configuracion, consenso: e.consenso, evaluadores: [{ id: 'u1', nombre: 'Ana' }], iniciadoEn: e.iniciadoEn, consolidadoEn: e.updatedAt, finalizadoEn: e.updatedAt };
  return e;
}
function consensoConOriginal(): EvaluacionFlujo {
  const e = evaluation({ fase: 'PENDIENTE_CONSENSO' });
  e.trabajos[0].hallazgos = [{ id: 'origen', criterioIds: [e.configuracion.metodologia.criterios[0].id], titulo: 'Problema original', pantalla: 'Inicio', descripcion: 'Error', recomendacion: 'Mejorar', severidad: 2, prioridad: 'MEDIA', notas: '', evidenciaIds: [] }];
  return e;
}
function renderFlow(element: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/', element: <Outlet context={{ proyectoId: 'p1' }} />, children: [{ index: true, element }] }]);
  return render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
}
function Harness({ initial }: { initial: EvaluacionFlujo }) {
  const [e, setE] = useState(initial);
  return <TrabajoEditor evaluacion={e} usuarioId="u1" onSaved={setE} onBack={vi.fn()} />;
}
beforeEach(() => { vi.resetAllMocks(); sessionStorage.clear(); confirm.mockResolvedValue(true); useAuthStore.setState({ user: { id: 'u1', nombre: 'Ana', email: 'ana@example.org', rol: 'ESTUDIANTE' }, isAuthenticated: true }); });

describe('flujo individual', () => {
  it('permite entregar todas las preguntas no aplicables sin motivo ni valoración', async () => {
    const e = evaluation(); e.configuracion.metodologia = copiarMetodologia(METODOLOGIAS_HEURISTICAS[0]);
    api.mockImplementation(async (_p, path, _method, body) => path.endsWith('/trabajo') ? { ...e, revision: 2, trabajos: [{ ...e.trabajos[0], respuestas: body.respuestas }] } : { ...e, revision: 3, trabajos: [{ ...e.trabajos[0], entregadoEn: e.updatedAt }] });
    renderFlow(<Harness initial={e} />);
    for (let i = 0; i < e.configuracion.metodologia.criterios.length; i++) {
      await userEvent.click(screen.getByRole('button', { name: new RegExp(`^Pregunta ${i + 1}:`) }));
      await userEvent.click(screen.getByRole('radio', { name: 'No aplica' }));
      expect(screen.queryByRole('combobox', { name: 'Valoración' })).toBeNull();
      expect(screen.queryByLabelText('Motivo de no aplica')).toBeNull();
    }
    expect(screen.getByText('10 de 10 preguntas respondidas')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Entregar mi evaluación' }));
    await screen.findByText('Trabajo entregado. Tus respuestas están cerradas.');
    const guardado = api.mock.calls.find(c => c[1].endsWith('/trabajo'))![3];
    expect(guardado.respuestas).toHaveLength(10);
    expect(guardado.respuestas.every((r: { noAplica: boolean; valor: string | null; motivo: string }) => r.noAplica && r.valor === null && r.motivo === '')).toBe(true);
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('ofrece respuestas visibles y No aplica dentro de la misma valoración', async () => {
    const e = evaluation(); renderFlow(<Harness initial={e} />);
    const opciones = screen.getByRole('radiogroup', { name: 'Valoración' });
    expect(within(opciones).getAllByRole('radio')).toHaveLength(e.configuracion.metodologia.escala.niveles.length + 1);
    await userEvent.click(within(opciones).getByRole('radio', { name: e.configuracion.metodologia.escala.niveles[0].etiqueta }));
    await userEvent.click(within(opciones).getByRole('radio', { name: 'No aplica' }));
    expect(within(opciones).getByRole('radio', { name: 'No aplica' })).toBeChecked();
    expect(screen.queryByLabelText('Motivo de no aplica')).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Valoración' })).toBeNull();
  });
  it('conserva respuestas al cambiar de pregunta y al consultar el resumen real del equipo', async () => {
    const e = evaluation(); e.configuracion.metodologia = copiarMetodologia(METODOLOGIAS_HEURISTICAS[0]);
    e.avanceEquipo = [{ evaluadorId: 'u1', nombre: 'Ana', evaluados: 0, total: 10, entregadoEn: null, guardadoEn: null }];
    renderFlow(<Harness initial={e} />);
    await userEvent.click(screen.getByRole('radio', { name: 'No aplica' }));
    const mapa = screen.getByRole('navigation', { name: 'Preguntas de la revisión' });
    await userEvent.click(within(mapa).getByRole('button', { name: /^Pregunta 5:/ }));
    expect(screen.getByText('Pregunta 5 de 10')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Resumen del equipo' }));
    expect(screen.getByRole('heading', { name: 'Progreso del equipo' })).toBeVisible();
    expect(screen.queryByRole('radio')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Mi revisión' }));
    await userEvent.click(within(mapa).getByRole('button', { name: /^Pregunta 1:/ }));
    expect(screen.getByRole('radio', { name: 'No aplica' })).toBeChecked();
  });
  it.each([true, false])('muestra errores al actualizar el resumen con trabajo propio: %s', async propio => {
    const e = evaluation();
    if (!propio) e.trabajos = [];
    api.mockRejectedValue(new Error('No se pudo actualizar el equipo'));
    renderFlow(<Harness initial={e} />);
    await userEvent.click(screen.getByRole('button', { name: 'Resumen del equipo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar estado del equipo' }));
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo actualizar el equipo');
  });
  it('guarda antes de entregar y cierra el trabajo propio', async () => {
    const e = evaluation();
    api.mockImplementation(async (_p, path, _method, body) => {
      if (path.endsWith('/trabajo')) return { ...e, revision: 2, trabajos: [{ ...e.trabajos[0], respuestas: body.respuestas, hallazgos: body.hallazgos }] };
      return { ...e, revision: 3, trabajos: [{ ...e.trabajos[0], entregadoEn: e.updatedAt }] };
    });
    renderFlow(<Harness initial={e} />);
    await userEvent.click(screen.getByRole('radio', { name: e.configuracion.metodologia.escala.niveles[0].etiqueta }));
    await userEvent.click(screen.getByRole('button', { name: 'Entregar mi evaluación' }));
    await screen.findByText('Trabajo entregado. Tus respuestas están cerradas.');
    expect(api.mock.calls.map(c => c[1])).toEqual(['/evaluaciones/e1/trabajo', '/evaluaciones/e1/entregar']);
    expect(api.mock.calls[1][3].revision).toBe(2);
    expect(screen.getByRole('radio', { name: e.configuracion.metodologia.escala.niveles[0].etiqueta })).toBeDisabled();
  });
  it('admite múltiples problemas por criterio sin confundir ausencia con NA', async () => {
    const e = evaluation(); renderFlow(<Harness initial={e} />);
    const add = screen.getByRole('button', { name: `Agregar problema para ${e.configuracion.metodologia.criterios[0].nombre}` });
    await userEvent.click(add); await userEvent.click(add);
    expect(screen.getAllByLabelText('Título del problema')).toHaveLength(2);
    expect(within(screen.getByRole('radiogroup', { name: 'Valoración' })).getAllByRole('radio').every(r => !(r as HTMLInputElement).checked)).toBe(true);
    expect(screen.getByText('2 problemas registrados en esta pregunta.')).toBeInTheDocument();
  });
  it('mantiene accesible un problema al quitar su última pregunta relacionada', async () => {
    const e = evaluation(); renderFlow(<Harness initial={e} />);
    await userEvent.click(screen.getByRole('button', { name: `Agregar problema para ${e.configuracion.metodologia.criterios[0].nombre}` }));
    await userEvent.click(screen.getByRole('checkbox', { name: e.configuracion.metodologia.criterios[0].nombre }));
    expect(screen.getByRole('textbox', { name: 'Título del problema' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar problema 1' })).toBeInTheDocument();
  });
  it('jerarquiza los botones de Revisar: agregar secundario, guardar ghost y quitar danger', async () => {
    const e = evaluation(); renderFlow(<Harness initial={e} />);
    expect(screen.getAllByRole('button', { name: 'Guardar cambios' })[0]).toHaveClass('ghost');
    const add = screen.getByRole('button', { name: `Agregar problema para ${e.configuracion.metodologia.criterios[0].nombre}` });
    expect(add).toHaveClass('secondary');
    await userEvent.click(add);
    expect(screen.getByRole('button', { name: 'Quitar problema 1' })).toHaveClass('danger');
  });
  it('reabre el problema incompleto aunque se haya cerrado manualmente', async () => {
    const e = evaluation(); renderFlow(<Harness initial={e} />);
    await userEvent.click(screen.getByRole('radio', { name: e.configuracion.metodologia.escala.niveles[0].etiqueta }));
    await userEvent.click(screen.getByRole('button', { name: `Agregar problema para ${e.configuracion.metodologia.criterios[0].nombre}` }));
    const resumen = screen.getByText('Problema 1 sin título');
    const panel = resumen.closest('details')!;
    await userEvent.click(resumen);
    expect(panel).not.toHaveAttribute('open');
    await userEvent.click(screen.getByRole('button', { name: 'Entregar mi evaluación' }));
    await waitFor(() => expect(panel).toHaveAttribute('open'));
    expect(screen.getByRole('alert')).toHaveTextContent('título y descripción');
  });
  it('retiene texto cuando falla guardado, muestra error y permite reintentar', async () => {
    const e = evaluation(); api.mockRejectedValueOnce(new Error('Sin conexión')).mockImplementation(async (_p, _path, _m, b) => ({ ...e, revision: 2, trabajos: [{ ...e.trabajos[0], respuestas: b.respuestas, hallazgos: b.hallazgos }] }));
    renderFlow(<Harness initial={e} />);
    await userEvent.type(screen.getByLabelText('Notas de la valoración'), 'Observación conservada');
    await userEvent.click(screen.getAllByRole('button', { name: 'Guardar cambios' })[0]);
    await screen.findAllByText(/Sin conexión/);
    expect(screen.getByLabelText('Notas de la valoración')).toHaveValue('Observación conservada');
    expect(sessionStorage.getItem('heuristica:u1:e1:trabajo:')).toContain('Observación conservada');
    await userEvent.click(screen.getAllByRole('button', { name: 'Guardar cambios' })[0]);
    await waitFor(() => expect(screen.getAllByText(/Cambios guardados/)).toHaveLength(1));
  });
  it('serializa cambios durante una escritura y usa revisión nueva', async () => {
    const e = evaluation(); let finish!: (e: EvaluacionFlujo) => void;
    api.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockImplementation(async (_p, _path, _m, b) => ({ ...e, revision: 3, trabajos: [{ ...e.trabajos[0], respuestas: b.respuestas, hallazgos: b.hallazgos }] }));
    renderFlow(<Harness initial={e} />);
    await userEvent.type(screen.getByLabelText('Notas de la valoración'), 'Primero');
    await userEvent.click(screen.getAllByRole('button', { name: 'Guardar cambios' })[0]);
    await userEvent.type(screen.getByLabelText('Notas de la valoración'), ' después');
    expect(api).toHaveBeenCalledTimes(1);
    finish({ ...e, revision: 2, trabajos: [{ ...e.trabajos[0], respuestas: api.mock.calls[0][3].respuestas }] });
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
    expect(api.mock.calls[1][3]).toMatchObject({ revision: 2, respuestas: [{ notas: 'Primero después' }] });
  });
  it('solo muestra el trabajo del usuario, incluso si una fixture incluye otros', () => {
    const e = evaluation(); e.trabajos.push({ ...e.trabajos[0], evaluadorId: 'otro', nombre: 'Otro experto', hallazgos: [{ id: 'ajeno', criterioIds: [], titulo: 'Secreto de otro', pantalla: '', descripcion: '', recomendacion: '', severidad: 2, prioridad: 'MEDIA', notas: '', evidenciaIds: [] }] });
    renderFlow(<Harness initial={e} />); expect(screen.queryByText('Secreto de otro')).not.toBeInTheDocument();
  });
  it('recupera borrador con su revisión original y evita sobrescribir cambios ajenos', async () => {
    const e = evaluation({ revision: 8 });
    const base = { respuestas: [], hallazgos: [] };
    const oldDraft = { ...base, respuestas: [{ criterioId: e.configuracion.metodologia.criterios[0].id, valor: null, noAplica: false, motivo: '', notas: 'Borrador de revisión cinco' }] };
    sessionStorage.setItem('heuristica:u1:e1:trabajo:', JSON.stringify({ revision: 5, base: JSON.stringify(base), data: oldDraft }));
    api.mockRejectedValue(new Error('La revisión cambió'));
    renderFlow(<Harness initial={e} />);
    expect(screen.getByLabelText('Notas de la valoración')).toHaveValue('Borrador de revisión cinco');
    await waitFor(() => expect(api).toHaveBeenCalled(), { timeout: 2000 });
    expect(api.mock.calls[0][3].revision).toBe(5);
    await screen.findAllByText(/La revisión cambió/);
    expect(screen.getByLabelText('Notas de la valoración')).toHaveValue('Borrador de revisión cinco');
  });
});

describe('configuración y consenso', () => {
  it('limita el equipo a cinco personas sin modificar la metodología original', async () => {
    const initial = config(); initial.evaluadorIds = [];
    let latest = initial;
    function Editor() { const [v, setV] = useState(initial); return <ConfiguracionEditor value={v} onChange={x => { latest = x; setV(x); }} biblioteca={[METODOLOGIAS_HEURISTICAS[0]]} equipo={Array.from({ length: 6 }, (_, i) => ({ id: `u${i}`, nombre: `Persona ${i}`, rol: 'ESTUDIANTE' }))} />; }
    renderFlow(<Editor />);
    const experts = within(screen.getByRole('group', { name: 'Equipo de revisión' })).getAllByRole('checkbox', { name: /^Evaluador:/ });
    for (let i = 0; i < 5; i++) await userEvent.click(experts[i]);
    expect(experts[5]).toBeDisabled();
    expect(latest.evaluadorIds).toHaveLength(5);
    expect(latest.metodologia).toEqual(initial.metodologia);
  });
  it('no convierte agenda ni fuentes en acuerdo automático', () => {
    const e = evaluation({ fase: 'PENDIENTE_CONSENSO' });
    e.trabajos[0].hallazgos = [{ id: 'origen', criterioIds: [e.configuracion.metodologia.criterios[0].id], titulo: 'Problema original', pantalla: 'Inicio', descripcion: 'Error', recomendacion: 'Mejorar', severidad: 2, prioridad: 'MEDIA', notas: '', evidenciaIds: [] }];
    renderFlow(<ConsensoEditor evaluacion={e} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(within(screen.getByRole('radiogroup', { name: 'Valoración' })).getAllByRole('radio').every(r => !(r as HTMLInputElement).checked)).toBe(true);
    expect(screen.queryByLabelText('Decisión del consenso')).not.toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });
  it('crea decisión pendiente al seleccionar fuente y requiere acuerdo manual', async () => {
    const e = evaluation({ fase: 'PENDIENTE_CONSENSO' });
    e.trabajos[0].hallazgos = [{ id: 'origen', criterioIds: [e.configuracion.metodologia.criterios[0].id], titulo: 'Problema original', pantalla: 'Inicio', descripcion: 'Error', recomendacion: 'Mejorar', severidad: 2, prioridad: 'MEDIA', notas: '', evidenciaIds: [] }];
    renderFlow(<ConsensoEditor evaluacion={e} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Revisar los problemas' }));
    await userEvent.click(screen.getByLabelText('Ana: Problema original'));
    await userEvent.click(screen.getByRole('button', { name: 'Crear decisión de los originales seleccionados' }));
    expect(screen.getByLabelText('Decisión del consenso')).toHaveValue('PENDIENTE');
    expect(screen.getByText(/Orígenes preservados: origen/)).toBeInTheDocument();
  });
  it('avisa y lleva el foco a la decisión nueva al crearla', async () => {
    const e = consensoConOriginal();
    renderFlow(<ConsensoEditor evaluacion={e} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Revisar los problemas' }));
    await userEvent.click(screen.getByLabelText('Ana: Problema original'));
    await userEvent.click(screen.getByRole('button', { name: 'Crear decisión de los originales seleccionados' }));
    expect(screen.getByText(/Decisión 1 creada con 1 problema/).closest('[role="status"]')).not.toBeNull();
    await waitFor(() => expect(screen.getByRole('group', { name: /Decisión 1/ })).toHaveFocus());
  });
  it('explica por qué no se puede crear una decisión sin selección', async () => {
    renderFlow(<ConsensoEditor evaluacion={consensoConOriginal()} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Revisar los problemas' }));
    const crear = screen.getByRole('button', { name: 'Crear decisión de los originales seleccionados' });
    expect(crear).toBeDisabled();
    expect(screen.getByText(/Marca al menos un problema/)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Ana: Problema original'));
    expect(screen.queryByText(/Marca al menos un problema/)).toBeNull();
    expect(crear).toBeEnabled();
  });
  it('jerarquiza los botones: una acción principal, secundarias, ghost y danger', async () => {
    renderFlow(<ConsensoEditor evaluacion={consensoConOriginal()} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Actualizar consenso y confirmaciones' })).toHaveClass('ghost');
    expect(screen.getByRole('button', { name: 'Continuar' })).toHaveClass('primary');
    await userEvent.click(screen.getByRole('tab', { name: 'Revisar los problemas' }));
    expect(screen.getByRole('button', { name: 'Anterior' })).toHaveClass('secondary');
    await userEvent.click(screen.getByLabelText('Ana: Problema original'));
    const crear = screen.getByRole('button', { name: 'Crear decisión de los originales seleccionados' });
    expect(crear).toHaveClass('primary');
    await userEvent.click(crear);
    expect(screen.getByRole('button', { name: /Reabrir orígenes de decisión 1/ })).toHaveClass('danger');
    await userEvent.click(screen.getByRole('tab', { name: 'Preparar el informe' }));
    expect(screen.getByRole('button', { name: 'Confirmar acuerdo' })).toHaveClass('secondary');
  });
  it('recarga decisiones remotas antes de aprobar desde editor limpio', async () => {
    const e = evaluation({ fase: 'PENDIENTE_CONSENSO' });
    const fresh = { ...e, revision: 3, consenso: { ...e.consenso, criterios: [{ criterioId: e.configuracion.metodologia.criterios[0].id, valor: e.configuracion.metodologia.escala.niveles[0].id, noAplica: false, motivo: '', notas: 'Acuerdo remoto', justificacion: 'Revisión conjunta' }] } };
    api.mockResolvedValue(fresh);
    function Editor() { const [v, setV] = useState(e); return <ConsensoEditor evaluacion={v} usuarioId="u1" onSaved={setV} onBack={vi.fn()} />; }
    renderFlow(<Editor />); await userEvent.click(screen.getByRole('button', { name: 'Actualizar consenso y confirmaciones' }));
    await waitFor(() => expect(screen.getByLabelText('Notas de la valoración')).toHaveValue('Acuerdo remoto'));
  });
});

describe('historial e informe', () => {
  it('presenta nuevo flujo como inicio y acceso explícito a sesiones anteriores', async () => {
    api.mockImplementation(async (_p, path) => path === '/metodologias' ? [METODOLOGIAS_HEURISTICAS[0]] : []);
    renderFlow(<FlujoHeuristicaPage />);
    expect(await screen.findByRole('heading', { name: 'Evaluación heurística' })).toBeInTheDocument();
    const nueva = screen.getByRole('button', { name: '+ Nueva evaluación' });
    expect(nueva).toHaveClass('primary');
    expect(nueva.closest('.page-head')).not.toBeNull();
    expect(screen.queryByLabelText('Producto o sitio')).toBeNull();
    expect(await screen.findByText('Aún no hay revisiones guardadas')).toBeInTheDocument();
  });
  it('explica en español el dato mínimo que falta y enfoca el producto', async () => {
    api.mockImplementation(async (_p, path) => path === '/metodologias' ? [config().metodologia] : path === '/equipo' ? [{ id: 'u1', nombre: 'Ana', rol: 'ESTUDIANTE' }] : []);
    renderFlow(<FlujoHeuristicaPage />);
    await userEvent.click(await screen.findByRole('button', { name: '+ Nueva evaluación' }));
    const producto = await screen.findByLabelText('Producto o sitio');
    await userEvent.click(screen.getByRole('button', { name: 'Comenzar revisión' }));
    expect(screen.getByRole('alert')).toHaveTextContent('producto o sitio');
    expect(producto).toHaveFocus();
  });
  it('no comienza con un método sin preguntas y explica qué falta', async () => {
    const vacia = { ...config().metodologia, criterios: [] };
    api.mockImplementation(async (_p, path) => path === '/metodologias' ? [vacia] : path === '/equipo' ? [{ id: 'u1', nombre: 'Ana', rol: 'ESTUDIANTE' }] : []);
    renderFlow(<FlujoHeuristicaPage />);
    await userEvent.click(await screen.findByRole('button', { name: '+ Nueva evaluación' }));
    await userEvent.type(await screen.findByLabelText('Producto o sitio'), 'Portal');
    await userEvent.click(screen.getByRole('button', { name: 'Comenzar revisión' }));
    expect(screen.getByRole('alert')).toHaveTextContent('una metodología con preguntas');
    expect(api).not.toHaveBeenCalledWith('p1', '/evaluaciones/comenzar', 'POST', expect.anything());
  });
  it('recupera lo escrito tras fallar el inicio y comienza directamente sin datos opcionales', async () => {
    let fail = true;
    let started = evaluation();
    api.mockImplementation(async (_p, path, method, body) => {
      if (method === 'POST') { if (fail) throw new Error('Sin conexión al comenzar'); started = evaluation({ configuracion: body }); return started; }
      if (path === '/evaluaciones/e1') return started;
      return path === '/metodologias' ? [config().metodologia] : path === '/equipo' ? [{ id: 'u1', nombre: 'Ana', rol: 'ESTUDIANTE' }] : [];
    });
    const first = renderFlow(<FlujoHeuristicaPage />);
    await userEvent.click(await screen.findByRole('button', { name: '+ Nueva evaluación' }));
    await userEvent.type(await screen.findByLabelText('Producto o sitio'), 'Portal local');
    await userEvent.click(screen.getByRole('button', { name: 'Comenzar revisión' }));
    await screen.findByText('Sin conexión al comenzar');
    first.unmount();
    renderFlow(<FlujoHeuristicaPage />);
    await userEvent.click(await screen.findByRole('button', { name: '+ Nueva evaluación' }));
    expect(await screen.findByLabelText('Producto o sitio')).toHaveValue('Portal local');
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Comenzar revisión' }));
    await screen.findByRole('navigation', { name: 'Preguntas de la revisión' });
    expect(api).toHaveBeenCalledWith('p1', '/evaluaciones/comenzar', 'POST', expect.objectContaining({ nombre: 'Portal local', objetivo: '', tareas: '', pantallas: '', evaluadorIds: ['u1'] }));
    expect(sessionStorage.getItem('heuristica:nueva:u1:p1')).toBeNull();
    expect(api.mock.calls.some(c => c[1] === '/evaluaciones' && c[2] === 'POST')).toBe(false);
  });
  it('permite reintentar un borrador antiguo cuando falla iniciar después de guardar', async () => {
    let guardada = evaluation({ fase: 'BORRADOR', configuracion: { ...config(), nombre: '' } });
    let falla = true;
    api.mockImplementation(async (_p, path, _method, body) => {
      if (path.endsWith('/configuracion')) {
        if (body.revision !== guardada.revision) throw new Error('Conflicto de revisión');
        guardada = { ...guardada, revision: guardada.revision + 1, configuracion: body.configuracion }; return guardada;
      }
      if (path.endsWith('/iniciar')) { if (falla) { falla = false; throw new Error('No se pudo iniciar'); } return { ...guardada, fase: 'EN_EVALUACION' }; }
      if (path === '/evaluaciones/e1') return guardada;
      if (path === '/evaluaciones') return [guardada];
      if (path === '/metodologias') return [config().metodologia];
      if (path === '/equipo') return [{ id: 'u1', nombre: 'Ana', rol: 'ESTUDIANTE' }];
      return [];
    });
    renderFlow(<FlujoHeuristicaPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Comenzar revisión' }));
    await screen.findByText('No se pudo iniciar');
    await userEvent.click(screen.getByRole('button', { name: 'Comenzar revisión' }));
    await screen.findByRole('navigation', { name: 'Preguntas de la revisión' });
    expect(screen.queryByText('Conflicto de revisión')).toBeNull();
  });
  it('informe cuenta solo consenso y no muestra promedio ordinal', () => {
    const e = final('actual'); e.trabajos[0].hallazgos = [{ id: 'individual', criterioIds: [], titulo: 'Solo individual', pantalla: '', descripcion: '', recomendacion: '', severidad: 4, prioridad: 'ALTA', notas: '', evidenciaIds: [] }];
    renderFlow(<InformeView evaluacion={e} historial={[]} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.queryByText('Solo individual')).not.toBeInTheDocument(); expect(screen.queryByText(/promedio/i)).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Distribución de severidad' })).toHaveTextContent('Severidad 4: 0');
  });
  it('aísla borrador al cambiar par comparativo y conserva NO_VERIFICADO', async () => {
    const current = final('actual'); const a = final('anteriorA'); const b = final('anteriorB');
    a.configuracion.nombre = 'Anterior A'; b.configuracion.nombre = 'Anterior B';
    api.mockResolvedValue({ previaId: a.id, compatible: true, motivos: [], vinculos: [], confirmadoPor: null, confirmadoEn: null });
    renderFlow(<InformeView evaluacion={current} historial={[a, b]} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    const select = screen.getByLabelText('Comparar con evaluación finalizada del mismo producto');
    await userEvent.selectOptions(select, a.id); await userEvent.click(await screen.findByRole('button', { name: 'Agregar correspondencia' }));
    await userEvent.selectOptions(screen.getByLabelText('Problema de versión anterior'), `${a.id}-problema`);
    await userEvent.selectOptions(screen.getByLabelText('Problema de versión actual'), `${current.id}-problema`);
    await userEvent.type(screen.getByLabelText('Justificación y verificación manual'), 'Borrador A');
    expect(screen.getByLabelText('Estado verificado')).toHaveValue('NO_VERIFICADO');
    await userEvent.selectOptions(select, b.id);
    await waitFor(() => expect(screen.queryByLabelText('Justificación y verificación manual')).not.toBeInTheDocument());
    expect(confirm).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Agregar correspondencia' }));
    await userEvent.selectOptions(screen.getByLabelText('Problema de versión anterior'), `${b.id}-problema`);
    await userEvent.selectOptions(screen.getByLabelText('Problema de versión actual'), `${current.id}-problema`);
    await userEvent.type(screen.getByLabelText('Justificación y verificación manual'), 'Borrador B');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(api.mock.calls.some(c => c[3]?.previaId === b.id && c[3]?.vinculos[0]?.justificacion === 'Borrador B')).toBe(true));
  });
  it('escala incompatible limita estados a no comparable / no verificado', async () => {
    const e = final('actual'); const a = final('anterior');
    api.mockResolvedValue({ previaId: a.id, compatible: false, motivos: ['Cambió alcance'], vinculos: [], confirmadoPor: null, confirmadoEn: null });
    renderFlow(<InformeView evaluacion={e} historial={[a]} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText('Comparar con evaluación finalizada del mismo producto'), a.id);
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar correspondencia' }));
    await userEvent.selectOptions(screen.getByLabelText('Problema de versión anterior'), `${a.id}-problema`);
    await userEvent.selectOptions(screen.getByLabelText('Problema de versión actual'), `${e.id}-problema`);
    expect(within(screen.getByLabelText('Estado verificado')).queryByRole('option', { name: 'SOLUCIONADO' })).not.toBeInTheDocument();
  });
  it('conserva vínculos guardados al avanzar revisión y editar nuevamente', async () => {
    const e = final('actual'); const a = final('anterior');
    const comparison = { previaId: a.id, compatible: true, motivos: [], vinculos: [], confirmadoPor: null, confirmadoEn: null };
    api.mockImplementation(async (_p, _path, method, body) => method === 'PATCH' ? { ...e, revision: 2, comparacion: { ...comparison, vinculos: body.vinculos } } : comparison);
    function Editor() { const [v, setV] = useState(e); return <InformeView evaluacion={v} historial={[a]} usuarioId="u1" onSaved={setV} onBack={vi.fn()} />; }
    renderFlow(<Editor />);
    await userEvent.selectOptions(screen.getByLabelText('Comparar con evaluación finalizada del mismo producto'), a.id);
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar correspondencia' }));
    await userEvent.selectOptions(screen.getByLabelText('Problema de versión anterior'), `${a.id}-problema`);
    await userEvent.selectOptions(screen.getByLabelText('Problema de versión actual'), `${e.id}-problema`);
    await userEvent.type(screen.getByLabelText('Justificación y verificación manual'), 'Primera verificación');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(screen.getByText(/Cambios guardados/)).toBeInTheDocument());
    expect(screen.getByLabelText('Justificación y verificación manual')).toHaveValue('Primera verificación');
    await userEvent.type(screen.getByLabelText('Justificación y verificación manual'), ' revisada');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(api.mock.calls.filter(c => c[2] === 'PATCH')).toHaveLength(2));
    expect(api.mock.calls.filter(c => c[2] === 'PATCH')[1][3]).toMatchObject({ revision: 2, vinculos: [{ justificacion: 'Primera verificación revisada' }] });
  });
});

it('distingue todos NA justificados de criterios pendientes', () => {
  const c = config(); expect(pendientesTrabajo(c, [{ criterioId: c.metodologia.criterios[0].id, valor: null, noAplica: true, motivo: 'Fuera de alcance', notas: '' }], [])).toEqual([]);
});

describe('rondas en la revisión', () => {
  function larga(): EvaluacionFlujo { const e = evaluation(); e.configuracion.metodologia = copiarMetodologia(METODOLOGIAS_HEURISTICAS[0]); return e; }
  it('pausa al terminar la ronda, la resume y sigue con la siguiente', async () => {
    const e = larga(); const rondas = armarRondas(e.configuracion.metodologia.criterios); const n = rondas[0].criterios.length;
    renderFlow(<Harness initial={e} />);
    for (let i = 0; i < n - 1; i++) await userEvent.click(screen.getByRole('button', { name: 'Pregunta siguiente' }));
    expect(screen.getByText(`Pregunta ${n} de ${e.configuracion.metodologia.criterios.length}`)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Pregunta siguiente' }));
    expect(screen.getByRole('heading', { name: `Terminaste la ronda 1 de ${rondas.length}` })).toBeInTheDocument();
    expect(screen.getByText(`${n} preguntas pendientes.`)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Seguir con la ronda siguiente' }));
    expect(screen.queryByRole('heading', { name: /^Terminaste la ronda/ })).toBeNull();
    expect(screen.getByText(`Pregunta ${n + 1} de ${e.configuracion.metodologia.criterios.length}`)).toBeInTheDocument();
    expect(screen.getByText(`Ronda 2 de ${rondas.length}`)).toBeInTheDocument();
  });
  it('volver a la ronda cierra la pausa sin cambiar de pregunta', async () => {
    const e = larga(); const n = armarRondas(e.configuracion.metodologia.criterios)[0].criterios.length;
    renderFlow(<Harness initial={e} />);
    for (let i = 0; i < n; i++) await userEvent.click(screen.getByRole('button', { name: 'Pregunta siguiente' }));
    await userEvent.click(screen.getByRole('button', { name: 'Volver a esta ronda' }));
    expect(screen.getByText(`Pregunta ${n} de ${e.configuracion.metodologia.criterios.length}`)).toBeInTheDocument();
  });
  it('la revisión final cuenta lo pendiente y lleva a la primera pregunta sin responder', async () => {
    const e = larga();
    renderFlow(<Harness initial={e} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ver revisión final' }));
    expect(screen.getByRole('heading', { name: 'Revisión final' })).toBeInTheDocument();
    expect(screen.getByText(`${e.configuracion.metodologia.criterios.length} preguntas pendientes.`)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ir a lo pendiente' }));
    expect(screen.queryByRole('heading', { name: 'Revisión final' })).toBeNull();
    expect(screen.getByText(`Pregunta 1 de ${e.configuracion.metodologia.criterios.length}`)).toBeInTheDocument();
  });
});
describe('vista checklist', () => {
  function checklistEval(mixta = false): EvaluacionFlujo {
    const base = evaluation();
    const m = copiarMetodologia(METODOLOGIAS_HEURISTICAS.find(x => x.id === 'hassan-checklist-2003')!);
    m.criterios = [...m.criterios.filter(c => c.categoria === 'Generales').slice(0, 2), ...m.criterios.filter(c => c.categoria === 'Identidad e información').slice(0, 1)];
    if (mixta) m.criterios[2] = { ...m.criterios[2], escala: copiarMetodologia(METODOLOGIAS_HEURISTICAS[0]).escala };
    return { ...base, configuracion: { ...base.configuracion, metodologia: m } };
  }
  const grupo = (nombre: string) => screen.getByRole('radiogroup', { name: nombre });
  it('agrupa por categoría y muestra "n de N respondidos" en texto', async () => {
    const e = checklistEval(); const [a, b] = e.configuracion.metodologia.criterios;
    renderFlow(<Harness initial={e} />);
    expect(screen.getByText('0 de 2 respondidos')).toBeInTheDocument();
    expect(screen.getByText('0 de 1 respondidos')).toBeInTheDocument();
    await userEvent.click(within(grupo(a.nombre)).getByLabelText('Sí'));
    expect(screen.getByText('1 de 2 respondidos')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Pregunta siguiente' }));
    await userEvent.click(within(grupo(b.nombre)).getByLabelText('No'));
    expect(screen.getByText('2 de 2 respondidos · ✓ Categoría completa')).toBeInTheDocument();
    expect(screen.getAllByText('✓ Respondido')).toHaveLength(2);
    expect(screen.getAllByText('Sin responder')).toHaveLength(1);
  });
  it('cuenta no aplica inmediatamente, también con preguntas de tipo checklist', async () => {
    const e = checklistEval(); const [a, b, c] = e.configuracion.metodologia.criterios;
    renderFlow(<Harness initial={e} />);
    await userEvent.click(within(grupo(a.nombre)).getByLabelText('Sí'));
    await userEvent.click(screen.getByRole('button', { name: /^Pregunta 3:/ }));
    await userEvent.click(within(grupo(c.nombre)).getByLabelText('No'));
    await userEvent.click(screen.getByRole('button', { name: /^Pregunta 2:/ }));
    await userEvent.click(within(grupo(b.nombre)).getByRole('radio', { name: 'No aplica' }));
    expect(screen.getByText('2 de 2 respondidos · ✓ Categoría completa')).toBeInTheDocument();
    expect(screen.queryByLabelText('Motivo de no aplica')).toBeNull();
    expect(screen.getByText('3 de 3 preguntas respondidas')).toBeInTheDocument();
  });
  it('permite agregar un hallazgo desde un ítem', async () => {
    const e = checklistEval(); renderFlow(<Harness initial={e} />);
    await userEvent.click(screen.getByRole('button', { name: `Agregar problema para ${e.configuracion.metodologia.criterios[0].nombre}` }));
    expect(screen.getAllByLabelText('Título del problema')).toHaveLength(1);
    expect(screen.getByText(/^1 problema registrado en este ítem\./)).toBeInTheDocument();
  });
  it('evaluación antigua (3 niveles) o con escalas mixtas conserva la vista actual', () => {
    const { unmount } = renderFlow(<Harness initial={evaluation()} />);
    expect(screen.getByRole('radiogroup', { name: 'Valoración' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    unmount();
    renderFlow(<Harness initial={checklistEval(true)} />);
    expect(screen.getAllByLabelText('Valoración')).toHaveLength(1);
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });
});
describe('cumplimiento en el informe', () => {
  function checklistFinal(): EvaluacionFlujo {
    const e = final('actual');
    const m = copiarMetodologia(METODOLOGIAS_HEURISTICAS.find(x => x.id === 'hassan-checklist-2003')!);
    m.criterios = m.criterios.filter(c => c.categoria === 'Generales').slice(0, 2);
    e.configuracion = { ...e.configuracion, metodologia: m };
    e.consenso.criterios = m.criterios.map((c, i) => ({ criterioId: c.id, valor: i ? 'no' : 'si', noAplica: false, motivo: '', notas: '', justificacion: 'ok' }));
    e.consenso.hallazgos = [];
    e.informe = { ...e.informe!, configuracion: e.configuracion, consenso: e.consenso };
    return e;
  }
  it('muestra "n de N cumplen" por categoría y total en texto', () => {
    renderFlow(<InformeView evaluacion={checklistFinal()} historial={[]} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Cumplimiento' })).toBeInTheDocument();
    expect(screen.getAllByText('1 de 2 cumplen (50 %)')).toHaveLength(2);
  });
  it('no muestra la sección con una escala sin favorables (evaluación antigua)', () => {
    const antigua = final('actual');
    antigua.informe!.configuracion = { ...antigua.informe!.configuracion, metodologia: structuredClone(antigua.informe!.configuracion.metodologia) };
    antigua.informe!.configuracion.metodologia.escala.niveles.forEach(n => { delete n.favorable; });
    renderFlow(<InformeView evaluacion={antigua} historial={[]} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.queryByRole('heading', { name: 'Cumplimiento' })).toBeNull();
  });
  it('textoCumplimiento: sin valorables, y con sin evaluar / no aplica', () => {
    const base = { favorables: 0, desfavorables: 0, neutros: 0, sinEvaluar: 0, noAplica: 0, proporcion: null };
    expect(textoCumplimiento({ ...base, noAplica: 2 })).toBe('Sin criterios valorables · 2 no aplica');
    expect(textoCumplimiento({ ...base, favorables: 1, desfavorables: 2, sinEvaluar: 1 })).toBe('1 de 3 cumplen (33 %) · 1 sin evaluar');
  });
});
describe('consenso con checklist', () => {
  function consensoEval(mixta = false): EvaluacionFlujo {
    const base = evaluation({ fase: 'PENDIENTE_CONSENSO' });
    const m = copiarMetodologia(METODOLOGIAS_HEURISTICAS.find(x => x.id === 'hassan-checklist-2003')!);
    m.criterios = [...m.criterios.filter(c => c.categoria === 'Generales').slice(0, 2), ...m.criterios.filter(c => c.categoria === 'Identidad e información').slice(0, 1)];
    if (mixta) m.criterios[2] = { ...m.criterios[2], escala: copiarMetodologia(METODOLOGIAS_HEURISTICAS[0]).escala };
    const resp = (valor: string) => m.criterios.map(c => ({ criterioId: c.id, valor, noAplica: false, motivo: '', notas: '' }));
    const trabajo = (evaluadorId: string, nombre: string, valor: string) => ({ evaluadorId, nombre, respuestas: resp(valor), hallazgos: [], entregadoEn: '2026-10-09T12:00:00Z', guardadoEn: '2026-10-09T12:00:00Z' });
    return { ...base, configuracion: { ...base.configuracion, metodologia: m, evaluadorIds: ['u1', 'u2'] }, trabajos: [trabajo('u1', 'Ana', 'si'), trabajo('u2', 'Beto', 'no')] };
  }
  it('agrupa por categoría y dice en texto qué respuestas difieren', () => {
    const e = consensoEval();
    renderFlow(<ConsensoEditor evaluacion={e} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole('region', { name: 'Generales' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Identidad e información' })).toBeNull();
    expect(screen.getByText('0 de 2 con valoración acordada')).toBeInTheDocument();
    expect(screen.getAllByText(/Difieren: Sí \/ No/)).toHaveLength(3);
  });
  it('con escalas mixtas conserva la vista plana', () => {
    renderFlow(<ConsensoEditor evaluacion={consensoEval(true)} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.queryByRole('region', { name: 'Generales' })).toBeNull();
    expect(screen.queryByText(/Difieren:/)).toBeNull();
  });
});

describe('aspectos positivos y conclusión', () => {
  it('agrega y quita un aspecto positivo en el consenso', async () => {
    renderFlow(<ConsensoEditor evaluacion={evaluation({ fase: 'PENDIENTE_CONSENSO' })} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.queryByLabelText('Título del aspecto positivo 1')).toBeNull();
    await userEvent.click(screen.getByRole('tab', { name: 'Preparar el informe' }));
    await userEvent.click(screen.getByRole('button', { name: 'Agregar aspecto positivo' }));
    await userEvent.type(screen.getByLabelText('Título del aspecto positivo 1'), 'Menú claro');
    expect(screen.getByLabelText('Título del aspecto positivo 1')).toHaveValue('Menú claro');
    await userEvent.click(screen.getByRole('button', { name: 'Quitar aspecto positivo 1' }));
    expect(screen.queryByLabelText('Título del aspecto positivo 1')).toBeNull();
  });
  it('envía positivos y conclusión al guardar el consenso', async () => {
    const e = evaluation({ fase: 'PENDIENTE_CONSENSO' });
    api.mockResolvedValue({ ...e, revision: 2 });
    renderFlow(<ConsensoEditor evaluacion={e} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Preparar el informe' }));
    await userEvent.click(screen.getByRole('button', { name: 'Agregar aspecto positivo' }));
    await userEvent.type(screen.getByLabelText('Título del aspecto positivo 1'), 'Menú claro');
    await userEvent.type(screen.getByLabelText('Conclusión y recomendaciones finales'), 'Corregir el formulario');
    await waitFor(() => expect(api).toHaveBeenCalledWith('p1', '/evaluaciones/e1/consenso', 'PATCH', expect.objectContaining({ positivos: [expect.objectContaining({ titulo: 'Menú claro' })], conclusion: 'Corregir el formulario' })), { timeout: 3000 });
  });
  it('el informe muestra las secciones solo con contenido', () => {
    const vacio = final('actual');
    const { unmount } = renderFlow(<InformeView evaluacion={vacio} historial={[]} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.queryByText('Ver lo que funciona bien')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Conclusión y recomendaciones finales' })).toBeNull();
    unmount();
    const lleno = final('actual');
    lleno.informe!.consenso.positivos = [{ id: 'pos1', titulo: 'Menú claro', descripcion: 'Etiquetas comprensibles.' }];
    lleno.informe!.consenso.conclusion = 'Corregir el formulario.';
    renderFlow(<InformeView evaluacion={lleno} historial={[]} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Ver lo que funciona bien')).toBeInTheDocument();
    expect(screen.getByText('Etiquetas comprensibles.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Conclusión y recomendaciones finales' })).toBeInTheDocument();
    expect(screen.getByText('Corregir el formulario.')).toBeInTheDocument();
  });
});

describe('mejoras antes/después', () => {
  it('agrega, edita y quita una mejora en el consenso', async () => {
    renderFlow(<ConsensoEditor evaluacion={evaluation({ fase: 'PENDIENTE_CONSENSO' })} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.queryByLabelText('Título de la mejora 1')).toBeNull();
    await userEvent.click(screen.getByRole('tab', { name: 'Preparar el informe' }));
    await userEvent.click(screen.getByRole('button', { name: 'Agregar mejora' }));
    await userEvent.type(screen.getByLabelText('Título de la mejora 1'), 'Botón visible');
    expect(screen.getByLabelText('Título de la mejora 1')).toHaveValue('Botón visible');
    expect(screen.getByText('Evidencias · antes de la mejora 1')).toBeInTheDocument();
    expect(screen.getByText('Evidencias · después de la mejora 1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar mejora 1' }));
    expect(screen.queryByLabelText('Título de la mejora 1')).toBeNull();
  });
  it('envía las mejoras al guardar el consenso', async () => {
    const e = evaluation({ fase: 'PENDIENTE_CONSENSO' });
    api.mockResolvedValue({ ...e, revision: 2 });
    renderFlow(<ConsensoEditor evaluacion={e} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Preparar el informe' }));
    await userEvent.click(screen.getByRole('button', { name: 'Agregar mejora' }));
    await userEvent.type(screen.getByLabelText('Título de la mejora 1'), 'Botón visible');
    await waitFor(() => expect(api).toHaveBeenCalledWith('p1', '/evaluaciones/e1/consenso', 'PATCH', expect.objectContaining({ mejoras: [expect.objectContaining({ titulo: 'Botón visible', antesIds: [], despuesIds: [] })] })), { timeout: 3000 });
  });
  it('el informe muestra la sección solo si hay mejoras', () => {
    const vacio = final('actual');
    const { unmount } = renderFlow(<InformeView evaluacion={vacio} historial={[]} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.queryByText('Ver imágenes de antes y después')).toBeNull();
    unmount();
    const lleno = final('actual');
    lleno.informe!.consenso.mejoras = [{ id: 'm1', titulo: 'Botón visible', descripcion: 'Se aumentó el contraste.', antesIds: [], despuesIds: [] }];
    renderFlow(<InformeView evaluacion={lleno} historial={[]} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Ver imágenes de antes y después')).toBeInTheDocument();
    expect(screen.getByText('Se aumentó el contraste.')).toBeInTheDocument();
    expect(screen.getAllByText('Sin capturas.')).toHaveLength(2);
  });
});

describe('continuidad al revisar', () => {
  const equipo = [{ id: 'u1', nombre: 'Ana', rol: 'ESTUDIANTE' }];
  const dos = (over: Partial<EvaluacionFlujo> = {}) => { const e = evaluation(over); e.configuracion.metodologia = copiarMetodologia(METODOLOGIAS_HEURISTICAS[0]); e.configuracion.metodologia.criterios = e.configuracion.metodologia.criterios.slice(0, 2); return e; };
  const responder = (lista: EvaluacionFlujo[]) => api.mockImplementation(async (_p, path) => path === '/evaluaciones' ? lista : path === '/metodologias' ? [config().metodologia] : path === '/equipo' ? equipo : lista.find(e => path === `/evaluaciones/${e.id}`) ?? []);
  it('ofrece retomar la última revisión sin terminar y abre esa', async () => {
    const vieja = evaluation({ id: 'e1', updatedAt: '2026-10-01T10:00:00Z' });
    const reciente = evaluation({ id: 'e2', updatedAt: '2026-10-15T10:00:00Z' });
    responder([final('f1'), vieja, reciente]);
    renderFlow(<FlujoHeuristicaPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Retomar mi última revisión' }));
    await screen.findByRole('navigation', { name: 'Preguntas de la revisión' });
    expect(api).toHaveBeenCalledWith('p1', '/evaluaciones/e2');
    expect(api).not.toHaveBeenCalledWith('p1', '/evaluaciones/e1');
  });
  it('no ofrece retomar si todas las revisiones están finalizadas o no hay ninguna', async () => {
    responder([final('f1')]);
    const primera = renderFlow(<FlujoHeuristicaPage />);
    await screen.findByRole('button', { name: '+ Nueva evaluación' });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Mis revisiones' }).closest('.technique-list-head')).toHaveTextContent('1'));
    expect(screen.queryByRole('button', { name: 'Retomar mi última revisión' })).toBeNull();
    primera.unmount();
    responder([]);
    renderFlow(<FlujoHeuristicaPage />);
    await screen.findByRole('button', { name: '+ Nueva evaluación' });
    expect(screen.queryByRole('button', { name: 'Retomar mi última revisión' })).toBeNull();
  });
  it('al volver a la técnica conserva la revisión abierta y Evaluaciones la olvida', async () => {
    const e = evaluation({ id: 'e2' });
    responder([e]);
    const primera = renderFlow(<FlujoHeuristicaPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Retomar mi última revisión' }));
    await screen.findByRole('navigation', { name: 'Preguntas de la revisión' });
    primera.unmount();
    const segunda = renderFlow(<FlujoHeuristicaPage />);
    await screen.findByRole('navigation', { name: 'Preguntas de la revisión' });
    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    await screen.findByRole('button', { name: '+ Nueva evaluación' });
    segunda.unmount();
    renderFlow(<FlujoHeuristicaPage />);
    await screen.findByRole('button', { name: '+ Nueva evaluación' });
    expect(screen.queryByRole('navigation', { name: 'Preguntas de la revisión' })).toBeNull();
  });
  it('recuerda la pregunta en la que estabas al volver', async () => {
    const e = dos();
    const primera = renderFlow(<Harness initial={e} />);
    await userEvent.click(screen.getByRole('button', { name: 'Pregunta siguiente' }));
    expect(screen.getByText('Pregunta 2 de 2')).toBeInTheDocument();
    primera.unmount();
    renderFlow(<Harness initial={e} />);
    expect(screen.getByText('Pregunta 2 de 2')).toBeInTheDocument();
  });
  it('deja Anterior y Siguiente junto a la pregunta, sin bajar al pie, y reserva el botón principal para la última pregunta', async () => {
    renderFlow(<Harness initial={dos()} />);
    const siguiente = screen.getByRole('button', { name: 'Pregunta siguiente' });
    expect(siguiente.closest('.hf-barra-pregunta')).not.toBeNull();
    expect(siguiente.closest('.hf-pie-trabajo')).toBeNull();
    expect(screen.getByRole('button', { name: 'Pregunta anterior' }).closest('.hf-barra-pregunta')).not.toBeNull();
    expect(siguiente).toHaveClass('primary');
    expect(screen.getByRole('button', { name: 'Entregar mi evaluación' })).not.toHaveClass('primary');
    await userEvent.click(siguiente);
    expect(screen.getByRole('button', { name: 'Entregar mi evaluación' })).toHaveClass('primary');
  });
});

describe('tarjeta de pregunta en Revisar', () => {
  function dosPreguntas(): EvaluacionFlujo {
    const e = evaluation();
    e.configuracion.metodologia.criterios = copiarMetodologia(METODOLOGIAS_HEURISTICAS[0]).criterios.slice(0, 2);
    return e;
  }
  it('muestra el problema dentro de la tarjeta de su pregunta', async () => {
    const e = evaluation(); renderFlow(<Harness initial={e} />);
    await userEvent.click(screen.getByRole('button', { name: `Agregar problema para ${e.configuracion.metodologia.criterios[0].nombre}` }));
    expect(screen.getByLabelText('Título del problema').closest('.hf-tarjeta')).not.toBeNull();
  });
  it('avanza sola a la pregunta siguiente, recuerda la pregunta y el interruptor', () => {
    vi.useFakeTimers();
    try {
      renderFlow(<Harness initial={dosPreguntas()} />);
      fireEvent.click(screen.getByRole('radio', { name: 'Cumple' }));
      act(() => { vi.advanceTimersByTime(600); });
      expect(screen.getByText('Pregunta 2 de 2')).toBeInTheDocument();
      expect(sessionStorage.getItem('heuristica:preg:e1:u1')).toBe('1');
      fireEvent.click(screen.getByRole('checkbox', { name: 'Pasar sola a la siguiente pregunta' }));
      expect(sessionStorage.getItem('heuristica:auto:u1')).toBe('0');
    } finally { vi.useRealTimers(); }
  });
});

describe('esqueleto estándar', () => {
  const equipo = [{ id: 'u1', nombre: 'Ana', rol: 'ESTUDIANTE' }];
  it('la lista muestra Mis revisiones con Abrir secundario; Nueva evaluación oculta la lista y pasa a Cancelar', async () => {
    api.mockImplementation(async (_p, path) => path === '/evaluaciones' ? [final('f1')] : path === '/metodologias' ? [config().metodologia] : path === '/equipo' ? equipo : []);
    renderFlow(<FlujoHeuristicaPage />);
    const abrir = await screen.findByRole('button', { name: 'Abrir' });
    expect(abrir).toHaveClass('secondary');
    expect(abrir.closest('.technique-item-actions')).not.toBeNull();
    await userEvent.click(screen.getByRole('button', { name: '+ Nueva evaluación' }));
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveClass('secondary');
    expect(await screen.findByLabelText('Producto o sitio')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Abrir' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByLabelText('Producto o sitio')).toBeNull();
    expect(screen.getByRole('button', { name: 'Abrir' })).toBeInTheDocument();
  });
  it('las instrucciones arrancan colapsadas', async () => {
    api.mockImplementation(async (_p, path) => path === '/metodologias' ? [config().metodologia] : path === '/equipo' ? equipo : []);
    renderFlow(<FlujoHeuristicaPage />);
    const resumen = await screen.findByText('Cómo trabajar con Evaluación heurística');
    expect(resumen.closest('details')).not.toHaveAttribute('open');
  });
});
