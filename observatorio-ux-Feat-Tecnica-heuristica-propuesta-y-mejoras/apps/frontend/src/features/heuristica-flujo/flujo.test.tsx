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
import { pendientesTrabajo } from './flujo-utils';
import { useAuthStore } from '../auth/store/useAuthStore';

const api = vi.hoisted(() => vi.fn());
const confirm = vi.hoisted(() => vi.fn());
vi.mock('./flujo.api', () => ({ flujoRequest: api }));
vi.mock('../../shared/api/confirm', () => ({ useConfirm: () => confirm }));
vi.mock('./EvidenciaEditor', () => ({ EvidenciaEditor: () => <span>Evidencias</span> }));

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
  it('bloquea entrega de criterios pendientes y no aplica sin motivo', async () => {
    renderFlow(<Harness initial={evaluation()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Entregar mi evaluación' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Valora o justifica');
    await userEvent.selectOptions(screen.getByLabelText('Valoración'), 'NA');
    await userEvent.click(screen.getByRole('button', { name: 'Entregar mi evaluación' }));
    expect(api).not.toHaveBeenCalled();
  });
  it('guarda antes de entregar y cierra el trabajo propio', async () => {
    const e = evaluation();
    api.mockImplementation(async (_p, path, _method, body) => {
      if (path.endsWith('/trabajo')) return { ...e, revision: 2, trabajos: [{ ...e.trabajos[0], respuestas: body.respuestas, hallazgos: body.hallazgos }] };
      return { ...e, revision: 3, trabajos: [{ ...e.trabajos[0], entregadoEn: e.updatedAt }] };
    });
    renderFlow(<Harness initial={e} />);
    await userEvent.selectOptions(screen.getByLabelText('Valoración'), e.configuracion.metodologia.escala.niveles[0].id);
    await userEvent.click(screen.getByRole('button', { name: 'Entregar mi evaluación' }));
    await screen.findByText('Trabajo entregado. Tus respuestas están cerradas.');
    expect(api.mock.calls.map(c => c[1])).toEqual(['/evaluaciones/e1/trabajo', '/evaluaciones/e1/entregar']);
    expect(api.mock.calls[1][3].revision).toBe(2);
    expect(screen.getByLabelText('Valoración')).toBeDisabled();
  });
  it('admite múltiples problemas por criterio sin confundir ausencia con NA', async () => {
    const e = evaluation(); renderFlow(<Harness initial={e} />);
    const add = screen.getByRole('button', { name: `Agregar hallazgo para ${e.configuracion.metodologia.criterios[0].nombre}` });
    await userEvent.click(add); await userEvent.click(add);
    expect(screen.getAllByLabelText('Título del problema')).toHaveLength(2);
    expect(screen.getByLabelText('Valoración')).toHaveValue('');
    expect(screen.getByText(/No registrar problemas no equivale/)).toBeInTheDocument();
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
    await waitFor(() => expect(screen.getAllByText(/Cambios guardados/)).toHaveLength(2));
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
  it('limita a cinco expertos y conserva original al personalizar', async () => {
    const initial = config(); initial.evaluadorIds = [];
    let latest = initial;
    function Editor() { const [v, setV] = useState(initial); return <ConfiguracionEditor value={v} onChange={x => { latest = x; setV(x); }} biblioteca={[METODOLOGIAS_HEURISTICAS[0]]} equipo={Array.from({ length: 6 }, (_, i) => ({ id: `u${i}`, nombre: `Experto ${i}`, rol: 'ESTUDIANTE' }))} onSaveMethod={vi.fn()} />; }
    renderFlow(<Editor />);
    const experts = within(screen.getByRole('group', { name: 'Expertos (0/5)' })).getAllByRole('checkbox');
    for (let i = 0; i < 5; i++) await userEvent.click(experts[i]);
    expect(experts[5]).toBeDisabled();
    await userEvent.clear(screen.getByLabelText('Nombre del criterio 1')); await userEvent.type(screen.getByLabelText('Nombre del criterio 1'), 'Personalizado');
    expect(latest.metodologia.criterios[0].origen).toEqual(METODOLOGIAS_HEURISTICAS[0].criterios[0].origen);
    expect(METODOLOGIAS_HEURISTICAS[0].criterios[0].nombre).not.toBe('Personalizado');
    const level = latest.metodologia.escala.niveles[1];
    await userEvent.click(screen.getByRole('button', { name: 'Bajar nivel 1' }));
    expect(latest.metodologia.escala.niveles[0]).toEqual(level);
    const size = latest.metodologia.escala.niveles.length;
    await userEvent.click(screen.getByRole('button', { name: 'Agregar nivel' }));
    expect(latest.metodologia.escala.niveles).toHaveLength(size + 1);
    await userEvent.click(screen.getByRole('button', { name: `Quitar nivel ${size + 1}` }));
    expect(latest.metodologia.escala.niveles).toHaveLength(size);
  });
  it('no convierte agenda ni fuentes en acuerdo automático', () => {
    const e = evaluation({ fase: 'PENDIENTE_CONSENSO' });
    e.trabajos[0].hallazgos = [{ id: 'origen', criterioIds: [e.configuracion.metodologia.criterios[0].id], titulo: 'Problema original', pantalla: 'Inicio', descripcion: 'Error', recomendacion: 'Mejorar', severidad: 2, prioridad: 'MEDIA', notas: '', evidenciaIds: [] }];
    renderFlow(<ConsensoEditor evaluacion={e} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByLabelText('Valoración')).toHaveValue('');
    expect(screen.queryByLabelText('Decisión del consenso')).not.toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });
  it('crea decisión pendiente al seleccionar fuente y requiere acuerdo manual', async () => {
    const e = evaluation({ fase: 'PENDIENTE_CONSENSO' });
    e.trabajos[0].hallazgos = [{ id: 'origen', criterioIds: [e.configuracion.metodologia.criterios[0].id], titulo: 'Problema original', pantalla: 'Inicio', descripcion: 'Error', recomendacion: 'Mejorar', severidad: 2, prioridad: 'MEDIA', notas: '', evidenciaIds: [] }];
    renderFlow(<ConsensoEditor evaluacion={e} usuarioId="u1" onSaved={vi.fn()} onBack={vi.fn()} />);
    await userEvent.click(screen.getByLabelText('Ana: Problema original'));
    await userEvent.click(screen.getByRole('button', { name: 'Crear decisión de los originales seleccionados' }));
    expect(screen.getByLabelText('Decisión del consenso')).toHaveValue('PENDIENTE');
    expect(screen.getByText(/Orígenes preservados: origen/)).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Evaluaciones anteriores (sesiones)' })).toBeInTheDocument();
  });
  it('recupera creación local tras fallo y limpia borrador al crear', async () => {
    let fail = true;
    let created = evaluation({ fase: 'BORRADOR' });
    api.mockImplementation(async (_p, path, method, body) => {
      if (method === 'POST') { if (fail) throw new Error('Sin conexión al crear'); created = evaluation({ fase: 'BORRADOR', configuracion: body }); return created; }
      if (path === '/evaluaciones/e1') return created;
      return path === '/metodologias' ? [config().metodologia] : path === '/equipo' ? [{ id: 'u1', nombre: 'Ana', rol: 'ESTUDIANTE' }] : [];
    });
    const first = renderFlow(<FlujoHeuristicaPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nueva evaluación completa' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Nueva evaluación completa' }));
    await userEvent.type(screen.getByLabelText('Nombre de la evaluación'), 'Borrador local');
    await userEvent.click(within(screen.getByRole('group', { name: 'Expertos (0/5)' })).getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar borrador de evaluación' }));
    await screen.findByText('Sin conexión al crear');
    first.unmount();
    renderFlow(<FlujoHeuristicaPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nueva evaluación completa' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Nueva evaluación completa' }));
    expect(screen.getByLabelText('Nombre de la evaluación')).toHaveValue('Borrador local');
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Guardar borrador de evaluación' }));
    await screen.findByRole('button', { name: 'Iniciar con configuración fija' });
    expect(sessionStorage.getItem('heuristica:nueva:u1:p1')).toBeNull();
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

describe('métodos propios: editar y borrar', () => {
  const propia = () => ({ ...copiarMetodologia(METODOLOGIAS_HEURISTICAS[0], 'a1b2c3d4-0000-4000-8000-000000000001', 'Mi método'), autor: 'Ana' });
  let latest: ConfiguracionFlujo;
  function Editor({ conAcciones = true, onSave = vi.fn().mockResolvedValue(undefined), onUpdate = vi.fn().mockResolvedValue(undefined), onDelete = vi.fn().mockResolvedValue(undefined) }: { conAcciones?: boolean; onSave?: () => Promise<void>; onUpdate?: () => Promise<void>; onDelete?: () => Promise<void> }) {
    const [v, setV] = useState(config());
    latest = v;
    return <ConfiguracionEditor value={v} onChange={setV} biblioteca={[METODOLOGIAS_HEURISTICAS[0], propia()]} equipo={[]} onSaveMethod={onSave}
      {...(conAcciones ? { onUpdateMethod: onUpdate, onDeleteMethod: onDelete } : {})} />;
  }
  it('ofrece Editar y Borrar solo en métodos propios y solo cuando hay acciones', () => {
    const { unmount } = renderFlow(<Editor />);
    expect(screen.getByRole('button', { name: 'Editar Mi método' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Borrar Mi método' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: `Borrar ${METODOLOGIAS_HEURISTICAS[0].nombre}` })).toBeNull();
    expect(screen.queryByRole('button', { name: `Editar ${METODOLOGIAS_HEURISTICAS[0].nombre}` })).toBeNull();
    unmount();
    renderFlow(<Editor conAcciones={false} />);
    expect(screen.queryByRole('button', { name: 'Editar Mi método' })).toBeNull();
  });
  it('editar carga el método con su id y guardar lo actualiza sin crear otro', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined), onUpdate = vi.fn().mockResolvedValue(undefined);
    renderFlow(<Editor onSave={onSave} onUpdate={onUpdate} />);
    expect(screen.queryByText(/Estás editando tu método guardado/)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Editar Mi método' }));
    expect(latest.metodologia.id).toBe(propia().id);
    expect(screen.getByText(/Estás editando tu método guardado «Mi método»/)).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Nombre del criterio 1')); await userEvent.type(screen.getByLabelText('Nombre del criterio 1'), 'Cambiado');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios del método' }));
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate.mock.calls[0][0]).toMatchObject({ id: propia().id, protegida: false });
    expect(onUpdate.mock.calls[0][0].criterios[0].nombre).toBe('Cambiado');
    expect(onSave).not.toHaveBeenCalled();
  });
  it('una copia nueva sigue guardándose como método nuevo', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined), onUpdate = vi.fn();
    renderFlow(<Editor onSave={onSave} onUpdate={onUpdate} />);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar metodología reutilizable' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onUpdate).not.toHaveBeenCalled();
  });
  it('pide confirmación antes de borrar y respeta la cancelación', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    renderFlow(<Editor onDelete={onDelete} />);
    confirm.mockResolvedValueOnce(false);
    await userEvent.click(screen.getByRole('button', { name: 'Borrar Mi método' }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Las evaluaciones que ya lo usan no cambian'));
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Borrar Mi método' }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(propia().id));
  });
  it('explica el error de borrado sin perder la configuración', async () => {
    renderFlow(<Editor onDelete={vi.fn().mockRejectedValue(new Error('No encontramos ese método entre los tuyos.'))} />);
    await userEvent.click(screen.getByRole('button', { name: 'Borrar Mi método' }));
    expect(await screen.findByText('No encontramos ese método entre los tuyos.')).toBeInTheDocument();
    expect(latest.nombre).toBe('Portal');
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
    await userEvent.click(within(grupo(b.nombre)).getByLabelText('No'));
    expect(screen.getByText('2 de 2 respondidos · ✓ Categoría completa')).toBeInTheDocument();
    expect(screen.getAllByText('✓ Respondido')).toHaveLength(2);
    expect(screen.getAllByText('Sin responder')).toHaveLength(1);
  });
  it('no aplica sin motivo no cuenta y bloquea la entrega', async () => {
    const e = checklistEval(); const [a, b, c] = e.configuracion.metodologia.criterios;
    renderFlow(<Harness initial={e} />);
    await userEvent.click(within(grupo(a.nombre)).getByLabelText('Sí'));
    await userEvent.click(within(grupo(c.nombre)).getByLabelText('No'));
    await userEvent.click(within(grupo(b.nombre)).getByLabelText('N.A.'));
    expect(screen.getByText('1 de 2 respondidos')).toBeInTheDocument();
    expect(screen.getByText('Falta el motivo de "no aplica".')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Entregar mi evaluación' }));
    expect(screen.getByRole('alert')).toHaveTextContent(`Valora o justifica no aplica: ${b.nombre}`);
    expect(api).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText('Motivo de no aplica'), 'Fuera del recorrido');
    expect(screen.getByText('2 de 2 respondidos · ✓ Categoría completa')).toBeInTheDocument();
  });
  it('permite agregar un hallazgo desde un ítem', async () => {
    const e = checklistEval(); renderFlow(<Harness initial={e} />);
    await userEvent.click(screen.getByRole('button', { name: `Agregar hallazgo para ${e.configuracion.metodologia.criterios[0].nombre}` }));
    expect(screen.getAllByLabelText('Título del problema')).toHaveLength(1);
    expect(screen.getByText(/^1 hallazgos propios en este ítem/)).toBeInTheDocument();
  });
  it('evaluación antigua (3 niveles) o con escalas mixtas conserva la vista actual', () => {
    const { unmount } = renderFlow(<Harness initial={evaluation()} />);
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getByLabelText('Valoración')).toBeInTheDocument();
    unmount();
    renderFlow(<Harness initial={checklistEval(true)} />);
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getAllByLabelText('Valoración')).toHaveLength(3);
  });
});
