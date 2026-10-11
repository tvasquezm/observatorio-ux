import type { EscalaFlujo, MetodologiaFlujo } from './heuristica-flujo';

export const ESCALA_OPERATIVA_HEURISTICA: EscalaFlujo = {
  tipo: 'categorica', sentido: 'sin_orden', fuente: 'Escala operativa de la plataforma',
  niveles: [
    { id: 'cumple', etiqueta: 'Cumple', significado: 'La evidencia del alcance revisado satisface el criterio.' },
    { id: 'parcial', etiqueta: 'Parcial', significado: 'La evidencia satisface solo parte del criterio; describir la limitación.' },
    { id: 'no_cumple', etiqueta: 'No cumple', significado: 'La evidencia muestra incumplimiento; documentar el problema.' },
  ],
};

type Definicion = [nombre: string, descripcion: string, categoria?: string];
function metodologia(id: string, nombre: string, autor: string, fuente: string, version: string, ambito: string, definiciones: Definicion[], tipo = 'Heurísticas; paráfrasis operativa de la plataforma'): MetodologiaFlujo {
  return { id, nombre, autor, fuente, version, tipo, ambito, protegida: true,
    criterios: definiciones.map(([nombreCriterio, descripcion, categoria], i) => ({
      id: `${id}:${i + 1}`, nombre: nombreCriterio, descripcion, categoria: categoria ?? nombreCriterio, peso: 1,
      origen: { metodologiaId: id, autor, fuente, version, tipo },
    })), escala: JSON.parse(JSON.stringify(ESCALA_OPERATIVA_HEURISTICA)) as EscalaFlujo,
  };
}

