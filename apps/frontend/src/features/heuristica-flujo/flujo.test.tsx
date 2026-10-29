import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
import { coincidenciasProblemas, participacionInforme, pendientesTrabajo, precargarConsenso, textoCumplimiento, textoEscala } from './flujo-utils';
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

const abrirComentario = () => userEvent.click(screen.getByRole('button', { name: /^Comentario de / }));

describe('flujo individual', () => {
  it('permite entregar todas las preguntas no aplicables sin motivo ni valoración', async () => {
    const e = evaluation(); e.configuracion.metodologia = copiarMetodologia(METODOLOGIAS_HEURISTICAS[0]);
    api.mockImplementation(async (_p, path, _method, body) => path.endsWith('/trabajo') ? { ...e, revision: 2, trabajos: [{ ...e.trabajos[0], respuestas: body.respuestas }] } : { ...e, revision: 3, trabajos: [{ ...e.trabajos[0], entregadoEn: e.updatedAt }] });
    renderFlow(<Harness initial={e} />);
    for (let seccion = 0; seccion < 10; seccion++) {
      for (const r of screen.getAllByRole('radio', { name: 'No aplica' })) await userEvent.click(r);
      if (seccion < 9) await userEvent.click(screen.getByRole('button', { name: 'Sección siguiente' }));
    }
    expect(screen.queryByLabelText('Motivo de no aplica')).toBeNull();
    expect(screen.getByText('40 de 40 preguntas respondidas')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Entregar mi evaluación' }));
    await screen.findByText('Trabajo entregado. Tus respuestas están cerradas.');
    const guardado = api.mock.calls.find(c => c[1].endsWith('/trabajo'))![3];
    expect(guardado.respuestas).toHaveLength(40);
    expect(guardado.respuestas.every((r: { noAplica: boolean; valor: string | null; motivo: string }) => r.noAplica && r.valor === null && r.motivo === '')).toBe(true);
    expect(screen.queryByRole('alert')).toBeNull();
  }, 30000);
  it('ofrece respuestas visibles y No aplica dentro de la misma valoración', async () => {
    const e = evaluation(); renderFlow(<Harness initial={e} />);
    expect(screen.getAllByRole('radio')).toHaveLength(e.configuracion.metodologia.escala.niveles.length + 1);
    await userEvent.click(screen.getByRole('radio', { name: e.configuracion.metodologia.escala.niveles[0].etiqueta }));
    await userEvent.click(screen.getByRole('radio', { name: 'No aplica' }));
    expect(screen.getByRole('radio', { name: 'No aplica' })).toBeChecked();
    expect(screen.queryByLabelText('Motivo de no aplica')).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Valoración' })).toBeNull();
  });
  it('conserva respuestas al cambiar de pregunta y al consultar el resumen real del equipo', async () => {
    const e = evaluation(); e.configuracion.metodologia = copiarMetodologia(METODOLOGIAS_HEURISTICAS[0]);
    e.avanceEquipo = [{ evaluadorId: 'u1', nombre: 'Ana', evaluados: 0, total: 40, entregadoEn: null, guardadoEn: null }];
    renderFlow(<Harness initial={e} />);
    await userEvent.click(screen.getAllByRole('radio', { name: 'No aplica' })[0]);
    const barra = () => screen.getByRole('navigation', { name: 'Preguntas de la revisión' });
    await userEvent.click(within(barra()).getByRole('button', { name: /^Sección 2:/ }));
    expect(within(barra()).getByRole('button', { name: /^Sección 2:/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.queryByRole('heading', { name: 'Estado visible' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Resumen del equipo' }));
    expect(screen.getByRole('heading', { name: 'Progreso del equipo' })).toBeVisible();
    expect(screen.queryByRole('radio')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Mi revisión' }));
    await userEvent.click(within(barra()).getByRole('button', { name: /^Sección 1:/ }));
    expect(screen.getAllByRole('radio', { name: 'No aplica' })[0]).toBeChecked();
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
    expect(screen.getAllByRole('radio').every(r => !(r as HTMLInputElement).checked)).toBe(true);
    expect(screen.getByText('2 problemas')).toBeInTheDocument();
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
  it('guarda un problema, lo colapsa con aviso y permite editarlo', async () => {
    const e = evaluation();
    api.mockImplementation(async (_p, _path, _method, body) => ({ ...e, revision: 2, trabajos: [{ ...e.trabajos[0], respuestas: body.respuestas, hallazgos: body.hallazgos }] }));
    renderFlow(<Harness initial={e} />);
    await userEvent.click(screen.getByRole('button', { name: `Agregar problema para ${e.configuracion.metodologia.criterios[0].nombre}` }));
    await userEvent.type(screen.getByLabelText('Título del problema'), 'Sin foco visible');
    await userEvent.type(screen.getByLabelText('Descripción del problema'), 'No se ve el foco al tabular');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar problema 1' }));
    expect(await screen.findByText('Problema guardado con éxito')).toBeInTheDocument();
    expect(screen.queryByLabelText('Título del problema')).toBeNull();
    expect(api).toHaveBeenCalledWith('p1', '/evaluaciones/e1/trabajo', 'PATCH', expect.objectContaining({ hallazgos: [expect.objectContaining({ titulo: 'Sin foco visible' })] }));
    await userEvent.click(screen.getByRole('button', { name: 'Editar problema 1' }));
    expect(screen.getByLabelText('Título del problema')).toHaveValue('Sin foco visible');
    expect(screen.queryByText('Problema guardado con éxito')).toBeNull();
  });
  describe('mensaje al entregar', () => {
    const toasts: string[] = [];
    const escucha = (ev: Event) => { toasts.push((ev as CustomEvent<{ message: string }>).detail.message); };
    beforeEach(() => { toasts.length = 0; window.addEventListener('app:toast', escucha); return () => window.removeEventListener('app:toast', escucha); });
    async function entregar(respuestaEntrega: (e: EvaluacionFlujo) => EvaluacionFlujo | Error) {
      const e = evaluation();
      api.mockImplementation(async (_p, path, _m, body) => {
        if (path.endsWith('/trabajo')) return { ...e, revision: 2, trabajos: [{ ...e.trabajos[0], respuestas: body.respuestas, hallazgos: body.hallazgos }] };
        const r = respuestaEntrega(e); if (r instanceof Error) throw r; return r;
      });
      renderFlow(<Harness initial={e} />);
      await userEvent.click(screen.getByRole('radio', { name: e.configuracion.metodologia.escala.niveles[0].etiqueta }));
      await userEvent.click(screen.getByRole('button', { name: 'Entregar mi evaluación' }));
    }
    const entregada = (e: EvaluacionFlujo, over: Partial<EvaluacionFlujo> = {}): EvaluacionFlujo => ({ ...e, revision: 3, trabajos: [{ ...e.trabajos[0], entregadoEn: e.updatedAt }], avanceEquipo: [{ evaluadorId: 'u1', nombre: 'Ana', evaluados: 1, total: 1, entregadoEn: e.updatedAt, guardadoEn: null }, { evaluadorId: 'u2', nombre: 'Beto', evaluados: 0, total: 1, entregadoEn: null, guardadoEn: null }], ...over });
    it('avisa que entregaste y nombra a quien falta, con aviso emergente', async () => {
      await entregar(e => entregada(e));
      expect(await screen.findByText('Entregaste tu evaluación')).toBeInTheDocument();
      expect(screen.getByText('Falta que entreguen: Beto.')).toBeInTheDocument();
      expect(toasts).toEqual(['Entregaste tu evaluación. Tus respuestas quedaron cerradas; falta que entregue el resto del equipo.']);
    });
    it('si fue la última entrega el aviso emergente habla del acuerdo del equipo', async () => {
      await entregar(e => entregada(e, { fase: 'PENDIENTE_CONSENSO' }));
      await waitFor(() => expect(toasts).toHaveLength(1));
      expect(toasts[0]).toContain('ahora el equipo acuerda el resultado');
    });
    it('si falla la entrega no hay aviso de éxito', async () => {
      await entregar(() => new Error('Sin conexión'));
      expect(await screen.findByText('Sin conexión')).toBeInTheDocument();
      expect(screen.queryByText('Entregaste tu evaluación')).toBeNull();
      expect(toasts).toEqual([]);
    });
  });
  it('el aviso de listo y el botón Entregar principal aparecen solo sin pendientes', async () => {
    const e = evaluation(); renderFlow(<Harness initial={e} />);
    const entregar = screen.getByRole('button', { name: 'Entregar mi evaluación' });
    expect(entregar).toHaveClass('secondary');
    expect(screen.queryByText('Estás listo para entregar')).toBeNull();
    await userEvent.click(screen.getByRole('radio', { name: e.configuracion.metodologia.escala.niveles[0].etiqueta }));
    expect(screen.getByText('Estás listo para entregar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entregar mi evaluación' })).toHaveClass('primary');
    await userEvent.click(screen.getByRole('button', { name: `Agregar problema para ${e.configuracion.metodologia.criterios[0].nombre}` }));
    expect(screen.queryByText('Estás listo para entregar')).toBeNull();
    expect(screen.getByRole('button', { name: 'Entregar mi evaluación' })).toHaveClass('secondary');
  });
  it('no colapsa un problema incompleto y dice qué falta', async () => {
    const e = evaluation(); renderFlow(<Harness initial={e} />);
    await userEvent.click(screen.getByRole('button', { name: `Agregar problema para ${e.configuracion.metodologia.criterios[0].nombre}` }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar problema 1' }));
    expect(screen.getByText('Problema 1: completa título y descripción.')).toBeInTheDocument();
    expect(screen.getByLabelText('Título del problema')).toBeInTheDocument();
    expect(screen.queryByText('Problema guardado con éxito')).toBeNull();
  });
  it('si falla el guardado conserva el problema abierto y el texto', async () => {
    const e = evaluation(); api.mockRejectedValue(new Error('boom'));
    renderFlow(<Harness initial={e} />);
    await userEvent.click(screen.getByRole('button', { name: `Agregar problema para ${e.configuracion.metodologia.criterios[0].nombre}` }));
    await userEvent.type(screen.getByLabelText('Título del problema'), 'Sin foco visible');
    await userEvent.type(screen.getByLabelText('Descripción del problema'), 'No se ve el foco');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar problema 1' }));
    expect(await screen.findByText('No se pudo guardar el problema. Tu borrador se conserva.')).toBeInTheDocument();
    expect(screen.getByLabelText('Título del problema')).toHaveValue('Sin foco visible');
    expect(screen.queryByText('Problema guardado con éxito')).toBeNull();
  });
  it('reabre el problema incompleto aunque se haya cerrado manualmente', async () => {
    const e = evaluation(); renderFlow(<Harness initial={e} />);
    await userEvent.click(screen.getByRole('radio', { name: e.configuracion.metodologia.escala.niveles[0].etiqueta }));
    await userEvent.click(screen.getByRole('button', { name: `Agregar problema para ${e.configuracion.metodologia.criterios[0].nombre}` }));
    const contador = screen.getByRole('button', { name: /^1 problema/ });
    await userEvent.click(contador);
    expect(screen.queryByRole('textbox', { name: 'Título del problema' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Entregar mi evaluación' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Título del problema' })).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('título y descripción');
  });
  it('retiene texto cuando falla guardado, muestra error y permite reintentar', async () => {
    const e = evaluation(); api.mockRejectedValueOnce(new Error('Sin conexión')).mockImplementation(async (_p, _path, _m, b) => ({ ...e, revision: 2, trabajos: [{ ...e.trabajos[0], respuestas: b.respuestas, hallazgos: b.hallazgos }] }));
    renderFlow(<Harness initial={e} />);
    await abrirComentario();
    await userEvent.type(screen.getByRole('textbox', { name: /^Comentario de / }), 'Observación conservada');
    await userEvent.click(screen.getAllByRole('button', { name: 'Guardar cambios' })[0]);
    await screen.findAllByText(/Sin conexión/);
    expect(screen.getByRole('textbox', { name: /^Comentario de / })).toHaveValue('Observación conservada');
    expect(sessionStorage.getItem('heuristica:u1:e1:trabajo:')).toContain('Observación conservada');
    await userEvent.click(screen.getAllByRole('button', { name: 'Guardar cambios' })[0]);
    await waitFor(() => expect(screen.getAllByText(/Cambios guardados/)).toHaveLength(1));
  });
  it('serializa cambios durante una escritura y usa revisión nueva', async () => {
    const e = evaluation(); let finish!: (e: EvaluacionFlujo) => void;
    api.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockImplementation(async (_p, _path, _m, b) => ({ ...e, revision: 3, trabajos: [{ ...e.trabajos[0], respuestas: b.respuestas, hallazgos: b.hallazgos }] }));
    renderFlow(<Harness initial={e} />);
    await abrirComentario();
    await userEvent.type(screen.getByRole('textbox', { name: /^Comentario de / }), 'Primero');
    await userEvent.click(screen.getAllByRole('button', { name: 'Guardar cambios' })[0]);
    await userEvent.type(screen.getByRole('textbox', { name: /^Comentario de / }), ' después');
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
    await abrirComentario();
    expect(screen.getByRole('textbox', { name: /^Comentario de / })).toHaveValue('Borrador de revisión cinco');
    await waitFor(() => expect(api).toHaveBeenCalled(), { timeout: 2000 });
    expect(api.mock.calls[0][3].revision).toBe(5);
    await screen.findAllByText(/La revisión cambió/);
    expect(screen.getByRole('textbox', { name: /^Comentario de / })).toHaveValue('Borrador de revisión cinco');
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
    expect(screen.getAllByRole('radio').every(r => !(r as HTMLInputElement).checked)).toBe(true);
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
    expect(screen.getByRole('button', { name: 'Entregar acuerdo' })).toHaveClass('secondary');
  });
  it('recarga decisiones remotas antes de aprobar desde editor limpio', async () => {
    const e = evaluation({ fase: 'PENDIENTE_CONSENSO' });
    const fresh = { ...e, revision: 3, consenso: { ...e.consenso, criterios: [{ criterioId: e.configuracion.metodologia.criterios[0].id, valor: e.configuracion.metodologia.escala.niveles[0].id, noAplica: false, motivo: '', notas: 'Acuerdo remoto', justificacion: 'Revisión conjunta' }] } };
    api.mockResolvedValue(fresh);
    function Editor() { const [v, setV] = useState(e); return <ConsensoEditor evaluacion={v} usuarioId="u1" onSaved={setV} onBack={vi.fn()} />; }
    renderFlow(<Editor />); await userEvent.click(screen.getByRole('button', { name: 'Actualizar consenso y confirmaciones' }));
    await userEvent.click(await screen.findByRole('button', { name: /^Comentario guardado/ }));
    expect(screen.getByLabelText(/^Comentario del equipo de /)).toHaveValue('Revisión conjunta');
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

describe('vista de tablas por ítem', () => {
  function checklistEval(mixta = false): EvaluacionFlujo {
    const base = evaluation();
    const m = copiarMetodologia(METODOLOGIAS_HEURISTICAS.find(x => x.id === 'hassan-checklist-2003')!);
    m.criterios = [...m.criterios.filter(c => c.categoria === 'Generales').slice(0, 2), ...m.criterios.filter(c => c.categoria === 'Identidad e información').slice(0, 1)];
    if (mixta) m.criterios[2] = { ...m.criterios[2], escala: copiarMetodologia(METODOLOGIAS_HEURISTICAS[0]).escala };
    return { ...base, configuracion: { ...base.configuracion, metodologia: m } };
  }
  const fila = (nombre: string) => screen.getByRole('rowheader', { name: nombre }).closest('tr') as HTMLElement;
  it('agrupa por categoría y muestra "n de N respondidos" en texto', async () => {
    const e = checklistEval(); const [a, b] = e.configuracion.metodologia.criterios;
    renderFlow(<Harness initial={e} />);
    expect(screen.getByText('0 de 2 respondidos')).toBeInTheDocument();
    await userEvent.click(within(fila(a.nombre)).getByLabelText('Sí'));
    expect(screen.getByText('1 de 2 respondidos')).toBeInTheDocument();
    await userEvent.click(within(fila(b.nombre)).getByLabelText('No'));
    expect(screen.getByText('2 de 2 respondidos · ✓ Categoría completa')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sección siguiente' }));
    expect(screen.getByText('0 de 1 respondidos')).toBeInTheDocument();
  });
  it('cuenta no aplica inmediatamente, también con preguntas de tipo checklist', async () => {
    const e = checklistEval(); const [a, b, c] = e.configuracion.metodologia.criterios;
    renderFlow(<Harness initial={e} />);
    await userEvent.click(within(fila(a.nombre)).getByLabelText('Sí'));
    await userEvent.click(within(fila(b.nombre)).getByRole('radio', { name: 'No aplica' }));
    expect(screen.getByText('2 de 2 respondidos · ✓ Categoría completa')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sección siguiente' }));
    await userEvent.click(within(fila(c.nombre)).getByLabelText('No'));
    expect(screen.queryByLabelText('Motivo de no aplica')).toBeNull();
    expect(screen.getByText('3 de 3 preguntas respondidas')).toBeInTheDocument();
  });
  it('permite agregar un hallazgo desde un ítem', async () => {
    const e = checklistEval(); renderFlow(<Harness initial={e} />);
    await userEvent.click(screen.getByRole('button', { name: `Agregar problema para ${e.configuracion.metodologia.criterios[0].nombre}` }));
    expect(screen.getAllByLabelText('Título del problema')).toHaveLength(1);
    expect(screen.getByText('1 problema')).toBeInTheDocument();
  });
  it('evaluación antigua (3 niveles) o con escalas mixtas se muestra como tablas por escala', async () => {
    const { unmount } = renderFlow(<Harness initial={evaluation()} />);
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    unmount();
    renderFlow(<Harness initial={checklistEval(true)} />);
    expect(screen.getAllByRole('table')).toHaveLength(1);
    expect(screen.getAllByRole('radio')).toHaveLength(2 * 3);
    await userEvent.click(screen.getByRole('button', { name: 'Sección siguiente' }));
    expect(screen.getAllByRole('table')).toHaveLength(1);
    expect(screen.getAllByRole('radio')).toHaveLength(4);
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
describe('coincidencias de problemas', () => {
  const problema = (id: string, criterioIds: string[], titulo: string) => ({ id, criterioIds, titulo, pantalla: 'Inicio', descripcion: 'Error', recomendacion: 'Mejorar', severidad: 2 as const, prioridad: 'MEDIA' as const, notas: '', evidenciaIds: [] });
  function equipo(porPersona: Array<[string, string, ReturnType<typeof problema>[]]>) {
    const e = evaluation({ fase: 'PENDIENTE_CONSENSO' });
    e.trabajos = porPersona.map(([evaluadorId, nombre, hallazgos]) => ({ evaluadorId, nombre, respuestas: [], hallazgos, entregadoEn: e.updatedAt, guardadoEn: null }));
    return e;
  }
  it('marca entre sí a personas distintas con problemas en la misma pregunta', () => {
    const e = equipo([['u1', 'Ana', [problema('a1', ['c1'], 'Uno')]], ['u2', 'Beto', [problema('b1', ['c1', 'c2'], 'Dos')]], ['u3', 'Carla', [problema('k1', ['c9'], 'Tres')]]]);
    const m = coincidenciasProblemas(e.trabajos);
    expect(m.get('a1')).toEqual(['Beto']);
    expect(m.get('b1')).toEqual(['Ana']);
    expect(m.has('k1')).toBe(false);
  });
  it('no marca problemas de la misma persona ni con una sola persona', () => {
    expect(coincidenciasProblemas(equipo([['u1', 'Ana', [problema('a1', ['c1'], 'Uno'), problema('a2', ['c1'], 'Dos')]]]).trabajos).size).toBe(0);
  });
  it('el acuerdo muestra "Coincide con" en el resumen y junto a la casilla sin cambiar su nombre', async () => {
    const c = evaluation().configuracion.metodologia.criterios[0].id;
    const e = equipo([['u1', 'Ana', [problema('a1', [c], 'Sin foco')]], ['u2', 'Beto', [problema('b1', [c], 'Foco oculto')]], ['u3', 'Carla', [problema('k1', ['otra'], 'Otro tema')]]]);
    renderFlow(<ConsensoEditor evaluacion={e} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Revisar los problemas' }));
    expect(screen.getByText(/Ana: Sin foco · Pendiente de decisión · Coincide con: Beto/)).toBeInTheDocument();
    expect(screen.getByText(/Carla: Otro tema · Pendiente de decisión$/)).toBeInTheDocument();
    expect(screen.getAllByText('Coincide con: Beto')).toHaveLength(1);
    expect(screen.getByLabelText('Ana: Sin foco')).toBeInTheDocument();
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
  it('muestra un ítem por categoría y dice en texto qué respondió cada persona', () => {
    renderFlow(<ConsensoEditor evaluacion={consensoEval()} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Generales', 'Identidad e información']);
    expect(screen.getByText('0 de 2 acordadas')).toBeInTheDocument();
    expect(screen.getAllByText('Difieren')).toHaveLength(3);
    expect(screen.getAllByText('Ana: Sí')).toHaveLength(3);
    expect(screen.getAllByText('Beto: No')).toHaveLength(3);
  });
  it('con escalas mixtas separa una tabla por escala y no muestra la lista de diferencias antigua', () => {
    renderFlow(<ConsensoEditor evaluacion={consensoEval(true)} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getAllByRole('table')).toHaveLength(2);
    expect(screen.queryByText(/Difieren:/)).toBeNull();
  });
});

describe('consenso en equipo sobre la tabla', () => {
  function equipoEval(valorBeto: string, aprobadoPor: string[] = []): EvaluacionFlujo {
    const e = evaluation({ fase: 'PENDIENTE_CONSENSO' });
    e.configuracion.evaluadorIds = ['u1', 'u2'];
    const cid = e.configuracion.metodologia.criterios[0].id;
    const resp = (valor: string) => [{ criterioId: cid, valor, noAplica: false, motivo: '', notas: '' }];
    const trabajo = (evaluadorId: string, nombre: string, valor: string) => ({ evaluadorId, nombre, respuestas: resp(valor), hallazgos: [], entregadoEn: '2026-10-09T12:00:00Z', guardadoEn: '2026-10-09T12:00:00Z' });
    e.trabajos = [trabajo('u1', 'Ana', 'cumple'), trabajo('u2', 'Beto', valorBeto)];
    e.consenso.aprobadoPor = aprobadoPor;
    return e;
  }
  it('precarga la respuesta común cuando todos coinciden y la autoguarda', async () => {
    const e = equipoEval('cumple');
    api.mockResolvedValue({ ...e, revision: 2 });
    renderFlow(<ConsensoEditor evaluacion={e} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'Cumple' })).toBeChecked();
    expect(screen.getByText('Coinciden')).toBeInTheDocument();
    expect(screen.getByText('1 de 1 preguntas acordadas')).toBeInTheDocument();
    await waitFor(() => expect(api).toHaveBeenCalledWith('p1', '/evaluaciones/e1/consenso', 'PATCH', expect.objectContaining({ criterios: [expect.objectContaining({ valor: 'cumple', noAplica: false, justificacion: '' })] })), { timeout: 3000 });
  });
  it('si difieren deja la respuesta común vacía y exige el comentario del equipo', async () => {
    renderFlow(<ConsensoEditor evaluacion={equipoEval('no_cumple')} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getAllByRole('radio').every(r => !(r as HTMLInputElement).checked)).toBe(true);
    expect(screen.getByText('Difieren')).toBeInTheDocument();
    expect(screen.getByText('0 de 1 preguntas acordadas')).toBeInTheDocument();
    expect(screen.getByText('Ana: Cumple')).toBeInTheDocument();
    expect(screen.getByText('Beto: No cumple')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Cumple' }));
    expect(screen.getByText('Falta el comentario del equipo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Comentario del equipo de / }));
    expect(screen.getByText(/^Obligatorio:/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/^Comentario del equipo de /), 'Se acordó tras revisar el flujo');
    expect(screen.queryByText('Falta el comentario del equipo')).toBeNull();
  });
  it('muestra quiénes confirmaron el acuerdo', () => {
    const { unmount } = renderFlow(<ConsensoEditor evaluacion={equipoEval('no_cumple')} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Confirmaron 0 de 2 evaluadores.')).toBeInTheDocument();
    unmount();
    renderFlow(<ConsensoEditor evaluacion={equipoEval('no_cumple', ['u2'])} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Confirmaron 1 de 2 evaluadores: Beto.')).toBeInTheDocument();
  });
  it('un no redactor ve el acuerdo en solo lectura, quién redacta y quién falta', async () => {
    renderFlow(<ConsensoEditor evaluacion={equipoEval('no_cumple')} usuarioId="u2" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Redacta el acuerdo: Ana. Solo esa persona puede editarlo; tú puedes leerlo y confirmarlo.')).toBeInTheDocument();
    expect(screen.getByText('Falta confirmar: Ana, Beto.')).toBeInTheDocument();
    expect(screen.getAllByRole('radio').every(r => (r as HTMLInputElement).disabled)).toBe(true);
    await userEvent.click(screen.getByRole('tab', { name: 'Revisar los problemas' }));
    expect(screen.queryByRole('button', { name: 'Agregar hallazgo nuevo del equipo' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Crear decisión de los originales seleccionados' })).toBeNull();
    await userEvent.click(screen.getByRole('tab', { name: 'Preparar el informe' }));
    expect(screen.getByLabelText('Conclusión y recomendaciones finales')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Estoy de acuerdo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Pido cambios' })).toBeEnabled();
  });
  it('con redactor elegido edita solo esa persona; el coordinador queda en lectura', () => {
    const elegido = () => { const e = equipoEval('no_cumple'); e.consenso.redactorId = 'u2'; return e; };
    const { unmount } = renderFlow(<ConsensoEditor evaluacion={elegido()} usuarioId="u2" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Tú redactas el acuerdo.')).toBeInTheDocument();
    expect(screen.getAllByRole('radio').every(r => !(r as HTMLInputElement).disabled)).toBe(true);
    unmount();
    renderFlow(<ConsensoEditor evaluacion={elegido()} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Redacta el acuerdo: Beto. Solo esa persona puede editarlo; tú puedes leerlo y confirmarlo.')).toBeInTheDocument();
    expect(screen.getAllByRole('radio').every(r => (r as HTMLInputElement).disabled)).toBe(true);
  });
  it('un no redactor no precarga ni autoguarda el acuerdo', async () => {
    renderFlow(<ConsensoEditor evaluacion={equipoEval('cumple')} usuarioId="u2" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('0 de 1 preguntas acordadas')).toBeInTheDocument();
    await new Promise(r => setTimeout(r, 1200));
    expect(api).not.toHaveBeenCalled();
  });
  it('un experto vota por el redactor con la revisión vigente', async () => {
    const e = equipoEval('no_cumple');
    api.mockResolvedValue({ ...e, revision: 2, consenso: { ...e.consenso, votosRedactor: { u2: 'u2' } } });
    renderFlow(<ConsensoEditor evaluacion={e} usuarioId="u2" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Redactor actual: Ana (el coordinador, hasta que el equipo vote).')).toBeInTheDocument();
    expect(screen.getByText('Beto: aún no votó')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decidir redactor' })).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText('Mi voto'), 'u2');
    await userEvent.click(screen.getByRole('button', { name: 'Votar por este redactor' }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('p1', '/evaluaciones/e1/redactor/voto', 'POST', { revision: 1, candidatoId: 'u2' }));
  });
  it('el coordinador decide solo con empate o votos faltantes', async () => {
    const e = equipoEval('no_cumple');
    e.consenso.votosRedactor = { u1: 'u1', u2: 'u2' };
    api.mockResolvedValue({ ...e, revision: 2, consenso: { ...e.consenso, redactorId: 'u2' } });
    const { unmount } = renderFlow(<ConsensoEditor evaluacion={e} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText('Redactor que decide el coordinador'), 'u2');
    await userEvent.click(screen.getByRole('button', { name: 'Decidir redactor' }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('p1', '/evaluaciones/e1/redactor/decidir', 'POST', { revision: 1, redactorId: 'u2' }));
    unmount();
    const mayoria = equipoEval('no_cumple');
    mayoria.consenso.votosRedactor = { u1: 'u2', u2: 'u2' };
    renderFlow(<ConsensoEditor evaluacion={mayoria} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Decidir redactor' })).toBeNull();
    expect(screen.getByText(/El equipo ya eligió por mayoría/)).toBeInTheDocument();
  });
  it('avisa cuando cambia quien redacta tras actualizar', async () => {
    const e = equipoEval('no_cumple');
    function Editor() { const [v, setV] = useState(e); return <><button type="button" onClick={() => setV({ ...e, revision: 2, consenso: { ...e.consenso, redactorId: 'u2' } })}>Simular cambio</button><ConsensoEditor evaluacion={v} usuarioId="u1" onSaved={setV} onBack={vi.fn()} /></>; }
    renderFlow(<Editor />);
    expect(screen.queryByText(/Cambió quien redacta/)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Simular cambio' }));
    expect(await screen.findByText('Cambió quien redacta el acuerdo: ahora redacta Beto.')).toBeInTheDocument();
  });
  it('lista los pendientes por sección y bloquea la entrega hasta completarlos', async () => {
    renderFlow(<ConsensoEditor evaluacion={equipoEval('no_cumple')} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Preparar el informe' }));
    expect(screen.getByText('Faltan 1 elemento por completar.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Criterios (1)' })).toBeInTheDocument();
    expect(screen.getByText(/: Falta evaluarlo\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entregar acuerdo' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Estoy de acuerdo' })).toBeNull();
  });
  it('el redactor entrega el acuerdo completo con la revisión vigente', async () => {
    const e = equipoEval('cumple');
    api.mockResolvedValue({ ...e, revision: 2 });
    renderFlow(<ConsensoEditor evaluacion={e} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Preparar el informe' }));
    expect(screen.getByText('No hay pendientes: el acuerdo está completo.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Entregar acuerdo' }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('p1', '/evaluaciones/e1/entregar-acuerdo', 'POST', { revision: 2 }));
  });
  it('un experto que no redacta confirma con "Estoy de acuerdo" o pide cambios con comentario', async () => {
    const e = equipoEval('cumple');
    e.consenso.criterios = [{ criterioId: e.configuracion.metodologia.criterios[0].id, valor: 'cumple', noAplica: false, motivo: '', notas: '', justificacion: '' }];
    api.mockResolvedValue({ ...e, revision: 2 });
    renderFlow(<ConsensoEditor evaluacion={e} usuarioId="u2" onSaved={vi.fn()} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Preparar el informe' }));
    expect(screen.queryByRole('button', { name: 'Entregar acuerdo' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Pido cambios' }));
    const enviar = screen.getByRole('button', { name: 'Enviar pedido de cambios' });
    expect(enviar).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Qué cambios pides'), '  Revisar el criterio 1 ');
    await userEvent.click(enviar);
    await waitFor(() => expect(api).toHaveBeenCalledWith('p1', '/evaluaciones/e1/pedir-cambios', 'POST', { revision: 1, comentario: 'Revisar el criterio 1' }));
    await waitFor(() => expect(screen.queryByLabelText('Qué cambios pides')).toBeNull());
    await userEvent.click(screen.getByRole('button', { name: 'Estoy de acuerdo' }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('p1', '/evaluaciones/e1/aprobar', 'POST', { revision: 1 }));
  });
  describe('al confirmar o entregar el acuerdo', () => {
    const toasts: string[] = [];
    const escucha = (ev: Event) => { toasts.push((ev as CustomEvent<{ message: string }>).detail.message); };
    beforeEach(() => { toasts.length = 0; window.addEventListener('app:toast', escucha); return () => window.removeEventListener('app:toast', escucha); });
    const completa = (aprobadoPor: string[] = []) => { const e = equipoEval('cumple', aprobadoPor); e.consenso.criterios = [{ criterioId: e.configuracion.metodologia.criterios[0].id, valor: 'cumple', noAplica: false, motivo: '', notas: '', justificacion: '' }]; return e; };
    function Editor({ inicial, usuario }: { inicial: EvaluacionFlujo; usuario: string }) { const [v, setV] = useState(inicial); return <ConsensoEditor evaluacion={v} usuarioId={usuario} onSaved={setV} onBack={vi.fn()} />; }
    it('confirmar avisa quién falta, muestra que ya confirmaste y bloquea el botón', async () => {
      const e = completa();
      api.mockImplementation(async (_p, path) => path.endsWith('/aprobar') ? { ...e, revision: 2, consenso: { ...e.consenso, aprobadoPor: ['u2'] } } : e);
      renderFlow(<Editor inicial={e} usuario="u2" />);
      await userEvent.click(screen.getByRole('tab', { name: 'Preparar el informe' }));
      expect(screen.queryByText('Ya confirmaste el acuerdo')).toBeNull();
      await userEvent.click(screen.getByRole('button', { name: 'Estoy de acuerdo' }));
      expect(await screen.findByText('Ya confirmaste el acuerdo')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Estoy de acuerdo' })).toBeDisabled();
      expect(toasts).toEqual(['Confirmaste el acuerdo. Falta que confirme: Ana.']);
      expect(document.activeElement).toBe(screen.getByText('Confirmación de todos los expertos').closest('section'));
    });
    it('entregar el acuerdo avisa con su propio mensaje', async () => {
      const e = completa();
      api.mockResolvedValue({ ...e, revision: 2, consenso: { ...e.consenso, aprobadoPor: ['u1'] } });
      renderFlow(<Editor inicial={e} usuario="u1" />);
      await userEvent.click(screen.getByRole('tab', { name: 'Preparar el informe' }));
      await userEvent.click(screen.getByRole('button', { name: 'Entregar acuerdo' }));
      expect(await screen.findByText('Ya confirmaste el acuerdo')).toBeInTheDocument();
      expect(toasts).toEqual(['Entregaste el acuerdo. Los demás expertos pueden confirmarlo o pedir cambios.']);
    });
    it('si falla la confirmación no hay aviso ni estado de confirmado', async () => {
      const e = completa();
      api.mockImplementation(async (_p, path) => { if (path.endsWith('/aprobar')) throw new Error('Conflicto de revisión'); return e; });
      renderFlow(<Editor inicial={e} usuario="u2" />);
      await userEvent.click(screen.getByRole('tab', { name: 'Preparar el informe' }));
      await userEvent.click(screen.getByRole('button', { name: 'Estoy de acuerdo' }));
      expect(await screen.findByText('Conflicto de revisión')).toBeInTheDocument();
      expect(toasts).toEqual([]); expect(screen.queryByText('Ya confirmaste el acuerdo')).toBeNull();
    });
  });
  it('muestra los cambios pedidos con su autor', async () => {
    const e = equipoEval('no_cumple');
    e.consenso.pedidosCambios = [{ evaluadorId: 'u2', comentario: 'Revisar el criterio 1', creadoEn: '2026-10-27T12:00:00Z' }];
    renderFlow(<ConsensoEditor evaluacion={e} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Preparar el informe' }));
    expect(screen.getByText('Beto pidió cambios: Revisar el criterio 1')).toBeInTheDocument();
  });
  it('agrega un hallazgo nuevo del equipo, lo rotula y permite quitarlo', async () => {
    renderFlow(<ConsensoEditor evaluacion={equipoEval('no_cumple')} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Revisar los problemas' }));
    await userEvent.click(screen.getByRole('button', { name: 'Agregar hallazgo nuevo del equipo' }));
    expect(screen.getByText('Nuevo del equipo')).toBeInTheDocument();
    expect(screen.getByLabelText('Decisión del consenso')).toHaveValue('PENDIENTE');
    await waitFor(() => expect(screen.getByRole('group', { name: /Decisión 1/ })).toHaveFocus());
    await userEvent.click(screen.getByRole('button', { name: 'Quitar hallazgo nuevo del equipo 1' }));
    expect(screen.queryByLabelText('Decisión del consenso')).toBeNull();
  });
  it('desactiva el botón al llegar al tope de hallazgos nuevos', async () => {
    const e = equipoEval('cumple');
    e.consenso.hallazgos = Array.from({ length: 50 }, (_, i) => ({ id: `n${i}`, criterioIds: [], titulo: `Nuevo ${i}`, pantalla: '', descripcion: '', recomendacion: '', severidad: 2 as const, prioridad: 'MEDIA' as const, notas: '', evidenciaIds: [], origenIds: [], decision: 'PENDIENTE' as const, justificacion: '' }));
    renderFlow(<ConsensoEditor evaluacion={e} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Revisar los problemas' }));
    expect(screen.getByRole('button', { name: 'Agregar hallazgo nuevo del equipo' })).toBeDisabled();
  });
  it('informe: bloque abierto en 3 grupos, escala traducida, fechas de Chile, confirmaciones y redactor', () => {
    const e = final('grupos');
    e.informe!.evaluadores = [{ id: 'u1', nombre: 'Ana' }, { id: 'u2', nombre: 'Beto' }];
    e.consenso.aprobadoPor = ['u1']; e.consenso.redactorId = 'u2'; e.informe!.consenso = e.consenso;
    e.informe!.iniciadoEn = '2026-10-09T12:00:00Z'; e.informe!.consolidadoEn = '2026-10-10T03:30:00Z'; e.informe!.finalizadoEn = null;
    e.informe!.configuracion = { ...e.informe!.configuracion, objetivo: '', exclusiones: '' };
    renderFlow(<InformeView evaluacion={e} historial={[]} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    const bloque = screen.getByText('Ver qué se revisó y quién participó').closest('details')!;
    expect(bloque).toHaveAttribute('open');
    for (const g of ['Qué se evaluó', 'Con qué criterios', 'Quién participó']) expect(within(bloque).getByRole('heading', { name: g })).toBeInTheDocument();
    expect(bloque).not.toHaveTextContent(/categorica|sin_orden|mayor_mejor|menor_mejor| \| /);
    expect(bloque).not.toHaveTextContent(/Z\b/);
    expect(within(bloque).getByText('Objetivo').nextSibling).toHaveTextContent('No indicado');
    expect(within(bloque).queryByText('Exclusiones')).toBeNull();
    expect(within(bloque).getByText('Redactor del acuerdo').nextSibling).toHaveTextContent('Beto');
    expect(within(bloque).getByText('Informe finalizado').nextSibling).toHaveTextContent('Pendiente');
    expect(within(bloque).getByText('Acuerdo consolidado').nextSibling).toHaveTextContent(/oct/i);
    const lista = within(bloque).getByRole('list', { name: 'Confirmación por persona' });
    expect(lista).toHaveTextContent('Ana: confirmó el acuerdo'); expect(lista).toHaveTextContent('Beto: falta confirmar');
  });
  it('participacionInforme: redactor por defecto es el coordinador y textoEscala traduce valores internos', () => {
    const e = final('p'); e.informe!.evaluadores = [{ id: 'u1', nombre: 'Ana' }];
    expect(participacionInforme(e.informe!, 'u1').redactor).toBe('Ana');
    expect(participacionInforme(e.informe!, 'coord-externo').redactor).toBe('El coordinador');
    expect(textoEscala({ tipo: 'categorica', niveles: [], sentido: 'sin_orden', fuente: 'x' })).toBe('Categorías, sin orden entre los niveles');
  });
  it('el informe rotula el hallazgo sin origen individual como Nuevo del equipo', () => {
    const e = final('equipo'); e.consenso.hallazgos[0].origenIds = []; e.informe!.consenso = e.consenso;
    renderFlow(<InformeView evaluacion={e} historial={[]} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText(/Origen: Nuevo del equipo/)).toBeInTheDocument();
  });
  describe('autoguardado del acuerdo tras un error', () => {
    function Editor({ inicial }: { inicial: EvaluacionFlujo }) { const [v, setV] = useState(inicial); return <ConsensoEditor evaluacion={v} usuarioId="u1" onSaved={setV} onBack={vi.fn()} />; }
    const comentar = async (texto: string) => {
      await userEvent.click(screen.getByRole('button', { name: /^Comentario del equipo de / }));
      await userEvent.type(screen.getByLabelText(/^Comentario del equipo de /), texto);
    };
    it('tras un error que no es 409, un cambio nuevo vuelve a intentar el guardado', async () => {
      const e = equipoEval('no_cumple');
      api.mockRejectedValueOnce(new Error('Datos inválidos.'));
      api.mockImplementation(async (_p, _path, _m, body) => ({ ...e, revision: 2, consenso: { ...e.consenso, ...body } }));
      renderFlow(<Editor inicial={e} />);
      await userEvent.click(screen.getByRole('radio', { name: 'Cumple' }));
      await waitFor(() => expect(api).toHaveBeenCalledTimes(1), { timeout: 3000 });
      await comentar('Acordado');
      await waitFor(() => expect(api).toHaveBeenCalledTimes(2), { timeout: 3000 });
      expect(api).toHaveBeenLastCalledWith('p1', '/evaluaciones/e1/consenso', 'PATCH', expect.objectContaining({ criterios: [expect.objectContaining({ justificacion: 'Acordado' })] }));
    });
    it('tras un 409 no reintenta con la revisión vieja hasta recargar', async () => {
      const e = equipoEval('no_cumple');
      api.mockRejectedValueOnce(Object.assign(new Error('Otra persona guardó antes.'), { status: 409 }));
      renderFlow(<Editor inicial={e} />);
      await userEvent.click(screen.getByRole('radio', { name: 'Cumple' }));
      await waitFor(() => expect(api).toHaveBeenCalledTimes(1), { timeout: 3000 });
      await comentar('Acordado');
      await new Promise(r => setTimeout(r, 1200));
      expect(api).toHaveBeenCalledTimes(1);
    });
  });
  it('precargarConsenso respeta lo ya acordado y devuelve el mismo arreglo si no hay nada que cargar', () => {
    const e = equipoEval('cumple'); const cid = e.configuracion.metodologia.criterios[0].id;
    const acordado = [{ criterioId: cid, valor: 'no_cumple', noAplica: false, motivo: '', notas: '', justificacion: 'x' }];
    expect(precargarConsenso(e.configuracion, e.trabajos, acordado)).toBe(acordado);
    expect(precargarConsenso(e.configuracion, equipoEval('no_cumple').trabajos, [])).toEqual([]);
    expect(precargarConsenso(e.configuracion, e.trabajos, [])).toEqual([expect.objectContaining({ criterioId: cid, valor: 'cumple', justificacion: '' })]);
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
  describe('guardar y plegar un aspecto positivo', () => {
    async function agregar() {
      const e = evaluation({ fase: 'PENDIENTE_CONSENSO' });
      api.mockImplementation(async (_p, _path, _m, body) => ({ ...e, revision: 2, consenso: { ...e.consenso, ...body } }));
      function Editor() { const [v, setV] = useState(e); return <ConsensoEditor evaluacion={v} usuarioId="u1" onSaved={setV} onBack={vi.fn()} />; }
      renderFlow(<Editor />);
      await userEvent.click(screen.getByRole('tab', { name: 'Preparar el informe' }));
      await userEvent.click(screen.getByRole('button', { name: 'Agregar aspecto positivo' }));
    }
    it('Guardar lo pliega con aviso y Editar lo reabre', async () => {
      await agregar();
      await userEvent.type(screen.getByLabelText('Título del aspecto positivo 1'), 'Menú claro');
      await userEvent.click(screen.getByRole('button', { name: 'Guardar aspecto positivo 1' }));
      expect(screen.getByText('Aspecto positivo guardado con éxito')).toBeInTheDocument();
      expect(screen.queryByLabelText('Título del aspecto positivo 1')).toBeNull();
      await userEvent.click(screen.getByRole('button', { name: 'Editar aspecto positivo 1' }));
      expect(screen.getByLabelText('Título del aspecto positivo 1')).toHaveValue('Menú claro');
      expect(screen.queryByText('Aspecto positivo guardado con éxito')).toBeNull();
    });
    it('sin título no se pliega y dice qué falta', async () => {
      await agregar();
      await userEvent.click(screen.getByRole('button', { name: 'Guardar aspecto positivo 1' }));
      expect(screen.getByRole('alert')).toHaveTextContent('Escribe un título');
      expect(screen.getByLabelText('Título del aspecto positivo 1')).toBeInTheDocument();
    });
    it('plegado se puede quitar y el guardado conserva los datos', async () => {
      await agregar();
      await userEvent.type(screen.getByLabelText('Título del aspecto positivo 1'), 'Menú claro');
      await userEvent.click(screen.getByRole('button', { name: 'Guardar aspecto positivo 1' }));
      await waitFor(() => expect(api).toHaveBeenCalledWith('p1', '/evaluaciones/e1/consenso', 'PATCH', expect.objectContaining({ positivos: [expect.objectContaining({ titulo: 'Menú claro' })] })), { timeout: 3000 });
      await userEvent.click(screen.getByRole('button', { name: 'Quitar aspecto positivo 1' }));
      expect(screen.queryByText('Aspecto positivo guardado con éxito')).toBeNull();
    });
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
    const e = dos(); e.configuracion.metodologia.criterios = copiarMetodologia(METODOLOGIAS_HEURISTICAS[0]).criterios.slice(0, 5);
    const barra = () => screen.getByRole('navigation', { name: 'Preguntas de la revisión' });
    const primera = renderFlow(<Harness initial={e} />);
    expect(within(barra()).getByRole('button', { name: /^Sección 1:/ })).toHaveAttribute('aria-current', 'true');
    await userEvent.click(within(barra()).getByRole('button', { name: /^Sección 2:/ }));
    expect(sessionStorage.getItem('heuristica:preg:e1:u1')).toBe('4');
    primera.unmount();
    renderFlow(<Harness initial={e} />);
    expect(within(barra()).getByRole('button', { name: /^Sección 2:/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.queryByRole('heading', { name: 'Estado visible' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Sección anterior' }));
    expect(within(barra()).getByRole('button', { name: /^Sección 1:/ })).toHaveAttribute('aria-current', 'true');
    expect(sessionStorage.getItem('heuristica:preg:e1:u1')).toBe('0');
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

describe('aviso de terminada y volver al inicio', () => {
  const toasts: string[] = [];
  const escucha = (ev: Event) => { toasts.push((ev as CustomEvent<{ message: string }>).detail.message); };
  beforeEach(() => { toasts.length = 0; window.addEventListener('app:toast', escucha); return () => window.removeEventListener('app:toast', escucha); });
  const consolidada = () => { const e = final('c1'); e.fase = 'CONSOLIDADA'; return e; };
  it('al finalizar avisa y vuelve al inicio', async () => {
    const e = consolidada(); const fin = { ...e, fase: 'FINALIZADA' as const, revision: 2 };
    api.mockResolvedValue(fin);
    const onSaved = vi.fn(); const onBack = vi.fn();
    renderFlow(<InformeView evaluacion={e} historial={[]} usuarioId="u1" onSaved={onSaved} onBack={onBack} />);
    await userEvent.click(screen.getByRole('button', { name: 'Finalizar informe' }));
    await waitFor(() => expect(onBack).toHaveBeenCalledTimes(1));
    expect(onSaved).toHaveBeenCalledWith(fin);
    expect(toasts).toEqual(['Evaluación terminada. Puedes abrir el informe final desde Mis revisiones.']);
  });
  it('si falla al finalizar no vuelve ni avisa y muestra el error', async () => {
    api.mockRejectedValue(new Error('Conflicto de revisión'));
    const onBack = vi.fn();
    renderFlow(<InformeView evaluacion={consolidada()} historial={[]} usuarioId="u1" onSaved={vi.fn()} onBack={onBack} />);
    await userEvent.click(screen.getByRole('button', { name: 'Finalizar informe' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Conflicto de revisión');
    expect(onBack).not.toHaveBeenCalled(); expect(toasts).toEqual([]);
  });
  it('en la página, tras finalizar se ve Mis revisiones con la revisión Terminada', async () => {
    const e = consolidada(); const fin = { ...e, fase: 'FINALIZADA' as const, revision: 2 };
    let finalizada = false;
    api.mockImplementation(async (_p, path, method) => {
      if (method === 'POST' && path.endsWith('/finalizar')) { finalizada = true; return fin; }
      if (path === '/evaluaciones') return [finalizada ? fin : e];
      if (path === `/evaluaciones/${e.id}`) return finalizada ? fin : e;
      if (path === '/metodologias') return [config().metodologia];
      if (path === '/equipo') return [{ id: 'u1', nombre: 'Ana', rol: 'ESTUDIANTE' }];
      return [];
    });
    renderFlow(<FlujoHeuristicaPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Finalizar informe' }));
    expect(await screen.findByRole('heading', { name: 'Mis revisiones' })).toBeInTheDocument();
    expect(await screen.findByText('Terminada')).toBeInTheDocument();
    expect(toasts).toHaveLength(1);
  });
});

describe('revisión pendiente creada por otra persona', () => {
  const equipo = [{ id: 'u1', nombre: 'Ana', rol: 'ESTUDIANTE' }, { id: 'u2', nombre: 'Beto', rol: 'ESTUDIANTE' }];
  const abrir = async (e: EvaluacionFlujo) => {
    api.mockImplementation(async (_p, path) => path === '/evaluaciones' ? [e] : path === '/metodologias' ? [config().metodologia] : path === '/equipo' ? equipo : []);
    renderFlow(<FlujoHeuristicaPage />);
    return within(await screen.findByRole('region', { name: 'Revisión sin terminar' }));
  };
  it('dice quién la creó cuando fue otra persona', async () => {
    const banner = await abrir(evaluation({ coordinadorId: 'u2' }));
    await waitFor(() => expect(banner.getByText(/creada por Beto/)).toBeInTheDocument());
  });
  it('si el creador no está en el equipo, dice otra persona del equipo', async () => {
    const banner = await abrir(evaluation({ coordinadorId: 'u9' }));
    expect(banner.getByText(/creada por otra persona del equipo/)).toBeInTheDocument();
  });
  it('si es propia, no menciona creador', async () => {
    const banner = await abrir(evaluation({ coordinadorId: 'u1' }));
    expect(banner.getByText(/Tienes una revisión sin terminar/)).toBeInTheDocument();
    expect(banner.queryByText(/creada por/)).toBeNull();
  });
});

describe('categorías plegables en el acuerdo', () => {
  function acuerdo(): EvaluacionFlujo {
    const e = evaluation({ fase: 'PENDIENTE_CONSENSO' });
    const todos = copiarMetodologia(METODOLOGIAS_HEURISTICAS[0]);
    const a = todos.criterios.filter(c => c.categoria === todos.criterios[0].categoria).slice(0, 1);
    const b = todos.criterios.filter(c => c.categoria === todos.criterios.find(x => x.categoria !== a[0].categoria)!.categoria).slice(0, 2);
    e.configuracion.metodologia = { ...todos, criterios: [...a, ...b] };
    const nivel = e.configuracion.metodologia.escala.niveles[0].id;
    e.consenso.criterios = [{ criterioId: a[0].id, valor: nivel, noAplica: false, motivo: '', notas: '', justificacion: 'ok' }, { criterioId: b[0].id, valor: nivel, noAplica: false, motivo: '', notas: '', justificacion: 'ok' }];
    return e;
  }
  const detalle = (i: number) => document.querySelectorAll<HTMLDetailsElement>('.hf-cat > details')[i];
  it('la categoría completa arranca plegada y la incompleta abierta, con su estado', () => {
    const e = acuerdo();
    renderFlow(<ConsensoEditor evaluacion={e} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(detalle(0)).not.toHaveAttribute('open'); expect(detalle(0)).toHaveTextContent('Completa');
    expect(detalle(1)).toHaveAttribute('open'); expect(detalle(1)).toHaveTextContent('Faltan 1');
  });
  it('al completar la última pregunta de una categoría abierta no se pliega sola', async () => {
    const e = acuerdo();
    renderFlow(<ConsensoEditor evaluacion={e} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    const radios = within(detalle(1) as HTMLElement).getAllByRole('radio');
    await userEvent.click(radios[radios.length - 1]);
    await waitFor(() => expect(detalle(1)).toHaveTextContent('Completa'));
    expect(detalle(1)).toHaveAttribute('open');
  });
  it('una categoría completa que la persona abre se mantiene abierta', async () => {
    const e = acuerdo();
    renderFlow(<ConsensoEditor evaluacion={e} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    await userEvent.click(within(detalle(0) as HTMLElement).getByText(/Completa/));
    expect(detalle(0)).toHaveAttribute('open');
  });
  it('la revisión individual no usa details por categoría', async () => {
    const i = evaluation();
    renderFlow(<TrabajoEditor evaluacion={i} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    const comenzar = screen.queryByRole('button', { name: 'Comenzar revisión' }); if (comenzar) await userEvent.click(comenzar);
    await screen.findByRole('navigation', { name: 'Preguntas de la revisión' });
    expect(document.querySelectorAll('.hf-cat > details').length).toBe(0);
  });
});
