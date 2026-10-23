import type { CriterioFlujo, EscalaFlujo, MetodologiaFlujo, OrigenCriterio } from './heuristica-flujo';

export const ESCALA_OPERATIVA_HEURISTICA: EscalaFlujo = {
  tipo: 'categorica', sentido: 'sin_orden', fuente: 'Escala operativa de la plataforma',
  niveles: [
    { id: 'cumple', etiqueta: 'Cumple', significado: 'La evidencia del alcance revisado satisface el criterio.', favorable: true },
    { id: 'parcial', etiqueta: 'Parcial', significado: 'La evidencia satisface solo parte del criterio; describir la limitación.' },
    { id: 'no_cumple', etiqueta: 'No cumple', significado: 'La evidencia muestra incumplimiento; documentar el problema.', favorable: false },
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

/** Agrega el enunciado de cada ítem (clave = `categoria`). El catálogo se redacta una metodología a la vez. */
function conEnunciados(m: MetodologiaFlujo, enunciados: Record<string, string>): MetodologiaFlujo {
  return { ...m, enunciados };
}

/** Definiciones redactadas para esta plataforma. La valoración del criterio es independiente de la severidad del hallazgo. */
const CATALOGO_BASE: MetodologiaFlujo[] = [
  conEnunciados(metodologia('nielsen10', 'Nielsen: 10 heurísticas', 'Jakob Nielsen', 'https://www.nngroup.com/articles/ten-usability-heuristics/', '1994; revisión 2024-01-30; paráfrasis v2', 'Interfaces generales; diez principios, con definiciones resumidas.', [
    ['¿Cada acción recibe una respuesta visible que confirma que fue registrada?', 'Revisar clics, envíos y cambios inmediatos después de actuar.', 'Estado visible'],
    ['¿Las esperas muestran progreso o alguna señal de que el sistema está trabajando?', 'Revisar cargas, envíos y procesos largos.', 'Estado visible'],
    ['¿La persona puede saber en qué punto del recorrido está y qué falta para terminar?', 'Revisar indicadores de paso, ubicación y avance en recorridos de varios pasos.', 'Estado visible'],
    ['¿El resultado de una operación se comunica de forma clara al terminar?', 'Revisar mensajes de éxito, cambios en listas y estados resultantes.', 'Estado visible'],
    ['¿Los textos usan palabras que el público objetivo entiende sin explicación?', 'Buscar jerga técnica, siglas y nombres internos en etiquetas y mensajes.', 'Lenguaje del usuario'],
    ['¿Los íconos e imágenes se relacionan con lo que representan en la vida real?', 'Comprobar si el significado del ícono se entiende sin leer su texto.', 'Lenguaje del usuario'],
    ['¿La información aparece en un orden natural para la tarea?', 'Comparar la secuencia de campos, pasos y secciones con cómo la persona piensa la tarea.', 'Lenguaje del usuario'],
    ['¿Hay una salida clara en cada pantalla o diálogo (cancelar, cerrar o volver)?', 'Revisar pantallas intermedias, ventanas modales y flujos de varios pasos.', 'Control y salida'],
    ['¿Se pueden deshacer o rehacer las acciones hechas por error?', 'Probar con ediciones, movimientos y cambios de estado.', 'Control y salida'],
    ['¿Las acciones destructivas permiten reconsiderar antes o después de ejecutarlas?', 'Revisar confirmaciones, papelera o deshacer al eliminar.', 'Control y salida'],
    ['¿Al volver atrás o cancelar se conservan los datos ya ingresados?', 'Probar el botón atrás y la cancelación en formularios a medio llenar.', 'Control y salida'],
    ['¿Las mismas acciones tienen el mismo nombre, ubicación y aspecto en todo el producto?', 'Comparar botones, menús y vínculos entre pantallas.', 'Consistencia'],
    ['¿Se respetan las convenciones de la plataforma para los controles comunes?', 'Comparar con las prácticas habituales de web, iOS o Android según el producto.', 'Consistencia'],
    ['¿Un mismo término significa siempre lo mismo?', 'Buscar palabras distintas para el mismo concepto, o la misma palabra con sentidos distintos.', 'Consistencia'],
    ['¿Los elementos con aspecto parecido responden de forma parecida?', 'Revisar controles que se ven iguales y comprobar que actúan igual.', 'Consistencia'],
    ['¿Los formularios guían o restringen la entrada (formatos, rangos, opciones listadas)?', 'Revisar campos con formato esperado, fechas, números y selecciones.', 'Prevención'],
    ['¿Las acciones de alto impacto piden confirmación e indican sus consecuencias?', 'Revisar eliminaciones, pagos y envíos definitivos.', 'Prevención'],
    ['¿Se avisa de las condiciones propensas a error antes de que ocurran?', 'Revisar campos obligatorios, límites, duplicados y datos incompatibles.', 'Prevención'],
    ['¿Los valores iniciales y las sugerencias reducen la posibilidad de equivocarse?', 'Revisar valores por defecto, autocompletado y ejemplos.', 'Prevención'],
    ['¿Las opciones disponibles se ven sin tener que recordarlas de una pantalla anterior?', 'Revisar menús, acciones y comandos en cada paso.', 'Reconocimiento'],
    ['¿La información necesaria para decidir sigue visible en el paso en que se usa?', 'Revisar pasos que dependen de datos mostrados antes.', 'Reconocimiento'],
    ['¿Las instrucciones de uso aparecen donde se necesitan?', 'Revisar etiquetas, textos de apoyo y ejemplos junto a los campos.', 'Reconocimiento'],
    ['¿Se ofrecen apoyos como historial, sugerencias o autocompletado?', 'Revisar búsquedas, filtros y campos repetitivos.', 'Reconocimiento'],
    ['¿Existen atajos para las tareas frecuentes (teclado, accesos rápidos, acciones masivas)?', 'Revisar si quien usa mucho el producto puede acelerar su trabajo.', 'Eficiencia'],
    ['¿Los recorridos más frecuentes se completan en pocos pasos?', 'Contar pasos y toques en las tareas principales.', 'Eficiencia'],
    ['¿Se pueden personalizar o recordar preferencias y contenido de uso frecuente?', 'Revisar favoritos, preferencias guardadas y contenido reciente.', 'Eficiencia'],
    ['¿Los atajos y aceleradores evitan estorbar a quien usa el producto por primera vez?', 'Comprobar que el camino básico sigue siendo claro sin conocer los atajos.', 'Eficiencia'],
    ['¿Cada elemento visible contribuye a la tarea o al propósito de la pantalla?', 'Identificar elementos que podrían quitarse sin afectar la tarea.', 'Contenido necesario'],
    ['¿Lo más importante destaca por encima de lo secundario?', 'Revisar jerarquía de tamaño, color y posición.', 'Contenido necesario'],
    ['¿Hay textos, adornos o avisos que compitan con la acción principal?', 'Revisar elementos que distraigan del camino principal.', 'Contenido necesario'],
    ['¿La información de uso poco frecuente está disponible pero fuera del camino principal?', 'Revisar detalles ocultos, plegados o en secciones secundarias.', 'Contenido necesario'],
    ['¿Los mensajes de error usan lenguaje claro, sin códigos ni términos técnicos?', 'Provocar errores y leer cada mensaje como lo haría una persona sin conocimientos técnicos.', 'Recuperación'],
    ['¿El mensaje indica qué falló y en qué lugar?', 'Revisar si el error se señala junto al campo o elemento que lo causa.', 'Recuperación'],
    ['¿Propone una acción concreta para corregirlo?', 'Comprobar que el mensaje diga qué hacer, no solo qué salió mal.', 'Recuperación'],
    ['¿Al corregir el error se conserva lo ya ingresado?', 'Revisar si hay que repetir datos después de un error.', 'Recuperación'],
    ['¿La ayuda se encuentra con facilidad desde el lugar donde surge la duda?', 'Buscar la ayuda desde distintas pantallas y comprobar que aparece sin rodeos.', 'Ayuda'],
    ['¿Está organizada por tareas y permite buscar?', 'Revisar el índice, los títulos y la búsqueda de la ayuda.', 'Ayuda'],
    ['¿Indica pasos concretos y breves?', 'Seguir una guía y comprobar que se puede completar la tarea con ella.', 'Ayuda'],
    ['¿El contenido de ayuda está al día con el producto actual?', 'Comparar lo que dice la ayuda con lo que hace el producto.', 'Ayuda'],
  ]), {
    'Estado visible': 'El producto mantiene informada a la persona sobre lo que ocurre, con respuestas oportunas y proporcionadas a lo que hizo.',
    'Lenguaje del usuario': 'El producto usa palabras, símbolos y un orden que la persona ya conoce, en vez de términos internos o técnicos.',
    'Control y salida': 'La persona puede abandonar una situación no deseada y deshacer lo que hizo por error, sin trámites largos.',
    'Consistencia': 'Los elementos y acciones equivalentes se ven y se comportan igual dentro del producto y siguen las convenciones de la plataforma y del sector.',
    'Prevención': 'El diseño evita que ocurran errores, en lugar de limitarse a avisar después de que pasan.',
    'Reconocimiento': 'La persona no necesita recordar: las opciones, acciones e información necesarias están a la vista o se obtienen con facilidad.',
    'Eficiencia': 'El producto sirve tanto a quien lo usa por primera vez como a quien lo usa a diario, con atajos y personalización para las tareas frecuentes.',
    'Contenido necesario': 'Cada pantalla muestra lo que ayuda a la tarea; la información sobrante le quita visibilidad a lo importante.',
    'Recuperación': 'Cuando ocurre un error, el mensaje lo explica en lenguaje sencillo, señala el problema y propone cómo continuar.',
    'Ayuda': 'Lo ideal es no necesitar ayuda; cuando hace falta, es fácil de encontrar, se centra en la tarea y entrega pasos concretos.',
  }),
  conEnunciados(metodologia('shneiderman8', 'Shneiderman: 8 reglas', 'Ben Shneiderman', 'https://www.cs.umd.edu/users/ben/goldenrules.html', 'Designing the User Interface, 6ª edición, 2016; paráfrasis v2', 'Interfaces generales; ocho reglas de la edición citada.', [
    ['¿Las situaciones equivalentes se resuelven con la misma secuencia de acciones?', 'Comparar tareas y pantallas equivalentes.', 'Consistencia'],
    ['¿Los términos, menús y avisos se repiten igual donde significan lo mismo?', 'Comparar tareas y pantallas equivalentes.', 'Consistencia'],
    ['¿Las excepciones a las convenciones son pocas y se entienden?', 'Comparar tareas y pantallas equivalentes.', 'Consistencia'],
    ['¿Se atienden distintos niveles de experiencia, de principiantes a personas expertas?', 'Revisar ayudas, atajos y alternativas de acceso.', 'Usabilidad universal'],
    ['¿Hay alternativas para distintas capacidades (lectura, audición, movilidad)?', 'Revisar ayudas, atajos y alternativas de acceso.', 'Usabilidad universal'],
    ['¿El producto funciona en los dispositivos y tamaños de pantalla previstos?', 'Revisar ayudas, atajos y alternativas de acceso.', 'Usabilidad universal'],
    ['¿Cada acción de la persona tiene una respuesta visible?', 'Actuar y observar la respuesta del sistema.', 'Retroalimentación'],
    ['¿La respuesta es proporcional a la importancia de la acción?', 'Actuar y observar la respuesta del sistema.', 'Retroalimentación'],
    ['¿La respuesta indica qué cambió y no solo que algo ocurrió?', 'Actuar y observar la respuesta del sistema.', 'Retroalimentación'],
    ['¿Se distinguen el inicio, el avance y el final de cada tarea de varios pasos?', 'Recorrer tareas de varios pasos de principio a fin.', 'Cierre'],
    ['¿Al terminar se confirma que la tarea quedó completa?', 'Recorrer tareas de varios pasos de principio a fin.', 'Cierre'],
    ['¿Después del cierre queda claro qué sigue o cómo volver al inicio?', 'Recorrer tareas de varios pasos de principio a fin.', 'Cierre'],
    ['¿Se impiden las entradas o acciones inválidas (opciones deshabilitadas, formatos guiados)?', 'Probar entradas inválidas y acciones erróneas.', 'Prevención de errores'],
    ['¿Los errores se detectan y se explican cerca de donde ocurren?', 'Probar entradas inválidas y acciones erróneas.', 'Prevención de errores'],
    ['¿Corregir un error evita repetir todo lo hecho antes?', 'Probar entradas inválidas y acciones erróneas.', 'Prevención de errores'],
    ['¿Se puede deshacer una acción individual?', 'Deshacer acciones individuales y operaciones completas.', 'Reversibilidad'],
    ['¿Se pueden deshacer grupos de acciones o una operación completa?', 'Deshacer acciones individuales y operaciones completas.', 'Reversibilidad'],
    ['¿Se avisa con claridad cuando una acción no se puede revertir?', 'Deshacer acciones individuales y operaciones completas.', 'Reversibilidad'],
    ['¿La persona decide cuándo iniciar, pausar o detener las acciones?', 'Observar quién inicia y dirige cada acción.', 'Control del usuario'],
    ['¿El sistema evita sorpresas, como acciones automáticas o cambios no pedidos?', 'Observar quién inicia y dirige cada acción.', 'Control del usuario'],
    ['¿El comportamiento del sistema es predecible para quien lo usa?', 'Observar quién inicia y dirige cada acción.', 'Control del usuario'],
    ['¿Lo necesario para decidir se mantiene visible entre pasos?', 'Revisar pasos que dependen de datos mostrados antes.', 'Memoria inmediata'],
    ['¿La cantidad de elementos o datos que se manejan a la vez es acotada?', 'Revisar pasos que dependen de datos mostrados antes.', 'Memoria inmediata'],
    ['¿Se puede elegir en lugar de recordar códigos o datos largos?', 'Revisar pasos que dependen de datos mostrados antes.', 'Memoria inmediata'],
  ]), {
    'Consistencia': 'Las situaciones parecidas se resuelven con secuencias de acciones, términos y diseño parecidos.',
    'Usabilidad universal': 'El producto reconoce la diversidad de personas, experiencia y tecnología, y ofrece formas de uso para cada una.',
    'Retroalimentación': 'Cada acción recibe una respuesta del sistema, discreta si es frecuente y más notoria si es infrecuente o importante.',
    'Cierre': 'Las secuencias de acciones tienen inicio, desarrollo y final, y el final se comunica.',
    'Prevención de errores': 'El diseño evita errores graves y, si ocurren, ayuda a detectarlos y corregirlos con sencillez.',
    'Reversibilidad': 'Las acciones se pueden deshacer, una a una o en grupo, para que explorar no dé temor.',
    'Control del usuario': 'La persona siente que dirige el sistema y que este responde a sus acciones.',
    'Memoria inmediata': 'El producto reduce lo que hay que retener en la memoria de corto plazo entre pasos y pantallas.',
  }),
  conEnunciados(metodologia('tognazzini', 'Tognazzini: primeros principios', 'Bruce Tognazzini', 'https://asktog.com/atc/principles-of-interaction-design/', 'Revised & Expanded, 2014-03-05; paráfrasis v2', 'Diecinueve categorías principales; síntesis de sus subprincipios, no transcripción completa.', [
    ['¿Las decisiones visuales conservan la facilidad para leer y encontrar cosas?', 'Comparar legibilidad y orden tras decisiones visuales.', 'Estética'],
    ['¿La estética evita ocultar o dificultar las acciones principales?', 'Comparar legibilidad y orden tras decisiones visuales.', 'Estética'],
    ['¿Las herramientas e información de la tarea están disponibles en un mismo lugar?', 'Revisar si cada tarea tiene a mano sus herramientas y datos.', 'Anticipación'],
    ['¿Se evita enviar a la persona a otras pantallas o sitios para completar un paso?', 'Revisar si cada tarea tiene a mano sus herramientas y datos.', 'Anticipación'],
    ['¿La persona puede elegir cómo avanzar dentro de límites claros?', 'Revisar qué decisiones puede tomar la persona.', 'Autonomía'],
    ['¿Los límites y restricciones se explican?', 'Revisar qué decisiones puede tomar la persona.', 'Autonomía'],
    ['¿Cada información en color tiene otra señal (texto, forma o ícono)?', 'Revisar la interfaz sin depender del color.', 'Color'],
    ['¿La interfaz se entiende sin distinguir colores?', 'Revisar la interfaz sin depender del color.', 'Color'],
    ['¿El color se usa con un sentido consistente?', 'Revisar la interfaz sin depender del color.', 'Color'],
    ['¿Los comportamientos equivalentes se ven y actúan igual?', 'Comparar elementos equivalentes entre pantallas.', 'Consistencia'],
    ['¿Se respetan las expectativas formadas en otros productos conocidos?', 'Comparar elementos equivalentes entre pantallas.', 'Consistencia'],
    ['¿Los campos traen valores razonables según el contexto?', 'Revisar campos con valor inicial o sugerido.', 'Valores iniciales'],
    ['¿Los valores iniciales se pueden modificar con facilidad?', 'Revisar campos con valor inicial o sugerido.', 'Valores iniciales'],
    ['¿Se recuerdan valores usados antes cuando conviene?', 'Revisar campos con valor inicial o sugerido.', 'Valores iniciales'],
    ['¿Se distingue qué elementos son interactivos?', 'Explorar sin instrucciones previas.', 'Descubrimiento'],
    ['¿Las acciones disponibles se encuentran sin conocimiento previo?', 'Explorar sin instrucciones previas.', 'Descubrimiento'],
    ['¿Hay pistas visibles para acciones menos evidentes, como gestos o atajos?', 'Explorar sin instrucciones previas.', 'Descubrimiento'],
    ['¿Se evitan tareas repetitivas que el sistema podría hacer?', 'Contar pasos, esperas y entradas en tareas frecuentes.', 'Eficiencia humana'],
    ['¿Las esperas de la persona son mínimas y justificadas?', 'Contar pasos, esperas y entradas en tareas frecuentes.', 'Eficiencia humana'],
    ['¿Se reduce el esfuerzo de entrada (clics, teclas, desplazamientos)?', 'Contar pasos, esperas y entradas en tareas frecuentes.', 'Eficiencia humana'],
    ['¿Se puede explorar sin consecuencias irreversibles?', 'Navegar y probar acciones buscando salidas.', 'Exploración'],
    ['¿Siempre hay una forma clara de volver al punto anterior?', 'Navegar y probar acciones buscando salidas.', 'Exploración'],
    ['¿Los controles importantes tienen un tamaño suficiente?', 'Medir tamaño y distancia de los controles clave.', 'Ley de Fitts'],
    ['¿Los controles de uso frecuente están en zonas fáciles de alcanzar?', 'Medir tamaño y distancia de los controles clave.', 'Ley de Fitts'],
    ['¿Se evitan objetivos pequeños y muy juntos que inducen errores?', 'Medir tamaño y distancia de los controles clave.', 'Ley de Fitts'],
    ['¿Los objetos representan conceptos de la tarea de forma reconocible?', 'Revisar qué objetos aparecen y qué se puede hacer con ellos.', 'Objetos de interfaz'],
    ['¿Las mismas acciones sirven sobre objetos del mismo tipo?', 'Revisar qué objetos aparecen y qué se puede hacer con ellos.', 'Objetos de interfaz'],
    ['¿Se informa el inicio de una espera y su duración aproximada?', 'Provocar cargas y procesos largos.', 'Latencia'],
    ['¿Se puede seguir trabajando o cancelar mientras se espera?', 'Provocar cargas y procesos largos.', 'Latencia'],
    ['¿Se reducen las esperas con respuestas rápidas o carga progresiva?', 'Provocar cargas y procesos largos.', 'Latencia'],
    ['¿Lo aprendido en una parte del producto sirve en las demás?', 'Observar el primer uso de funciones nuevas.', 'Aprendizaje'],
    ['¿Se puede aprender usando el producto, sin leer un manual?', 'Observar el primer uso de funciones nuevas.', 'Aprendizaje'],
    ['¿Las metáforas son comprensibles para el público?', 'Identificar las analogías que usa el producto.', 'Metáforas'],
    ['¿Las metáforas se mantienen coherentes, sin mezclarse ni romperse?', 'Identificar las analogías que usa el producto.', 'Metáforas'],
    ['¿Se guarda el trabajo automáticamente o se avisa antes de perderlo?', 'Provocar cierres, errores y cortes de conexión.', 'Protección del trabajo'],
    ['¿Se puede recuperar lo hecho tras un error o un cierre inesperado?', 'Provocar cierres, errores y cortes de conexión.', 'Protección del trabajo'],
    ['¿Las acciones que borran datos piden confirmación o se pueden revertir?', 'Provocar cierres, errores y cortes de conexión.', 'Protección del trabajo'],
    ['¿El tamaño, contraste y espaciado permiten leer sin esfuerzo?', 'Revisar tamaño, contraste y ajustes de texto.', 'Lectura'],
    ['¿Se puede ampliar o ajustar el texto?', 'Revisar tamaño, contraste y ajustes de texto.', 'Lectura'],
    ['¿Los textos largos están organizados para poder leerlos?', 'Revisar tamaño, contraste y ajustes de texto.', 'Lectura'],
    ['¿Las tareas más frecuentes se resuelven con pocos pasos?', 'Comparar el camino de tareas frecuentes y avanzadas.', 'Simplicidad'],
    ['¿Las opciones avanzadas están disponibles sin estorbar lo común?', 'Comparar el camino de tareas frecuentes y avanzadas.', 'Simplicidad'],
    ['¿Al volver se restaura el punto de trabajo anterior?', 'Salir y volver a entrar al producto.', 'Estado persistente'],
    ['¿Se conservan preferencias y configuración entre sesiones?', 'Salir y volver a entrar al producto.', 'Estado persistente'],
    ['¿Las opciones principales se ven sin abrir menús ocultos?', 'Revisar qué opciones exigen abrir menús ocultos.', 'Interfaz visible'],
    ['¿La persona puede saber dónde está y qué puede hacer desde ahí?', 'Revisar qué opciones exigen abrir menús ocultos.', 'Interfaz visible'],
  ]), {
    'Estética': 'El atractivo visual apoya el uso y no lo estorba.',
    'Anticipación': 'El producto reúne de antemano lo que la persona va a necesitar, en vez de obligarla a buscarlo.',
    'Autonomía': 'La persona tiene margen para decidir, con límites que se entienden.',
    'Color': 'El color apoya el significado, pero nunca es la única señal.',
    'Consistencia': 'Los comportamientos equivalentes son reconocibles y se mantienen estables.',
    'Valores iniciales': 'Los campos llegan con valores útiles que se pueden cambiar.',
    'Descubrimiento': 'Las acciones disponibles se ven; no hay que adivinar qué se puede hacer.',
    'Eficiencia humana': 'Se cuida el tiempo y el esfuerzo de la persona más que el del sistema.',
    'Exploración': 'La persona puede explorar con seguridad porque siempre puede volver atrás.',
    'Ley de Fitts': 'Los objetivos de interacción son fáciles y rápidos de alcanzar.',
    'Objetos de interfaz': 'Los objetos de la interfaz representan cosas de la tarea y se manipulan de forma coherente.',
    'Latencia': 'Las esperas se anuncian y no bloquean el resto del trabajo.',
    'Aprendizaje': 'El producto se aprende usándolo, gracias a un uso consistente.',
    'Metáforas': 'Las analogías ayudan a entender y se mantienen coherentes.',
    'Protección del trabajo': 'El trabajo de la persona no se pierde por errores, cortes o cierres.',
    'Lectura': 'El texto es legible y se puede ajustar.',
    'Simplicidad': 'Las tareas frecuentes son simples y la complejidad queda para lo poco usado.',
    'Estado persistente': 'El producto recuerda el contexto de trabajo y lo restaura.',
    'Interfaz visible': 'Las alternativas y la orientación se ven en la interfaz en lugar de esconderse.',
  }),
  conEnunciados(metodologia('bastien-scapin', 'Bastien y Scapin: criterios ergonómicos', 'J. M. Christian Bastien y Dominique L. Scapin', 'https://inria.hal.science/inria-00070012v1', 'INRIA RT-0156, versión 2.1, mayo 1993; paráfrasis v2', 'Dieciocho criterios elementales de ocho grupos; síntesis operativa. Informe original disponible en el repositorio INRIA.', [
    ['¿Se explica qué hacer y qué datos se esperan en cada paso?', 'Revisar indicaciones, agrupación, respuesta y legibilidad.', 'Guía'],
    ['¿Se informa del estado y de las alternativas disponibles?', 'Revisar indicaciones, agrupación, respuesta y legibilidad.', 'Guía'],
    ['¿Los elementos relacionados están cerca entre sí y separados de los que no lo están?', 'Revisar indicaciones, agrupación, respuesta y legibilidad.', 'Guía'],
    ['¿Formatos, colores o marcos distinguen los conjuntos de elementos?', 'Revisar indicaciones, agrupación, respuesta y legibilidad.', 'Guía'],
    ['¿Los criterios visuales de agrupación se mantienen entre pantallas?', 'Revisar indicaciones, agrupación, respuesta y legibilidad.', 'Guía'],
    ['¿Cada acción tiene un resultado visible y rápido?', 'Revisar indicaciones, agrupación, respuesta y legibilidad.', 'Guía'],
    ['¿El tiempo de respuesta es estable y comprensible?', 'Revisar indicaciones, agrupación, respuesta y legibilidad.', 'Guía'],
    ['¿El texto se lee sin esfuerzo por tamaño, contraste y espaciado?', 'Revisar indicaciones, agrupación, respuesta y legibilidad.', 'Guía'],
    ['¿Se evitan datos y textos que la persona no necesita?', 'Contar datos, pasos y elementos por pantalla.', 'Carga de trabajo'],
    ['¿Las entradas y salidas son breves?', 'Contar datos, pasos y elementos por pantalla.', 'Carga de trabajo'],
    ['¿Las tareas se completan con pocas acciones?', 'Contar datos, pasos y elementos por pantalla.', 'Carga de trabajo'],
    ['¿Se evita repetir entradas o pasos?', 'Contar datos, pasos y elementos por pantalla.', 'Carga de trabajo'],
    ['¿La cantidad de información simultánea es manejable?', 'Contar datos, pasos y elementos por pantalla.', 'Carga de trabajo'],
    ['¿Se muestra lo necesario para la tarea sin saturar?', 'Contar datos, pasos y elementos por pantalla.', 'Carga de trabajo'],
    ['¿El sistema ejecuta solo lo que la persona pidió?', 'Observar quién inicia y detiene cada proceso.', 'Control explícito'],
    ['¿Las acciones requieren una orden clara de la persona?', 'Observar quién inicia y detiene cada proceso.', 'Control explícito'],
    ['¿Se puede interrumpir, pausar o cancelar un proceso?', 'Observar quién inicia y detiene cada proceso.', 'Control explícito'],
    ['¿La persona decide el ritmo de la interacción?', 'Observar quién inicia y detiene cada proceso.', 'Control explícito'],
    ['¿Hay más de un camino para lograr lo mismo?', 'Revisar caminos alternativos y apoyos por nivel de experiencia.', 'Adaptabilidad'],
    ['¿Se puede ajustar la interfaz a preferencias?', 'Revisar caminos alternativos y apoyos por nivel de experiencia.', 'Adaptabilidad'],
    ['¿Hay apoyo para principiantes?', 'Revisar caminos alternativos y apoyos por nivel de experiencia.', 'Adaptabilidad'],
    ['¿Hay atajos para personas expertas?', 'Revisar caminos alternativos y apoyos por nivel de experiencia.', 'Adaptabilidad'],
    ['¿Se previenen las entradas y acciones erróneas?', 'Probar entradas erróneas y leer los mensajes.', 'Errores'],
    ['¿Se valida y confirma lo crítico?', 'Probar entradas erróneas y leer los mensajes.', 'Errores'],
    ['¿Los mensajes de error explican la causa?', 'Probar entradas erróneas y leer los mensajes.', 'Errores'],
    ['¿Los mensajes indican cómo recuperarse?', 'Probar entradas erróneas y leer los mensajes.', 'Errores'],
    ['¿Se puede corregir sin rehacer todo?', 'Probar entradas erróneas y leer los mensajes.', 'Errores'],
    ['¿Se conservan los datos válidos al corregir?', 'Probar entradas erróneas y leer los mensajes.', 'Errores'],
    ['¿Los elementos se presentan igual en contextos similares?', 'Comparar contextos equivalentes.', 'Homogeneidad'],
    ['¿Las convenciones de nombre, ubicación y efecto se mantienen?', 'Comparar contextos equivalentes.', 'Homogeneidad'],
    ['¿Los nombres, etiquetas y abreviaturas se entienden sin explicación?', 'Revisar etiquetas, íconos, códigos y siglas.', 'Significado'],
    ['¿Los íconos y códigos tienen relación con lo que representan?', 'Revisar etiquetas, íconos, códigos y siglas.', 'Significado'],
    ['¿El flujo sigue el orden real de la tarea?', 'Contrastar el flujo con la tarea real.', 'Compatibilidad'],
    ['¿La información presentada coincide con lo que la tarea necesita?', 'Contrastar el flujo con la tarea real.', 'Compatibilidad'],
    ['¿Se respetan los hábitos y expectativas del público?', 'Contrastar el flujo con la tarea real.', 'Compatibilidad'],
  ]), {
    'Guía': 'El producto orienta, informa y conduce a la persona durante la interacción.',
    'Carga de trabajo': 'El producto reduce la carga perceptiva y de memoria, y aumenta la eficiencia del diálogo.',
    'Control explícito': 'El sistema solo actúa cuando la persona lo pide, y ella controla el avance.',
    'Adaptabilidad': 'El producto se ajusta al contexto, a las preferencias y a la experiencia de las personas.',
    'Errores': 'El producto evita errores y ayuda a detectarlos y corregirlos.',
    'Homogeneidad': 'Las convenciones se mantienen estables entre contextos parecidos.',
    'Significado': 'Los códigos, nombres y abreviaturas significan algo para las personas.',
    'Compatibilidad': 'La interacción coincide con las características de las personas y con las tareas reales.',
  }),
  conEnunciados(metodologia('gerhardt-powals', 'Gerhardt-Powals: ingeniería cognitiva', 'Jill Gerhardt-Powals', 'https://www.tandfonline.com/doi/abs/10.1080/10447319609526147', 'International Journal of Human–Computer Interaction 8(2), 1996, pp.189–211; paráfrasis v2', 'Diez principios resumidos; referencia editorial verificada. El artículo completo puede requerir acceso del editor.', [
    ['¿Los cálculos y conversiones los hace el sistema?', 'Buscar cálculos y pasos mecánicos hechos a mano.', 'Automatización'],
    ['¿Se evita que la persona memorice o repita pasos mecánicos?', 'Buscar cálculos y pasos mecánicos hechos a mano.', 'Automatización'],
    ['¿Las decisiones rutinarias se automatizan sin quitar control a la persona?', 'Buscar cálculos y pasos mecánicos hechos a mano.', 'Automatización'],
    ['¿Se muestran las opciones disponibles y sus consecuencias?', 'Revisar pantallas donde hay que decidir.', 'Incertidumbre'],
    ['¿Se indica el grado de confianza o incertidumbre de los datos?', 'Revisar pantallas donde hay que decidir.', 'Incertidumbre'],
    ['¿Las alternativas se presentan de forma comparable?', 'Revisar pantallas donde hay que decidir.', 'Incertidumbre'],
    ['¿Los datos necesarios para una decisión están reunidos?', 'Revisar si un análisis exige saltar entre pantallas.', 'Integración de datos'],
    ['¿Se muestran las relaciones entre los datos?', 'Revisar si un análisis exige saltar entre pantallas.', 'Integración de datos'],
    ['¿Se evita saltar entre pantallas para integrar la información?', 'Revisar si un análisis exige saltar entre pantallas.', 'Integración de datos'],
    ['¿La información nueva se relaciona con algo familiar?', 'Revisar cifras, estados y conceptos poco familiares.', 'Interpretación'],
    ['¿Se usan ejemplos, comparaciones o unidades conocidas?', 'Revisar cifras, estados y conceptos poco familiares.', 'Interpretación'],
    ['¿Hay ayuda para interpretar cifras y estados?', 'Revisar cifras, estados y conceptos poco familiares.', 'Interpretación'],
    ['¿Las etiquetas describen la función del elemento?', 'Leer etiquetas pensando en su función.', 'Nombres funcionales'],
    ['¿Elementos con funciones distintas tienen nombres distintos?', 'Leer etiquetas pensando en su función.', 'Nombres funcionales'],
    ['¿Los nombres se mantienen estables en todo el producto?', 'Leer etiquetas pensando en su función.', 'Nombres funcionales'],
    ['¿Los datos se agrupan por su significado para la tarea?', 'Revisar cómo se agrupan datos y controles.', 'Agrupación'],
    ['¿El criterio de agrupación se mantiene entre pantallas?', 'Revisar cómo se agrupan datos y controles.', 'Agrupación'],
    ['¿Los grupos tienen un tamaño manejable?', 'Revisar cómo se agrupan datos y controles.', 'Agrupación'],
    ['¿Se evita buscar manualmente datos que el sistema ya tiene?', 'Buscar búsquedas manuales que el sistema podría evitar.', 'Tareas guiadas por datos'],
    ['¿Los datos relevantes para la tarea se destacan?', 'Buscar búsquedas manuales que el sistema podría evitar.', 'Tareas guiadas por datos'],
    ['¿La pantalla se adapta a lo que pide la tarea actual?', 'Buscar búsquedas manuales que el sistema podría evitar.', 'Tareas guiadas por datos'],
    ['¿La información aparece cuando se necesita?', 'Revisar qué aparece en cada momento de la tarea.', 'Información oportuna'],
    ['¿Se evita mostrar datos que no importan en ese momento?', 'Revisar qué aparece en cada momento de la tarea.', 'Información oportuna'],
    ['¿Lo urgente se comunica a tiempo?', 'Revisar qué aparece en cada momento de la tarea.', 'Información oportuna'],
    ['¿Los estados importantes usan más de una señal?', 'Revisar estados y datos importantes.', 'Codificación múltiple'],
    ['¿Las codificaciones evitan depender de un solo canal, como el color o el sonido?', 'Revisar estados y datos importantes.', 'Codificación múltiple'],
    ['¿Las señales múltiples son coherentes entre sí?', 'Revisar estados y datos importantes.', 'Codificación múltiple'],
    ['¿Las repeticiones de información ayudan a interpretarla?', 'Identificar datos que se muestran más de una vez.', 'Redundancia útil'],
    ['¿La información repetida es consistente?', 'Identificar datos que se muestran más de una vez.', 'Redundancia útil'],
    ['¿La redundancia evita saturar la pantalla?', 'Identificar datos que se muestran más de una vez.', 'Redundancia útil'],
  ]), {
    'Automatización': 'El sistema hace los cálculos y el trabajo repetitivo para liberar a la persona.',
    'Incertidumbre': 'Se hacen visibles las opciones y la incertidumbre para decidir mejor.',
    'Integración de datos': 'Los datos relacionados se reúnen para interpretarlos juntos.',
    'Interpretación': 'La información nueva se explica con referencias conocidas.',
    'Nombres funcionales': 'Las etiquetas indican lo que hace cada elemento.',
    'Agrupación': 'Los datos se organizan con un criterio estable y con sentido para la tarea.',
    'Tareas guiadas por datos': 'El producto muestra lo que se necesita sin obligar a buscarlo manualmente.',
    'Información oportuna': 'Se muestra lo necesario en el momento en que sirve.',
    'Codificación múltiple': 'Un dato se representa con más de una señal perceptible.',
    'Redundancia útil': 'Repetir información ayuda cuando mejora la interpretación sin confundir.',
  }),
  conEnunciados(metodologia('hassan-montero-martin-fernandez', 'Hassan Montero y Martín Fernández: sitios web', 'Yusef Hassan Montero y Francisco J. Martín Fernández', 'https://www.nosolousabilidad.com/articulos/heuristica.htm', 'No Solo Usabilidad nº2, 2003-03-30; síntesis por dimensiones v2', 'Once dimensiones sintetizadas en criterios operativos; no reproduce todas las preguntas del checklist original.', [
    ['¿Se entiende el propósito del sitio al llegar?', 'Revisar la página de inicio y la estructura global.', 'Generales'],
    ['¿Los contenidos responden a las necesidades del público?', 'Revisar la página de inicio y la estructura global.', 'Generales'],
    ['¿La estructura corresponde al modo en que las personas usan el sitio?', 'Revisar la página de inicio y la estructura global.', 'Generales'],
    ['¿Se identifica al responsable del sitio?', 'Buscar datos del responsable y de contacto.', 'Identidad e información'],
    ['¿Hay vías de contacto visibles?', 'Buscar datos del responsable y de contacto.', 'Identidad e información'],
    ['¿Está clara la información institucional necesaria, como quiénes somos y condiciones?', 'Buscar datos del responsable y de contacto.', 'Identidad e información'],
    ['¿El lenguaje es claro y apropiado para el público?', 'Leer textos como lo haría una persona del público.', 'Lenguaje y redacción'],
    ['¿Los textos son breves y van al punto?', 'Leer textos como lo haría una persona del público.', 'Lenguaje y redacción'],
    ['¿Los títulos y párrafos permiten recorrer el texto con rapidez?', 'Leer textos como lo haría una persona del público.', 'Lenguaje y redacción'],
    ['¿Los rótulos expresan con claridad su contenido o acción?', 'Leer rótulos de menús, enlaces y botones.', 'Rotulado'],
    ['¿Los rótulos son consistentes en todo el sitio?', 'Leer rótulos de menús, enlaces y botones.', 'Rotulado'],
    ['¿Secciones distintas evitan nombres parecidos?', 'Leer rótulos de menús, enlaces y botones.', 'Rotulado'],
    ['¿Se sabe en qué lugar del sitio se está?', 'Recorrer las rutas principales del sitio.', 'Estructura y navegación'],
    ['¿Se puede volver o cambiar de sección con facilidad?', 'Recorrer las rutas principales del sitio.', 'Estructura y navegación'],
    ['¿Los recorridos principales se completan sin callejones sin salida?', 'Recorrer las rutas principales del sitio.', 'Estructura y navegación'],
    ['¿Lo más importante destaca sobre lo secundario?', 'Revisar el orden visual de las pantallas.', 'Distribución'],
    ['¿La distribución guía la lectura?', 'Revisar el orden visual de las pantallas.', 'Distribución'],
    ['¿El espacio y la alineación ordenan sin saturar?', 'Revisar el orden visual de las pantallas.', 'Distribución'],
    ['¿La búsqueda es fácil de encontrar y de usar?', 'Probar búsquedas con y sin resultados.', 'Búsqueda'],
    ['¿Los resultados son relevantes y comprensibles?', 'Probar búsquedas con y sin resultados.', 'Búsqueda'],
    ['¿Se ayuda a la persona cuando no hay resultados?', 'Probar búsquedas con y sin resultados.', 'Búsqueda'],
    ['¿Las imágenes y videos aportan al contenido?', 'Revisar imágenes, video y audio.', 'Multimedia'],
    ['¿Hay alternativas textuales o subtítulos?', 'Revisar imágenes, video y audio.', 'Multimedia'],
    ['¿Se puede controlar la reproducción?', 'Revisar imágenes, video y audio.', 'Multimedia'],
    ['¿La ayuda es fácil de encontrar?', 'Buscar la ayuda desde distintos puntos.', 'Ayuda'],
    ['¿La ayuda explica cómo resolver los problemas frecuentes?', 'Buscar la ayuda desde distintos puntos.', 'Ayuda'],
    ['¿Hay un contacto disponible si la ayuda no basta?', 'Buscar la ayuda desde distintos puntos.', 'Ayuda'],
    ['¿Se puede usar el sitio solo con teclado?', 'Probar con teclado y revisar contraste y alternativas.', 'Accesibilidad'],
    ['¿El contraste y el tamaño permiten leer?', 'Probar con teclado y revisar contraste y alternativas.', 'Accesibilidad'],
    ['¿Imágenes y controles tienen alternativas para tecnología asistiva?', 'Probar con teclado y revisar contraste y alternativas.', 'Accesibilidad'],
    ['¿El sitio informa lo que ocurre tras cada acción?', 'Observar la respuesta tras cada acción.', 'Control y respuesta'],
    ['¿La persona puede controlar la acción, por ejemplo cancelar o volver?', 'Observar la respuesta tras cada acción.', 'Control y respuesta'],
    ['¿Se evitan acciones automáticas inesperadas, como ventanas o redirecciones?', 'Observar la respuesta tras cada acción.', 'Control y respuesta'],
  ], 'Checklist web; síntesis complementaria de la plataforma'), {
    'Generales': 'El propósito, el contenido y la estructura corresponden a lo que necesita el público.',
    'Identidad e información': 'Se identifica quién está detrás del sitio y cómo contactarlo.',
    'Lenguaje y redacción': 'Los textos son comprensibles, breves y organizados.',
    'Rotulado': 'Las secciones y acciones tienen nombres inequívocos.',
    'Estructura y navegación': 'La persona se orienta, puede volver y completa sus recorridos.',
    'Distribución': 'La jerarquía visual destaca la información relevante.',
    'Búsqueda': 'Se puede consultar y los resultados se interpretan.',
    'Multimedia': 'Los medios son pertinentes y vienen con alternativas y control.',
    'Ayuda': 'Hay instrucciones localizables para resolver dificultades.',
    'Accesibilidad': 'El sitio se puede leer y usar con distintas capacidades.',
    'Control y respuesta': 'El sitio informa su estado y la persona dirige las acciones.',
  }),
  conEnunciados(metodologia('bertini2006', 'Bertini et al.: móvil', 'Enrico Bertini, Silvia Gabrielli y Stephen Kimani', 'https://doi.org/10.1145/1133265.1133291', 'AVI 2006, pp.119–126; paráfrasis v2', 'Ocho heurísticas móviles. Contenido contrastado también con el capítulo de coautores: https://www.alandix.com/academic/papers/mobile-chap-2008/mobilechapter-near-final-draft.pdf', [
    ['¿Se informa el estado de la conexión y otras condiciones relevantes?', 'Revisar indicadores de conexión, batería y ubicación.', 'Estado y localización'],
    ['¿Se avisa cuando la conexión es limitada o se pierde?', 'Revisar indicadores de conexión, batería y ubicación.', 'Estado y localización'],
    ['¿Si usa ubicación, el estado es claro y se puede corregir?', 'Revisar indicadores de conexión, batería y ubicación.', 'Estado y localización'],
    ['¿La información se ajusta al lugar y momento de uso?', 'Pensar en uso en movimiento, con poca luz o con interrupciones.', 'Contexto real'],
    ['¿Lo esencial se puede usar con interrupciones?', 'Pensar en uso en movimiento, con poca luz o con interrupciones.', 'Contexto real'],
    ['¿El producto evita suponer condiciones ideales de uso?', 'Pensar en uso en movimiento, con poca luz o con interrupciones.', 'Contexto real'],
    ['¿Las acciones se entienden igual en distintos contextos?', 'Comparar con las convenciones del sistema móvil.', 'Consistencia y correspondencia'],
    ['¿El producto sigue las convenciones del sistema operativo móvil?', 'Comparar con las convenciones del sistema móvil.', 'Consistencia y correspondencia'],
    ['¿Los gestos y metáforas corresponden a la vida real?', 'Comparar con las convenciones del sistema móvil.', 'Consistencia y correspondencia'],
    ['¿Los controles principales se alcanzan con una mano?', 'Usar el producto con una mano y en pantalla pequeña.', 'Ergonomía'],
    ['¿Los objetivos táctiles son lo bastante grandes y separados?', 'Usar el producto con una mano y en pantalla pequeña.', 'Ergonomía'],
    ['¿Se evitan los elementos superfluos en pantalla pequeña?', 'Usar el producto con una mano y en pantalla pequeña.', 'Ergonomía'],
    ['¿Se reduce la escritura con opciones, autocompletado o sensores?', 'Revisar campos de texto y textos largos.', 'Entrada y lectura'],
    ['¿El texto es breve y legible en pantalla pequeña?', 'Revisar campos de texto y textos largos.', 'Entrada y lectura'],
    ['¿Se admiten otras formas de entrada, como voz o cámara?', 'Revisar campos de texto y textos largos.', 'Entrada y lectura'],
    ['¿Las tareas frecuentes necesitan pocos toques?', 'Contar toques en tareas frecuentes.', 'Eficiencia y personalización'],
    ['¿Se pueden personalizar contenido y accesos?', 'Contar toques en tareas frecuentes.', 'Eficiencia y personalización'],
    ['¿Se recuerdan las preferencias?', 'Contar toques en tareas frecuentes.', 'Eficiencia y personalización'],
    ['¿Se evita mostrar información sensible en pantalla sin necesidad?', 'Revisar qué se muestra y qué permisos se piden.', 'Privacidad y entorno social'],
    ['¿Se controlan notificaciones y sonidos en público?', 'Revisar qué se muestra y qué permisos se piden.', 'Privacidad y entorno social'],
    ['¿Los permisos se piden con una explicación?', 'Revisar qué se muestra y qué permisos se piden.', 'Privacidad y entorno social'],
    ['¿Se previenen los errores por toques accidentales?', 'Provocar toques accidentales y cortes de conexión.', 'Errores realistas'],
    ['¿Los errores de conexión o de sensores se explican?', 'Provocar toques accidentales y cortes de conexión.', 'Errores realistas'],
    ['¿Se conserva el trabajo ante interrupciones o pérdida de conexión?', 'Provocar toques accidentales y cortes de conexión.', 'Errores realistas'],
  ], 'Complemento móvil; paráfrasis operativa'), {
    'Estado y localización': 'El estado del dispositivo y de la conexión está visible, y se facilita ubicar al dispositivo y a la persona.',
    'Contexto real': 'La información se adapta al entorno de uso.',
    'Consistencia y correspondencia': 'Las acciones se entienden en distintos contextos y coinciden con el mundo real.',
    'Ergonomía': 'El dispositivo se maneja con comodidad y sin elementos superfluos.',
    'Entrada y lectura': 'Se reduce la escritura y se lee con facilidad en pantalla pequeña.',
    'Eficiencia y personalización': 'Las acciones frecuentes se ajustan a las preferencias de cada persona.',
    'Privacidad y entorno social': 'Se respetan las expectativas de privacidad en espacios públicos.',
    'Errores realistas': 'Se previenen, explican y recuperan los fallos propios del uso móvil.',
  }),
  conEnunciados(metodologia('wcag22', 'WCAG 2.2: selección complementaria', 'W3C, Accessibility Guidelines Working Group', 'https://www.w3.org/TR/2024/REC-WCAG22-20241212/', 'Recomendación 2024-12-12; selección operativa v2', 'Selección de doce criterios A/AA; revisión heurística complementaria. No cubre WCAG completa ni certifica conformidad. Consultar requisitos y excepciones en cada enlace.', [
    ['¿Las imágenes que transmiten información tienen una alternativa textual equivalente?', 'Revisar imágenes, íconos y controles gráficos.', '1.1.1 Alternativas'],
    ['¿Las imágenes decorativas quedan fuera de la lectura de la tecnología asistiva?', 'Revisar imágenes, íconos y controles gráficos.', '1.1.1 Alternativas'],
    ['¿Títulos, listas y tablas usan la estructura que les corresponde?', 'Revisar títulos, listas, tablas y formularios.', '1.3.1 Estructura'],
    ['¿Las etiquetas están asociadas a sus campos?', 'Revisar títulos, listas, tablas y formularios.', '1.3.1 Estructura'],
    ['¿El texto normal alcanza el contraste mínimo de 4,5 a 1?', 'Medir el contraste con una herramienta.', '1.4.3 Contraste'],
    ['¿El texto grande alcanza el contraste mínimo de 3 a 1?', 'Medir el contraste con una herramienta.', '1.4.3 Contraste'],
    ['¿El contenido se reorganiza al ampliar sin perder información ni funciones?', 'Ampliar la página al 400 % o reducir el ancho a 320 píxeles.', '1.4.10 Reajuste'],
    ['¿Se evita el desplazamiento horizontal, salvo en contenido que lo requiere?', 'Ampliar la página al 400 % o reducir el ancho a 320 píxeles.', '1.4.10 Reajuste'],
    ['¿Todas las funciones se pueden operar con teclado?', 'Recorrer el producto solo con teclado.', '2.1.1 Teclado'],
    ['¿El orden de tabulación es lógico?', 'Recorrer el producto solo con teclado.', '2.1.1 Teclado'],
    ['¿Se puede salir de cada componente usando el teclado?', 'Entrar y salir de menús, ventanas y reproductores con teclado.', '2.1.2 Sin trampas'],
    ['¿Si se necesita una tecla especial para salir, se informa?', 'Entrar y salir de menús, ventanas y reproductores con teclado.', '2.1.2 Sin trampas'],
    ['¿El elemento con foco se distingue visualmente?', 'Tabular y observar el indicador de foco.', '2.4.7 Foco visible'],
    ['¿El indicador de foco aparece en todos los controles?', 'Tabular y observar el indicador de foco.', '2.4.7 Foco visible'],
    ['¿Las barras fijas o ventanas dejan visible el elemento con foco?', 'Tabular con barras fijas o ventanas flotantes presentes.', '2.4.11 Foco no oculto'],
    ['¿Al tabular, el elemento enfocado se desplaza a una zona visible?', 'Tabular con barras fijas o ventanas flotantes presentes.', '2.4.11 Foco no oculto'],
    ['¿Los objetivos miden al menos 24 por 24 píxeles CSS, o tienen espacio equivalente alrededor?', 'Medir los controles táctiles y de puntero.', '2.5.8 Tamaño del objetivo'],
    ['¿Se revisaron las excepciones aplicables, como enlaces en un texto o tamaño esencial?', 'Medir los controles táctiles y de puntero.', '2.5.8 Tamaño del objetivo'],
    ['¿Se identifica el campo con error?', 'Enviar formularios con datos erróneos.', '3.3.1 Identificación de errores'],
    ['¿El error se describe con texto y no solo con color?', 'Enviar formularios con datos erróneos.', '3.3.1 Identificación de errores'],
    ['¿Se puede autenticar sin memorizar ni transcribir, por ejemplo pegando o con un gestor de contraseñas?', 'Revisar el inicio de sesión y la recuperación de acceso.', '3.3.8 Autenticación accesible'],
    ['¿Hay una alternativa a las pruebas cognitivas, como acertijos o transcripción?', 'Revisar el inicio de sesión y la recuperación de acceso.', '3.3.8 Autenticación accesible'],
    ['¿Cada control tiene un nombre accesible y el rol correcto?', 'Revisar controles con un lector de pantalla o el árbol de accesibilidad.', '4.1.2 Nombre, función, valor'],
    ['¿Los cambios de estado y de valor se comunican a la tecnología asistiva?', 'Revisar controles con un lector de pantalla o el árbol de accesibilidad.', '4.1.2 Nombre, función, valor'],
  ], 'Selección complementaria de criterios normativos; no certificación'), {
    '1.1.1 Alternativas': 'El contenido no textual tiene una alternativa textual equivalente, salvo las excepciones de la norma.',
    '1.3.1 Estructura': 'La estructura y las relaciones visuales también existen en el código para la tecnología asistiva.',
    '1.4.3 Contraste': 'El texto tiene contraste suficiente con su fondo, según los umbrales y excepciones de la norma.',
    '1.4.10 Reajuste': 'El contenido se reorganiza al ampliar, sin perder información ni exigir desplazamiento en dos direcciones.',
    '2.1.1 Teclado': 'Todas las funciones se pueden operar con teclado.',
    '2.1.2 Sin trampas': 'El foco del teclado no queda atrapado en un componente.',
    '2.4.7 Foco visible': 'El elemento con foco del teclado se distingue visualmente.',
    '2.4.11 Foco no oculto': 'El elemento con foco no queda totalmente tapado por otro contenido.',
    '2.5.8 Tamaño del objetivo': 'Los objetivos interactivos tienen tamaño o espacio suficiente, según la norma y sus excepciones.',
    '3.3.1 Identificación de errores': 'Los errores de entrada se identifican y se describen con texto.',
    '3.3.8 Autenticación accesible': 'La autenticación no exige pruebas cognitivas sin una alternativa.',
    '4.1.2 Nombre, función, valor': 'Los controles exponen nombre, función y valor a la tecnología asistiva.',
  }),
  conEnunciados(metodologia('coga2021', 'COGA 2021: objetivos cognitivos', 'W3C, Cognitive and Learning Disabilities Accessibility Task Force', 'https://www.w3.org/TR/2021/NOTE-coga-usable-20210429/', 'W3C Working Group Note, 2021-04-29; síntesis v2', 'Ocho objetivos de diseño sintetizados; documento informativo complementario, no norma ni evaluación completa de todos sus patrones.', [
    ['¿Se entiende el propósito de cada página?', 'Revisar si cada página y control se explican solos.', 'Comprensión de uso'],
    ['¿Los controles se entienden sin necesidad de interpretarlos?', 'Revisar si cada página y control se explican solos.', 'Comprensión de uso'],
    ['¿Los elementos conocidos se ven y funcionan como se espera?', 'Revisar si cada página y control se explican solos.', 'Comprensión de uso'],
    ['¿Se encuentra el contenido con pocos pasos?', 'Buscar contenido y volver de una pantalla profunda.', 'Localización'],
    ['¿Se sabe dónde se está y cómo volver?', 'Buscar contenido y volver de una pantalla profunda.', 'Localización'],
    ['¿Se puede recuperar la orientación si la persona se pierde?', 'Buscar contenido y volver de una pantalla profunda.', 'Localización'],
    ['¿El lenguaje es simple, literal y sin ambigüedades?', 'Leer textos, íconos y cifras.', 'Contenido claro'],
    ['¿Hay imágenes o íconos que ayuden a entender el texto?', 'Leer textos, íconos y cifras.', 'Contenido claro'],
    ['¿Se evitan metáforas, abreviaturas y números difíciles de interpretar?', 'Leer textos, íconos y cifras.', 'Contenido claro'],
    ['¿Se evitan trampas y errores fáciles de cometer?', 'Cometer errores a propósito y corregirlos.', 'Prevención y corrección'],
    ['¿Se puede deshacer o corregir con facilidad?', 'Cometer errores a propósito y corregirlos.', 'Prevención y corrección'],
    ['¿Los datos ingresados se conservan al corregir?', 'Cometer errores a propósito y corregirlos.', 'Prevención y corrección'],
    ['¿Se evitan distracciones, como animaciones o avisos, durante la tarea?', 'Observar animaciones, avisos y límites de tiempo.', 'Concentración'],
    ['¿Se puede retomar la tarea tras una interrupción?', 'Observar animaciones, avisos y límites de tiempo.', 'Concentración'],
    ['¿Los límites de tiempo son flexibles?', 'Observar animaciones, avisos y límites de tiempo.', 'Concentración'],
    ['¿Se evita tener que recordar datos de un paso a otro?', 'Revisar pasos que dependen de recordar datos.', 'Memoria'],
    ['¿La autenticación y otros procesos admiten ayudas para la memoria?', 'Revisar pasos que dependen de recordar datos.', 'Memoria'],
    ['¿Se muestran el progreso y los datos ya ingresados?', 'Revisar pasos que dependen de recordar datos.', 'Memoria'],
    ['¿La ayuda está disponible en el momento en que hace falta?', 'Buscar ayuda en medio de una tarea.', 'Apoyo'],
    ['¿Se accede a la ayuda sin perder lo ya hecho?', 'Buscar ayuda en medio de una tarea.', 'Apoyo'],
    ['¿Hay formas alternativas de contacto?', 'Buscar ayuda en medio de una tarea.', 'Apoyo'],
    ['¿Se puede personalizar la presentación?', 'Probar preferencias y compatibilidad con herramientas externas.', 'Adaptación'],
    ['¿El producto es compatible con herramientas de apoyo de la persona?', 'Probar preferencias y compatibilidad con herramientas externas.', 'Adaptación'],
    ['¿Se respetan las preferencias del sistema, como tamaño de texto o movimiento reducido?', 'Probar preferencias y compatibilidad con herramientas externas.', 'Adaptación'],
  ], 'Guía informativa complementaria; no norma'), {
    'Comprensión de uso': 'Se entiende para qué sirven los controles y cada página.',
    'Localización': 'Se encuentra el contenido y se recupera la orientación.',
    'Contenido claro': 'Las expresiones y representaciones son comprensibles.',
    'Prevención y corrección': 'Se previenen los errores y se corrigen conservando los datos.',
    'Concentración': 'Se reducen las distracciones y se ayuda a retomar la tarea.',
    'Memoria': 'No se exige recordar información entre pasos.',
    'Apoyo': 'Hay ayuda accesible durante la tarea.',
    'Adaptación': 'Se pueden usar preferencias y herramientas de apoyo.',
  }),
  conEnunciados(metodologia('amershi2019', 'Amershi et al.: interacción con IA', 'Saleema Amershi, Dan Weld, Mihaela Vorvoreanu, Adam Fourney, Besmira Nushi, Penny Collisson, Jina Suh, Shamsi Iqbal, Paul N. Bennett, Kori Inkpen, Jaime Teevan, Ruth Kikin-Gil y Eric Horvitz', 'https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/', 'CHI 2019; DOI 10.1145/3290605.3300233; paráfrasis v2', 'Dieciocho directrices de interacción con IA; apoyo para revisión contextual y discusión de compromisos, no certificación.', [
    ['¿Se explica qué puede hacer el sistema?', 'Buscar descripciones de lo que hace el sistema.', 'Capacidades'],
    ['¿Se declaran sus límites?', 'Buscar descripciones de lo que hace el sistema.', 'Capacidades'],
    ['¿Se indica la fiabilidad esperable?', 'Revisar mensajes sobre precisión y error.', 'Fiabilidad'],
    ['¿Se informa cuándo es más probable que falle?', 'Revisar mensajes sobre precisión y error.', 'Fiabilidad'],
    ['¿El sistema interviene cuando es relevante?', 'Observar cuándo aparece la asistencia.', 'Momento'],
    ['¿Se evita interrumpir tareas críticas?', 'Observar cuándo aparece la asistencia.', 'Momento'],
    ['¿Lo que se muestra se relaciona con la tarea actual?', 'Comparar lo mostrado con la tarea actual.', 'Pertinencia'],
    ['¿Se tiene en cuenta el contexto de la persona?', 'Comparar lo mostrado con la tarea actual.', 'Pertinencia'],
    ['¿El tono y el comportamiento se ajustan a las normas del contexto?', 'Revisar tono y comportamiento del sistema.', 'Normas sociales'],
    ['¿Se evitan lenguaje o acciones inapropiadas?', 'Revisar tono y comportamiento del sistema.', 'Normas sociales'],
    ['¿Se evitan resultados que refuercen estereotipos?', 'Revisar resultados para distintos grupos.', 'Sesgos'],
    ['¿Se comprueba que funcione de forma equitativa entre grupos?', 'Revisar resultados para distintos grupos.', 'Sesgos'],
    ['¿Se puede invocar el servicio cuando se necesita?', 'Buscar cómo se solicita ayuda al sistema.', 'Invocación'],
    ['¿La invocación es fácil de encontrar?', 'Buscar cómo se solicita ayuda al sistema.', 'Invocación'],
    ['¿Se puede descartar o ignorar un servicio no deseado?', 'Descartar una sugerencia no deseada.', 'Rechazo'],
    ['¿Ignorar la asistencia evita entorpecer la tarea?', 'Descartar una sugerencia no deseada.', 'Rechazo'],
    ['¿Se puede editar o refinar un resultado incorrecto?', 'Corregir un resultado equivocado.', 'Corrección'],
    ['¿La corrección es sencilla?', 'Corregir un resultado equivocado.', 'Corrección'],
    ['¿Se pide aclaración cuando la intención no es clara?', 'Probar entradas ambiguas.', 'Incertidumbre'],
    ['¿Se modera la intervención cuando hay duda?', 'Probar entradas ambiguas.', 'Incertidumbre'],
    ['¿Se ofrece una explicación de por qué se dio un resultado?', 'Buscar explicaciones de un resultado.', 'Explicación'],
    ['¿La explicación se comprende?', 'Buscar explicaciones de un resultado.', 'Explicación'],
    ['¿Se recuerdan las interacciones recientes?', 'Repetir una tarea y ver si recuerda lo reciente.', 'Memoria reciente'],
    ['¿Ese contexto se usa de forma útil?', 'Repetir una tarea y ver si recuerda lo reciente.', 'Memoria reciente'],
    ['¿El sistema se adapta con el uso?', 'Usar el sistema varias veces y observar cambios.', 'Aprendizaje'],
    ['¿La persona puede ver o controlar lo que el sistema aprende?', 'Usar el sistema varias veces y observar cambios.', 'Aprendizaje'],
    ['¿Los cambios se introducen de forma gradual?', 'Revisar cómo se introducen los cambios.', 'Adaptación prudente'],
    ['¿Se avisa antes de cambiar comportamientos importantes?', 'Revisar cómo se introducen los cambios.', 'Adaptación prudente'],
    ['¿Se pueden valorar resultados concretos?', 'Buscar formas de dar retroalimentación.', 'Comentarios específicos'],
    ['¿Los comentarios se reflejan en lo que el sistema hace después?', 'Buscar formas de dar retroalimentación.', 'Comentarios específicos'],
    ['¿Se informa qué pasará con las acciones de la persona?', 'Revisar mensajes sobre el efecto de las acciones.', 'Consecuencias'],
    ['¿Se aclara cómo afectan sus preferencias al comportamiento futuro?', 'Revisar mensajes sobre el efecto de las acciones.', 'Consecuencias'],
    ['¿Se puede configurar qué observa el sistema y cómo actúa?', 'Buscar ajustes generales del sistema.', 'Control global'],
    ['¿Los ajustes son fáciles de encontrar?', 'Buscar ajustes generales del sistema.', 'Control global'],
    ['¿Se avisa de nuevas capacidades o cambios?', 'Buscar avisos de novedades.', 'Cambios'],
    ['¿Se explica su efecto sobre el uso habitual?', 'Buscar avisos de novedades.', 'Cambios'],
  ], 'Complemento de interacción humano–IA; paráfrasis operativa'), {
    'Capacidades': 'Se explica qué puede hacer la IA y qué no.',
    'Fiabilidad': 'Se explica qué tan bien lo hace y cuándo puede equivocarse.',
    'Momento': 'Las intervenciones llegan en el momento oportuno.',
    'Pertinencia': 'La información mostrada es adecuada a la tarea y al contexto.',
    'Normas sociales': 'Se respetan las expectativas sociales y culturales.',
    'Sesgos': 'No se refuerzan estereotipos injustos.',
    'Invocación': 'Es fácil pedir la asistencia del sistema cuando se necesita.',
    'Rechazo': 'Se puede ignorar o descartar la asistencia.',
    'Corrección': 'Se pueden corregir los resultados erróneos.',
    'Incertidumbre': 'Si el sistema duda, lo aclara o interviene menos.',
    'Explicación': 'Se puede entender por qué el sistema actuó como lo hizo.',
    'Memoria reciente': 'Se conserva el contexto reciente útil.',
    'Aprendizaje': 'El sistema adapta su comportamiento con el uso.',
    'Adaptación prudente': 'Los cambios en el comportamiento del sistema son cuidadosos.',
    'Comentarios específicos': 'Se pueden indicar preferencias concretas.',
    'Consecuencias': 'Se explican los efectos futuros de las acciones.',
    'Control global': 'Se puede configurar el comportamiento y la observación del sistema.',
    'Cambios': 'Se informa de las actualizaciones y nuevas capacidades.',
  }),
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
