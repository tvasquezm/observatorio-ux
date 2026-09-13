// apps/frontend/src/features/admin/pages/AdminProfesoresPage.tsx

import React, { useState } from 'react';
import {
  useDocentes,
  useCreateDocente,
  useRemoveDocente,
  useEstudiantesAdmin,
} from '../hooks/useUsersQueries';
import { useConfirm } from '../../../shared/api/confirm';

function CrearDocenteForm() {
  const { mutate: crear, isPending } = useCreateDocente();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !email.trim() || !password) return;
    crear(
      { nombre: nombre.trim(), email: email.trim(), password },
      { onSuccess: () => { setNombre(''); setEmail(''); setPassword(''); } },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="form-row-inline">
      <input
        type="text"
        aria-label="Nombre del docente"
        placeholder="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
        className="input-flex"
      />
      <input
        type="email"
        aria-label="Email del docente"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="input-flex"
      />
      <input
        type="password"
        aria-label="Contraseña del docente"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
        className="input-flex"
      />
      <button type="submit" className="primary" disabled={isPending}>
        {isPending ? 'Creando…' : '+ Crear docente'}
      </button>
    </form>
  );
}

function DocentesList() {
  const confirm = useConfirm();
  const { data: docentes, isLoading } = useDocentes();
  const { mutate: eliminar } = useRemoveDocente();

  async function handleEliminar(id: string, nombre: string) {
    if (await confirm(`¿Eliminar al docente "${nombre}"?`)) eliminar(id);
  }

  if (isLoading) return <p>Cargando…</p>;
  if (!docentes?.length) return <p>No hay docentes registrados.</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Email</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {docentes.map((d) => (
          <tr key={d.id}>
            <td>{d.nombre}</td>
            <td>{d.email}</td>
            <td>
              <button type="button" className="danger" onClick={() => handleEliminar(d.id, d.nombre)}>
                Eliminar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EstudiantesList() {
  const { data: estudiantes, isLoading } = useEstudiantesAdmin();

  if (isLoading) return <p>Cargando…</p>;
  if (!estudiantes?.length) return <p>No hay estudiantes registrados.</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Email</th>
          <th>Sala</th>
        </tr>
      </thead>
      <tbody>
        {estudiantes.map((e) => (
          <tr key={e.id}>
            <td>{e.nombre ?? '—'}</td>
            <td>{e.email}</td>
            <td>{e.salaId}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function AdminProfesoresPage() {
  return (
    <div className="fade">
      <h1>Administración de docentes</h1>

      <section style={{ marginBottom: 24 }}>
        <h2>Crear docente</h2>
        <CrearDocenteForm />
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>Docentes</h2>
        <DocentesList />
      </section>

      <section>
        <h2>Estudiantes</h2>
        <EstudiantesList />
      </section>
    </div>
  );
}
