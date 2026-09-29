Markdown
# Documentación del Sprint 7: Reportes PDF y Exportación JSON

## 📋 Resumen del Sprint
El Sprint 7 se enfoca en dotar a la plataforma del Observatorio UX de capacidades avanzadas de extracción de información analítica por proyecto. Esto incluye la generación y descarga de documentos formales en formato PDF utilizando datos en tiempo real, así como un endpoint dedicado a la exportación estructurada de datos en formato JSON para integraciones o respaldos.

---

## 🚀 Endpoints Implementados

### 1. Exportación de Datos en JSON
Permite obtener una estructura consolidada con toda la información y métricas asociadas a un proyecto de investigación.

* **Ruta:** `GET /api/projects/:proyectoId/reports/json`
* **Seguridad:** Autenticado mediante Cookie HttpOnly (`evaluadorToken`) o Bearer Token. Protegido por `JwtAuthGuard` y `RolesGuard`.
* **Roles Permitidos:** `ESTUDIANTE`, `DOCENTE`, `ADMIN`.
* **Respuesta de Ejemplo:**
  ```json
  {
    "generatedAt": "2026-09-28T18:57:08.915Z",
    "proyecto": {
      "id": "2220b224-865d-4230-a484-19338c66b9e6",
      "nombre": "Estudio de Arquitectura de Información 2026",
      "descripcion": "Proyecto de prueba para validación de Card Sorting",
      "createdAt": "2026-09-16T22:33:42.615Z",
      "creador": {
        "id": "c702fdcf-ff14-4e49-bcdf-620f1738bb01",
        "nombre": "Estudiante Uno",
        "email": "estudiante1@ux.utem.cl"
      }
    },
    "resumen": {
      "artefactos": 0,
      "sesiones": 0,
      "comentarios": 0
    },
    "artefactos": [],
    "sesiones": [],
    "comentarios": []
  }
2. Generación y Descarga de Reporte PDF
Genera un documento binario en formato PDF basado en la plantilla y los datos reales del proyecto consultado.

Ruta: GET /api/projects/:proyectoId/reports/pdf

Seguridad: Mismos mecanismos de autenticación y roles que el endpoint JSON.

Headers de Respuesta:

Content-Type: application/pdf

Content-Disposition: attachment; filename="reporte-proyecto-{proyectoId}.pdf"

🛠️️ Decisiones Arquitectónicas y Técnicas
Prioridad de Enrutamiento en NestJS:

Para evitar conflictos con el comodín de rutas generales @Get(':id') en ProjectsController, las rutas específicas de reportes (:proyectoId/reports/json y :proyectoId/reports/pdf) se declararon explícitamente antes del decorador de búsqueda por ID individual.

Seguridad y Autenticación Híbrida:

Evaluadores (Profesores/Admins): Autenticados mediante la cookie evaluadorToken (HttpOnly) combinada con una estrategia Double-Submit Cookie para validación de mutaciones y peticiones seguras mediante x-csrf-token.

Clientes externos / CLI / Swagger: Soporte de fallback compatible con autenticación tradicional Authorization: Bearer <token>.

Manejo de Respuestas Binarias:

El controlador intercepta el flujo nativo utilizando @Res() response: Response para inyectar los headers HTTP correspondientes al tamaño y tipo de archivo PDF generado antes de finalizar el stream con response.end(pdf).

🧪 Guía rápida de pruebas (CLI / cURL)
Puedes validar el correcto funcionamiento de los endpoints utilizando la terminal:

Probar exportación JSON:
Bash
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/projects/2220b224-865d-4230-a484-19338c66b9e6/reports/json
Descargar reporte PDF:
Bash
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  -o reporte-prueba.pdf \
  http://localhost:3000/api/projects/2220b224-865d-4230-a484-19338c66b9e6/reports/pdf
Verificar integridad del PDF descargado:
Bash
file reporte-prueba.pdf
# Resultado esperado: PDF document, version ...