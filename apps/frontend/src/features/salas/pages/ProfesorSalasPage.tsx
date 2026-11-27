import { SalaBadge } from '../components/SalaBadge';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSalas, softDeleteSala, type Sala } from '../api/salas.api';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { resolvePerspective } from '../../../shared/auth/perspectivas';
import { useConfirm } from '../../../shared/api/confirm';
import { useUnsavedChanges } from '../../../shared/hooks/useUnsavedChanges';
import { SalaFormDialog } from '../components/SalaFormDialog';
import { Skeleton } from '../../../shared/components/ui/Skeleton';

export const ProfesorSalasPage: React.FC = () => {
  const { user, perspectiveRole } = useAuthStore();
  const activeRole = user ? resolvePerspective(user.rol, perspectiveRole) : null;
  const puedeGestionar = activeRole === 'DOCENTE' || activeRole === 'ADMIN';
  const [salas, setSalas] = useState<Sala[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [salaEditando, setSalaEditando] = useState<Sala | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const confirm = useConfirm();
  useUnsavedChanges(isModalOpen, formDirty, false, salaEditando?.id ?? 'new');

  useEffect(() => {
    cargarSalas();
  }, []);

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

  const abrirCrearSala = () => {
    setSaveNotice('');
    setSalaEditando(null);
    setIsModalOpen(true);
  };

  const abrirEditarSala = (sala: Sala) => {
    setSaveNotice('');
    setSalaEditando(sala);
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setIsModalOpen(false);
    setSalaEditando(null);
  };

  const handleEliminarSala = async (sala: Sala) => {
    if (!(await confirm(`¿Eliminar la sala "${sala.nombre}"? Se puede recuperar dentro de 20 días.`, { requireText: sala.nombre }))) return;
    try {
      await softDeleteSala(sala.id);
      await cargarSalas();
    } catch (err: any) {
      setLoadError(err?.message || 'No se pudo eliminar la sala.');
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
    <div className="salas-page">
      <div className="salas-header">
        <div>
          <span className="eyebrow">Espacios académicos</span>
          <h1>{puedeGestionar ? 'Salas de proyecto UX' : 'Mis salas'}</h1>
          <p>
            {puedeGestionar
              ? 'Gestiona las salas de tus estudiantes y supervisa su avance temporal.'
              : 'Aquí aparecen las salas en las que tu docente te ha registrado.'}
          </p>
        </div>
        {puedeGestionar && (
          <div className="salas-header-actions">
            <Link to="/salas/eliminadas" className="secondary button-like">
              Salas eliminadas
            </Link>
            <button
              type="button"
              onClick={abrirCrearSala}
              className="primary"
            >
              Crear sala
            </button>
          </div>
        )}
      </div>

      {saveNotice && <p role="status" className="inline-state">{saveNotice}</p>}
      <div className="salas-toolbar">
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
        <span className="salas-result-count" aria-live="polite">
          {loading ? 'Cargando…' : `${salasFiltradas.length} ${salasFiltradas.length === 1 ? 'sala' : 'salas'}`}
        </span>
      </div>

      {loadError ? (
        <div className="error-text" role="alert">
          <p>{loadError}</p>
          <button type="button" className="secondary" onClick={cargarSalas}>Reintentar</button>
        </div>
      ) : loading ? (
        <Skeleton etiqueta="Cargando salas" variante="tarjetas" />
      ) : salasFiltradas.length > 0 ? (
        <div className="salas-list">
          {salasFiltradas.map((sala) => {
            const salaCompat = sala as Sala & { descripcion?: string; fecha_inicio?: string; fecha_fin?: string; created_at?: string };
            const fechasExtraidas = extraerFechasDeTexto(sala.instrucciones || salaCompat.descripcion);

            const inicio = formatearFecha(sala.fechaInicio || salaCompat.fecha_inicio) || fechasExtraidas.inicio || 'Sin definir';
            const fin = formatearFecha(sala.fechaFin || salaCompat.fecha_fin) || fechasExtraidas.fin || 'Sin definir';
            const creada = formatearFecha(sala.createdAt || salaCompat.created_at) || 'N/A';

            return (
              <article
                key={sala.id}
                className="sala-card"
              >
                <SalaBadge id={sala.id} nombre={sala.nombre} />

                <div className="sala-card-content">
                  <div className="sala-card-heading">
                    <div>
                      <h2>{sala.nombre}</h2>
                      {!!sala.accesosPendientes && (
                        <Link to={`/salas/${sala.id}?tab=equipos`} className="sala-pendientes">
                          {sala.accesosPendientes} acceso{sala.accesosPendientes === 1 ? '' : 's'} por revisar
                        </Link>
                      )}
                      {sala.profesor?.nombre && (
                        <p className="sala-profesor">Docente: {sala.profesor.nombre}</p>
                      )}
                    </div>
                    <div className="sala-card-actions">
                      <span className="sala-periodo">{sala.periodo}</span>
                      {puedeGestionar && (
                        <button
                          type="button"
                          className="secondary sala-edit-button"
                          onClick={() => abrirEditarSala(sala)}
                          aria-label={`Editar sala ${sala.nombre}`}
                        >
                          Editar
                        </button>
                      )}
                      {activeRole === 'ADMIN' && (
                        <button
                          type="button"
                          className="danger sala-delete-button"
                          onClick={() => handleEliminarSala(sala)}
                          aria-label={`Eliminar sala ${sala.nombre}`}
                        >
                          Eliminar
                        </button>
                      )}
                      <Link className="primary sala-enter-link" to={`/salas/${sala.id}`}>
                        Ver proyectos <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </div>

                  <div className="sala-dates">
                    <div className="sala-date-item">
                      <div>
                        <span>Inicio</span>
                        <strong>{inicio}</strong>
                      </div>
                    </div>

                    <span className="sala-date-arrow" aria-hidden="true">→</span>

                    <div className="sala-date-item">
                      <div>
                        <span>Término</span>
                        <strong>{fin}</strong>
                      </div>
                    </div>

                    <div className="sala-date-separator" aria-hidden="true" />

                    <div className="sala-date-item">
                      <div>
                        <span>Creada el</span>
                        <strong>{creada}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state salas-empty">
          <strong>{busqueda ? 'Sin coincidencias' : 'Todavía no tienes salas'}</strong>
          <small>
            {busqueda
              ? 'Prueba con otro nombre o período.'
              : puedeGestionar
                ? 'Crea una sala para comenzar a organizar a tus estudiantes.'
                : 'Cuando un docente registre tu correo en una sala, aparecerá aquí automáticamente.'}
          </small>
          {!busqueda && puedeGestionar && <button type="button" className="primary" onClick={abrirCrearSala}>Crear la primera sala</button>}
        </div>
      )}

      <SalaFormDialog
        sala={salaEditando}
        abierto={isModalOpen}
        onClose={cerrarModal}
        onSaved={async (guardada) => {
          const nombreGuardado = guardada.nombre || salaEditando?.nombre || '';
          setSaveNotice(`Sala «${nombreGuardado}» ${salaEditando ? 'actualizada' : 'creada'}.`);
          await cargarSalas();
        }}
        onDirtyChange={setFormDirty}
      />
    </div>
  );
};
