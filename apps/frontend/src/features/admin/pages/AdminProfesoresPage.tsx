import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useCreateDocente,
  useDocentes,
  useEstudiantesAdmin,
  useRemoveDocente,
} from '../hooks/useUsersQueries';
import { useConfirm } from '../../../shared/api/confirm';
import { UserAccountsPanel } from '../components/UserAccountsPanel';
import { AdminProjectsPanel } from '../components/AdminProjectsPanel';
import './admin.css';

export function CrearDocenteForm() {
  const { mutate: crear, isPending } = useCreateDocente();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accessMode, setAccessMode] = useState<'PASSWORD' | 'GOOGLE'>('PASSWORD');
  const [credentials, setCredentials] = useState<{ email: string; password?: string } | null>(null);
  const [copyMessage, setCopyMessage] = useState('');
  const [formError, setFormError] = useState('');

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending || credentials) return;
    setFormError('');
    if (!nombre.trim() || !email.trim() || (accessMode === 'PASSWORD' && !password)) {
      setFormError('Completa los datos requeridos para crear la cuenta.');
      return;
    }
    crear(
      { nombre: nombre.trim(), email: email.trim(), ...(accessMode === 'GOOGLE' ? { acceso: 'GOOGLE' as const } : { password }) },
      {
        onSuccess: (docente) => {
          setCredentials({ email: docente.email, ...(accessMode === 'PASSWORD' ? { password } : {}) });
          setCopyMessage('');
          setShowPassword(false);
          setNombre('');
          setEmail('');
          setPassword('');
        },
        onError: (error) => setFormError(error instanceof Error ? error.message : 'No se pudo crear el docente. Inténtalo nuevamente.'),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="admin-create-form">
      <fieldset className="admin-access-method" disabled={isPending || credentials !== null}>
        <legend>Forma de acceso</legend>
        <div className="admin-access-options">
          <label><input type="radio" name="access-mode" checked={accessMode === 'PASSWORD'} onChange={() => setAccessMode('PASSWORD')} />Usar contraseña</label>
          <label><input type="radio" name="access-mode" checked={accessMode === 'GOOGLE'} onChange={() => { setAccessMode('GOOGLE'); setPassword(''); setShowPassword(false); }} />Cuenta de Google</label>
        </div>
      </fieldset>
      <fieldset disabled={isPending || credentials !== null}>
      <legend>1. Datos de la persona</legend>
      <label className="field" htmlFor="docente-nombre">
        Nombre completo
        <input id="docente-nombre" type="text" autoComplete="name" placeholder="Ej. Camila Rojas" value={nombre} onChange={(event) => setNombre(event.target.value)} required disabled={isPending} />
      </label>
      <label className="field" htmlFor="docente-email">
        Correo institucional
        <input id="docente-email" type="email" autoComplete="email" placeholder="camila.rojas@utem.cl" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isPending} />
      </label>
      </fieldset>
      <fieldset disabled={isPending || credentials !== null}>
      <legend>2. Acceso inicial</legend>
      {accessMode === 'GOOGLE' ? <div className="admin-google-note"><strong>Autorizar un correo de Google</strong><p>La persona usará «Continuar con Google» con este mismo correo de Gmail o Google Workspace. El acceso estará disponible cuando se configure la integración.</p><p>Su rol en el Observatorio será docente.</p></div> : <>
      <div className="field">
        <label htmlFor="docente-password">Contraseña temporal</label>
        <div className="password-field">
          <input id="docente-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" aria-describedby="docente-password-help" placeholder="Mínimo 8 caracteres" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={72} disabled={isPending} />
          <button type="button" className="secondary" aria-pressed={showPassword} aria-controls="docente-password" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}</button>
        </div>
      </div>
      <button type="button" className="text-button" onClick={() => {
        setPassword(Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) => value.toString(16).padStart(2, '0')).join(''));
      }}>Generar contraseña segura</button>
      <p id="docente-password-help" className="form-help">Usa entre 8 y 72 caracteres. Después de crear la cuenta podrás copiar el acceso y compartirlo con la persona.</p>
      </>}
      </fieldset>
      {formError && <p className="inline-state inline-state--error" role="alert">{formError}</p>}
      <button type="submit" className="primary admin-submit" disabled={isPending || credentials !== null}>
        {isPending ? 'Creando docente…' : 'Crear docente'}
      </button>
      {credentials && <section className="inline-state credentials-result" aria-labelledby="credentials-title">
        <h3 id="credentials-title">{credentials.password ? 'Docente creado: comparte su acceso' : 'Cuenta autorizada para Google'}</h3>
        <label className="field" htmlFor="created-email">Correo creado<input id="created-email" readOnly value={credentials.email} /></label>
        {credentials.password && <><label className="field" htmlFor="created-password">Contraseña creada<input id="created-password" type={showPassword ? 'text' : 'password'} readOnly value={credentials.password} autoComplete="off" /></label>
        <button type="button" className="secondary" aria-pressed={showPassword} aria-controls="created-password" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Ocultar acceso creado' : 'Mostrar acceso creado'}</button>
        <p className="form-help">Este acceso se muestra solo ahora. Pide al docente cambiar la contraseña al ingresar.</p>
        </>}
        {!credentials.password && <p>La persona podrá entrar con ese correo cuando se active Google. No se ha creado una contraseña local.</p>}
        <div className="password-actions">
          <button type="button" className="secondary" onClick={async () => {
            setCopyMessage('');
            try { await navigator.clipboard.writeText(credentials.password ? `Correo: ${credentials.email}\nContraseña temporal: ${credentials.password}` : credentials.email); setCopyMessage('Credenciales copiadas.'); }
            catch { setCopyMessage('No se pudieron copiar. Selecciona los campos y cópialos manualmente.'); }
          }}>{credentials.password ? 'Copiar correo y contraseña' : 'Copiar correo'}</button>
          <button type="button" className="secondary" onClick={() => { setCredentials(null); setCopyMessage(''); setShowPassword(false); }}>Cerrar credenciales</button>
        </div>
        {copyMessage && <p role="status">{copyMessage}</p>}
      </section>}
    </form>
  );
}

