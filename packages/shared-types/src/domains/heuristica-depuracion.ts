import type { MetodologiaFlujo } from './heuristica-flujo';

/**
 * Depuración del catálogo contra sus fuentes (F41, 2026-11-22; ver
 * docs/AUDITORIA_PREGUNTAS_HEURISTICAS.md). Solo quedan las preguntas
 * respaldadas por la fuente citada:
 * - `quitar`: posición (1 = primera) de las preguntas que no están en la fuente o
 *   que, ajustadas a la fuente, repetían a otra.
 * - `reescribir`: preguntas cuya idea sí está en la fuente pero agregaban
 *   detalles que no; se redactan dentro de lo que la fuente dice.
 * Los ids de las preguntas que quedan no cambian (`familia:posición`), así que
 * las evaluaciones guardadas siguen enlazando sus respuestas.
 */
interface Depuracion { quitar: number[]; reescribir: Record<number, string>; describir?: Record<number, string> }

export const DEPURACION_CATALOGO: Record<string, Depuracion> = {
  nielsen10: {
    quitar: [12, 16, 26, 32, 36, 40],
    reescribir: {
      1: '¿El sistema mantiene informada a la persona de lo que ocurre, con una respuesta en un tiempo razonable?',
      2: '¿La respuesta del sistema llega lo antes posible, idealmente de inmediato?',
      3: '¿La persona puede saber dónde se encuentra dentro del producto?',
      8: '¿Los nombres y conceptos del producto coinciden con los que conoce su público?',
      11: '¿Se puede abandonar una acción no deseada sin pasar por un proceso largo?',
      13: '¿Las situaciones y acciones equivalentes significan lo mismo en todo el producto?',
      17: '¿El diseño usa restricciones útiles para evitar errores?',
      18: '¿Se pide confirmación antes de ejecutar acciones de alto impacto?',
      20: '¿Los valores por defecto ayudan a evitar errores?',
      24: '¿Se reduce la cantidad de información que la persona debe recordar?',
      25: '¿Hay aceleradores, como atajos de teclado o gestos, para quien usa mucho el producto?',
      27: '¿Se puede personalizar o adaptar el producto?',
      34: '¿El mensaje indica con precisión cuál es el problema?',
    },
    describir: { 8: 'Comparar los términos del producto con los que usa su público.' },
  },
  shneiderman8: {
    quitar: [18],
    reescribir: {
      5: '¿La interfaz contempla la diversidad de discapacidades de las personas usuarias?',
      6: '¿La interfaz contempla la diversidad tecnológica de las personas usuarias?',
      9: '¿La respuesta muestra explícitamente los cambios en los objetos de interés?',
      12: '¿Al terminar un grupo de acciones, la interfaz prepara a la persona para el siguiente?',
      14: '¿Si la persona comete un error, recibe instrucciones simples, constructivas y específicas para recuperarse?',
      19: '¿La interfaz responde a las acciones de la persona y la mantiene al mando?',
      20: '¿El sistema evita sorpresas y cambios en el comportamiento que la persona ya conoce?',
      23: '¿Se tiene en cuenta la capacidad limitada de la memoria de corto plazo?',
      24: '¿Se evita pedir a la persona que recuerde o vuelva a escribir datos de una pantalla en otra?',
    },
  },
  tognazzini: {
    quitar: [2, 9, 14, 20, 26, 31, 32, 34, 37, 40],
    reescribir: {
      1: '¿Las decisiones estéticas evitan perjudicar el rendimiento de la persona?',
      6: '¿La autonomía de la persona convive con reglas y límites claros?',
      15: '¿Los controles necesarios son visiblemente accesibles en todo momento?',
      17: '¿Los gestos se explican con apoyos visuales?',
      18: '¿El producto hace el máximo de trabajo pidiendo el mínimo de información a la persona?',
      19: '¿Se evita que la persona tenga que esperar al sistema?',
      22: '¿Las acciones se pueden revertir con Deshacer?',
      24: '¿Los controles importantes están en zonas fáciles de alcanzar?',
      25: '¿Los controles de acciones no deseadas o peligrosas son pequeños y están alejados?',
      28: '¿Se informa a la persona durante las esperas largas?',
      29: '¿El trabajo puede seguir en segundo plano mientras se espera?',
      30: '¿Se reducen las esperas con precarga o procesamiento en segundo plano?',
      35: '¿El trabajo se guarda de forma continua?',
      36: '¿El trabajo queda protegido frente a errores y fallos de red?',
      38: '¿El contraste y el tamaño del texto permiten leerlo?',
      39: '¿Se evita fijar el texto en tamaños que no se puedan leer?',
      41: '¿Se equilibra la facilidad de empezar a usar el producto con la facilidad de uso diario?',
      44: '¿El sistema recuerda el historial y la posición de la sesión?',
      46: '¿La persona puede saber dónde está dentro del producto?',
    },
  },
  'hassan-montero-martin-fernandez': {
    quitar: [8, 12, 27, 28, 30, 33],
    reescribir: {
      1: '¿Muestra de forma precisa y completa qué contenidos o servicios ofrece realmente el sitio?',
      2: '¿Los contenidos y servicios que ofrece se corresponden con los objetivos del sitio?',
      3: '¿La estructura general del sitio está orientada a la persona usuaria?',
      4: '¿Se muestra claramente la identidad del sitio o de su responsable en todas las páginas?',
      5: '¿Se proporcionan mecanismos para ponerse en contacto con los responsables?',
      6: '¿Se ofrece información sobre el sitio y sobre quienes lo publican?',
      9: '¿Cada párrafo expresa una sola idea?',
      14: '¿Hay elementos de navegación que orientan sobre dónde se está y cómo deshacer la navegación?',
      15: '¿Se controla que no haya enlaces que no llevan a ningún sitio?',
      16: '¿Se aprovechan las zonas de alta jerarquía de la página para los contenidos más relevantes?',
      17: '¿La jerarquía visual expresa las relaciones del tipo «parte de» entre los elementos?',
      18: '¿Se hace un uso correcto del espacio visual de la página?',
      19: '¿La búsqueda es fácilmente accesible?',
      20: '¿Los resultados de búsqueda se muestran de forma comprensible?',
      22: '¿Las imágenes o animaciones aportan algún valor añadido?',
      23: '¿Las imágenes incluyen un texto alternativo que describe su contenido?',
      24: '¿La persona tiene libertad para actuar, por ejemplo para saltar animaciones?',
      26: '¿Si hay preguntas frecuentes, sus preguntas y respuestas están bien elegidas y redactadas?',
      32: '¿La persona tiene el control sobre la interfaz?',
    },
  },
  'hassan-checklist-2003': {
    quitar: [2, 18, 19, 20, 21, 27, 28, 33, 40, 48, 52, 53, 54, 56, 58, 61, 63, 64, 65, 70],
    reescribir: {
      1: 'El sitio muestra de forma precisa y completa qué contenidos o servicios ofrece.',
      3: 'Los contenidos y servicios se corresponden con los objetivos del sitio.',
      4: 'La estructura general del sitio está orientada a la persona usuaria.',
      6: 'El tiempo de respuesta del sitio está controlado.',
      9: 'Hay elementos de navegación que orientan sobre dónde se está y cómo deshacer la navegación.',
      10: 'Se proporcionan mecanismos para ponerse en contacto con los responsables.',
      12: 'El título de cada página es correcto y está planificado.',
      14: 'Se informa sobre la protección de los datos personales de quienes usan el sitio.',
      16: 'El lenguaje es claro y conciso.',
      24: 'Los rótulos son significativos.',
      32: 'En los menús se controla el número de elementos y de términos por elemento.',
      36: 'La respuesta del sistema es predecible antes de hacer clic en un enlace.',
      37: 'Las zonas de alta jerarquía de la página se usan para los contenidos más relevantes.',
      38: 'La jerarquía visual expresa las relaciones del tipo «parte de» entre los elementos.',
      41: 'La longitud de las páginas está controlada.',
      42: 'La persona tiene el control sobre la interfaz.',
      47: 'Los resultados de búsqueda se muestran de forma comprensible.',
      51: 'El peso de las páginas está controlado.',
      55: 'Se ofrece ayuda contextual en las tareas complejas.',
      57: 'Si hay preguntas frecuentes, sus preguntas y respuestas están bien elegidas y redactadas.',
      60: 'El tamaño de la letra está definido de forma relativa.',
      68: 'La persona tiene libertad para actuar.',
    },
  },
  wcag22: {
    quitar: [8, 10, 16, 22, 28, 30, 32, 36, 40, 42, 46],
    reescribir: {
      7: '¿El contenido puede presentarse con un ancho de 320 píxeles CSS sin perder información ni funciones y sin desplazamiento en dos dimensiones, salvo el que requiere disposición bidimensional?',
      9: '¿Todas las funciones se pueden operar con teclado, sin exigir tiempos específicos por pulsación, salvo las que dependen de la trayectoria del movimiento?',
      14: '¿La interfaz operable con teclado tiene un modo en que el indicador de foco es visible?',
      15: '¿Ningún componente con foco queda completamente oculto por contenido del propio sitio?',
      18: '¿Los objetivos que miden menos de 24 por 24 píxeles CSS cumplen alguna excepción (espaciado, control equivalente, objetivo en línea, tamaño del navegador o presentación esencial)?',
      21: '¿La autenticación evita exigir una prueba de función cognitiva, como recordar o transcribir, salvo que exista una alternativa, un mecanismo de ayuda, reconocimiento de objetos o contenido personal?',
      25: '¿Las funciones que requieren arrastrar pueden hacerse con un solo puntero sin arrastrar, salvo que el arrastre sea esencial?',
      29: '¿La información visual necesaria para identificar los componentes y sus estados tiene al menos 3 a 1 de contraste con los colores adyacentes?',
      35: '¿Se proporcionan etiquetas o instrucciones cuando el contenido pide datos a la persona?',
      37: '¿La información ya ingresada en el mismo proceso se completa sola o se puede seleccionar, salvo que sea esencial volver a ingresarla, la seguridad lo exija o ya no sea válida?',
      39: '¿Si los mecanismos de ayuda se repiten en varias páginas, aparecen en el mismo orden relativo?',
      41: '¿En los envíos con consecuencias legales, financieras o que modifican datos, el envío es reversible, los datos se verifican con opción de corregirlos o hay revisión y confirmación?',
      43: '¿Cada límite de tiempo se puede desactivar, ajustar o extender, salvo las excepciones aplicables?',
      44: '¿Al extender un límite de tiempo, se avisa a la persona y se le dan al menos 20 segundos para hacerlo?',
    },
    describir: { 41: 'Revisar pagos, compras y formularios que guardan o modifican datos.' },
  },
  coga2021: {
    quitar: [6, 15, 18],
    reescribir: {
      3: '¿Se usan elementos de diseño comunes que la persona ya conoce?',
      4: '¿Se puede encontrar el contenido rápida y fácilmente?',
      5: '¿La jerarquía del sitio es fácil de entender y de recorrer?',
      8: '¿Las imágenes son claras?',
      9: '¿Las metáforas y abreviaturas se explican y los conceptos numéricos tienen alternativas?',
      10: '¿Los formularios están diseñados para reducir la posibilidad de cometer errores?',
      13: '¿Se evitan las interrupciones y los cambios de contenido, y se pueden controlar los recordatorios?',
      14: '¿Los encabezados y las migas de pan ayudan a recuperar el contexto si la persona se distrae?',
      17: '¿La autenticación y otros procesos se pueden completar sin recordar ni transcribir datos?',
      20: '¿La ayuda está disponible desde cualquier punto donde la persona pueda quedarse atascada?',
      24: '¿Se respetan las preferencias del sistema operativo o del navegador?',
    },
  },
  amershi2019: {
    quitar: [2, 4, 6, 10, 12, 14, 16, 22, 26, 28, 30, 32, 34, 36],
    reescribir: {
      13: '¿Es fácil invocar o solicitar los servicios del sistema cuando se necesitan?',
      24: '¿La persona puede referirse de forma eficiente a lo que hizo o dijo hace poco?',
      27: '¿Se limitan los cambios disruptivos al actualizar o adaptar el sistema?',
      29: '¿La persona puede indicar sus preferencias con comentarios durante el uso normal?',
      31: '¿Se informa de inmediato cómo afectarán las acciones de la persona al comportamiento futuro del sistema?',
    },
  },
};

