import type { ReactNode } from 'react';
import { TechniqueChips } from '../../../shared/components/TechniqueChips';
import { TechniqueProcess } from '../../../shared/components/TechniqueProcess';
import type { PersonaArtifact, PersonaContenido } from '../api/persona.api';
import { ETIQUETAS_CAMPOS, iniciales, procesoPersona } from '../persona-visual';

type CampoLista = 'objetivos' | 'necesidades' | 'motivaciones' | 'frustraciones' | 'comportamientos' | 'expectativas';

const COLUMNAS: { titulo: string; tono: string; campos: CampoLista[] }[] = [
  { titulo: 'Quiere lograr', tono: 'var(--teal)', campos: ['objetivos', 'necesidades', 'motivaciones'] },
  { titulo: 'Le frustra', tono: 'var(--coral)', campos: ['frustraciones'] },
  { titulo: 'Cómo actúa', tono: 'var(--lav)', campos: ['comportamientos', 'expectativas'] },
];

const DETALLE_TEXTO = [
  'familia', 'fotografiaUrl', 'contextoDeUso', 'rolEnServicio', 'relacionConServicio', 'observacionesValidacion',
] as const;
const DETALLE_LISTA = ['hobbies', 'habilidades', 'caracteristicasDistintivas', 'evidencia'] as const;

interface Props {
  persona: PersonaArtifact;
  acciones?: ReactNode;
}

export function PersonaCard({ persona, acciones }: Props) {
  const c: PersonaContenido = persona.contenido;
  const validada = c.estadoValidacion === 'VALIDADA';
  const demografia = [c.ocupacion, c.edad !== undefined ? `${c.edad} años` : null].filter(Boolean).join(' · ');

  return (
    <article className="panel persona-profile tv-persona" aria-labelledby={`persona-name-${persona.id}`}>
      <header className="tv-persona-head">
        <span className="tv-avatar tv-avatar--lg" aria-hidden="true">{iniciales(c.nombreCompleto)}</span>
        <div className="persona-profile-identity">
          <h3 id={`persona-name-${persona.id}`}>{c.nombreCompleto}</h3>
          <p>{demografia || 'Sin datos demográficos registrados'}</p>
        </div>
        <div className="tv-persona-badges">
          <span className={validada ? 'count' : 'short-id'}>{validada ? 'Validada' : 'Validación pendiente'}</span>
          <span className="text-muted-xs">Versión {persona.version}</span>
        </div>
      </header>

      {c.acercaDe && <blockquote className="tv-quote">{c.acercaDe}</blockquote>}

      <TechniqueProcess compact title="Proceso de la persona" steps={procesoPersona(c)} />

      <div className="tv-persona-cols">
        {COLUMNAS.map((columna) => (
          <section key={columna.titulo} className="tv-persona-col" style={{ ['--tv-tone' as string]: columna.tono }}>
            <h4>{columna.titulo}</h4>
            {columna.campos.map((campo) => (
              <div key={campo} className="tv-persona-group">
                <h5>{ETIQUETAS_CAMPOS[campo]}</h5>
                <TechniqueChips items={c[campo] ?? []} tono={columna.tono} vacio="Sin registrar." />
              </div>
            ))}
          </section>
        ))}
      </div>

      <details className="persona-profile-details">
        <summary>Ver perfil completo</summary>
        <dl className="persona-detail-grid">
          {DETALLE_TEXTO.map((campo) => c[campo] && (
            <div key={campo}><dt>{ETIQUETAS_CAMPOS[campo]}</dt><dd>{c[campo]}</dd></div>
          ))}
          {DETALLE_LISTA.map((campo) => {
            const valores = c[campo];
            return Array.isArray(valores) && valores.length > 0 ? (
              <div key={campo}>
                <dt>{ETIQUETAS_CAMPOS[campo]}</dt>
                <dd><ul>{valores.map((valor, index) => <li key={index}>{valor}</li>)}</ul></dd>
              </div>
            ) : null;
          })}
        </dl>
      </details>

      {acciones}
    </article>
  );
}
