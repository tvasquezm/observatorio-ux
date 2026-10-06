// apps/frontend/src/features/legal/pages/PrivacyPage.tsx
//
// Página pública (sin sesión): qué guarda el navegador al usar la plataforma.
// Si cambia una cookie o una clave de almacenamiento, actualizar este texto.

export function PrivacyPage() {
  return (
    <main className="privacy">
      <article className="privacy-card">
        <h1>Privacidad y cookies</h1>
        <p className="privacy-updated">Actualizado en octubre de 2026</p>
        <p>
          UXLab Observatorio es una plataforma de investigación de experiencia usuaria de uso
          académico, de la Universidad Tecnológica Metropolitana. Esta página explica qué guarda
          tu navegador cuando la usas.
        </p>

        <h2>Cookies</h2>
        <p>
          Usamos 2 cookies, ambas necesarias para que la sesión funcione de forma segura. No
          usamos cookies de analítica, publicidad ni seguimiento. Solo se crean cuando inicias
          sesión como docente, estudiante o administrador; los participantes no reciben cookies.
        </p>
        <dl>
          <dt><code>evaluadorToken</code></dt>
          <dd>
            Mantiene tu sesión iniciada. Solo la lee el servidor: el código de la página no puede
            acceder a ella. Se elimina al cerrar sesión y vence junto con la sesión.
          </dd>
          <dt><code>csrfToken</code></dt>
          <dd>
            Protege tu cuenta de solicitudes falsas enviadas desde otros sitios. Se elimina al
            cerrar sesión.
          </dd>
        </dl>

        <h2>Almacenamiento del navegador</h2>
        <p>Además de las cookies, la plataforma guarda en tu navegador, sin enviarlo a ningún tercero:</p>
        <ul>
          <li>
            <strong>Docentes, estudiantes y administradores:</strong> tu nombre, correo y rol, para
            mostrar la interfaz mientras se valida tu sesión; la vista que elegiste (en la pestaña
            actual); y tus preferencias de tema claro u oscuro y alto contraste (observatorio-ux-contrast).
          </li>
          <li>
            <strong>Participantes de un estudio:</strong> un identificador temporal anónimo y la
            credencial de la actividad, que se borran al cerrar la pestaña; y tu avance en el
            ejercicio, para que no lo pierdas si recargas la página. Ese avance se elimina al enviar
            tus respuestas.
          </li>
        </ul>

        <h2>Datos de participantes</h2>
        <p>
          En el acceso abierto por enlace o código QR no pedimos nombre ni correo. Tu participación
          es voluntaria y las respuestas se usan para análisis de experiencia usuaria.
        </p>

        <h2>Cómo borrar estos datos</h2>
        <p>
          Puedes eliminar las cookies y el almacenamiento desde la configuración de tu navegador.
          Si lo haces, tendrás que volver a iniciar sesión.
        </p>

        <h2>Consultas</h2>
        <p>
          Si tienes dudas sobre tus datos, escribe a tu docente o a la persona administradora de la
          plataforma.
        </p>
      </article>
    </main>
  );
}
