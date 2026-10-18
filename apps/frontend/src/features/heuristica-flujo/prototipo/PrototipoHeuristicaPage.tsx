import { useRef, useState } from 'react';
import { copiarMetodologia, escalaDe, METODOLOGIAS_HEURISTICAS } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, HallazgoFlujo, RespuestaCriterio } from '@observatorio-ux/shared-types';
import { Icon } from '../../../shared/components/ui/Icon';
import { Field } from '../campos';
import { criterioRespondido, faltantesParaIniciar, hallazgoVacio, pendientesTrabajo, respuestaVacia } from '../flujo-utils';
import { HallazgoEditor } from '../TrabajoEditor';
import { ConfiguracionEditor } from '../ConfiguracionEditor';
import './prototipo-heuristica.css';

const EQUIPO = [{ id: 'profesor', nombre: 'Profesor coordinador', detalle: 'Tú' }, { id: 'camila', nombre: 'Camila Rojas', detalle: 'Experta de ejemplo' }, { id: 'diego', nombre: 'Diego Soto', detalle: 'Experto de ejemplo' }];


function configuracionInicial(): ConfiguracionFlujo {
  const metodologia = copiarMetodologia(METODOLOGIAS_HEURISTICAS[0]);
  return { nombre: 'Evaluación del portal UTEM', producto: { clave: 'portal-utem', nombre: 'Portal UTEM', version: '1.0', url: 'https://www.utem.cl', dispositivo: 'Escritorio' }, objetivo: 'Revisar la navegación y la claridad de los formularios.', tareas: 'Encontrar información y completar un formulario.', pantallas: 'Inicio, navegación y formulario.', exclusiones: '', metodologia, evaluadorIds: ['profesor'], lectorIds: [] };
}