/** Definiciones redactadas para esta plataforma. La valoración del criterio es independiente de la severidad del hallazgo. */
export const METODOLOGIAS_HEURISTICAS: MetodologiaFlujo[] = [
  metodologia('nielsen10', 'Nielsen: 10 heurísticas', 'Jakob Nielsen', 'https://www.nngroup.com/articles/ten-usability-heuristics/', '1994; revisión 2024-01-30; paráfrasis v1', 'Interfaces generales; diez principios, con definiciones resumidas.', [
    ['Estado visible', 'Comprobar que cada acción informa su progreso y resultado.'],
    ['Lenguaje del usuario', 'Usar conceptos cotidianos y un orden comprensible.'],
    ['Control y salida', 'Permitir cancelar, salir y deshacer acciones involuntarias.'],
    ['Consistencia', 'Mantener significados y convenciones entre pantallas.'],
    ['Prevención', 'Evitar entradas y acciones que causen errores.'],
    ['Reconocimiento', 'Mostrar opciones sin exigir recordar instrucciones previas.'],
    ['Eficiencia', 'Facilitar recorridos frecuentes para distintos niveles de experiencia.'],
    ['Contenido necesario', 'Eliminar elementos que compiten con la tarea.'],
    ['Recuperación', 'Explicar el error y cómo continuar sin pérdida.'],
    ['Ayuda', 'Ofrecer orientación localizable y pasos concretos.'],
  ]),
  metodologia('shneiderman8', 'Shneiderman: 8 reglas', 'Ben Shneiderman', 'https://www.cs.umd.edu/users/ben/goldenrules.html', 'Designing the User Interface, 6ª edición, 2016; paráfrasis v1', 'Interfaces generales; ocho reglas de la edición citada.', [
    ['Consistencia', 'Repetir convenciones para acciones y situaciones equivalentes.'],
    ['Usabilidad universal', 'Atender diversidad de capacidades, experiencia y tecnología.'],
    ['Retroalimentación', 'Mostrar respuestas proporcionales a cada acción.'],
    ['Cierre', 'Señalar inicio, avance y término de cada recorrido.'],
    ['Prevención de errores', 'Restringir acciones inválidas y permitir corrección localizada.'],
    ['Reversibilidad', 'Ofrecer recuperación de acciones individuales y grupos.'],
    ['Control del usuario', 'Permitir iniciar y dirigir acciones previsibles.'],
    ['Memoria inmediata', 'Mantener visible la información necesaria entre pasos.'],
  ]),
  metodologia('tognazzini', 'Tognazzini: primeros principios', 'Bruce Tognazzini', 'https://asktog.com/atc/principles-of-interaction-design/', 'Revised & Expanded, 2014-03-05; paráfrasis v1', 'Diecinueve categorías principales; síntesis de sus subprincipios, no transcripción completa.', [
    ['Estética', 'Comprobar utilidad tras cambios visuales.'],
    ['Anticipación', 'Reunir herramientas e información necesarias.'],
    ['Autonomía', 'Permitir decisiones con límites comprensibles.'],
    ['Color', 'Añadir señales distintas al color.'],
    ['Consistencia', 'Mantener comportamientos equivalentes reconocibles.'],
    ['Valores iniciales', 'Proponer valores útiles y modificables.'],
    ['Descubrimiento', 'Hacer visibles las acciones disponibles.'],
    ['Eficiencia humana', 'Reducir esfuerzo humano repetitivo.'],
    ['Exploración', 'Permitir explorar y revertir.'],
    ['Ley de Fitts', 'Facilitar alcanzar objetivos interactivos.'],
    ['Objetos de interfaz', 'Representar objetos mediante acciones coherentes.'],
    ['Latencia', 'Informar esperas y permitir continuar.'],
    ['Aprendizaje', 'Facilitar aprender mediante uso consistente.'],
    ['Metáforas', 'Utilizar analogías comprensibles y coherentes.'],
    ['Protección del trabajo', 'Preservar datos y facilitar recuperación.'],
    ['Lectura', 'Ofrecer texto legible y ajustable.'],
    ['Simplicidad', 'Reducir complejidad de tareas frecuentes.'],
    ['Estado persistente', 'Restaurar el contexto de trabajo.'],
    ['Interfaz visible', 'Mostrar alternativas y orientación.'],
  ]),
  metodologia('bastien-scapin', 'Bastien y Scapin: criterios ergonómicos', 'J. M. Christian Bastien y Dominique L. Scapin', 'https://inria.hal.science/inria-00070012v1', 'INRIA RT-0156, versión 2.1, mayo 1993; paráfrasis v1', 'Dieciocho criterios elementales de ocho grupos; síntesis operativa. Informe original disponible en el repositorio INRIA.', [
    ['Indicaciones', 'Explicar acciones y datos esperados.', 'Guía'],
    ['Agrupación espacial', 'Organizar elementos por proximidad.', 'Guía'],
    ['Agrupación visual', 'Distinguir conjuntos mediante presentación.', 'Guía'],
    ['Respuesta inmediata', 'Mostrar resultado de cada acción.', 'Guía'],
    ['Legibilidad', 'Permitir leer sin esfuerzo.', 'Guía'],
    ['Concisión', 'Reducir pasos y datos innecesarios.', 'Carga de trabajo'],
    ['Acciones mínimas', 'Evitar operaciones repetidas innecesarias.', 'Carga de trabajo'],
    ['Densidad informativa', 'Limitar información simultánea.', 'Carga de trabajo'],
    ['Acciones explícitas', 'Ejecutar operaciones solicitadas claramente.', 'Control explícito'],
    ['Control', 'Permitir detener operaciones.', 'Control explícito'],
    ['Flexibilidad', 'Admitir distintos recorridos equivalentes.', 'Adaptabilidad'],
    ['Experiencia', 'Atender principiantes y expertos.', 'Adaptabilidad'],
    ['Protección', 'Prevenir entradas y operaciones erróneas.', 'Errores'],
    ['Mensajes', 'Explicar causas y recuperación.', 'Errores'],
    ['Corrección', 'Corregir sin perder datos válidos.', 'Errores'],
    ['Homogeneidad', 'Mantener convenciones estables.'],
    ['Significado', 'Usar códigos y nombres comprensibles.'],
    ['Compatibilidad', 'Ajustar interacción a tareas reales.'],
  ]),
  metodologia('gerhardt-powals', 'Gerhardt-Powals: ingeniería cognitiva', 'Jill Gerhardt-Powals', 'https://www.tandfonline.com/doi/abs/10.1080/10447319609526147', 'International Journal of Human–Computer Interaction 8(2), 1996, pp.189–211; paráfrasis v1', 'Diez principios resumidos; referencia editorial verificada. El artículo completo puede requerir acceso del editor.', [
    ['Automatización', 'Evitar cálculos y trabajo mental repetitivo.'],
    ['Incertidumbre', 'Hacer explícitas opciones y consecuencias.'],
    ['Integración de datos', 'Reunir datos para interpretar relaciones.'],
    ['Interpretación', 'Explicar información nueva mediante referencias familiares.'],
    ['Nombres funcionales', 'Relacionar etiquetas con su función.'],
    ['Agrupación', 'Organizar datos con significado estable.'],
    ['Tareas guiadas por datos', 'Evitar búsqueda manual innecesaria.'],
    ['Información oportuna', 'Mostrar lo necesario para el momento.'],
    ['Codificación múltiple', 'Combinar señales perceptibles para representar datos.'],
    ['Redundancia útil', 'Repetir información cuando facilite interpretación consistente.'],
  ]),
  metodologia('hassan-montero-martin-fernandez', 'Hassan Montero y Martín Fernández: sitios web', 'Yusef Hassan Montero y Francisco J. Martín Fernández', 'https://www.nosolousabilidad.com/articulos/heuristica.htm', 'No Solo Usabilidad nº2, 2003-03-30; síntesis por dimensiones v1', 'Once dimensiones sintetizadas en criterios operativos; no reproduce todas las preguntas del checklist original.', [
    ['Generales', 'Relacionar propósito, contenido y estructura con las necesidades.'],
    ['Identidad e información', 'Identificar responsables y vías de contacto.'],
    ['Lenguaje y redacción', 'Usar texto comprensible, breve y organizado.'],
    ['Rotulado', 'Nombrar secciones y acciones de forma inequívoca.'],
    ['Estructura y navegación', 'Permitir orientarse, volver y completar recorridos.'],
    ['Distribución', 'Destacar información relevante mediante una jerarquía clara.'],
    ['Búsqueda', 'Permitir consultas y resultados interpretables.'],
    ['Multimedia', 'Usar medios pertinentes con alternativas y control.'],
    ['Ayuda', 'Ofrecer instrucciones localizables para resolver dificultades.'],
    ['Accesibilidad', 'Revisar lectura e interacción con distintas capacidades.'],
    ['Control y respuesta', 'Informar estados y permitir dirigir las acciones.'],
  ], 'Checklist web; síntesis complementaria de la plataforma'),
  metodologia('bertini2006', 'Bertini et al.: móvil', 'Enrico Bertini, Silvia Gabrielli y Stephen Kimani', 'https://doi.org/10.1145/1133265.1133291', 'AVI 2006, pp.119–126; paráfrasis v1', 'Ocho heurísticas móviles. Contenido contrastado también con el capítulo de coautores: https://www.alandix.com/academic/papers/mobile-chap-2008/mobilechapter-near-final-draft.pdf', [
    ['Estado y localización', 'Mostrar estado y facilitar localizar el dispositivo.'],
    ['Contexto real', 'Adaptar la información al entorno de uso.'],
    ['Consistencia y correspondencia', 'Mantener acciones comprensibles entre contextos.'],
    ['Ergonomía', 'Facilitar manipulación y reducir elementos superfluos.'],
    ['Entrada y lectura', 'Reducir escritura y permitir lectura breve.'],
    ['Eficiencia y personalización', 'Ajustar acciones frecuentes a preferencias.'],
    ['Privacidad y entorno social', 'Respetar expectativas de privacidad en público.'],
    ['Errores realistas', 'Prevenir, explicar y recuperar fallos móviles.'],
  ], 'Complemento móvil; paráfrasis operativa'),
  metodologia('wcag22', 'WCAG 2.2: selección complementaria', 'W3C, Accessibility Guidelines Working Group', 'https://www.w3.org/TR/2024/REC-WCAG22-20241212/', 'Recomendación 2024-12-12; selección operativa v1', 'Selección de doce criterios A/AA; revisión heurística complementaria. No cubre WCAG completa ni certifica conformidad. Consultar requisitos y excepciones en cada enlace.', [
    ['1.1.1 Alternativas', 'Revisar alternativas útiles para contenido no textual.'],
    ['1.3.1 Estructura', 'Comprobar relaciones disponibles para tecnología asistiva.'],
    ['1.4.3 Contraste', 'Verificar contraste textual según requisitos y excepciones.'],
    ['1.4.10 Reajuste', 'Revisar contenido al ampliar y reducir ancho.'],
    ['2.1.1 Teclado', 'Comprobar operaciones completas mediante teclado.'],
    ['2.1.2 Sin trampas', 'Permitir abandonar componentes mediante teclado.'],
    ['2.4.7 Foco visible', 'Identificar visualmente el elemento con foco.'],
    ['2.4.11 Foco no oculto', 'Comprobar foco no totalmente tapado por contenido.'],
    ['2.5.8 Tamaño del objetivo', 'Medir objetivos interactivos y revisar excepciones.'],
    ['3.3.1 Identificación de errores', 'Identificar campos erróneos mediante texto.'],
    ['3.3.8 Autenticación accesible', 'Revisar alternativas y ayudas para autenticarse.'],
    ['4.1.2 Nombre, función, valor', 'Comprobar semántica y estado de controles.'],
  ], 'Selección complementaria de criterios normativos; no certificación'),
  metodologia('coga2021', 'COGA 2021: objetivos cognitivos', 'W3C, Cognitive and Learning Disabilities Accessibility Task Force', 'https://www.w3.org/TR/2021/NOTE-coga-usable-20210429/', 'W3C Working Group Note, 2021-04-29; síntesis v1', 'Ocho objetivos de diseño sintetizados; documento informativo complementario, no norma ni evaluación completa de todos sus patrones.', [
    ['Comprensión de uso', 'Hacer comprensibles controles y finalidad de cada página.'],
    ['Localización', 'Facilitar encontrar contenido y recuperar orientación.'],
    ['Contenido claro', 'Usar expresiones y representaciones comprensibles.'],
    ['Prevención y corrección', 'Permitir corregir errores conservando datos.'],
    ['Concentración', 'Reducir distracciones y ayudar a retomar tareas.'],
    ['Memoria', 'Ofrecer alternativas a recordar información entre pasos.'],
    ['Apoyo', 'Proporcionar ayuda accesible durante la tarea.'],
    ['Adaptación', 'Permitir preferencias y herramientas de apoyo.'],
  ], 'Guía informativa complementaria; no norma'),
  metodologia('amershi2019', 'Amershi et al.: interacción con IA', 'Saleema Amershi, Dan Weld, Mihaela Vorvoreanu, Adam Fourney, Besmira Nushi, Penny Collisson, Jina Suh, Shamsi Iqbal, Paul N. Bennett, Kori Inkpen, Jaime Teevan, Ruth Kikin-Gil y Eric Horvitz', 'https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/', 'CHI 2019; DOI 10.1145/3290605.3300233; paráfrasis v1', 'Dieciocho directrices de interacción con IA; apoyo para revisión contextual y discusión de compromisos, no certificación.', [
    ['Capacidades', 'Explicar qué puede hacer la IA.'],
    ['Fiabilidad', 'Explicar límites y probabilidad de error.'],
    ['Momento', 'Ajustar intervenciones al contexto.'],
    ['Pertinencia', 'Presentar información adecuada a la tarea.'],
    ['Normas sociales', 'Respetar expectativas sociales del contexto.'],
    ['Sesgos', 'Evitar reforzar estereotipos injustos.'],
    ['Invocación', 'Facilitar pedir asistencia.'],
    ['Rechazo', 'Permitir ignorar asistencia innecesaria.'],
    ['Corrección', 'Permitir corregir resultados erróneos.'],
    ['Incertidumbre', 'Aclarar dudas o reducir intervención.'],
    ['Explicación', 'Permitir entender las acciones del sistema.'],
    ['Memoria reciente', 'Conservar contexto reciente útil.'],
    ['Aprendizaje', 'Adaptar comportamiento mediante uso.'],
    ['Adaptación prudente', 'Evitar cambios disruptivos inesperados.'],
    ['Comentarios específicos', 'Permitir indicar preferencias concretas.'],
    ['Consecuencias', 'Explicar efectos futuros de las acciones.'],
    ['Control global', 'Permitir configurar comportamiento y observación.'],
    ['Cambios', 'Informar nuevas capacidades y actualizaciones.'],
  ], 'Complemento de interacción humano–IA; paráfrasis operativa'),
];

