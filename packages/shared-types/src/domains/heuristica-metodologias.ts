import type { CriterioFlujo, EscalaFlujo, MetodologiaFlujo, OrigenCriterio } from './heuristica-flujo';

export const ESCALA_OPERATIVA_HEURISTICA: EscalaFlujo = {
  tipo: 'categorica', sentido: 'sin_orden', fuente: 'Escala operativa de la plataforma',
  niveles: [
    { id: 'cumple', etiqueta: 'Cumple', significado: 'La evidencia del alcance revisado satisface el criterio.' },
    { id: 'parcial', etiqueta: 'Parcial', significado: 'La evidencia satisface solo parte del criterio; describir la limitación.' },
    { id: 'no_cumple', etiqueta: 'No cumple', significado: 'La evidencia muestra incumplimiento; documentar el problema.' },
  ],
};

type Definicion = [nombre: string, descripcion: string, categoria?: string];
function metodologia(id: string, nombre: string, autor: string, fuente: string, version: string, ambito: string, definiciones: Definicion[], tipo = 'Heurísticas; paráfrasis operativa de la plataforma', escala?: EscalaFlujo): MetodologiaFlujo {
  return { id, nombre, autor, fuente, version, tipo, ambito, protegida: true,
    criterios: definiciones.map(([nombreCriterio, descripcion, categoria], i) => ({
      id: `${id}:${i + 1}`, nombre: nombreCriterio, descripcion, categoria: categoria ?? nombreCriterio, peso: 1,
      origen: { metodologiaId: id, autor, fuente, version, tipo },
    })), escala: escala ?? JSON.parse(JSON.stringify(ESCALA_OPERATIVA_HEURISTICA)) as EscalaFlujo,
  };
}

