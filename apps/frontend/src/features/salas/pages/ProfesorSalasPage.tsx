import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getSalas, createSala, Sala } from '../api/salas.api';

export const ProfesorSalasPage: React.FC = () => {
  const [salas, setSalas] = useState<Sala[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const modalRef = useRef<HTMLDialogElement>(null);

  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [periodo, setPeriodo] = useState('2026-2');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [instrucciones, setInstrucciones] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    cargarSalas();
  }, []);

  useEffect(() => {
    const dialog = modalRef.current;
    if (!dialog || !isModalOpen) return;
    dialog.showModal();
    return () => dialog.close();
  }, [isModalOpen]);

  const cargarSalas = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const data = await getSalas();
      setSalas(data);
    } catch (err: any) {
      setLoadError(err?.message || 'No se pudieron cargar las salas. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCrearSala = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (new Date(fechaFin) <= new Date(fechaInicio)) {
      setError('La fecha de término debe ser posterior a la fecha de inicio.');
      return;
    }
    try {
      await createSala({ 
        nombre, 
        periodo, 
        instrucciones: instrucciones.trim() || undefined,
        fechaInicio: new Date(fechaInicio).toISOString(),
        fechaFin: new Date(fechaFin).toISOString(),
      });

      setNombre('');
      setFechaInicio('');
      setFechaFin('');
      setInstrucciones('');
      setIsModalOpen(false);
      cargarSalas();
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor para guardar la sala');
    }
  };

  const salasFiltradas = salas.filter((sala) =>
    sala.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    sala.periodo.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="card" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2>Salas de Proyecto UX</h2>
          <p style={{ color: 'var(--muted)', marginTop: '4px' }}>Gestiona las salas de tus estudiantes y supervisa su avance temporal.</p>
        </div>
        <button 
          type="button" 
          onClick={() => setIsModalOpen(true)}
          style={{ cursor: 'pointer' }}
        >
          + Crear Sala
        </button>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label className="sr-only" htmlFor="buscar-sala">Buscar sala</label>
        <input
          id="buscar-sala"
          type="text"
          placeholder="Buscar sala por nombre o período..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ width: '100%', maxWidth: '400px', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
        />
      </div>

      {loadError ? (
        <div className="error-text" role="alert">
          <p>{loadError}</p>
          <button type="button" className="secondary" onClick={cargarSalas}>Reintentar</button>
        </div>
      ) : loading ? (
        <p style={{ color: 'var(--muted)' }}>Cargando salas...</p>
      ) : salasFiltradas.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {salasFiltradas.map((sala) => (
            <div key={sala.id} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>{sala.nombre}</h3>
                  <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-subtle, #f3f4f6)' }}>
                    {sala.periodo}
                  </span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--muted)', whiteSpace: 'pre-line', marginTop: '8px' }}>
                  {sala.instrucciones || 'Sin instrucciones adicionales.'}
                </p>
                {sala.fechaInicio && sala.fechaFin && (
                  <p className="text-muted-sm">
                    {new Date(sala.fechaInicio).toLocaleString()} – {new Date(sala.fechaFin).toLocaleString()}
                  </p>
                )}
              </div>
              <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Creada el {new Date(sala.createdAt).toLocaleDateString()}</span>
                <Link to={`/salas/${sala.id}`}>Ver detalle →</Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>
          <p>No se encontraron salas registradas.</p>
          <small>Intenta crear una nueva sala utilizando el botón superior.</small>
        </div>
      )}

      {/* Modal de Creación */}
      {isModalOpen && (
        <dialog
          ref={modalRef}
          className="card sala-modal"
          aria-labelledby="crear-sala-title"
          onCancel={() => setIsModalOpen(false)}
        >
            <h3 id="crear-sala-title" style={{ marginBottom: '16px' }}>Crear nueva sala</h3>

            {error && (
              <div role="alert" style={{ marginBottom: '16px', padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '14px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCrearSala} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label htmlFor="sala-nombre" style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Nombre de la sala</label>
                <input
                  id="sala-nombre"
                  name="nombre"
                  autoFocus
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Taller de Usabilidad"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
              </div>

              <div>
                <label htmlFor="sala-periodo" style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Período académico</label>
                <input
                  id="sala-periodo"
                  name="periodo"
                  type="text"
                  required
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  placeholder="Ej: 2026-2"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
              </div>

              <div className="sala-date-grid">
                <div>
                  <label htmlFor="sala-inicio" style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Inicio</label>
                  <input
                    id="sala-inicio"
                    name="fechaInicio"
                    type="datetime-local"
                    required
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                  />
                </div>
                <div>
                  <label htmlFor="sala-fin" style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Término</label>
                  <input
                    id="sala-fin"
                    name="fechaFin"
                    type="datetime-local"
                    required
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="sala-instrucciones" style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Instrucciones o descripción</label>
                <textarea
                  id="sala-instrucciones"
                  name="instrucciones"
                  value={instrucciones}
                  onChange={(e) => setInstrucciones(e.target.value)}
                  rows={3}
                  placeholder="Detalles para los estudiantes..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit">
                  Guardar Sala
                </button>
              </div>
            </form>
        </dialog>
      )}
    </div>
  );
};
