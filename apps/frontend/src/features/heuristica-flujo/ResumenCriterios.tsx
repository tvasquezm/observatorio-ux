import { clasificarCriterios, resumirCumplimiento } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, ConsensoFlujo } from '@observatorio-ux/shared-types';

export function ResumenCriterios({ configuracion, consenso }: { configuracion: ConfiguracionFlujo; consenso: ConsensoFlujo }) {
  const clases = clasificarCriterios(configuracion, consenso);
  const total = resumirCumplimiento(configuracion, consenso)?.total;
  return <section className="panel" aria-label="Problemas y aciertos por criterio">
    {(['desfavorable', 'favorable'] as const).map(clase => {
      const criterios = configuracion.metodologia.criterios.filter(c => clases.some(r => r.criterioId === c.id && r.clase === clase));
      const titulo = clase === 'desfavorable' ? 'Problemas' : 'Aciertos';
      return <section key={clase} aria-label={titulo}><h2><span aria-hidden="true">{clase === 'desfavorable' ? '!' : '✓'}</span> {titulo} ({criterios.length})</h2>
        {criterios.length ? <ul>{criterios.map(c => <li key={c.id}>{c.nombre}</li>)}</ul> : <p>Sin criterios en este grupo.</p>}
      </section>;
    })}
    <p>{clases.filter(c => c.clase === 'no_aplica').length} no aplican.</p>
    <p>Los criterios neutros y sin evaluar quedan fuera de ambos grupos.</p>
    {!total && <p>Esta escala no clasifica respuestas como favorables o desfavorables.</p>}
  </section>;
}
