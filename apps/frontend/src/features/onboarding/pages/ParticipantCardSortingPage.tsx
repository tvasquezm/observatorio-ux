// apps/frontend/src/features/onboarding/pages/ParticipantCardSortingPage.tsx
//
// Pantalla del PARTICIPANTE tras unirse a un estudio de Card Sorting
// (ver OnboardingPage). Drag & drop nativo (HTML5 DnD), sin librería
// externa. El progreso se cachea en localStorage por sesionId para no
// perderlo si el token expira o la página se recarga.

import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { useParams } from 'react-router-dom';
import {
  getParticipantCardSortingSession,
  submitCardSortingResult,
  type ParticipantCardSortingSession,
  type GrupoResultado,
} from '../api/participant-card-sorting.api';
import { SesionExpiradaError } from '../../../shared/api/api-client';
import { notify } from '../../../shared/api/toast';

interface ProgresoCache {
  // cardId -> categoriaId (CERRADO) o nombre de categoría (ABIERTO)
  asignaciones: Record<string, string>;
  // Solo ABIERTO: nombres de categorías que el participante fue creando.
  categoriasCreadas: string[];
}

function claveCache(sesionId: string) {
  return `cardSorting:progreso:${sesionId}`;
}

function leerCache(sesionId: string): ProgresoCache {
  try {
    const raw = localStorage.getItem(claveCache(sesionId));
    if (!raw) return { asignaciones: {}, categoriasCreadas: [] };
    const parsed = JSON.parse(raw);
    return {
      asignaciones: parsed.asignaciones ?? {},
      categoriasCreadas: parsed.categoriasCreadas ?? [],
    };
  } catch {
    return { asignaciones: {}, categoriasCreadas: [] };
  }
}

function guardarCache(sesionId: string, progreso: ProgresoCache) {
  localStorage.setItem(claveCache(sesionId), JSON.stringify(progreso));
}

function limpiarCache(sesionId: string) {
  localStorage.removeItem(claveCache(sesionId));
}

