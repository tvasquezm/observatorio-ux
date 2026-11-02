# Manual de usuario del Observatorio UX

Esta guía acompaña el trabajo de una sala desde la creación de las cuentas hasta la descarga del informe de un proyecto. Para practicar en una instalación local, primero prepara los [datos de demostración y las cuentas por rol](COMANDOS.md#usuarios-de-seed-solo-desarrollo-local).

## Acceso

Abre la plataforma e inicia sesión con el correo registrado y tu contraseña. Si tu institución habilitó Google y autorizó tu cuenta, puedes usar ese acceso. En una instalación local, abre `http://localhost:5173`. Si tienes varias perspectivas disponibles, elige la que corresponda al recorrido que vas a realizar.

### Estudiante · Registrar evidencia en un proyecto

1. En **Salas**, abre tu sala y revisa **Proyectos** y **Equipos**. Si falta la sala, pide al docente que compruebe la inscripción con el mismo correo que usaste para ingresar.
2. Abre el proyecto asignado. Si debes crear uno, entra en **Proyectos → Nuevo proyecto**, escribe el nombre, selecciona una sala habilitada y guarda. Si el botón está desactivado, el docente debe permitir la creación de proyectos en esa sala o asignarte uno.
3. Dentro del proyecto, elige **Personas → + Nueva persona**. Como ejercicio, describe a una usuaria de la biblioteca. Escribe su nombre en **Identidad**, añade qué necesita lograr y qué le cuesta en los pasos siguientes. Avanza hasta el sexto paso y selecciona **Guardar persona**. Comprueba que aparezca en el listado. Para modificarla, abre su edición y pulsa **Actualizar persona** en el paso final.
4. Usa las otras técnicas según la evidencia que necesites:

   | Técnica | Recorrido |
   |---|---|
   | Journey Map | Crea el mapa, organiza las etapas del recorrido y registra las acciones o experiencias de cada etapa. Guarda y revisa el orden. |
   | Momentos críticos | Registra un incidente, describe su impacto y consúltalo en la matriz de priorización. |
   | Card Sorting | Crea un estudio, elige la modalidad y carga las tarjetas. En una prueba cerrada define también las categorías. Abre el estudio para consultar su enlace y sus resultados. |
   | Evaluación heurística | Completa la configuración del proyecto de evaluación, revisa los criterios y entrega tu trabajo individual. En equipo, compara los hallazgos, elige al redactor y revisa el acuerdo. Puedes confirmarlo o pedir cambios. |

5. Si Personas o Momentos críticos muestra **Editando: nombre**, espera a que tu compañero guarde o salga y vuelve a abrir la ficha. Si aparece un aviso de versión desactualizada, conserva tus apuntes, recarga y revisa lo que cambió antes de volver a guardar.

**Resultado esperado:** al regresar al proyecto puedes localizar la evidencia que guardaste. La sección de Analítica del proyecto está reservada a las perspectivas docente y administrativa.

### Docente · Preparar una sala y revisar el trabajo

1. En **Salas → Crear sala**, indica el nombre y el período académico, completa las fechas que correspondan y guarda. Abre la sala recién creada.
2. En **Estudiantes**, usa **Agregar uno** o **Agregar varios** para incorporar al curso por correo. Comprueba que los estudiantes aparezcan en la lista. En **Equipos**, crea un equipo y agrega sus integrantes.
3. En **Proyectos** de la sala, vincula el proyecto que utilizará el equipo. Si la actividad exige que los estudiantes creen los suyos, activa **Permitir que los estudiantes creen proyectos en esta sala**. Pide a un estudiante que abra el proyecto para confirmar la asignación.
4. Abre el proyecto, revisa los registros de sus técnicas y consulta **Analítica**. Para devolver observaciones al equipo, abre **Comentarios** en el proyecto.
5. Para entregar el informe, selecciona **Exportar PDF**, comprueba el proyecto elegido, marca al menos una técnica y pulsa **Descargar PDF**. Abre el archivo y verifica el nombre del proyecto y las secciones incluidas.

**Para recoger respuestas de Card Sorting**, abre el estudio y usa **Copiar enlace**. Envíalo a las personas que participarán. El enlace abre un acceso público sin cuenta ni código: la persona lee el consentimiento y, si acepta, entra al estudio. Si tu equipo lleva además una lista de invitaciones, el creador del proyecto o un administrador puede gestionarla en **Participantes**. Esa lista no restringe el enlace público.

### Administrador · Dar acceso y comprobar permisos

1. En la perspectiva **Administrador**, abre el **Panel administrativo** (`/admin`). En **Crear docente**, completa nombre y correo y elige el mecanismo de acceso. Para acceso con contraseña puedes usar **Generar contraseña segura**. Para una cuenta autorizada con Google, selecciona **Cuenta de Google**.
2. Pulsa **Crear docente**. Comprueba el registro en **Docentes registrados**. Si generaste una contraseña, entrega el acceso directamente a la persona por un canal privado.
3. En **Cuentas y roles**, busca por correo para identificar la cuenta correcta. Si corresponde ajustar permisos, selecciona el nuevo rol en esa fila, verifica el nombre y confirma. La pantalla impide cambiar tu propio rol desde ese selector.
4. En el panel de proyectos, localiza el proyecto por nombre y usa **Abrir** para revisar su contenido. Para obtener un informe, sigue el mismo recorrido de **Exportar PDF** descrito para el docente.

**Resultado esperado:** el docente aparece con el rol correcto y, al entrar con su propia cuenta, puede acceder a **Salas**. La vista previa de otra perspectiva sirve para orientarse en la interfaz. Para confirmar la asignación de una sala, compruébala con la cuenta de su titular.

## Si algo impide continuar

| Lo que ves | Qué hacer |
|---|---|
| La plataforma vuelve a pedir acceso | Inicia sesión otra vez y abre de nuevo el proyecto. |
| Una sala o un proyecto no aparece | Comprueba el correo y la perspectiva activos. Pide al docente que revise la inscripción, el equipo y la asociación al proyecto. |
| La descarga de PDF está deshabilitada | Elige un proyecto disponible y al menos una técnica. |
| Un invitado no puede ingresar | Vuelve a copiar el enlace desde el estudio correcto, comprueba que sigue recibiendo respuestas y pide a la persona que revise el paso de consentimiento. |
