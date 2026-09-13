import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import { useCardSortingStudies, useCreateCardSortingSession } from '../features/card-sorting/hooks/useCardSortingQueries';
import type { TipoCardSorting } from '../features/card-sorting/api/card-sorting.api';

export function CardSortingPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const navigate = useNavigate();
  const { mutate: crear, isPending, error } = useCreateCardSortingSession();
  const { data: studies = [], isLoading: loadingStudies } = useCardSortingStudies(proyectoId);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoCardSorting>('ABIERTO');
  const [tarjetasTexto, setTarjetasTexto] = useState('');
  const [categoriasTexto, setCategoriasTexto] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    const tarjetas = tarjetasTexto
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((etiqueta) => ({ etiqueta }));

    if (tarjetas.length === 0) return;

    const categorias = categoriasTexto
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((nombre) => ({ nombre }));

    crear(
      {
        proyectoId,
        nombre: nombre.trim(),
        tipo,
        tarjetas,
        categorias: tipo === 'CERRADO' && categorias.length > 0 ? categorias : undefined,
      },
      {
        onSuccess: (session) => {
          // Una técnica recién creada abre inmediatamente su espacio de aplicación.
          navigate(`/proyectos/${proyectoId}/card-sorting/${session.id}`);
        },
      },
    );
  }

  return (
    <div className="fade">
      <div className="page-head">
        <div>
          <span className="kicker">ARQUITECTURA DE INFORMACIÓN</span>
          <h1>Card Sorting</h1>
          <p>Configura la técnica y, al crearla, pasarás directamente a su espacio de aplicación. Desde ahí puedes demostrarla, compartirla con participantes y revisar sus resultados.</p>
        </div>
      </div>

      <section className="sort-layout">
        <article className="panel sort-board">
          <div className="panel-head">
            <div>
              <span className="kicker">NUEVA TÉCNICA</span>
              <h2>Configurar Card Sorting</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="form-grid" style={{ maxWidth: 620 }}>
            <label className="field">
              Nombre de la técnica
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Arquitectura de información UTEM" maxLength={120} required />
            </label>

            <label className="field">
              Tipo de estudio
              <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCardSorting)}>
                <option value="ABIERTO">Abierto — el participante crea sus categorías</option>
                <option value="CERRADO">Cerrado — usa categorías predefinidas</option>
              </select>
            </label>

            <label className="field">
              Tarjetas (una por línea)
              <textarea
                placeholder={'Inscripción de asignaturas\nCalendario académico\nBiblioteca'}
                value={tarjetasTexto}
                onChange={(e) => setTarjetasTexto(e.target.value)}
                required
                className="textarea-lg"
              />
            </label>

            {tipo === 'CERRADO' && (
              <label className="field">
                Categorías predefinidas (una por línea)
                <textarea
                  placeholder={'Información académica\nServicios\nVida universitaria'}
                  value={categoriasTexto}
                  onChange={(e) => setCategoriasTexto(e.target.value)}
                  className="textarea-md"
                />
              </label>
            )}

            {error && <p className="error-text">{(error as Error).message}</p>}

            <button type="submit" className="primary" disabled={isPending}>
              {isPending ? 'Creando técnica…' : 'Crear técnica y comenzar →'}
            </button>
          </form>
        </article>

        <aside className="panel sort-analysis">
          <span className="kicker">FLUJO</span>
          <h2>De la configuración a la aplicación</h2>
          <div className="cs-flow-list">
            <div><span>1</span><p><strong>Configura</strong> tarjetas y categorías.</p></div>
            <div><span>2</span><p><strong>Abre la técnica</strong> en su propia página.</p></div>
            <div><span>3</span><p><strong>Clasifica</strong> las tarjetas mediante arrastrar y soltar.</p></div>
            <div><span>4</span><p><strong>Analiza</strong> las clasificaciones recibidas desde la página de resultados.</p></div>
          </div>
        </aside>
      </section>

      <section className="panel" style={{ marginTop: 24 }}>
        <div className="panel-head">
          <div><span className="kicker">MIS TÉCNICAS</span><h2>Card Sorting creados</h2></div>
          <span className="count">{studies.length}</span>
        </div>
        {loadingStudies ? <p className="text-muted-sm">Cargando técnicas…</p> : studies.length === 0 ? <p className="text-muted-sm">Todavía no has creado técnicas de Card Sorting.</p> : (
          <div className="cs-results-list">
            {studies.map((study) => (
              <button key={study.id} type="button" className="cs-result-row" onClick={() => navigate(`/proyectos/${proyectoId}/card-sorting/${study.id}`)} style={{ textAlign: 'left', border: 0, width: '100%', cursor: 'pointer' }}>
                <div className="cs-result-row-head"><strong>{study.nombre}</strong><span>{study.estado === 'COMPLETADO' ? '🔴 Cerrada' : '🟢 Abierta'} · {study.respuestasCount} respuestas · {study.cardsCount} tarjetas</span></div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