export function PrototipoHeuristicaPage() {
  const [config, setConfig] = useState(configuracionInicial);
  const [view, setView] = useState<'config' | 'summary' | 'work'>('config');
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [criterionId, setCriterionId] = useState('');
  const [answers, setAnswers] = useState<RespuestaCriterio[]>([]);
  const [findings, setFindings] = useState<HallazgoFlujo[]>([]);
  const [finding, setFinding] = useState<HallazgoFlujo | null>(null);
  const [error, setError] = useState('');
  const [evidenceName, setEvidenceName] = useState('');
  const [evidenceNames, setEvidenceNames] = useState<Record<string, string>>({});
  const dialog = useRef<HTMLDialogElement>(null);
  const addFindingButton = useRef<HTMLButtonElement>(null);
  const criteria = config.metodologia.criterios;
  const index = Math.max(0, criteria.findIndex(c => c.id === criterionId));
  const criterion = criteria[index];
  const answer = answers.find(a => a.criterioId === criterion?.id) ?? respuestaVacia(criterion?.id ?? '');
  const completed = criteria.filter(c => criterioRespondido(config, c, answers.find(a => a.criterioId === c.id))).length;
  const ownFindings = findings.filter(f => f.criterioIds.includes(criterion?.id));
  const selectedTeam = EQUIPO.filter(p => config.evaluadorIds.includes(p.id));

  function updateAnswer(value: RespuestaCriterio) { setAnswers(previous => [...previous.filter(a => a.criterioId !== value.criterioId), value]); setError(''); }
  function navigate(next: typeof view) { setView(next); setError(''); }
  function start() {
    const missing = faltantesParaIniciar(config);
    if (!criteria.length) missing.push('al menos un criterio');
    if (!selectedTeam.length) missing.push('al menos un experto');
    if (missing.length) { setError(`Completa: ${missing.join(', ')}.`); return; }
    setStarted(true); navigate(config.evaluadorIds.includes('profesor') ? 'work' : 'summary');
  }
  function openFinding(value?: HallazgoFlujo) {

    setFinding(value ? { ...value } : hallazgoVacio(criterion.id));
    setEvidenceName(value ? evidenceNames[value.id] ?? '' : '');
    dialog.current?.showModal();
  }
  function closeFinding() { dialog.current?.close(); setError(''); addFindingButton.current?.focus(); }
  function saveFinding() {
    if (!finding) return;
    const errors = pendientesTrabajo({ ...config, metodologia: { ...config.metodologia, criterios: [] } }, [], [finding]);
    if (errors.length) { setError(errors[0]); return; }
    setFindings(previous => [...previous.filter(f => f.id !== finding.id), finding]);
    setEvidenceNames(previous => ({ ...previous, [finding.id]: evidenceName }));
    closeFinding(); setError('');
  }
  function deliver() {
    const missing = pendientesTrabajo(config, answers, findings);
    if (missing.length) { setError(`Antes de entregar: ${missing[0]}`); return; }
    setSubmitted(true); navigate('summary');
  }

  const niveles = criterion ? escalaDe(config.metodologia, criterion).niveles : [];
  const noAplica = answers.filter(r => r.noAplica && r.valor === null).length;
  const irAPregunta = (id: string) => { setCriterionId(id); setError(''); };

  return <div className="hp-page">

    <div className="hp-container">
      <div className="hp-context"><span>Proyecto de ejemplo / Evaluación heurística</span><span>Prototipo local</span></div>
      <section className="hp-panel" aria-label={view === 'config' ? 'Configuración de la evaluación' : view === 'work' ? 'Evaluación por criterio' : 'Resumen del profesor'}>
        <header className="hp-header">
          <div className="hp-heading"><span className="hp-heading-icon"><Icon name="heuristica" /></span><div><h1>{view === 'config' ? 'Evaluación heurística' : view === 'work' ? 'Mi evaluación' : 'Resumen de la evaluación'}</h1><p>{view === 'config' ? 'Prepara tu revisión en un solo lugar.' : `${config.producto.nombre} · ${config.metodologia.nombre}`}</p></div></div>
          <span className="hp-state">{submitted ? 'Trabajo entregado' : started ? 'En evaluación' : 'Configuración'}</span>
        </header>
        {started && <nav className="hp-view-nav" aria-label="Vistas de la evaluación">
          {config.evaluadorIds.includes('profesor') && <button type="button" aria-current={view === 'work' ? 'page' : undefined} onClick={() => navigate('work')}>Mi revisión</button>}
          <button type="button" aria-label={view === 'work' ? 'Volver al resumen' : undefined} aria-current={view === 'summary' ? 'page' : undefined} onClick={() => navigate('summary')}>Resumen del equipo</button>
        </nav>}

        {view === 'config' && <>
          <div className="hp-setup">
            <div className="hp-setup-form hf"><h2>¿Qué vas a revisar?</h2><p className="hp-muted">Solo necesitas el producto y una metodología.</p>
              <ConfiguracionEditor value={config} onChange={setConfig} biblioteca={METODOLOGIAS_HEURISTICAS} equipo={EQUIPO.map(p => ({ ...p, rol: 'Evaluador' }))} />
            </div>
            <aside className="hp-preview" aria-label="Vista previa de la revisión"><span className="hp-section-label">Así se responde</span><h2>Una pregunta a la vez</h2><p className="hp-muted">Elige una respuesta. Si la pregunta no corresponde, marca «No aplica».</p>
              <div className="hp-preview-question"><span>Pregunta de ejemplo</span><h3>{criteria[0]?.nombre}</h3><div className="hp-preview-options">{config.metodologia.escala.niveles.map(n => <span key={n.id}>{n.etiqueta}</span>)}<span>No aplica</span></div></div>
              <p className="hp-preview-note"><Icon name="check" />{criteria.length} preguntas listas para revisar</p>
            </aside>
          </div>
          {error && <p className="hp-error" role="alert">{error}</p>}
          <footer className="hp-footer"><p className="hp-muted">Los demás datos son opcionales.</p><button type="button" className="primary" onClick={start}>Comenzar revisión</button></footer>
        </>}

        {view === 'work' && criterion && <>
          <div className="hp-review-layout">
            <aside className="hp-review-aside">
              <div className="hp-progress-heading"><strong>{completed}<span> / {criteria.length}</span></strong><span>respondidas</span></div>
              <progress max={criteria.length} value={completed} aria-label="Avance de mi evaluación" />
              <p className="hp-sr-status" role="status">{completed} de {criteria.length} preguntas respondidas</p>
              <details className="hp-map" open={criteria.length <= 12}><summary>Ir a una pregunta</summary>
                <nav className="hp-question-map" aria-label="Preguntas de la revisión">{criteria.map((c, i) => {
                  const r = answers.find(a => a.criterioId === c.id);
                  const lista = criterioRespondido(config, c, r);
                  return <button type="button" key={c.id} aria-label={`Pregunta ${i + 1}: ${c.nombre}${lista ? r?.noAplica ? ', no aplica' : ', respondida' : ', pendiente'}`} aria-current={c.id === criterion.id ? 'true' : undefined} data-done={lista || undefined} onClick={() => irAPregunta(c.id)}>{i + 1}{lista && <span aria-hidden="true">{r?.noAplica ? '−' : '✓'}</span>}</button>;
                })}</nav>
              </details>
              <p className="hp-map-key">✓ Respondida <span>− No aplica</span></p>
              <dl className="hp-mini-counts"><div><dt>No aplican</dt><dd>{noAplica}</dd></div><div><dt>Problemas registrados</dt><dd>{findings.length}</dd></div></dl>
            </aside>
            <div className="hp-question-content">
              <p className="hp-section-label">Pregunta {index + 1} de {criteria.length}</p><h2>{criterion.nombre}</h2><p className="hp-question-description">{criterion.descripcion}</p>
              <fieldset className="hp-answer" disabled={submitted}><legend>Elige una respuesta</legend><div className="hp-answer-options">
                {niveles.map(n => <label className="hp-answer-option" key={n.id}><input type="radio" name="hp-respuesta" aria-label={n.etiqueta} aria-describedby={`hp-nivel-${n.id}`} checked={!answer.noAplica && answer.valor === n.id} onChange={() => updateAnswer({ ...answer, noAplica: false, valor: n.id })} /><span><strong>{n.etiqueta}</strong><small id={`hp-nivel-${n.id}`}>{n.significado}</small></span></label>)}
                <label className="hp-answer-option hp-option-na"><input type="radio" name="hp-respuesta" aria-label="No aplica" checked={answer.noAplica} onChange={() => updateAnswer({ ...answer, noAplica: true, valor: null })} /><span><strong>No aplica</strong><small>Esta pregunta no corresponde al producto.</small></span></label>
              </div></fieldset>
              <div className="hp-question-extras"><details><summary>Agregar una nota (opcional)</summary><Field label="Nota de la pregunta"><textarea disabled={submitted} value={answer.notas} onChange={e => updateAnswer({ ...answer, notas: e.target.value })} /></Field>{answer.motivo && <p className="hp-muted">Nota anterior: {answer.motivo}</p>}</details>
                <div className="hp-problem-action">{!submitted && <button ref={addFindingButton} type="button" className="secondary" onClick={() => openFinding()}>+ Registrar problema</button>}{ownFindings.length > 0 && <details><summary>Problemas de esta pregunta ({ownFindings.length})</summary>{ownFindings.map(f => <div className="hp-finding-row" key={f.id}><strong>{f.titulo}</strong><button type="button" className="hp-text-button" onClick={() => openFinding(f)}>{submitted ? 'Ver detalle' : 'Editar problema'}</button></div>)}</details>}</div>
              </div>
            </div>
          </div>
          {error && <p role="alert" className="hp-error">{error}</p>}
          <footer className="hp-footer"><p className="hp-feedback" role="status">{submitted ? 'Revisión entregada. Puedes consultar tus respuestas.' : 'Las respuestas se conservan mientras esta página esté abierta.'}</p><div className="hp-actions"><button type="button" className="secondary" disabled={index === 0} aria-label="Anterior criterio" onClick={() => irAPregunta(criteria[index - 1].id)}>← Anterior</button>{index < criteria.length - 1 ? <button type="button" className="primary" aria-label="Siguiente criterio" onClick={() => irAPregunta(criteria[index + 1].id)}>Siguiente →</button> : !submitted && <button type="button" className="primary" onClick={deliver}>Entregar mi evaluación</button>}</div></footer>
        </>}

        {view === 'summary' && <>
          <div className="hp-summary-layout">
            <section className="hp-own-summary" aria-label="Tu revisión"><span className="hp-section-label">Tu revisión</span><h2>{submitted ? 'Tu revisión ya está entregada.' : config.evaluadorIds.includes('profesor') ? 'Continúa donde quedaste' : 'Tu equipo está revisando'}</h2>
              <div className="hp-summary-number">{completed}<span>de {criteria.length} preguntas</span></div><progress max={criteria.length} value={completed} aria-label="Preguntas respondidas por ti" />
              <dl className="hp-mini-counts"><div><dt>No aplican</dt><dd>{noAplica}</dd></div><div><dt>Problemas registrados</dt><dd>{findings.length}</dd></div></dl>
            </section>
            <section className="hp-team-summary"><div className="hp-section-head"><h2>Progreso del equipo</h2><span className="hp-muted">{submitted ? 1 : 0}/{selectedTeam.length} entregas</span></div>
              {selectedTeam.map(person => { const own = person.id === 'profesor'; const done = own ? completed : 0; return <div className="hp-team-row" key={person.id}><span className="hp-avatar" aria-hidden="true">{person.nombre.split(' ').map(word => word[0]).slice(0, 2).join('')}</span><div className="hp-person"><strong>{person.nombre}{own && <span className="hp-you">Tú</span>}</strong><small>{own && submitted ? 'Entregado' : done ? 'En revisión' : 'Sin comenzar'}</small><progress max={criteria.length || 1} value={done} aria-label={`Avance de ${person.nombre}`} /></div><span className="hp-team-count">{done}/{criteria.length}</span></div>; })}
              <p className="hp-privacy"><Icon name="info" />Los trabajos individuales son privados. Aquí solo ves el avance de las otras personas.</p>
            </section>
          </div>
          <details className="hp-scope"><summary>Ver configuración de la evaluación</summary><dl className="hp-scope-grid"><div><dt>Producto</dt><dd>{config.producto.nombre}</dd></div><div><dt>Metodología</dt><dd>{config.metodologia.nombre}</dd></div><div><dt>Objetivo</dt><dd>{config.objetivo || 'Sin especificar'}</dd></div><div><dt>Pantallas</dt><dd>{config.pantallas || 'Sin especificar'}</dd></div></dl></details>
          <footer className="hp-footer"><p className="hp-feedback" role="status">{submitted ? 'Tu entrega está registrada en esta demostración.' : 'El avance del equipo se reúne aquí.'}</p>{config.evaluadorIds.includes('profesor') && <button type="button" className="primary" onClick={() => navigate('work')}>{submitted ? 'Ver mi evaluación' : 'Continuar mi evaluación'}</button>}</footer>
        </>}
      </section>
      <p className="hp-demo-note"><Icon name="info" />Demostración con datos de ejemplo. No modifica proyectos reales.</p>
    </div>
    <dialog className="hp-finding-dialog" ref={dialog} aria-labelledby="hp-finding-title" onCancel={() => setError('')}>
      <div className="hp-dialog-head"><div><p className="hp-eyebrow">HALLAZGO DEL CRITERIO</p><h2 id="hp-finding-title">{submitted ? 'Detalle del hallazgo' : 'Registrar hallazgo'}</h2></div><button type="button" className="hp-icon-button" aria-label="Cerrar hallazgo" onClick={closeFinding}><Icon name="close" /></button></div>
      {finding && <>
        <fieldset className="hp-dialog-fields" disabled={submitted}><legend className="sr-only">Datos del hallazgo</legend><HallazgoEditor value={finding} config={config} onChange={setFinding} />
          {!submitted && <Field label="Captura de ejemplo (opcional)"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setEvidenceName(e.target.files?.[0]?.name ?? '')} /></Field>}
        </fieldset>
        {evidenceName && <p className="hp-muted">Seleccionada: {evidenceName}. Se muestra el nombre; no se sube el archivo.</p>}
        {error && <p className="hp-error" role="alert">{error}</p>}
        <div className="hp-actions"><button type="button" className="secondary" onClick={closeFinding}>{submitted ? 'Cerrar detalle' : 'Cancelar'}</button>{!submitted && <button type="button" className="primary" onClick={saveFinding}>Guardar hallazgo</button>}</div>
      </>}
    </dialog>
  </div>;
}
