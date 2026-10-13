import { useState } from 'react';
import { claveEscalaPredefinida, escalaPredefinida, parsearListaCriterios, problemasMetodologia } from '@observatorio-ux/shared-types';
import type { ClaveEscalaPredefinida, ConfiguracionFlujo, CriterioFlujo, MetodologiaFlujo, RespuestaCriterio } from '@observatorio-ux/shared-types';
import { Field } from './campos';
import { ValoracionEditor } from './TrabajoEditor';
import { respuestaVacia } from './flujo-utils';

const ESCALAS: [ClaveEscalaPredefinida, string][] = [['si_no', 'Sí / No'], ['likert_1_5', 'Cumplimiento de 1 a 5'], ['nielsen_0_4', 'Severidad de Nielsen de 0 a 4']];

export function PasoCabecera({ n, titulo, ayuda }: { n: number; titulo: string; ayuda: string }) {
  return <div className="panel-head hf-paso"><h2>Paso {n} de 4 · {titulo}</h2><p className="hf-ayuda">{ayuda}</p></div>;
}

export function PegarLista({ metodologia, autor, onAdd }: { metodologia: MetodologiaFlujo; autor: string; onAdd: (criterios: CriterioFlujo[]) => void }) {
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState<{ agregados: number; avisos: string[] } | null>(null);
  const origen = { metodologiaId: metodologia.id, autor, fuente: `Definición propia de ${autor}`, version: '1', tipo: 'personalizado' };
  return <fieldset><legend>Pegar lista de criterios</legend>
    <p className="hf-ayuda">Una línea por criterio. Si quieres agruparlos, escribe «Categoría: criterio».</p>
    <Field label="Lista de criterios"><textarea value={texto} onChange={e => setTexto(e.target.value)} placeholder={'Navegación: Los menús usan nombres conocidos\nLos botones principales se distinguen'} /></Field>
    <div className="hf-actions"><button type="button" disabled={!texto.trim()} onClick={() => {
      const { criterios, avisos } = parsearListaCriterios(texto, origen, () => crypto.randomUUID(), metodologia.criterios);
      if (criterios.length) { onAdd(criterios); setTexto(''); }
      setResultado({ agregados: criterios.length, avisos });
    }}>Agregar criterios de la lista</button></div>
    {resultado && <div role="status">{resultado.agregados ? `✓ Se agregaron ${resultado.agregados} criterios.` : '⚠ No se agregó ningún criterio.'}{resultado.avisos.length > 0 && <ul>{resultado.avisos.map(a => <li key={a}>{a}</li>)}</ul>}</div>}
  </fieldset>;
}

export function EscalaRapida({ onApply }: { onApply: (clave: ClaveEscalaPredefinida) => void }) {
  return <Field label="Usar una escala predefinida en todos los criterios"><select value="" onChange={e => { if (e.target.value) onApply(e.target.value as ClaveEscalaPredefinida); }}>
    <option value="">Elegir una escala…</option>{ESCALAS.map(([k, nombre]) => <option key={k} value={k}>{nombre}</option>)}
  </select></Field>;
}

export function EscalaCriterio({ criterio, index, onChange }: { criterio: CriterioFlujo; index: number; onChange: (escala: CriterioFlujo['escala']) => void }) {
  const clave = criterio.escala ? claveEscalaPredefinida(criterio.escala) : null;
  const valor = !criterio.escala ? 'base' : clave ?? 'propia';
  return <Field label={`Escala del criterio ${index + 1}`}><select value={valor} onChange={e => {
    if (e.target.value === 'propia') return;
    onChange(e.target.value === 'base' ? undefined : escalaPredefinida(e.target.value as ClaveEscalaPredefinida));
  }}>
    <option value="base">La de la metodología</option>{ESCALAS.map(([k, nombre]) => <option key={k} value={k}>{nombre}</option>)}
    {valor === 'propia' && <option value="propia">Escala propia (se conserva)</option>}
  </select></Field>;
}

const MUESTRA = 3;
export function VistaPreviaEvaluador({ value }: { value: ConfiguracionFlujo }) {
  const [respuestas, setRespuestas] = useState<Record<string, RespuestaCriterio>>({});
  const problemas = problemasMetodologia(value.metodologia);
  const criterios = value.metodologia.criterios.slice(0, MUESTRA);
  return <>
    {problemas.length ? <div role="alert" className="hf-error"><p>⚠ Antes de guardar o iniciar, corrige:</p><ul>{problemas.map(p => <li key={p}>{p}</li>)}</ul></div> : <p role="status">✓ La metodología está lista para usar.</p>}
    <p className="hf-ayuda">Así verá cada experto el formulario. Es solo una vista previa: lo que elijas aquí no se guarda.</p>
    {criterios.map(c => <fieldset key={c.id}><legend>{c.nombre || 'Criterio sin nombre'}</legend><p>{c.descripcion}</p><p className="hf-origin">{c.categoria}</p>
      <ValoracionEditor config={value} respuesta={respuestas[c.id] ?? respuestaVacia(c.id)} onChange={r => setRespuestas(prev => ({ ...prev, [c.id]: r }))} /></fieldset>)}
    <p role="status">{value.metodologia.criterios.length > MUESTRA ? `Mostrando ${MUESTRA} de ${value.metodologia.criterios.length} criterios.` : `${value.metodologia.criterios.length} criterios en total.`}</p>
  </>;
}