/** Definiciones redactadas para esta plataforma. La valoración del criterio es independiente de la severidad del hallazgo. */
const CATALOGO_BASE: MetodologiaFlujo[] = [
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

export function copiarMetodologia(original: MetodologiaFlujo, id = `${original.id}-copia`, nombre = `${original.nombre} (copia)`): MetodologiaFlujo {
  const copia = JSON.parse(JSON.stringify(original)) as MetodologiaFlujo;
  return { ...copia, id, nombre, protegida: false };
}

export function combinarMetodologias(originales: MetodologiaFlujo[], id = 'combinada', nombre = 'Metodología combinada'): MetodologiaFlujo {
  if (!originales.length) throw new Error('Selecciona al menos una metodología.');
  const copias = originales.map(m => copiarMetodologia(m));
  const base = copias[0].escala;
  const usados = new Set<string>();
  // Cada criterio conserva su escala efectiva; solo se guarda `escala` propia cuando difiere de la base.
  const criterios: CriterioFlujo[] = copias.flatMap((m, indice) => m.criterios.map((c): CriterioFlujo => {
    const baseId = `${originales[indice].id}:${c.id}`;
    let criterioId = baseId, sufijo = 2;
    while (usados.has(criterioId)) criterioId = `${baseId}:${sufijo++}`;
    usados.add(criterioId);
    const { escala: propia, ...resto } = c;
    const efectiva = propia ?? m.escala;
    return JSON.stringify(efectiva) === JSON.stringify(base) ? { ...resto, id: criterioId } : { ...resto, id: criterioId, escala: efectiva };
  }));
  const mismaEscala = criterios.every(c => !c.escala);
  return {
    id, nombre, criterios, protegida: false,
    autor: [...new Set(originales.map(m => m.autor))].join('; '),
    fuente: [...new Set(originales.map(m => m.fuente))].join('\n'),
    version: 'Combinación operativa v1; versiones originales en cada criterio', tipo: 'Combinación personalizada',
    ambito: originales.map(m => `${m.nombre}: ${m.ambito}`).join('\n') + (mismaEscala ? '' : '\nEscalas distintas: cada criterio conserva la escala de su metodología de origen.'),
    escala: base,
  };
}

export type ClaveEscalaPredefinida = 'si_no' | 'likert_1_5' | 'nielsen_0_4';
const nivelEscala = (id: string, etiqueta: string, significado: string, valor?: number) => ({ id, etiqueta, significado, ...(valor === undefined ? {} : { valor }) });
const ESCALAS_PREDEFINIDAS: Record<ClaveEscalaPredefinida, () => EscalaFlujo> = {
  si_no: () => ({
    tipo: 'categorica', sentido: 'sin_orden', fuente: 'Escala Sí/No de la plataforma',
    niveles: [{ ...nivelEscala('si', 'Sí', 'El producto cumple lo que pide este ítem.'), favorable: true }, { ...nivelEscala('no', 'No', 'El producto no cumple lo que pide este ítem.'), favorable: false }],
  }),
  likert_1_5: () => ({
    tipo: 'numerica', sentido: 'mayor_mejor', formula: 'media_ponderada', fuente: 'Escala de cumplimiento 1 a 5 de la plataforma',
    niveles: [
      nivelEscala('v1', '1 · No cumple', 'El criterio no se cumple en absoluto.', 1), nivelEscala('v2', '2 · Cumple poco', 'Se cumple en una parte menor del alcance revisado.', 2),
      nivelEscala('v3', '3 · Cumple a medias', 'Se cumple en parte; hay carencias claras.', 3), nivelEscala('v4', '4 · Cumple casi todo', 'Se cumple, con carencias menores.', 4),
      nivelEscala('v5', '5 · Cumple totalmente', 'Se cumple en todo el alcance revisado.', 5),
    ],
  }),
  nielsen_0_4: () => ({
    tipo: 'numerica', sentido: 'menor_mejor', fuente: 'Escala de severidad 0 a 4 de Nielsen; redacción propia de la plataforma',
    niveles: [
      nivelEscala('n0', '0 · Sin problema', 'No se observa ningún problema de usabilidad en este criterio.', 0), nivelEscala('n1', '1 · Cosmético', 'Problema de apariencia; corregir solo si sobra tiempo.', 1),
      nivelEscala('n2', '2 · Menor', 'Molesta, pero la persona logra completar su tarea.', 2), nivelEscala('n3', '3 · Mayor', 'Dificulta la tarea; conviene corregirlo con prioridad.', 3),
      nivelEscala('n4', '4 · Catastrófico', 'Impide completar la tarea o causa pérdidas; corregir antes de publicar.', 4),
    ],
  }),
};
/** Escala lista para usar; cada llamada devuelve una copia nueva y editable. */
export function escalaPredefinida(clave: ClaveEscalaPredefinida): EscalaFlujo { return ESCALAS_PREDEFINIDAS[clave](); }

/** Checklist Sí/No: ítems redactados por la plataforma sobre las once dimensiones del artículo; no reproduce el texto original. */
const ITEMS_CHECKLIST_HASSAN: Array<[categoria: string, items: string[]]> = [
  ['Generales', [
    'El propósito del sitio se entiende desde la página de inicio.',
    'Se distingue con claridad a quién está dirigido el sitio.',
    'El contenido responde a lo que la audiencia viene a buscar.',
    'La estructura general refleja cómo la audiencia agrupa la información.',
    'El diseño visual es coherente en todo el sitio.',
    'Las páginas cargan en un tiempo razonable con una conexión habitual.',
    'El sitio se ve y funciona de forma similar en los navegadores y dispositivos previstos.',
  ]],
  ['Identidad e información', [
    'Se identifica quién edita el sitio (nombre, logotipo o marca) en todas las páginas.',
    'El logotipo lleva a la página de inicio.',
    'Hay una forma visible de contactar a los responsables.',
    'Se explica qué es el sitio y qué ofrece sin necesidad de salir de él.',
    'Cada página indica con claridad su título o tema.',
    'Los contenidos indican cuándo se publicaron o actualizaron, cuando eso importa.',
    'Se informan las condiciones de uso y de privacidad cuando se piden datos personales.',
  ]],
  ['Lenguaje y redacción', [
    'El texto usa el vocabulario de la audiencia, sin jerga innecesaria.',
    'Las frases son breves y directas.',
    'Cada párrafo desarrolla una sola idea.',
    'La información más importante aparece al comienzo del texto.',
    'Los textos largos se dividen con títulos, listas o párrafos cortos.',
    'El tono es coherente en todas las secciones.',
    'No hay errores ortográficos ni gramaticales evidentes.',
  ]],
  ['Rotulado', [
    'Los títulos de página describen su contenido real.',
    'Las etiquetas del menú permiten anticipar a dónde llevan.',
    'Los enlaces se entienden fuera de su contexto, sin depender de textos como "aquí" o "más".',
    'Los botones nombran la acción que ejecutan.',
    'Un mismo concepto se llama igual en todo el sitio.',
  ]],
  ['Estructura y navegación', [
    'El menú principal es visible y está en el mismo lugar en todas las páginas.',
    'Desde cualquier página se puede volver a la página de inicio.',
    'La persona puede saber en qué parte del sitio está.',
    'Se distinguen los enlaces ya visitados.',
    'Los enlaces se reconocen como tales.',
    'Los niveles del menú son pocos y no obligan a navegar más de lo necesario.',
    'Las tareas frecuentes se completan en pocos pasos.',
    'No hay enlaces rotos ni páginas sin salida.',
    'Los sitios con varios niveles ofrecen una ruta de migas u otra pista de ubicación.',
    'Los enlaces externos se distinguen de los internos o avisan que abren otro sitio.',
  ]],
  ['Distribución de la información', [
    'La jerarquía visual destaca lo más importante de cada página.',
    'Los elementos relacionados se ven agrupados.',
    'Hay espacio en blanco suficiente para separar los bloques.',
    'La página no obliga a desplazarse en horizontal.',
    'El contenido principal se ve sin desplazarse demasiado.',
    'Las ventanas emergentes y los anuncios no tapan ni distraen del contenido.',
    'La longitud de línea del texto permite leer con comodidad.',
    'El diseño se adapta al tamaño de pantalla en que se usa.',
  ]],
  ['Búsqueda', [
    'Hay un buscador accesible cuando el sitio tiene mucho contenido.',
    'El campo de búsqueda se reconoce y es lo bastante amplio.',
    'Los resultados se presentan ordenados y con contexto suficiente.',
    'La búsqueda tolera errores de escritura u ofrece alternativas.',
    'Si no hay resultados, se explica y se sugieren otras opciones.',
  ]],
  ['Multimedia', [
    'Las imágenes aportan información o apoyan el contenido.',
    'El tamaño de las imágenes equilibra calidad y tiempo de carga.',
    'Los videos y audios se pueden pausar, detener y ajustar en volumen.',
    'No se reproduce sonido ni video automáticamente sin aviso.',
    'Los medios cuentan con alternativa de texto, subtítulos o transcripción.',
  ]],
  ['Ayuda', [
    'Hay ayuda o instrucciones localizables desde donde se necesitan.',
    'La ayuda está redactada en torno a las tareas de la persona.',
    'Hay preguntas frecuentes o algo equivalente para las dudas habituales.',
    'Se indica cómo recibir ayuda personal cuando la ayuda escrita no basta.',
  ]],
  ['Accesibilidad', [
    'El texto tiene contraste suficiente con el fondo.',
    'El texto se puede ampliar sin romper la página.',
    'La información no depende solo del color.',
    'Las imágenes informativas tienen texto alternativo.',
    'Todo se puede usar con teclado y el foco se ve.',
    'Cada campo de formulario está asociado a su etiqueta.',
    'La estructura de títulos permite navegar con lector de pantalla.',
  ]],
  ['Control y retroalimentación', [
    'Cada acción recibe una respuesta visible.',
    'Los procesos largos informan su progreso.',
    'Se puede cancelar o volver atrás sin perder lo hecho.',
    'Los errores se explican con lenguaje claro y dicen cómo corregirlos.',
    'Se pide confirmación antes de las acciones irreversibles.',
    'La persona decide cuándo se abren ventanas nuevas o cambia el contenido.',
  ]],
];
const HASSAN_CHECKLIST: MetodologiaFlujo = metodologia(
  'hassan-checklist-2003', 'Hassan y Martín: checklist web (adaptación)', 'Yusef Hassan Montero y Francisco J. Martín Fernández',
  'https://www.nosolousabilidad.com/articulos/heuristica.htm', 'No Solo Usabilidad nº2, 2003-03-30; adaptación propia v1',
  'Lista de comprobación Sí/No para sitios web. Ítems redactados por la plataforma sobre las once dimensiones del artículo; no reproducen el texto original.',
  ITEMS_CHECKLIST_HASSAN.flatMap(([categoria, items]) => items.map((item): Definicion => [item, '', categoria])),
  'Checklist web; adaptación propia de la plataforma', escalaPredefinida('si_no'),
);

/** Rúbrica del curso Experiencia de Usuario (UTEM): 22 preguntas con nota de 1 a 5, agrupadas en seis conceptos. Las tres preguntas abiertas de Experiencia no son criterios. */
const ITEMS_RUBRICA_UTEM: Array<[categoria: string, items: string[]]> = [
  ['Identidad', [
    'Identidad o logotipo significativo, identificable y suficientemente visible.',
    'Identidad del sitio en todas las páginas',
    'Existen mecanismos de contacto',
    '¿El diseño corresponde al tipo de audiencia a la que está dirigido?',
  ]],
  ['Contenido', [
    '¿Le parecen adecuados los contenidos destacados en la portada/home?',
    '¿Al ver la portada/home del sitio, pudo distinguir de una sola mirada cuál era el contenido más relevante? ¿Cómo logró distinguirlo?',
    '¿Los textos de los enlaces son suficientemente descriptivos de lo que se ofrece en las páginas hacia las cuales te dirigen?',
    '¿Los rótulos son claros?',
  ]],
  ['Diseño', [
    '¿El diseño es consistente en todas las pantallas del sitio - APP?',
    '¿Las páginas tienen scroll adecuado?',
    '¿Le pareció pertinente el uso de las imágenes?',
    '¿Considera que gráficamente el sitio está equilibrado?',
  ]],
  ['Navegación', [
    '¿Es predecible la respuesta del sistema antes de hacer clic sobre el enlace?',
    '¿El menú es consistente en todo el recorrido del sistema?',
    'En menú de navegación, ¿Se ha controlado el número de elementos y de términos por elemento para no producir sobrecarga memorística?',
    '¿Existen elementos que le permitan saber exactamente en qué lugar se encuentra? (ej. breadcrumbs, página actual)',
  ]],
  ['Accesibilidad', [
    '¿El tipo de fuente, efectos tipográficos, ancho de línea y alineación empleados facilitan la lectura?',
    '¿Existe un alto contraste entre el color de fuente y el fondo?',
    '¿El tamaño de letras es adecuado?',
  ]],
  ['Utilidad', [
    '¿Le quedó claro cuál es el objetivo del sitio web - APP?',
    '¿Los contenidos y servicios que ofrece se corresponden con esos objetivos?',
    '¿Cree que los contenidos que se ofrecen son de utilidad?',
  ]],
];
const ESCALA_RUBRICA_UTEM: EscalaFlujo = {
  tipo: 'numerica', sentido: 'mayor_mejor', formula: 'media_ponderada', fuente: 'Rúbrica UTEM, Evaluación heurística (nota de 1 a 5)',
  niveles: [
    nivelEscala('n1', '1 · Muy malo o no funciona', 'Característica no observada.', 1),
    nivelEscala('n2', '2 · Funciona pobremente', 'Se muestra, pero no aporta a la experiencia general del sitio.', 2),
    nivelEscala('n3', '3 · Funciona medianamente', 'Se muestra relativamente, pero podría ser mejor.', 3),
    nivelEscala('n4', '4 · Cumple', 'Se observa correctamente, pero se pueden incorporar mejoras al respecto.', 4),
    nivelEscala('n5', '5 · Es lo que el usuario busca', 'Se muestra de una manera tan correcta que cumple o excede la expectativa del usuario.', 5),
  ],
};
const RUBRICA_UTEM: MetodologiaFlujo = metodologia(
  'rubrica-utem-eval-heuristica', 'Rúbrica UTEM: evaluación heurística', 'UTEM, Experiencia de Usuario (prof. Ronald Méndez Sánchez)',
  'https://www.utem.cl/', 'Documento del curso «Evaluación heurística»; texto de las preguntas tal como figura en la rúbrica; v1',
  'Rúbrica de 22 preguntas con nota de 1 a 5 sobre identidad, contenido, diseño, navegación, accesibilidad y utilidad de un sitio web o app. Material del curso: la URL apunta a la institución, no al documento.',
  ITEMS_RUBRICA_UTEM.flatMap(([categoria, items]) => items.map((item): Definicion => [item, '', categoria])),
  'Rúbrica de curso; texto original', ESCALA_RUBRICA_UTEM,
);

/** Catálogo protegido y congelado. El checklist va junto a la síntesis de Hassan y Martín. */
export const METODOLOGIAS_HEURISTICAS: MetodologiaFlujo[] = [...CATALOGO_BASE.flatMap(m => m.id === 'hassan-montero-martin-fernandez' ? [m, HASSAN_CHECKLIST] : [m]), RUBRICA_UTEM];
congelar(METODOLOGIAS_HEURISTICAS);
export function claveEscalaPredefinida(escala: EscalaFlujo): ClaveEscalaPredefinida | null {
  // `favorable` no cambia la identidad de la escala: los métodos guardados antes de B1 siguen reconociéndose.
  const sinFavorable = (e: EscalaFlujo) => JSON.stringify({ ...e, niveles: e.niveles.map(n => { const copia = { ...n }; delete copia.favorable; return copia; }) });
  const texto = sinFavorable(escala);
  return (Object.keys(ESCALAS_PREDEFINIDAS) as ClaveEscalaPredefinida[]).find(k => sinFavorable(ESCALAS_PREDEFINIDAS[k]()) === texto) ?? null;
}

/** Metodología propia sin criterios; usa la escala operativa hasta que se elija otra. */
export function metodologiaVacia(autor: string, id: string, nombre = 'Mi metodología'): MetodologiaFlujo {
  return { id, nombre, autor, fuente: `Definición propia de ${autor}`, version: '1', tipo: 'personalizado', ambito: '', criterios: [], escala: JSON.parse(JSON.stringify(ESCALA_OPERATIVA_HEURISTICA)) as EscalaFlujo, protegida: false };
}

export const MAX_CRITERIOS_METODOLOGIA = 500;
const MAX_NOMBRE_CRITERIO = 300;
const MAX_CATEGORIA = 60;
/**
 * Una línea = un criterio. Formato opcional `Categoría: criterio`. Ignora viñetas y numeración al inicio.
 * `existentes` evita duplicados y respeta el tope de criterios de la metodología.
 */
export function parsearListaCriterios(texto: string, origen: OrigenCriterio, nuevoId: () => string, existentes: Pick<CriterioFlujo, 'nombre' | 'categoria'>[] = []): { criterios: CriterioFlujo[]; avisos: string[] } {
  const criterios: CriterioFlujo[] = [];
  const avisos: string[] = [];
  const clave = (categoria: string, nombre: string) => `${categoria.trim().toLocaleLowerCase()}|${nombre.trim().toLocaleLowerCase()}`;
  const vistos = new Set(existentes.map(c => clave(c.categoria, c.nombre)));
  const lineas = texto.split(/\r?\n/);
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i].trim().replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, '').trim();
    if (!linea) continue;
    if (existentes.length + criterios.length >= MAX_CRITERIOS_METODOLOGIA) { avisos.push(`Se llegó al máximo de ${MAX_CRITERIOS_METODOLOGIA} criterios; las líneas desde la ${i + 1} no se agregaron.`); break; }
    const corte = linea.indexOf(':');
    const conCategoria = corte > 0 && corte <= MAX_CATEGORIA && !!linea.slice(corte + 1).trim();
    const categoria = conCategoria ? linea.slice(0, corte).trim() : 'Personalizado';
    const nombre = conCategoria ? linea.slice(corte + 1).trim() : linea;
    if (nombre.length > MAX_NOMBRE_CRITERIO) { avisos.push(`La línea ${i + 1} es demasiado larga (máximo ${MAX_NOMBRE_CRITERIO} caracteres) y no se agregó.`); continue; }
    if (vistos.has(clave(categoria, nombre))) { avisos.push(`La línea ${i + 1} repite un criterio y no se agregó: ${nombre}`); continue; }
    vistos.add(clave(categoria, nombre));
    criterios.push({ id: nuevoId(), nombre, descripcion: '', categoria, peso: 1, origen: { ...origen } });
  }
  return { criterios, avisos };
}

