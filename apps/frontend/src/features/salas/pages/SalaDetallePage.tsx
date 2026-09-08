// apps/frontend/src/features/salas/pages/SalaDetallePage.tsx
//
// Detalle de una sala: tab "Proyectos" (crear uno nuevo alojado en la sala
// o vincular uno ya existente del profesor) y tab "Estudiantes" (registro
// liviano, sin cuenta — alta individual o masiva pegando una lista).

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjects } from '../../projects/hooks/useProjectsQueries';
import {
  useEstudiantes,
  useAddEstudiante,
  useAddEstudiantesBulk,
  useRemoveEstudiante,
  useProyectosDeSala,
  useCreateProyectoEnSala,
  useVincularProyecto,
  useDesvincularProyecto,
} from '../hooks/useSalasQueries';
import { useConfirm } from '../../../shared/api/confirm';

type Tab = 'proyectos' | 'estudiantes';

export function SalaDetallePage() {
  const { salaId } = useParams<{ salaId: string }>();
  const [tab, setTab] = useState<Tab>('proyectos');

  if (!salaId) return null;

  return (
    <div className="card" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '16px' }}>Detalle de la Sala</h2>

      <div className="form-row-inline" style={{ marginBottom: 24 }}>
        <button
          type="button"
          className={tab === 'proyectos' ? 'primary' : 'secondary'}
          onClick={() => setTab('proyectos')}
        >
          Proyectos
        </button>
        <button
          type="button"
          className={tab === 'estudiantes' ? 'primary' : 'secondary'}
          onClick={() => setTab('estudiantes')}
        >
          Estudiantes
        </button>
      </div>

      {tab === 'proyectos' ? <ProyectosDeSala salaId={salaId} /> : <EstudiantesDeSala salaId={salaId} />}
    </div>
  );
}

// ---------------------------------------------------------------
// Tab Proyectos
// ---------------------------------------------------------------

