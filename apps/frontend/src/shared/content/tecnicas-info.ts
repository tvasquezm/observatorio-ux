export type TecnicaId = 'personas' | 'journey-map' | 'momentos-criticos' | 'card-sorting' | 'evaluacion-heuristica';
export interface TecnicaInfo {
  nombre: string;
  descripcionCorta: string;
  ayudaGraficos: Record<string, string>;
}

export const TECNICAS_INFO: Record<TecnicaId, TecnicaInfo> = {
  personas: {
    nombre: 'Personas',
    descripcionCorta: 'Describe perfiles de usuarios, sus necesidades y su contexto para orientar las decisiones de diseño.',
    ayudaGraficos: {},
  },
  'journey-map': {
    nombre: 'Journey Map',
    descripcionCorta: 'Ordena el recorrido de una persona para reconocer emociones, dificultades y oportunidades en cada etapa.',
    ayudaGraficos: { curva: 'Lee las etapas de izquierda a derecha. La curva resume la emoción registrada en cada una; contrástala con las dificultades y la evidencia.' },
  },
  'momentos-criticos': {
    nombre: 'Momentos críticos',
    descripcionCorta: 'Registra incidentes positivos y negativos para priorizar mejoras según su impacto y frecuencia.',
    ayudaGraficos: { matriz: 'Cada celda cruza impacto y frecuencia. Lee también el tipo y la descripción del incidente: una experiencia positiva puede ser algo que conviene mantener.' },
  },
  'card-sorting': {
    nombre: 'Card Sorting',
    descripcionCorta: 'Pide a las personas que agrupen tarjetas para entender cómo organizan los contenidos.',
    ayudaGraficos: {
      cards: 'Cada barra muestra cómo se distribuyó una tarjeta entre categorías. Compara los porcentajes y el umbral de consenso elegido.',
      categories: 'Compara las tarjetas ubicadas en cada categoría y sus porcentajes. Un acuerdo bajo invita a revisar la tarjeta o la categoría.',
      results: 'Cada celda cuenta cuántas personas ubicaron una tarjeta en una categoría. Lee la fila completa para comparar alternativas.',
      popular: 'Cada celda muestra un porcentaje de participantes. Compara el número y su categoría; el color solo acompaña el valor.',
      similarity: 'Cada cruce compara dos tarjetas. Un porcentaje alto indica que se agruparon juntas con mayor frecuencia.',
      dendrogram: 'Sigue las uniones de tarjetas y grupos. Las uniones más cercanas muestran tarjetas agrupadas juntas con mayor frecuencia.',
      participants: 'Cada fila corresponde a una clasificación anónima. Revisa sus grupos para entender diferencias que el promedio puede ocultar.',
      answers: 'Lee las respuestas por pregunta y busca temas compartidos. Una respuesta individual no representa a toda la muestra.',
    },
  },
  'evaluacion-heuristica': {
    nombre: 'Evaluación heurística',
    descripcionCorta: 'Revisa un producto con criterios acordados y reúne problemas, aciertos y evidencia del equipo.',
    ayudaGraficos: {
      matriz: 'Cada fila es un criterio. Compara las respuestas y su evidencia; «No aplica» queda fuera de problemas y aciertos.',
      cumplimiento: 'Compara las respuestas favorables y desfavorables según la escala elegida. Los criterios sin evaluar o no aplicables quedan fuera del porcentaje.',
    },
  },
};
