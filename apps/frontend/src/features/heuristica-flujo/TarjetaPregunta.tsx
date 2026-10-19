import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { escalaDe } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, CriterioFlujo, RespuestaCriterio } from '@observatorio-ux/shared-types';
import { ValoracionEditor } from './TrabajoEditor';

const ESPERA_AVANCE_MS = 600;
const MAX_ATAJOS = 5;

/** Una pregunta como tarjeta: atajos 1 a 5 y N, y avance automatico opcional. `children` va debajo de la valoracion. */
export function TarjetaPregunta({ config, criterio, numero, total, respuesta, editable, auto, onAuto, onChange, onAvanzar, children }: { config: ConfiguracionFlujo; criterio: CriterioFlujo; numero: number; total: number; respuesta: RespuestaCriterio; editable: boolean; auto: boolean; onAuto: (activo: boolean) => void; onChange: (r: RespuestaCriterio) => void; onAvanzar: () => void; children?: ReactNode }) {
  const niveles = escalaDe(config.metodologia, criterio).niveles;
  const atajos = Math.min(MAX_ATAJOS, niveles.length);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [aviso, setAviso] = useState('');
  useEffect(() => { clearTimeout(timer.current); setAviso(''); }, [criterio.id]);
  useEffect(() => () => clearTimeout(timer.current), []);
  function elegir(r: RespuestaCriterio) {
    onChange(r);
    if (r.valor === respuesta.valor && r.noAplica === respuesta.noAplica) return;
    clearTimeout(timer.current);
    const desfavorable = !r.noAplica && niveles.find(n => n.id === r.valor)?.favorable === false;
    if (!auto || numero >= total || desfavorable) { setAviso(''); return; }
    setAviso('Respuesta guardada. Pasando a la siguiente pregunta.');
    timer.current = setTimeout(onAvanzar, ESPERA_AVANCE_MS);
  }
  function tecla(e: KeyboardEvent<HTMLElement>) {
    if (!editable || e.ctrlKey || e.metaKey || e.altKey) return;
    if ((e.target as HTMLElement).matches('textarea, select, [contenteditable="true"], input:not([type=radio]):not([type=checkbox])')) return;
    const k = e.key.toLowerCase();
    if (k === 'n') { e.preventDefault(); elegir({ ...respuesta, noAplica: true, valor: null }); return; }
    const i = Number(k);
    if (Number.isInteger(i) && i >= 1 && i <= atajos) { e.preventDefault(); elegir({ ...respuesta, noAplica: false, valor: niveles[i - 1].id }); }
  }
  return <section className="hf-tarjeta" onKeyDown={tecla}>
    <fieldset className="hf-pregunta-actual" disabled={!editable}><legend>{criterio.nombre}</legend><p>{criterio.descripcion}</p>
      <ValoracionEditor config={config} respuesta={respuesta} onChange={elegir} />
      {editable && <div className="hf-atajos"><p className="hf-ayuda">Atajos: teclas 1 a {atajos} para responder y N para No aplica.</p>
        <label className="hf-auto"><input type="checkbox" checked={auto} onChange={e => { clearTimeout(timer.current); setAviso(''); onAuto(e.target.checked); }} />Pasar sola a la siguiente pregunta</label></div>}
      <p role="status" className="hf-aviso">{aviso}</p>
    </fieldset>
    {children}
  </section>;
}
