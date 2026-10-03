Genera el mensaje de commit con el formato Conventional Commits.

- Primera línea: `tipo(scope): descripción`.
- El tipo y el scope van en inglés y en minúscula. Tipos válidos: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
- Scopes habituales en este repo: ui, ux, persona, reports, auth, salas, card-sorting, responsive, e2e, deps, docker, vscode. Omite el scope si el cambio no es de un área concreta.
- La descripción va en español, en imperativo, con minúscula inicial y sin punto final. La primera línea completa no pasa de 72 caracteres.
- Describe la intención del cambio. Evita mensajes vagos como "actualizar código" o "cambios".
- Si hace falta cuerpo, sepáralo con una línea en blanco, escríbelo en español, usa viñetas con `-` y explica por qué se hizo el cambio, no solo qué cambió.
- Si el cambio rompe compatibilidad, agrega al pie `BREAKING CHANGE:` seguido de la explicación.
- Cada commit debe representar un solo cambio lógico.
