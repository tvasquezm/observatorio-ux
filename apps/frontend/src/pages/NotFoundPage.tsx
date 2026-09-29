import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="route-state">
      <span className="kicker">ERROR 404</span>
      <h1>Esta página no existe</h1>
      <p>El enlace puede estar incompleto o la sección pudo haber cambiado.</p>
      <Link className="primary button-like" to="/">Volver al dashboard</Link>
    </main>
  );
}