/** Problemas que impedirían guardar la metodología, en lenguaje simple. Vacío = lista para usar. */
export function problemasMetodologia(m: MetodologiaFlujo): string[] {
  const problemas: string[] = [];
  const escala = (e: EscalaFlujo, nombre: string) => {
    if (!e.niveles.length) problemas.push(`Agrega al menos un nivel a ${nombre}.`);
    if (!e.fuente.trim()) problemas.push(`Indica la fuente o definición de ${nombre}.`);
    e.niveles.forEach((n, i) => {
      if (!n.etiqueta.trim() || !n.significado.trim()) problemas.push(`El nivel ${i + 1} de ${nombre} necesita etiqueta y significado.`);
      if (e.tipo === 'numerica' && (n.valor === undefined || !Number.isFinite(n.valor))) problemas.push(`El nivel ${i + 1} de ${nombre} necesita un valor numérico.`);
    });
    if (e.formula && e.sentido === 'sin_orden') problemas.push(`Para calcular la media, ${nombre} necesita un sentido favorable (mayor o menor es mejor).`);
  };
  if (!m.nombre.trim()) problemas.push('Ponle un nombre a la metodología.');
  if (!m.criterios.length) problemas.push('Agrega al menos un criterio.');
  m.criterios.forEach((c, i) => {
    if (!c.nombre.trim()) problemas.push(`El criterio ${i + 1} no tiene nombre.`);
    if (!c.categoria.trim()) problemas.push(`El criterio ${i + 1} no tiene categoría.`);
    if (!(c.peso > 0)) problemas.push(`El peso del criterio ${i + 1} debe ser mayor que cero.`);
    if (c.escala) escala(c.escala, `la escala del criterio ${i + 1}`);
  });
  escala(m.escala, 'la escala');
  return problemas;
}
