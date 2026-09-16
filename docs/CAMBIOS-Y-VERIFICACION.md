# Cambios visuales, técnicos y verificación

Fecha: 15 de septiembre de 2026. Carpeta de trabajo: `Documents/ChatGPT/TITULO/observatorio-ux`.

## Cambios aplicados

1. Contraste del panel de decisión del dashboard corregido en ambos temas.
2. El control compartido de acceso excluye proyectos eliminados.
3. La lectura y edición de artefactos excluye filas eliminadas; eliminar limpia sus reservas de edición.
4. El backend confía en un salto de proxy en producción, según la topología del Compose.
5. Cabeceras de seguridad en Nginx, incluida CSP. Los recursos estáticos conservan la herencia de cabeceras.
6. Swagger disponible únicamente fuera de producción.
7. Tokens de participante en `sessionStorage`; limpieza de credenciales persistentes de versiones anteriores.
8. Renovación de la reserva de edición cada dos minutos y aviso ante pérdida de la reserva.
9. El formulario envía la versión que abrió; el backend rechaza guardar sobre una versión posterior y traduce colisiones de versión a HTTP 409.
10. Estados decorativos de proyectos sustituidos por información de sesiones registradas.
11. La selección del primer proyecto se presenta como «Proyecto reciente».
12. Texto auxiliar, métricas y tablas con tamaños más legibles.
13. Login con región principal, etiquetas y contraste corregido.
14. Logos con dimensiones explícitas y versiones WebP optimizadas. El logo principal pasa de 61.582 a 19.276 bytes con compresión sin pérdida; se conservan los PNG originales. El isotipo se entrega al tamaño adecuado para la interfaz.
15. Ayuda de acceso desplegable que dirige al docente o administrador. No añade un flujo automático de recuperación de contraseña.
16. Confirmaciones con diálogo nativo, foco inicial en Cancelar, Escape y restauración del foco.
17. Etiquetas accesibles en los campos de proyectos y evaluación heurística que carecían de ellas.
18. Advertencia al abandonar los formularios de proyectos y artefactos por enlaces internos, navegación programática, Atrás/Adelante, recarga o cierre. Compara con el contenido al abrir y se activa únicamente cuando hay cambios. Cancelar la navegación conserva el formulario.
19. Subnavegación del proyecto desplazable, con barra de desplazamiento y ayuda visible en móvil.
20. Búsqueda de proyectos y pestañas de salas/resultados de Card Sorting reflejadas en la URL.
21. Títulos de técnicas subordinados al título del proyecto.
22. Página 404, estado de carga de rutas y límite de errores de renderizado con recuperación.
23. Cliente HTTP común para los dominios del evaluador: cookies, CSRF y errores consistentes.
24. Tipos de Personas, Journey Maps y Momentos Críticos reutilizados desde el paquete compartido.
25. Páginas cargadas por separado bajo demanda.
26. Política común de caché y reintentos; no se reintentan errores HTTP 4xx ni mutaciones.
27. Analítica transversal de las cinco técnicas. Los artefactos se cuentan por su última versión vigente y las barras usan una escala relativa a los datos.
28. Selector de proyecto y técnicas: una de las cinco, una combinación o informe completo. Exporta los datos guardados del proyecto aunque la técnica no esté abierta. El PDF incluye portada, cobertura, tablas, severidad, recomendaciones, resultados agregados y numeración. Journey Map se presenta en una matriz horizontal. Fuente Roboto con acentos y ajuste de líneas; cabeceras de tabla repetidas al continuar. El selector y el motor PDF se cargan bajo demanda. Las evaluaciones y estudios mantienen sus permisos de lectura.

Además, producción exige secretos JWT distintos y de al menos 32 caracteres. Los ejemplos de entorno están actualizados. No se modificaron secretos locales.

