# Acceso con Google preparado para configuración

La integración queda desactivada mientras `GOOGLE_CLIENT_ID` esté vacío. Se conserva el acceso por contraseña. No hace falta un Client Secret para este flujo de Google Identity Services.

## Activación cuando estén disponibles las credenciales

1. Crear un cliente OAuth de tipo **Aplicación web** en Google Cloud y configurar la pantalla de consentimiento.
2. Agregar los orígenes JavaScript de la aplicación, incluyendo esquema y puerto. En desarrollo, por ejemplo `http://localhost:5173`; en producción, el dominio HTTPS real. No se requiere una URL de redirección: se usa el callback JavaScript del botón oficial.
3. Configurar `GOOGLE_CLIENT_ID` en el entorno del backend. El frontend obtiene el identificador público desde `/api/auth/google/config`; no se configura por separado ni contiene secretos.
4. Aplicar las migraciones con `pnpm --filter backend prisma:deploy`. La migración de Google agrega una identidad opcional y única; conserva las cuentas existentes.
5. Reiniciar el backend y publicar el frontend y las políticas Nginx actualizadas. Las fuentes de los PDF se copian al compilar el backend.
6. Autorizar la cuenta desde el panel administrativo, seleccionando **Cuenta de Google**, y comprobar el ingreso con el mismo correo de Gmail o Google Workspace.

Sin credenciales configuradas, no se carga la biblioteca externa ni aparece un botón que prometa un acceso activo. El admin puede preautorizar cuentas, cuyo ingreso quedará disponible al activar Google.

## Comportamiento de acceso

- Google demuestra la identidad; los permisos y roles siguen perteneciendo a la base del Observatorio.
- No hay autorregistro: un correo que no haya sido autorizado previamente recibe una denegación. Google no puede asignar el rol ADMIN.
- Se verifican firma, audiencia, emisor, vigencia, correo verificado y el nonce de la solicitud. El nonce dura cinco minutos, viaja en una cookie HttpOnly y se elimina al ingresar.
- La vinculación inicial por correo se limita a Gmail o Google Workspace. Después se reconoce el identificador estable `sub`, incluso si cambia el correo en Google.
- Los estudiantes conservan la comprobación de sala activa. El acceso por contraseña mantiene su comportamiento anterior.
- Se emiten las cookies de sesión y CSRF existentes; no se guardan tokens de Google en localStorage ni se devuelve el JWT local en JSON.

## Referencias

- [Configuración de Google Identity Services](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).
- [Verificación del token en el servidor](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
- Referencia visual de los PDF: [Simple report de Overleaf](https://www.overleaf.com/latex/templates/simple-report/xttmdbmftwqc) y [Latin Modern en CTAN](https://ctan.org/pkg/lm). Se adapta la composición; la aplicación sigue generando sus informes con pdfmake.

## Verificación pendiente de configuración

Se pueden probar la autorización, los rechazos y el intercambio de credenciales con dobles de prueba. El ingreso real con Google y los orígenes OAuth deben verificarse después de configurar el Client ID y aplicar la migración. No se ha modificado ninguna configuración de Google Cloud.
