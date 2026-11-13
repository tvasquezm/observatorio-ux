export type TecnicaId = 'personas' | 'journey-map' | 'momentos-criticos' | 'card-sorting' | 'evaluacion-heuristica';
export interface TecnicaInfo {
  nombre: string;
  descripcionCorta: string;
  explicacionCompleta: { titulo: string; secciones: Array<{ encabezado: string; parrafos?: string[]; pasos?: string[] }> };
  ayudaGraficos: Record<string, string>;
}

export const TECNICAS_INFO: Record<TecnicaId, TecnicaInfo> = {
  personas: {
    nombre: 'Personas',
    descripcionCorta: 'Describe perfiles de usuarios, sus necesidades y su contexto para orientar las decisiones de diseño.',
    explicacionCompleta: { titulo: 'Cómo trabajar con Personas', secciones: [
      { encabezado: 'Qué es', parrafos: ['Una persona es un perfil que reúne características y necesidades de un grupo de usuarios. Se construye con evidencia; no representa a todas las personas.'] },
      { encabezado: 'Cuándo usarla', parrafos: ['Úsala para acordar para quién diseña el equipo y qué necesidades conviene atender. Revisa el perfil cuando encuentres nueva evidencia.'] },
      { encabezado: 'Cómo se hace paso a paso', pasos: ['Reúne entrevistas, observaciones u otras fuentes.', 'Registra identidad, objetivos, necesidades y dificultades del perfil.', 'Anota el contexto de uso y las fuentes que respaldan lo escrito.', 'Guarda el perfil y revísalo con el equipo. Distingue datos observados de hipótesis.'] },
      { encabezado: 'Cómo leer los resultados', parrafos: ['Lee los objetivos junto con las barreras y el contexto. Usa esos datos para justificar decisiones concretas; evita decidir solo por edad u ocupación.', 'El estado de validación describe la revisión del perfil. No convierte una hipótesis en un hecho.'] },
    ] },
    ayudaGraficos: {},
  },
  'journey-map': {
    nombre: 'Journey Map',
    descripcionCorta: 'Ordena el recorrido de una persona para reconocer emociones, dificultades y oportunidades en cada etapa.',
    explicacionCompleta: { titulo: 'Cómo trabajar con Journey Map', secciones: [
      { encabezado: 'Qué es', parrafos: ['Es un mapa del recorrido de una persona al intentar alcanzar un objetivo. Relaciona etapas, acciones, puntos de contacto y emociones.'] },
      { encabezado: 'Cuándo usarla', parrafos: ['Úsala para entender una experiencia completa y encontrar dónde se interrumpe o se vuelve difícil. Define un objetivo y un contexto específicos.'] },
      { encabezado: 'Cómo se hace paso a paso', pasos: ['Define la persona, su rol y el objetivo del recorrido.', 'Ordena las etapas desde el inicio hasta el resultado.', 'Registra acciones, puntos de contacto, pensamientos y emociones por etapa.', 'Anota dificultades, oportunidades y la evidencia disponible. Guarda el mapa.'] },
      { encabezado: 'Cómo leer los resultados', parrafos: ['Compara las etapas y localiza emociones negativas junto con sus dificultades. Revisa qué evidencia explica cada cambio antes de proponer mejoras.', 'La curva resume emociones registradas; no es una medición estadística de satisfacción.'] },
    ] },
    ayudaGraficos: { curva: 'Lee las etapas de izquierda a derecha. La curva resume la emoción registrada en cada una; contrástala con las dificultades y la evidencia.' },
  },
  'momentos-criticos': {
    nombre: 'Momentos críticos',
    descripcionCorta: 'Registra incidentes positivos y negativos para priorizar mejoras según su impacto y frecuencia.',
    explicacionCompleta: { titulo: 'Cómo trabajar con Momentos críticos', secciones: [
      { encabezado: 'Qué es', parrafos: ['Reúne situaciones que ayudaron o dificultaron una experiencia. Cada incidente describe lo que ocurrió, su causa y las acciones sugeridas.'] },
      { encabezado: 'Cuándo usarla', parrafos: ['Úsala cuando necesites comparar situaciones concretas y decidir cuáles requieren atención primero. Incluye también experiencias positivas que conviene conservar.'] },
      { encabezado: 'Cómo se hace paso a paso', pasos: ['Define el perfil de usuario y su rol.', 'Describe cada incidente y distingue si fue positivo o negativo.', 'Registra causa, impacto, frecuencia y una acción sugerida.', 'Guarda los incidentes y compáralos en la matriz.'] },
      { encabezado: 'Cómo leer los resultados', parrafos: ['Cruza impacto y frecuencia para comparar incidentes. Revisa su descripción y causa antes de acordar una prioridad.', 'La clasificación refleja los valores que registró el equipo; verifica su respaldo en observaciones.'] },
    ] },
    ayudaGraficos: { matriz: 'Cada celda cruza impacto y frecuencia. Lee también el tipo y la descripción del incidente: una experiencia positiva puede ser algo que conviene mantener.' },
  },
  'card-sorting': {
    nombre: 'Card Sorting',
    descripcionCorta: 'Pide a las personas que agrupen tarjetas para entender cómo organizan los contenidos.',
    explicacionCompleta: { titulo: 'Cómo trabajar con Card Sorting', secciones: [
      { encabezado: 'Qué es', parrafos: ['Cada participante agrupa tarjetas con contenidos. Sus clasificaciones ayudan a proponer categorías y una organización comprensible.'] },
      { encabezado: 'Cuándo usarla', parrafos: ['Úsala al organizar contenidos o revisar categorías. En abierto las personas crean categorías; en cerrado usan las definidas; en híbrido pueden añadir propias.'] },
      { encabezado: 'Cómo se hace paso a paso', pasos: ['Nombra el card sorting y elige su tipo.', 'Carga tarjetas claras; en cerrado o híbrido define las categorías iniciales.', 'Comparte el enlace de participación. Cada persona realiza su clasificación.', 'Revisa las respuestas completadas, compara agrupaciones y exporta los resultados necesarios.'] },
      { encabezado: 'Cómo leer los resultados', parrafos: ['Compara distribuciones, matrices y similitud. El umbral elegido distingue agrupaciones con mayor acuerdo dentro de la muestra.', 'Revisa cuántas personas participaron. Un resultado de una muestra pequeña necesita más evidencia antes de orientar una decisión general.'] },
    ] },
    ayudaGraficos: {
      cards: 'Cada barra muestra cómo se distribuyó una tarjeta entre categorías. Compara los porcentajes y el umbral de consenso elegido.',
      categories: 'Compara las tarjetas ubicadas en cada categoría y sus porcentajes. Un acuerdo bajo invita a revisar la tarjeta o la categoría.',
      results: 'Cada celda cuenta cuántas personas ubicaron una tarjeta en una categoría. Lee la fila completa para comparar alternativas.',
      popular: 'Cada celda muestra un porcentaje de participantes. Compara el número y su categoría; el color solo acompaña el valor.',
      similarity: 'Cada cruce compara dos tarjetas. Un porcentaje alto indica que se agruparon juntas con mayor frecuencia.',
      dendrogram: 'Sigue las uniones de tarjetas y grupos. Las uniones con mayor similitud sugieren asociaciones más frecuentes dentro de esta muestra.',
      participants: 'Cada fila corresponde a una clasificación anónima. Revisa sus grupos para entender diferencias que el promedio puede ocultar.',
      answers: 'Lee las respuestas por pregunta y busca temas compartidos. Una respuesta individual no representa a toda la muestra.',
    },
  },
  'evaluacion-heuristica': {
    nombre: 'Evaluación heurística',
    descripcionCorta: 'Revisa un producto con criterios acordados y reúne problemas, aciertos y evidencia del equipo.',
    explicacionCompleta: { titulo: 'Cómo trabajar con Evaluación heurística', secciones: [
      { encabezado: 'Qué es', parrafos: ['El equipo revisa un producto usando una metodología y una escala de respuesta. Registra valoraciones y evidencia para discutir qué mejorar.'] },
      { encabezado: 'Cuándo usarla', parrafos: ['Úsala para revisar criterios de diseño de forma ordenada. Complementa esta revisión con observaciones de usuarios: ambas aportan evidencia diferente.'] },
      { encabezado: 'Cómo se hace paso a paso', pasos: ['Define producto, metodología, escala y personas que revisarán.', 'Cada evaluador responde los criterios y registra problemas o evidencia.', 'El equipo revisa diferencias y acuerda las respuestas del consenso.', 'Confirma el acuerdo y revisa el informe antes de descargarlo.'] },
      { encabezado: 'Cómo leer los resultados', parrafos: ['Distingue respuestas favorables, desfavorables y no aplicables según la escala elegida. Un criterio no aplicable no es un problema ni un acierto.', 'Lee cada problema junto con evidencia, severidad y recomendación. El porcentaje resume las respuestas evaluables, no toda la calidad del producto.'] },
    ] },
    ayudaGraficos: {
      matriz: 'Cada fila es un criterio. Compara las respuestas y su evidencia; «No aplica» queda fuera de problemas y aciertos.',
      cumplimiento: 'Compara las respuestas favorables y desfavorables según la escala elegida. Los criterios sin evaluar o no aplicables quedan fuera del porcentaje.',
    },
  },
};