export function ParticipantCardSortingPage() {
  const { sesionId } = useParams<{ sesionId: string }>();
  const [sesion, setSesion] = useState<ParticipantCardSortingSession | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sesionExpirada, setSesionExpirada] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const [asignaciones, setAsignaciones] = useState<Record<string, string>>({});
  const [categoriasCreadas, setCategoriasCreadas] = useState<string[]>([]);
  // Tarjeta recién soltada en "+ Nueva categoría", esperando que el
  // participante escriba el nombre para confirmar.
  const [pendienteNueva, setPendienteNueva] = useState<string | null>(null);
  const [nombreNueva, setNombreNueva] = useState('');

  useEffect(() => {
    if (!sesionId) return;
    const cache = leerCache(sesionId);
    setAsignaciones(cache.asignaciones);
    setCategoriasCreadas(cache.categoriasCreadas);

    (async () => {
      try {
        setCargando(true);
        const data = await getParticipantCardSortingSession(sesionId);
        setSesion(data);
      } catch (e) {
        if (e instanceof SesionExpiradaError) {
          setSesionExpirada(true);
        } else {
          setError(e instanceof Error ? e.message : 'No se pudo cargar el estudio.');
        }
      } finally {
        setCargando(false);
      }
    })();
  }, [sesionId]);

  // Persiste cada cambio — así un reload o una expiración de token no
  // borra lo ya clasificado.
  useEffect(() => {
    if (!sesionId) return;
    guardarCache(sesionId, { asignaciones, categoriasCreadas });
  }, [sesionId, asignaciones, categoriasCreadas]);

  const esCerrado = sesion?.estudio.tipoCardSorting === 'CERRADO';
  const estudioCerrado = sesion?.estudio.cerrado ?? false;

  const cardsPorId = useMemo(() => {
    const map = new Map<string, string>();
    sesion?.estudio.cardsDefinidas.forEach((c) => map.set(c.id, c.etiqueta));
    return map;
  }, [sesion]);

  const sinClasificar = useMemo(
    () => sesion?.estudio.cardsDefinidas.filter((c) => !asignaciones[c.id]) ?? [],
    [sesion, asignaciones],
  );

  const todasAsignadas = sinClasificar.length === 0 && (sesion?.estudio.cardsDefinidas.length ?? 0) > 0;

  function asignar(cardId: string, valor: string) {
    setAsignaciones((prev) => ({ ...prev, [cardId]: valor }));
  }

  function quitarDeMazo(cardId: string) {
    setAsignaciones((prev) => {
      const { [cardId]: _omit, ...resto } = prev;
      return resto;
    });
  }

  function onDropZonaExistente(e: DragEvent, valor: string) {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;
    asignar(cardId, valor);
  }

  function onDropMazo(e: DragEvent) {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;
    quitarDeMazo(cardId);
  }

  function onDropNuevaZona(e: DragEvent) {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;
    setPendienteNueva(cardId);
    setNombreNueva('');
  }

  function confirmarNuevaCategoria() {
    const nombre = nombreNueva.trim();
    if (!nombre || !pendienteNueva) return;
    setCategoriasCreadas((prev) => (prev.includes(nombre) ? prev : [...prev, nombre]));
    asignar(pendienteNueva, nombre);
    setPendienteNueva(null);
    setNombreNueva('');
  }

  async function handleEnviar() {
    if (!sesion || !sesionId) return;
    setEnviando(true);
    setError(null);
    try {
      let grupos: GrupoResultado[];
      if (esCerrado) {
        const porCategoria = new Map<string, string[]>();
        for (const card of sesion.estudio.cardsDefinidas) {
          const categoriaId = asignaciones[card.id];
          porCategoria.set(categoriaId, [...(porCategoria.get(categoriaId) ?? []), card.id]);
        }
        grupos = Array.from(porCategoria.entries()).map(([categoriaId, cardIds]) => ({
          categoriaId,
          cardIds,
        }));
      } else {
        const porNombre = new Map<string, string[]>();
        for (const card of sesion.estudio.cardsDefinidas) {
          const nombre = asignaciones[card.id];
          porNombre.set(nombre, [...(porNombre.get(nombre) ?? []), card.id]);
        }
        grupos = Array.from(porNombre.entries()).map(([categoriaNombre, cardIds]) => ({
          categoriaNombre,
          cardIds,
        }));
      }
      await submitCardSortingResult(sesionId, grupos);
      limpiarCache(sesionId);
      setEnviado(true);
      notify.success('¡Gracias! Tus respuestas fueron enviadas.');
    } catch (e) {
      if (e instanceof SesionExpiradaError) {
        setSesionExpirada(true);
      } else {
        setError(e instanceof Error ? e.message : 'No se pudo enviar el resultado.');
      }
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <main className="onboarding">
        <p>Cargando estudio…</p>
      </main>
    );
  }

  if (sesionExpirada) {
    return (
      <main className="onboarding">
        <p role="alert" className="onboarding-error">
          Tu sesión expiró. Volvé a entrar usando el link original — tu clasificación quedó
          guardada y vas a poder continuar donde la dejaste.
        </p>
      </main>
    );
  }

  if (error && !sesion) {
    return (
      <main className="onboarding">
        <p role="alert" className="onboarding-error">{error}</p>
      </main>
    );
  }

  if (!sesion) return null;

  if (enviado) {
    return (
      <main className="onboarding">
        <h1>¡Listo!</h1>
        <p>Gracias por participar. Ya puedes cerrar esta ventana.</p>
      </main>
    );
  }

  if (estudioCerrado) {
    return (
      <main className="onboarding">
        <p role="alert" className="onboarding-error">
          Este estudio ya no acepta envíos — el evaluador lo cerró. Tu clasificación no se pudo
          enviar.
        </p>
      </main>
    );
  }

  return (
    <main className="onboarding">
      <h1>Clasifica las tarjetas</h1>
      <p>
        Arrastra cada tarjeta del mazo hacia la categoría que le corresponda.
        {!esCerrado && ' Podés soltarla en "+ Nueva categoría" para crear una propia.'}
      </p>

      {error && <p role="alert" className="onboarding-error">{error}</p>}

      <div className="participant-sort-board">
        <div
          className="participant-sort-zone participant-sort-deck"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropMazo}
        >
          <h2>Mazo ({sinClasificar.length})</h2>
          {sinClasificar.map((card) => (
            <div
              key={card.id}
              className="participant-sort-card"
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', card.id)}
            >
              {card.etiqueta}
            </div>
          ))}
        </div>

        {esCerrado &&
          sesion.estudio.categoriasDefinidas.map((cat) => (
            <div
              key={cat.id}
              className="participant-sort-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDropZonaExistente(e, cat.id)}
            >
              <h2>{cat.nombre}</h2>
              {sesion.estudio.cardsDefinidas
                .filter((c) => asignaciones[c.id] === cat.id)
                .map((c) => (
                  <div
                    key={c.id}
                    className="participant-sort-card"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)}
                  >
                    {c.etiqueta}
                  </div>
                ))}
            </div>
          ))}

        {!esCerrado &&
          categoriasCreadas.map((nombre) => (
            <div
              key={nombre}
              className="participant-sort-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDropZonaExistente(e, nombre)}
            >
              <h2>{nombre}</h2>
              {Object.entries(asignaciones)
                .filter(([, valor]) => valor === nombre)
                .map(([cardId]) => (
                  <div
                    key={cardId}
                    className="participant-sort-card"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', cardId)}
                  >
                    {cardsPorId.get(cardId)}
                  </div>
                ))}
            </div>
          ))}

        {!esCerrado && (
          <div
            className="participant-sort-zone participant-sort-nueva"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDropNuevaZona}
          >
            <h2>+ Nueva categoría</h2>
            {pendienteNueva && (
              <div>
                <p>«{cardsPorId.get(pendienteNueva)}» — ¿cómo se llama esta categoría?</p>
                <input
                  type="text"
                  autoFocus
                  value={nombreNueva}
                  onChange={(e) => setNombreNueva(e.target.value)}
                  placeholder="Nombre de la categoría"
                />
                <button type="button" onClick={confirmarNuevaCategoria}>Crear</button>
                <button type="button" onClick={() => setPendienteNueva(null)}>Cancelar</button>
              </div>
            )}
          </div>
        )}
      </div>

      <button type="button" onClick={handleEnviar} disabled={!todasAsignadas || enviando}>
        {enviando ? 'Enviando…' : 'Enviar clasificación'}
      </button>
    </main>
  );
}