function DocentesList() {
  const confirm = useConfirm();
  const { data: docentes, isLoading, isError, error, refetch } = useDocentes();
  const { mutate: eliminar, isPending: eliminando } = useRemoveDocente();

  async function handleEliminar(id: string, nombre: string) {
    if (await confirm(`¿Eliminar al docente "${nombre}"?`)) eliminar(id);
  }

  if (isLoading) return <div className="loading-block" aria-label="Cargando docentes" />;
  if (isError) {
    return (
      <div className="inline-state inline-state--error" role="alert">
        <p>{error instanceof Error ? error.message : 'No se pudieron cargar los docentes.'}</p>
        <button type="button" className="secondary" onClick={() => refetch()}>Reintentar</button>
      </div>
    );
  }
  if (!docentes?.length) {
    return <div className="empty-state empty-state--compact"><strong>Aún no hay docentes</strong><p>Completa el formulario para crear el primer acceso docente.</p></div>;
  }

  return (
    <div className="table-shell">
      <table className="data-table admin-table">
        <caption className="sr-only">Docentes registrados</caption>
        <thead><tr><th>Docente</th><th>Correo</th><th>Registro</th><th><span className="sr-only">Acciones</span></th></tr></thead>
        <tbody>
          {docentes.map((docente) => (
            <tr key={docente.id}>
              <td><span className="person-cell"><span className="person-avatar">{docente.nombre.charAt(0).toUpperCase()}</span><strong>{docente.nombre}</strong></span></td>
              <td>{docente.email}</td>
              <td>{new Date(docente.createdAt).toLocaleDateString('es-CL')}</td>
              <td className="table-actions"><button type="button" className="text-button text-button--danger" disabled={eliminando} onClick={() => handleEliminar(docente.id, docente.nombre)}>Eliminar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EstudiantesList() {
  const { data: estudiantes, isLoading, isError, error, refetch } = useEstudiantesAdmin();

  if (isLoading) return <div className="loading-block" aria-label="Cargando estudiantes" />;
  if (isError) {
    return (
      <div className="inline-state inline-state--error" role="alert">
        <p>{error instanceof Error ? error.message : 'No se pudieron cargar los estudiantes.'}</p>
        <button type="button" className="secondary" onClick={() => refetch()}>Reintentar</button>
      </div>
    );
  }
  if (!estudiantes?.length) {
    return <div className="empty-state empty-state--compact"><strong>No hay estudiantes registrados</strong><p>Se mostrarán aquí cuando sean incorporados a una sala.</p></div>;
  }

  return (
    <div className="table-shell">
      <table className="data-table admin-table">
        <caption className="sr-only">Estudiantes registrados</caption>
        <thead><tr><th>Estudiante</th><th>Correo</th><th>Sala</th><th>Registro</th></tr></thead>
        <tbody>
          {estudiantes.map((estudiante) => {
            const nombre = estudiante.nombre ?? 'Sin nombre informado';
            return (
              <tr key={estudiante.id}>
                <td><span className="person-cell"><span className="person-avatar person-avatar--student">{nombre.charAt(0).toUpperCase()}</span><strong>{nombre}</strong></span></td>
                <td>{estudiante.email}</td>
                <td><code className="short-id" title={estudiante.salaId}>{estudiante.salaId.slice(0, 8)}</code></td>
                <td>{new Date(estudiante.createdAt).toLocaleDateString('es-CL')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AdminProfesoresPage() {
  const { data: docentes } = useDocentes();
  const { data: estudiantes } = useEstudiantesAdmin();

  return (
    <div className="fade admin-page">
      <header className="page-head">
        <div><span className="eyebrow">Administración</span><h1>Panel administrativo</h1><p>Gestiona cuentas, permisos, proyectos y el avance de las sesiones.</p></div>
        <div className="page-summary" aria-label="Resumen de usuarios"><span><strong>{docentes?.length ?? 0}</strong> docentes</span><span><strong>{estudiantes?.length ?? 0}</strong> estudiantes</span></div>
      </header>

      <div className="admin-layout">
        <section className="panel admin-create-panel" aria-labelledby="create-user-title">
          <div className="admin-create-heading"><div><span className="eyebrow">Nuevo acceso</span><h2 id="create-user-title">Crear docente</h2></div><span className="admin-access-badge">Acceso docente</span></div>
          <p className="section-description">Entrega un acceso inicial para que una persona gestione investigación y docencia.</p>
          <CrearDocenteForm />
          <p className="admin-student-help">¿Necesitas incorporar estudiantes? <Link to="/salas">Agrégalos desde una sala</Link>.</p>
        </section>

        <div className="admin-lists">
          <UserAccountsPanel />
          <details className="admin-directory">
            <summary>Ver directorio de docentes y estudiantes</summary>
          <section className="panel" aria-labelledby="docentes-title">
            <div className="panel-head"><div><span className="eyebrow">Equipo docente</span><h2 id="docentes-title">Docentes registrados</h2></div><span className="count">{docentes?.length ?? 0}</span></div>
            <DocentesList />
          </section>
          <section className="panel" aria-labelledby="estudiantes-title">
            <div className="panel-head"><div><span className="eyebrow">Participación</span><h2 id="estudiantes-title">Estudiantes registrados</h2></div><span className="count">{estudiantes?.length ?? 0}</span></div>
            <EstudiantesList />
          </section>
          </details>
        </div>
      </div>
      <AdminProjectsPanel />
    </div>
  );
}