El arranque de Docker conserva las cuentas y proyectos existentes: el seed requiere `SEED_ON_START=true` fuera de producción o ejecución manual explícita. Las pruebas E2E usan por defecto una base separada (`observatorio_ux_e2e`) y puertos 5174/3001. El seed de pruebas exige un nombre de base terminado en `_e2e` o `_test`. La generación del cliente Prisma se realiza antes de arrancar el servidor para evitar el bloqueo de DLL en Windows.

Las fichas antiguas de Persona que guardaban `nombre` se adaptan al campo actual `nombreCompleto` al leer, sin modificar el registro original.

## Verificación

- Backend: compilación correcta y 137 pruebas aprobadas, incluidas las restricciones de lectura de evaluaciones en el informe.
- Frontend: compilación correcta y 35 pruebas aprobadas, incluida selección del informe, fallos de carga y navegación Atrás con cambios pendientes.
- `pnpm audit --prod`: sin vulnerabilidades conocidas reportadas.
- `git diff --check`: sin errores de espacios.
- Lighthouse durante la primera ronda sobre `/login` en preview: 98/100/100 frente a la referencia 98/89/100. Esa medición precede al selector PDF y al cambio de router; no representa una nueva medición de la versión final.
- JavaScript principal final: 309,61 kB sin comprimir y 99,72 kB gzip, frente a la referencia 389,60/110,90 kB. Las rutas, el selector y el motor PDF se cargan aparte.
- Navegador: login, dashboard y analítica revisados; sin desbordamiento horizontal a 390 px. Analítica revisada también en tema oscuro.
- Confirmación: foco inicial, recorrido con Tab y cancelación con Escape comprobados.
- E2E con PostgreSQL en Docker: ocho pruebas aprobadas en escritorio y móvil, incluidas las cinco técnicas y permisos de estudiantes.
- PDF: descarga real de las cinco técnicas por separado, combinación y completo. Informe completo de siete páginas renderizado y revisado, con matriz horizontal, acentos, nombre de Persona y numeración correctos. Descarga también comprobada desde el dashboard a través de Nginx usando el frontend compilado, sin errores de consola.
- Nginx: ambas configuraciones pasan `nginx -t` dentro de contenedores. Cabeceras comprobadas en HTML, healthchecks, API y JavaScript estático; una única política CSP y `X-Frame-Options: DENY`. Recursos estáticos con caché anual. El proxy elimina duplicados de las cabeceras de sus upstreams.
- Docker de desarrollo actualizado y levantado: PostgreSQL y backend saludables, compilación de tipos sin errores y frontend disponible en `http://localhost:5173`. El motor PDF está instalado dentro del contenedor y el arranque confirmó que omite el seed automático.

## Límites de esta verificación

### Ajuste visual de la exportación PDF - 15 de septiembre de 2026

El selector y el informe incorporan los logos originales de UXLab Observatorio. La portada usa un degradado azul con acento lima, los encabezados incluyen la marca y las fichas de evidencia tienen separadores ligeros. Se retiraron las tarjetas numeradas del selector y el lema genérico de la portada; el selector conserva la familia tipográfica de la aplicación. No se cambiaron consultas, permisos, selección de técnicas ni datos guardados.

Verificación adicional: compilación del frontend y 36 pruebas aprobadas. Descargas reales del informe completo (7 páginas) y de Evaluación Heurística (2 páginas), con todas sus páginas renderizadas e inspeccionadas. Selector revisado en escritorio, móvil de 390 px y modo oscuro de 320 px, sin desbordamiento horizontal; contenido inferior accesible mediante desplazamiento. Escape restaura el foco en Exportar PDF. Consola sin errores. Esta revisión visual utilizó el proyecto demo existente, sin modificar sus registros.

Las pruebas de negocio se ejecutaron en una base aislada con datos demo. La revisión del PDF usa esos datos, no información personal de proyectos reales. La prueba de Nginx utilizó el frontend compilado y el backend en modo de prueba; no constituye un despliegue productivo ni un pentest completo. Los avisos de Vite sobre módulos `use client` y tamaño de los módulos PDF no impiden compilar; el motor PDF permanece fuera de la carga inicial.
