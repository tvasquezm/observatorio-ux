import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getSalas, createSala, updateSala, type Sala } from '../api/salas.api';

function fechaParaInput(fechaRaw?: string | null) {
  if (!fechaRaw) return '';
  const fecha = new Date(fechaRaw);
  if (Number.isNaN(fecha.getTime())) return '';
  const pad = (valor: number) => String(valor).padStart(2, '0');
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
}

export const ProfesorSalasPage: React.FC = () => {
  const [salas, setSalas] = useState<Sala[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [salaEditando, setSalaEditando] = useState<Sala | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const limpiarFormulario = () => {
    setNombre('');
    setPeriodo('2026-2');
    setFechaInicio('');
    setFechaFin('');
    setInstrucciones('');
    setError('');
    setSalaEditando(null);
  };

  const abrirCrearSala = () => {
    limpiarFormulario();
    setIsModalOpen(true);
  };

  const abrirEditarSala = (sala: Sala) => {
    setSalaEditando(sala);
    setNombre(sala.nombre);
    setPeriodo(sala.periodo);
    setFechaInicio(fechaParaInput(sala.fechaInicio));
    setFechaFin(fechaParaInput(sala.fechaFin));
    setInstrucciones(sala.instrucciones ?? '');
    setError('');
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setIsModalOpen(false);
    limpiarFormulario();
  };

  const handleGuardarSala = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (new Date(fechaFin) <= new Date(fechaInicio)) {
      setError('La fecha de término debe ser posterior a la fecha de inicio.');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        nombre: nombre.trim(),
        periodo: periodo.trim(),
        instrucciones: salaEditando ? instrucciones.trim() : (instrucciones.trim() || undefined),
        fechaInicio: new Date(fechaInicio).toISOString(),
        fechaFin: new Date(fechaFin).toISOString(),
      };

      if (salaEditando) {
        await updateSala(salaEditando.id, payload);
      } else {
        await createSala(payload);
      }

      cerrarModal();
      await cargarSalas();
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor para guardar la sala');
    } finally {
      setSaving(false);
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
    <div className="card salas-page">
      <div className="salas-header">
        <div>
          <h2>Salas de Proyecto UX</h2>
          <p>Gestiona las salas de tus estudiantes y supervisa su avance temporal.</p>
        </div>
        <button 
          type="button" 
          onClick={abrirCrearSala}
          className="primary"
        >
          + Crear Sala
        </button>
      </div>

      <div className="salas-search">
        <label className="sr-only" htmlFor="buscar-sala">Buscar sala</label>
        <input
          id="buscar-sala"
          type="text"
          placeholder="Buscar sala por nombre o período..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="salas-search-input"
        />
      </div>

      {loadError ? (
        <div className="error-text" role="alert">
          <p>{loadError}</p>
          <button type="button" className="secondary" onClick={cargarSalas}>Reintentar</button>
        </div>
      ) : loading ? (
        <p className="text-muted">Cargando salas...</p>
      ) : salasFiltradas.length > 0 ? (
        <div className="salas-list">
          {salasFiltradas.map((sala) => {
            const salaCompat = sala as Sala & { descripcion?: string; fecha_inicio?: string; fecha_fin?: string; created_at?: string };
            const fechasExtraidas = extraerFechasDeTexto(sala.instrucciones || salaCompat.descripcion);

            const inicio = formatearFecha(sala.fechaInicio || salaCompat.fecha_inicio) || fechasExtraidas.inicio || 'Sin definir';
            const fin = formatearFecha(sala.fechaFin || salaCompat.fecha_fin) || fechasExtraidas.fin || 'Sin definir';
            const creada = formatearFecha(sala.createdAt || salaCompat.created_at) || 'N/A';

            return (
              <div
                key={sala.id}
                className="sala-card"
              >
                <div className="sala-card-icon" aria-hidden="true">
                  <div>
                    {sala.nombre.match(/\d+/)?.[0] ?? sala.nombre.charAt(0)}
                  </div>
                  <span>👥</span>
                </div>

                <div className="sala-card-content">
                  <div className="sala-card-heading">
                    <h3>
                      <Link to={`/salas/${sala.id}`}>
                        {sala.nombre}
                      </Link>
                    </h3>
                    <div className="sala-card-actions">
                      <span className="sala-periodo">{sala.periodo}</span>
                      <button
                        type="button"
                        className="secondary sala-edit-button"
                        onClick={() => abrirEditarSala(sala)}
                        aria-label={`Editar sala ${sala.nombre}`}
                      >
                        Editar
                      </button>
                    </div>
                  </div>

                  <div className="sala-dates">
                    <div className="sala-date-item">
                      <span aria-hidden="true">🗓️</span>
                      <div>
                        <span>Inicio</span>
                        <strong>{inicio}</strong>
                      </div>
                    </div>

                    <span className="sala-date-arrow" aria-hidden="true">→</span>

                    <div className="sala-date-item">
                      <span aria-hidden="true">🗓️</span>
                      <div>
                        <span>Término</span>
                        <strong>{fin}</strong>
                      </div>
                    </div>

                    <div className="sala-date-separator" aria-hidden="true" />

                    <div className="sala-date-item">
                      <span aria-hidden="true">🗓️</span>
                      <div>
                        <span>Creada el</span>
                        <strong>{creada}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card salas-empty">
          <p>No se encontraron salas registradas.</p>
          <small>Intenta crear una nueva sala utilizando el botón superior.</small>
        </div>
      )}

      {/* Modal de creación y edición */}
      {isModalOpen && (
        <dialog
          ref={modalRef}
          className="card sala-modal"
          aria-labelledby="sala-modal-title"
          onCancel={cerrarModal}
        >
          <h3 id="sala-modal-title">
            {salaEditando ? 'Editar sala' : 'Crear nueva sala'}
          </h3>

          {error && (
            <div role="alert" className="sala-form-error">
              {error}
            </div>
          )}

          <form onSubmit={handleGuardarSala} className="sala-form">
            <div className="sala-field">
              <label htmlFor="sala-nombre">Nombre de la sala</label>
              <input
                id="sala-nombre"
                name="nombre"
                autoFocus
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Taller de Usabilidad"
              />
            </div>

            <div className="sala-field">
              <label htmlFor="sala-periodo">Período académico</label>
              <input
                id="sala-periodo"
                name="periodo"
                type="text"
                required
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                placeholder="Ej: 2026-2"
              />
            </div>

            <div className="sala-date-grid">
              <div className="sala-field">
                <label htmlFor="sala-inicio">Inicio</label>
                <input
                  id="sala-inicio"
                  name="fechaInicio"
                  type="datetime-local"
                  required
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </div>
              <div className="sala-field">
                <label htmlFor="sala-fin">Término</label>
                <input
                  id="sala-fin"
                  name="fechaFin"
                  type="datetime-local"
                  required
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </div>
            </div>

            <div className="sala-field">
              <label htmlFor="sala-instrucciones">Instrucciones o descripción</label>
              <textarea
                id="sala-instrucciones"
                name="instrucciones"
                value={instrucciones}
                onChange={(e) => setInstrucciones(e.target.value)}
                rows={3}
                placeholder="Detalles para los estudiantes..."
              />
            </div>

            <div className="sala-form-actions">
              <button
                type="button"
                className="secondary"
                onClick={cerrarModal}
                disabled={saving}
              >
                Cancelar
              </button>
              <button type="submit" className="primary" disabled={saving}>
                {saving ? 'Guardando…' : salaEditando ? 'Guardar cambios' : 'Guardar Sala'}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
};
