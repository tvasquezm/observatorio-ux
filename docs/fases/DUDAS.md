# Dudas del plan

## F24 · Estado de sesión entre pestañas

- Se esperaba que las pestañas abiertas reflejaran el cierre o la renovación de una sesión común.
- El cliente actualiza el estado y el tiempo en la pestaña que ejecuta la acción. El temporizador de otra pestaña puede expirar con información anterior. Ver [diagnóstico de accesos](../DIAGNOSTICO_ACCESOS.md).
- Propuesta para una fase posterior. Comunicar el cambio de sesión entre pestañas y volver a validar con `/auth/me` antes de actuar sobre un vencimiento local. Comprobar cierre, renovación y borradores en dos pestañas con reloj controlado.
