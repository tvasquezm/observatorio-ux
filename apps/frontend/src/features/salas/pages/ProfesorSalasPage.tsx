import React, { useState, useEffect } from 'react';
import { getSalas, createSala, Sala } from '../api/salas.api';

export const ProfesorSalasPage: React.FC = () => {
  const [salas, setSalas] = useState<Sala[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const cargarSalas = async () => {
    try {
      setLoading(true);
      const data = await getSalas();
      setSalas(data);
    } catch (err) {
      console.error('Error al cargar las salas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearSala = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      // Formateamos las fechas al orden Día/Mes/Año Hora:min para que quede claro visualmente
      const formatearFechaLocal = (isoStr: string) => {
        if (!isoStr) return '';
        const [datePart, timePart] = isoStr.split('T');
        const [yyyy, mm, dd] = datePart.split('-');
        return `${dd}/${mm}/${yyyy} ${timePart}`;
      };

      const inicioFmt = formatearFechaLocal(fechaInicio);
      const finFmt = formatearFechaLocal(fechaFin);

      const instruccionesCompletas = `Inicio: ${inicioFmt} | Término: ${finFmt}\n\n${instrucciones}`;
      
      await createSala({ 
        nombre, 
        periodo, 
        instrucciones: instruccionesCompletas 
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
        <input
          type="text"
          placeholder="Buscar sala por nombre o período..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ width: '100%', maxWidth: '400px', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
        />
      </div>

      {loading ? (
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
              </div>
              <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                Creada el {new Date(sala.createdAt).toLocaleDateString()}
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
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '24px', background: 'var(--bg-card, #ffffff)' }}>
            <h3 style={{ marginBottom: '16px' }}>Crear Nueva Sala con Rango Horario</h3>

            {error && (
              <div style={{ marginBottom: '16px', padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '14px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCrearSala} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Nombre de la Sala</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Taller de Usabilidad"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Período Académico</label>
                <input
                  type="text"
                  required
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  placeholder="Ej: 2026-2"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Inicio (Día / Mes / Año y Hora)</label>
                  <input
                    type="datetime-local"
                    required
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Término (Día / Mes / Año y Hora)</label>
                  <input
                    type="datetime-local"
                    required
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Instrucciones / Descripción</label>
                <textarea
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
          </div>
        </div>
      )}
    </div>
  );
};