/**
 * Familias cuya fuente no se pudo leer para verificarlas (Bastien y Scapin: el
 * repositorio bloquea el acceso automático; Gerhardt-Powals y Bertini: artículos
 * de pago). Quedan fuera de la biblioteca para evaluaciones nuevas hasta
 * verificarlas con el texto original; las evaluaciones guardadas no cambian.
 */
export const FAMILIAS_SIN_VERIFICAR = ['bastien-scapin', 'gerhardt-powals', 'bertini2006'];

export function depurarMetodologia(m: MetodologiaFlujo): MetodologiaFlujo {
  const d = DEPURACION_CATALOGO[m.id];
  if (!d) return m;
  const quitar = new Set(d.quitar);
  const criterios = m.criterios.flatMap((c, i) => quitar.has(i + 1) ? [] : [{ ...c, ...(d.reescribir[i + 1] ? { nombre: d.reescribir[i + 1] } : {}), ...(d.describir?.[i + 1] ? { descripcion: d.describir[i + 1] } : {}) }]);
  const categorias = new Set(criterios.map(c => c.categoria));
  const enunciados = m.enunciados ? Object.fromEntries(Object.entries(m.enunciados).filter(([k]) => categorias.has(k))) : undefined;
  const version = `${m.version}; depurada contra la fuente 2026-11-22`;
  return { ...m, version, criterios: criterios.map(c => ({ ...c, origen: { ...c.origen, version } })), ...(enunciados ? { enunciados } : {}) };
}
