Aquí tienes un mensaje resumen que puedes guardar o compartir (por ejemplo, en el README del módulo, en un issue de GitHub, o para tu informe de tesis):

Deuda técnica — Módulo Evaluación Heurística
Detectada durante auditoría de integración (Postman), 03/08/2026

1. Falta autorización por propiedad de sesión (prioridad alta)
registrarHallazgo, finalizarSesion y obtenerSesion en EvaluacionHeuristicaService reciben el usuario autenticado pero no verifican que sea el dueño de la sesión (usuario.id === sesion.evaluadorId). Actualmente, cualquier usuario autenticado puede leer, editar o finalizar la sesión de otro evaluador con solo conocer el sesionId. Se requiere agregar la validación de pertenencia (y considerar excepción para rol ADMIN).

2. No existe RolesGuard
El schema define Rol (ESTUDIANTE, DOCENTE, ADMIN) pero ningún endpoint restringe acceso por rol. Falta implementar un guard de roles reutilizable para todos los módulos.

3. Tipado débil en capa de autenticación
Controller y service usan usuario: any en lugar de la interfaz AuthenticatedUser ya definida en el proyecto. Esto oculta errores en tiempo de compilación que solo aparecen en runtime (como el bug de usuario.id undefined detectado en esta auditoría).

4. Secreto JWT hardcodeado
'secreto_super_seguro_de_tu_tesis' está escrito directamente en jwt.strategy.ts y auth.module.ts. Debe moverse a variable de entorno (JWT_SECRET) vía ConfigService.

5. Endpoint /auth/test-token no distingue tipo de usuario
El endpoint temporal de generación de tokens de prueba tiene el payload hardcodeado (actualmente fijo a un Usuario evaluador). Módulos distintos (Heurística vs. Card Sorting) requieren tokens con sub de Usuario o de Participante respectivamente, y hoy se pisan entre sí. Pendiente: parametrizar por query param o crear variantes separadas.

6. Falta validación de formato UUID en parámetros de ruta
proyectoId y sesionId se reciben como string sin ParseUUIDPipe, por lo que un ID malformado produce error 500 de Prisma no controlado en lugar de un 400 claro.

7. Restos de debugging en código productivo
console.log('Objeto usuario detectado:', usuario) en EvaluacionHeuristicaController.crear — remover antes de considerar el módulo cerrado.