function congelar(valor: object): void {
  Object.values(valor).forEach(v => { if (v && typeof v === 'object') congelar(v); });
  Object.freeze(valor);
}
congelar(ESCALA_OPERATIVA_HEURISTICA);
congelar(METODOLOGIAS_HEURISTICAS);

export function copiarMetodologia(original: MetodologiaFlujo, id = `${original.id}-copia`, nombre = `${original.nombre} (copia)`): MetodologiaFlujo {
  const copia = JSON.parse(JSON.stringify(original)) as MetodologiaFlujo;
  return { ...copia, id, nombre, protegida: false };
}

export function combinarMetodologias(originales: MetodologiaFlujo[], id = 'combinada', nombre = 'Metodología combinada'): MetodologiaFlujo {
  if (!originales.length) throw new Error('Selecciona al menos una metodología.');
  const copias = originales.map(m => copiarMetodologia(m));
  const usados = new Set<string>();
  const criterios = copias.flatMap((m, indice) => m.criterios.map(c => {
    const base = `${originales[indice].id}:${c.id}`;
    let criterioId = base, sufijo = 2;
    while (usados.has(criterioId)) criterioId = `${base}:${sufijo++}`;
    usados.add(criterioId);
    return { ...c, id: criterioId };
  }));
  const mismaEscala = originales.every(m => JSON.stringify(m.escala) === JSON.stringify(originales[0].escala));
  return {
    id, nombre, criterios, protegida: false,
    autor: [...new Set(originales.map(m => m.autor))].join('; '),
    fuente: [...new Set(originales.map(m => m.fuente))].join('\n'),
    version: 'Combinación operativa v1; versiones originales en cada criterio', tipo: 'Combinación personalizada',
    ambito: originales.map(m => `${m.nombre}: ${m.ambito}`).join('\n') + (mismaEscala ? '' : '\nEscalas distintas: se aplica la escala categórica operativa de la plataforma; revisar antes de iniciar.'),
    escala: mismaEscala ? copias[0].escala : JSON.parse(JSON.stringify(ESCALA_OPERATIVA_HEURISTICA)) as EscalaFlujo,
  };
}