function ProyectosDeSala({ salaId }: { salaId: string }) {
  const confirm = useConfirm();
  const { data: proyectosSala, isLoading, isError, error, refetch } = useProyectosDeSala(salaId);
  const { data: todosLosProyectos } = useProjects();
  const { mutate: crear, isPending: creando } = useCreateProyectoEnSala(salaId);
  const { mutate: vincular, isPending: vinculando } = useVincularProyecto(salaId);
  const { mutate: desvincular } = useDesvincularProyecto(salaId);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [proyectoAVincular, setProyectoAVincular] = useState('');

  // Solo se pueden vincular proyectos que todavía no están en ninguna sala.
  const disponiblesParaVincular = (todosLosProyectos ?? []).filter(
    (p) => !proyectosSala?.some((ps) => ps.id === p.id) && !p.salaId,
  );

  function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    crear(
      { nombre: nombre.trim(), descripcion: descripcion.trim() || undefined },
      { onSuccess: () => { setNombre(''); setDescripcion(''); } },
    );
  }

  function handleVincular(e: React.FormEvent) {
    e.preventDefault();
    if (!proyectoAVincular) return;
    vincular(proyectoAVincular, { onSuccess: () => setProyectoAVincular('') });
  }

  async function handleDesvincular(id: string, nombreProyecto: string) {
    if (await confirm(`¿Desvincular el proyecto “${nombreProyecto}” de esta sala?`)) {
      desvincular(id);
    }
  }

  return (
    <div>
      <div className="sala-management-grid">
        <form onSubmit={handleCrear} className="form-grid">
          <label className="field">
            Crear proyecto nuevo en esta sala
            <input
              type="text"
              placeholder="Nombre del proyecto"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </label>
          <label className="field">
            Descripción (opcional)
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
            />
          </label>
          <button type="submit" className="primary" disabled={creando}>
            {creando ? 'Creando…' : '+ Crear proyecto'}
          </button>
        </form>

        <form onSubmit={handleVincular} className="form-grid">
          <label className="field">
            Vincular un proyecto ya existente
            <select
              value={proyectoAVincular}
              onChange={(e) => setProyectoAVincular(e.target.value)}
              required
            >
              <option value="">Selecciona un proyecto…</option>
              {disponiblesParaVincular.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="primary" disabled={vinculando || !proyectoAVincular}>
            {vinculando ? 'Vinculando…' : 'Vincular proyecto'}
          </button>
        </form>
      </div>

      {isLoading && <p>Cargando proyectos…</p>}
      {isError && (
        <div className="error-text" role="alert">
          <p>{(error as Error).message}</p>
          <button type="button" className="secondary" onClick={() => refetch()}>Reintentar</button>
        </div>
      )}

      <div className="list-stack">
        {proyectosSala?.map((p) => (
          <div key={p.id} className="entity-card row-between">
            <div>
              <b>{p.nombre}</b>
              {p.descripcion && <div className="text-muted-sm">{p.descripcion}</div>}
            </div>
            <button
              type="button"
              className="secondary"
              onClick={() => handleDesvincular(p.id, p.nombre)}
            >
              Desvincular
            </button>
          </div>
        ))}
        {proyectosSala && proyectosSala.length === 0 && (
          <p>Todavía no hay proyectos alojados en esta sala.</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Tab Estudiantes
// ---------------------------------------------------------------

function EstudiantesDeSala({ salaId }: { salaId: string }) {
  const confirm = useConfirm();
  const { data: estudiantes, isLoading, isError, error, refetch } = useEstudiantes(salaId);
  const { mutate: agregar, isPending: agregando } = useAddEstudiante(salaId);
  const { mutate: agregarBulk, isPending: agregandoBulk } = useAddEstudiantesBulk(salaId);
  const { mutate: eliminar } = useRemoveEstudiante(salaId);

  const [modo, setModo] = useState<'individual' | 'bulk'>('individual');
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [bulkTexto, setBulkTexto] = useState('');

  function handleAgregarIndividual(e: React.FormEvent) {
    e.preventDefault();
    const limpio = email.trim();
    if (!limpio) return;
    agregar(
      { email: limpio, nombre: nombre.trim() || undefined },
      { onSuccess: () => { setEmail(''); setNombre(''); } },
    );
  }

  function handleAgregarBulk(e: React.FormEvent) {
    e.preventDefault();
    // Una línea por estudiante: "email" o "email, nombre".
    const entradas = bulkTexto
      .split('\n')
      .map((linea) => linea.trim())
      .filter(Boolean)
      .map((linea) => {
        const [emailCrudo, ...resto] = linea.split(',');
        return { email: emailCrudo.trim(), nombre: resto.join(',').trim() || undefined };
      })
      .filter((e) => e.email.length > 0);

    if (entradas.length === 0) return;
    agregarBulk(entradas, { onSuccess: () => setBulkTexto('') });
  }

  async function handleEliminar(id: string, nombreVisible: string) {
    if (await confirm(`¿Quitar a “${nombreVisible}” de esta sala?`)) eliminar(id);
  }

  return (
    <div>
      <div className="form-row-inline" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={modo === 'individual' ? 'primary' : 'secondary'}
          onClick={() => setModo('individual')}
        >
          Agregar uno
        </button>
        <button
          type="button"
          className={modo === 'bulk' ? 'primary' : 'secondary'}
          onClick={() => setModo('bulk')}
        >
          Agregar varios
        </button>
      </div>

      {modo === 'individual' && (
        <form onSubmit={handleAgregarIndividual} className="form-row-inline">
          <input
            type="email"
            aria-label="Email del estudiante"
            placeholder="Email del estudiante"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-flex"
          />
          <input
            type="text"
            aria-label="Nombre del estudiante"
            placeholder="Nombre (opcional)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="input-flex"
          />
          <button type="submit" className="primary" disabled={agregando}>
            {agregando ? 'Agregando…' : '+ Agregar'}
          </button>
        </form>
      )}

      {modo === 'bulk' && (
        <form onSubmit={handleAgregarBulk} className="form-grid" style={{ maxWidth: 480 }}>
          <label className="field">
            Un estudiante por línea — <code>email</code> o <code>email, nombre</code>
            <textarea
              placeholder={'ana@utem.cl\nbruno@utem.cl, Bruno Soto'}
              value={bulkTexto}
              aria-label="Lista de estudiantes"
              onChange={(e) => setBulkTexto(e.target.value)}
              className="textarea-md"
            />
          </label>
          <button type="submit" className="primary" disabled={agregandoBulk}>
            {agregandoBulk ? 'Agregando…' : '+ Agregar lista'}
          </button>
        </form>
      )}

      {isLoading && <p>Cargando…</p>}
      {isError && (
        <div className="error-text" role="alert">
          <p>{(error as Error).message}</p>
          <button type="button" className="secondary" onClick={() => refetch()}>Reintentar</button>
        </div>
      )}

      <div className="list-stack mt-16">
        {estudiantes?.map((e) => (
          <div key={e.id} className="entity-card row-between">
            <div>
              <b>{e.nombre ?? e.email}</b>
              {e.nombre && <div className="text-muted-sm">{e.email}</div>}
            </div>
            <button
              type="button"
              className="secondary danger"
              onClick={() => handleEliminar(e.id, e.nombre ?? e.email)}
            >
              Quitar
            </button>
          </div>
        ))}
        {estudiantes && estudiantes.length === 0 && (
          <p>Todavía no hay estudiantes registrados en esta sala.</p>
        )}
      </div>
    </div>
  );
}
