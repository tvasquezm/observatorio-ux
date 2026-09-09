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

  const formatearFecha = (fechaRaw?: string) => {
    if (!fechaRaw) return null;
    const d = new Date(fechaRaw);
    if (isNaN(d.getTime())) return null;

    const dia = d.getDate().toString().padStart(2, '0');
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const mes = meses[d.getMonth()];
    const anio = d.getFullYear();
    const horas = d.getHours().toString().padStart(2, '0');
    const minutos = d.getMinutes().toString().padStart(2, '0');

    return `${dia} ${mes} ${anio} ${horas}:${minutos}`;
  };

  // Helper para extraer fechas en caso de que vengan embebidas dentro de instrucciones/descripción
  const extraerFechasDeTexto = (texto?: string) => {
    if (!texto) return { inicio: null, fin: null };
    const regex = /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/g;
    const coincidencias = texto.match(regex);
    return {
      inicio: coincidencias?.[0] || null,
      fin: coincidencias?.[1] || null,
    };
  };

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {salasFiltradas.map((sala: any) => {
            const fechasExtraidas = extraerFechasDeTexto(sala.instrucciones || sala.descripcion);

            const inicio = formatearFecha(sala.fechaInicio || sala.fecha_inicio) || fechasExtraidas.inicio || 'Sin definir';
            const fin = formatearFecha(sala.fechaFin || sala.fecha_fin) || fechasExtraidas.fin || 'Sin definir';
            const creada = formatearFecha(sala.createdAt || sala.created_at) || 'N/A';

            return (
              <div
                key={sala.id}
                className="card"
                style={{
                  padding: '20px 24px',
                  borderRadius: '20px',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '24px',
                  width: '100%',
                }}
              >
                {/* Cuadro verde con número/ícono */}
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    minWidth: '80px',
                    borderRadius: '18px',
                    background: '#d9f99d',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontWeight: 800,
                    color: '#14532d',
                  }}
                >
                  <div style={{ fontSize: '26px', lineHeight: 1.1 }}>
                    {sala.nombre.match(/\d+/)?.[0] ?? sala.nombre.charAt(0)}
                  </div>
                  <div style={{ fontSize: '16px', marginTop: '2px', opacity: 0.8 }}>👥</div>
                </div>

                {/* Contenido principal (Título + Fechas abajo) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Título */}
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                      <Link to={`/salas/${sala.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        {sala.nombre}
                      </Link>
                    </h2>
                  </div>

                  {/* Fila de Fechas con ícono */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                    {/* Fecha Inicio */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '22px' }}>🗓️</span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Inicio</span>
                        <strong style={{ fontSize: '13px', color: '#1e293b' }}>
                          {inicio}
                        </strong>
                      </div>
                    </div>

                    <span style={{ color: '#cbd5e1', fontSize: '16px' }}>→</span>

                    {/* Fecha Término */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '22px' }}>🗓️</span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Término</span>
                        <strong style={{ fontSize: '13px', color: '#1e293b' }}>
                          {fin}
                        </strong>
                      </div>
                    </div>

                    {/* Separador vertical */}
                    <div style={{ width: '1px', height: '28px', background: '#e2e8f0' }} />

                    {/* Fecha Creación */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '22px' }}>🗓️</span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Creada el</span>
                        <strong style={{ fontSize: '13px', color: '#1e293b' }}>
                          {creada}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Badge Período (Esquina superior derecha) */}
                <div style={{ alignSelf: 'flex-start' }}>
                  <span
                    style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      fontWeight: 700,
                      fontSize: '13px',
                    }}
                  >
                    {sala.periodo}
                  </span>
                </div>
              </div>
            );
          })}
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