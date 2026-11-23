# Inventario previo de campos opcionales (F3b)

Se revisaron required, validación de envío y los schemas de packages/shared-types. No se deduce opcionalidad solo por la ausencia de required.

| Formulario | Campos opcionales | Fuente / decisión |
|---|---|---|
| Proyecto | Descripción | POST/PATCH aceptan omitirla; ya marcada. Reutilizar OptionalTag en creación y edición. |
| Sala | Instrucciones o descripción | CreateSalaDto; nombre, período y fechas siguen obligatorios. El nombre del estudiante ya dice «opcional». |
| Persona | Todos salvo nombre completo: edad, ocupación, familia, acerca de, fotografía local/URL, listas, contexto, rol/relación con servicio, estado y observaciones de validación | PersonaSchema usa optional/default. |
| Journey map | Objetivo, evento de inicio, evidencia y listas de cada fase (actividades, contacto, pensamientos, dificultades, ganancias, oportunidades) | JourneyMapSchema / PhaseSchema optional/default; nombre/rol del perfil, nombre de fase y emoción siguen requeridos. |
| Momentos críticos | Ninguno de los campos del perfil/incidente | MomentosCriticosSchema requiere nombre, rol, descripción, causa, tipo, impacto, frecuencia y al menos una acción; no se etiqueta falsamente ninguno. |
| Heurística, borrador | Contexto, URL, versión, dispositivo, tareas, exclusiones, lectores | Ya marcados; no se rebajan requisitos de activación. Producto y metodología conservan sus validaciones. |
| Card sorting | Preguntas para participantes | Ya marcado; las categorías son obligatorias de forma condicional en cerrado/híbrido. |

F3 se divide en F3a (salas, miembros, comentarios) y F3b (opcionales e ingreso) por superar diez archivos.
