# Card Sorting — flujo de aplicación

La implementación separa la configuración de la ejecución de la técnica.

## Flujo docente/estudiante evaluador

1. Entrar al proyecto.
2. Abrir **Card Sorting**.
3. Configurar tipo, tarjetas y categorías (si es cerrado).
4. Presionar **Crear técnica y comenzar**.
5. La aplicación navega a `/proyectos/:proyectoId/card-sorting/:estudioId`.
6. Esa página muestra el espacio de aplicación con tarjetas arrastrables.

La vista de aplicación del evaluador funciona como previsualización interactiva; los resultados reales se registran mediante la sesión de participante.

## Flujo participante

El enlace compartible es:

`/card-sorting/:estudioId`

El participante debe tener `participanteToken` en `localStorage`, obtenido por el flujo de registro/consentimiento/token existente. La página se une al estudio, carga las tarjetas y permite:

- arrastrar tarjetas a categorías;
- devolver tarjetas al mazo sin clasificar;
- crear categorías cuando el estudio es abierto;
- enviar la clasificación cuando todas las tarjetas están asignadas.

Los resultados se envían a `POST /api/card-sorting/sessions/:participanteSesionId/results` usando el Bearer token del participante.


## Flujo actualizado de resultados

Una técnica creada por un estudiante o docente queda asociada a la persona que la creó. Desde su página de aplicación se puede:

1. Usar la vista de trabajo como demostración o aplicación guiada.
2. Copiar el enlace de participación `/card-sorting/:estudioId` para compartirlo con los participantes.
3. Recibir las clasificaciones enviadas por los participantes mediante la sesión hija de cada uno.
4. Abrir **Ver resultados** para consultar la analítica agregada del estudio.

La analítica de Card Sorting se calcula a partir de las sesiones de participantes completadas. Incluye cantidad de participantes, tarjetas, acuerdo global, frecuencia de categorías, categoría más frecuente por tarjeta y consenso por grupo.

El acceso a resultados sigue protegido por el backend: solamente el creador del estudio o un administrador puede consultar su analítica.
