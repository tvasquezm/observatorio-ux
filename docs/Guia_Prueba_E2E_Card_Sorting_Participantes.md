# Guía de Prueba E2E — Card Sorting con Registro de Participantes

Flujo completo: configuración por el evaluador/docente y participación del usuario final, vía API

---

## FASE A: Configuración Inicial por el Evaluador / Docente

### Paso 1: Autenticación del Evaluador

- **Rol:** Evaluador / Docente
- **Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "estudiante1@ux.utem.cl",
  "password": "TuPasswordDeDocente"
}
```

**Acción:** Copia el `access_token` de la respuesta, haz clic en el botón Authorize de Swagger y pégalo.

---

### Paso 2: Crear el Proyecto

- **Rol:** Evaluador / Docente
- **Endpoint:** `POST /api/projects`

**Request Body:**
```json
{
  "nombre": "Estudio Arquitectura Web 2026",
  "descripcion": "Evaluación UX de ordenación de contenidos"
}
```

**Respuesta Esperada (201 Created):**
```json
{
  "id": "c58d6894-51f4-4f8c-b72b-ee2ee748fcfb",
  "nombre": "Estudio Arquitectura Web 2026"
}
```

👉 Guarda el PROYECTO_ID (c58d6894...).

---

### Paso 3: Crear el Estudio de Card Sorting

- **Rol:** Evaluador / Docente
- **Endpoint:** `POST /api/card-sorting/sessions`

**Request Body:**
```json
{
  "proyectoId": "c58d6894-51f4-4f8c-b72b-ee2ee748fcfb",
  "nombre": "Card Sorting Abierto",
  "tipoCardSorting": "ABIERTO",
  "tarjetas": [
    { "etiqueta": "Carrito de Compras" },
    { "etiqueta": "Perfil de Usuario" },
    { "etiqueta": "Catálogo de Productos" }
  ]
}
```

**Respuesta Esperada (201 Created):**
```json
{
  "id": "f8fbd7e7-4ac5-4424-9e8e-2e790bebb73a",
  "tipoCardSorting": "ABIERTO",
  "cardsDefinidas": [
    { "id": "edda1910-3350-4755-9f12-30da59752799", "etiqueta": "Carrito de Compras" },
    { "id": "b2f6cb09-04e8-4e55-bc3d-1fcdfc0db5f2", "etiqueta": "Perfil de Usuario" },
    { "id": "899de926-b869-478d-8c6e-d62a98fd5f0b", "etiqueta": "Catálogo de Productos" }
  ]
}
```

👉 Guarda el ESTUDIO_ID (f8fbd7e7...) y los IDs de las tarjetas.

---

### Paso 4: Registrar la Invitación del Participante en el Proyecto

- **Rol:** Evaluador / Docente
- **Endpoint:** `POST /api/projects/{id}/participantes`
- **Path Parameter (id):** c58d6894-51f4-4f8c-b72b-ee2ee748fcfb (PROYECTO_ID)

**Request Body:**
```json
{
  "email": "participante.estudio2026@ux.utem.cl"
}
```

**Respuesta Esperada (201 Created):**
```json
{
  "id": "fc2a8cd7-9772-495e-94fa-9dfb20bd2ccd",
  "email": "participante.estudio2026@ux.utem.cl",
  "usado": false
}
```

---

## FASE B: Flujo Completo del Participante

### Paso 5: Registro Público del Participante

- **Rol:** Participante
- **Endpoint:** `POST /api/auth/participants/register`

**Request Body:**
```json
{
  "proyectoId": "c58d6894-51f4-4f8c-b72b-ee2ee748fcfb",
  "email": "participante.estudio2026@ux.utem.cl"
}
```

**Respuesta Esperada (201 Created):**
```json
{
  "participanteId": "e2073ab0-cf10-4a02-8ccb-905fd454265b",
  "yaRegistrado": false
}
```

👉 Guarda el PARTICIPANTE_ID (e2073ab0...).

---

### Paso 6: Generar Token Inicial del Participante

- **Rol:** Participante
- **Endpoint:** `POST /api/auth/participants/token`

**Request Body:**
```json
{
  "proyectoId": "c58d6894-51f4-4f8c-b72b-ee2ee748fcfb",
  "participanteId": "e2073ab0-cf10-4a02-8ccb-905fd454265b"
}
```

**Acción:** Copia el `access_token` generado, desautoriza el token de docente en el botón Authorize de Swagger y pega este nuevo token.

---

### Paso 7: Registrar Consentimiento Informado

- **Rol:** Participante
- **Endpoint:** `POST /api/auth/participants/consent`

**Request Body:** (Nota: la propiedad `version` es obligatoria)
```json
{
  "proyectoId": "c58d6894-51f4-4f8c-b72b-ee2ee748fcfb",
  "participanteId": "e2073ab0-cf10-4a02-8ccb-905fd454265b",
  "aceptado": true,
  "version": "1.0"
}
```

**Respuesta Esperada:** 200 OK o 201 Created.

---

### Paso 8: Actualizar Token con Consentimiento Aceptado

- **Rol:** Participante
- **Endpoint:** `POST /api/auth/participants/token`

**Request Body:** Reutiliza el payload del Paso 6.

**Acción:** Copia el nuevo `access_token` emitido y actualiza la sección Authorize en Swagger.

---

### Paso 9: Unirse al Estudio (/join)

- **Rol:** Participante
- **Endpoint:** `POST /api/card-sorting/sessions/{id}/join`
- **Path Parameter (id):** f8fbd7e7-4ac5-4424-9e8e-2e790bebb73a (ESTUDIO_ID del Paso 3)

**Request Body:** Vacío

**Respuesta Esperada (201 Created):**
```json
{
  "id": "437fad76-7edb-4700-aa54-cc49f97af35d",
  "proyectoId": "c58d6894-51f4-4f8c-b72b-ee2ee748fcfb",
  "estado": "EN_PROGRESO",
  "participanteId": "e2073ab0-cf10-4a02-8ccb-905fd454265b",
  "estudioId": "f8fbd7e7-4ac5-4424-9e8e-2e790bebb73a",
  "estudio": {
    "cardsDefinidas": [
      { "id": "edda1910-3350-4755-9f12-30da59752799", "etiqueta": "Carrito de Compras" },
      { "id": "b2f6cb09-04e8-4e55-bc3d-1fcdfc0db5f2", "etiqueta": "Perfil de Usuario" },
      { "id": "899de926-b869-478d-8c6e-d62a98fd5f0b", "etiqueta": "Catálogo de Productos" }
    ]
  }
}
```

👉 Guarda la SESION_PARTICIPANTE_ID devuelta en la raíz (437fad76...).

---

### Paso 10: Enviar Resultados (/results)

- **Rol:** Participante
- **Endpoint:** `POST /api/card-sorting/sessions/{id}/results`
- **Path Parameter (id):** 437fad76-7edb-4700-aa54-cc49f97af35d (SESION_PARTICIPANTE_ID del Paso 9)

**Request Body:**
```json
{
  "grupos": [
    {
      "categoriaNombre": "Tienda y Compras",
      "cardIds": [
        "edda1910-3350-4755-9f12-30da59752799",
        "899de926-b869-478d-8c6e-d62a98fd5f0b"
      ]
    },
    {
      "categoriaNombre": "Cuenta de Usuario",
      "cardIds": [
        "b2f6cb09-04e8-4e55-bc3d-1fcdfc0db5f2"
      ]
    }
  ]
}
```

**Respuesta Esperada:** 201 Created o 200 OK.

---

## Mapa de Dependencias de IDs

| ID / Parámetro | Se obtiene en... | Se usa en... |
|---|---|---|
| PROYECTO_ID | Paso 2 (POST /api/projects) | Pasos 3, 4, 5, 6 y 7 |
| ESTUDIO_ID | Paso 3 (POST /api/card-sorting/sessions) | Paso 9 (/join en URL) |
| PARTICIPANTE_ID | Paso 5 (POST /api/auth/participants/register) | Pasos 6 y 7 |
| TARJETA_IDs | Paso 3 o Paso 9 (cardsDefinidas) | Paso 10 (cardIds) |
| SESION_PARTICIPANTE_ID | Paso 9 (POST /join) | Paso 10 (/results en URL) |
