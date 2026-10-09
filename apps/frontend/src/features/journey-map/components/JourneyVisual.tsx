import { TechniqueChips } from '../../../shared/components/TechniqueChips';
import { TechniqueProcess } from '../../../shared/components/TechniqueProcess';
import type { Emocion, JourneyMapContenido, Phase } from '../api/journey-map.api';
import {
  CURVA_ALTO,
  CURVA_ANCHO_FASE,
  NIVEL_Y,
  procesoJourney,
  puntosCurva,
  trazoCurva,
} from '../journey-visual';

type CampoLista = 'actividades' | 'touchpoints' | 'pensamientos' | 'dificultades' | 'ganancias' | 'oportunidades';

const CARRILES: { campo: CampoLista; etiqueta: string; tono: string }[] = [
  { campo: 'actividades', etiqueta: 'Actividades', tono: 'var(--muted)' },
  { campo: 'touchpoints', etiqueta: 'Puntos de contacto', tono: 'var(--teal)' },
  { campo: 'pensamientos', etiqueta: 'Pensamientos', tono: 'var(--lav)' },
  { campo: 'dificultades', etiqueta: 'Dificultades / puntos de dolor', tono: 'var(--coral)' },
  { campo: 'ganancias', etiqueta: 'Ganancias / aspectos positivos', tono: 'var(--mint)' },
  { campo: 'oportunidades', etiqueta: 'Oportunidades de mejora', tono: 'var(--navy)' },
];

const COL_FASE = 180;
const COL_ETIQUETA = 170;

function claseEmocion(emocion: Emocion) {
  return `tv-emo--${emocion.toLowerCase()}`;
}

function iniciales(nombre: string) {
  return nombre.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
}

export function JourneyEmotionStrip({ fases }: { fases: Phase[] }) {
  return (
    <ol className="tv-strip" aria-label="Emociones por fase">
      {fases.map((fase, index) => (
        <li key={index} className={claseEmocion(fase.emocion)} title={`${fase.nombre}: ${fase.emocion}`}>
          <span className="sr-only">{fase.nombre}: {fase.emocion}</span>
        </li>
      ))}
    </ol>
  );
}

export function JourneyVisual({ contenido }: { contenido: JourneyMapContenido }) {
  const { perfilUsuario, objetivo, eventoInicio, fases, evidencia } = contenido;
  const columnas = `${COL_ETIQUETA}px repeat(${fases.length}, minmax(${COL_FASE}px, 1fr))`;
  const ancho = COL_ETIQUETA + fases.length * COL_FASE;
  const puntos = puntosCurva(fases.map((fase) => fase.emocion));
  const anchoCurva = CURVA_ANCHO_FASE * fases.length;

  return (
    <div className="tv-journey">
      <TechniqueProcess title="Proceso del Journey Map" steps={procesoJourney(contenido)} />

      <div className="tv-journey-head">
        <span className="tv-avatar" aria-hidden="true">{iniciales(perfilUsuario.nombre)}</span>
        <div>
          <h3 className="tv-title">{perfilUsuario.nombre}</h3>
          <p className="tv-subtitle">{perfilUsuario.rol}</p>
        </div>
      </div>

      {(eventoInicio || objetivo) && (
        <div className="tv-journey-meta">
          {eventoInicio && (
            <div className="tv-callout">
              <h4>Evento de inicio</h4>
              <p>{eventoInicio}</p>
            </div>
          )}
          {objetivo && (
            <div className="tv-callout tv-callout--mint">
              <h4>Objetivo del recorrido</h4>
              <p>{objetivo}</p>
            </div>
          )}
        </div>
      )}

      <div className="tv-board" tabIndex={0} aria-label="Recorrido por fases (desplázate para ver todas)">
        <div
          className="tv-board-inner"
          role="table"
          aria-label="Journey Map por fases"
          style={{ ['--tv-cols' as string]: columnas, minWidth: ancho }}
        >
          <div className="tv-row tv-row--phases" role="row">
            <div className="tv-rowhead" role="columnheader">Fase</div>
            {fases.map((fase, index) => (
              <div key={index} className="tv-cell" role="columnheader">
                <span className="tv-phase-n" aria-hidden="true">{index + 1}</span>
                <span className="tv-phase-title">{fase.nombre}</span>
              </div>
            ))}
          </div>

          <div className="tv-row" role="row">
            <div className="tv-rowhead" role="rowheader">
              Curva emocional
              <small>Arriba: positiva · abajo: negativa</small>
            </div>
            <div className="tv-curve" role="cell" aria-hidden="true">
              <svg viewBox={`0 0 ${anchoCurva} ${CURVA_ALTO}`} preserveAspectRatio="none">
                {Object.values(NIVEL_Y).map((y) => (
                  <line key={y} className="tv-guide" x1="0" x2={anchoCurva} y1={y} y2={y} />
                ))}
                <path className="tv-line" d={trazoCurva(puntos)} />
              </svg>
              {fases.map((fase, index) => (
                <span
                  key={index}
                  className={`tv-dot ${claseEmocion(fase.emocion)}`}
                  style={{
                    left: `${((index + 0.5) / fases.length) * 100}%`,
                    top: `${(NIVEL_Y[fase.emocion] / CURVA_ALTO) * 100}%`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="tv-row" role="row">
            <div className="tv-rowhead" role="rowheader">Emoción</div>
            {fases.map((fase, index) => (
              <div key={index} className="tv-cell" role="cell">
                <span className={`tv-pill ${claseEmocion(fase.emocion)}`}>{fase.emocion}</span>
              </div>
            ))}
          </div>

          {CARRILES.map((carril) => (
            <div key={carril.campo} className="tv-row" role="row" style={{ ['--tv-tone' as string]: carril.tono }}>
              <div className="tv-rowhead tv-rowhead--lane" role="rowheader">{carril.etiqueta}</div>
              {fases.map((fase, index) => (
                <div key={index} className="tv-cell" role="cell">
                  <TechniqueChips items={fase[carril.campo]} tono={carril.tono} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="tv-evidence">
        <h4>Evidencia</h4>
        <TechniqueChips items={evidencia} tono="var(--teal)" />
      </div>
    </div>
  );
}
