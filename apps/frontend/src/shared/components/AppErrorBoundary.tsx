import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('Error de renderizado', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="route-state" role="alert">
        <span className="kicker">ALGO SALIÓ MAL</span>
        <h1>No pudimos mostrar esta pantalla</h1>
        <p>Tus datos guardados siguen intactos. Recarga para volver a intentarlo.</p>
        <button type="button" className="primary" onClick={() => window.location.reload()}>
          Recargar aplicación
        </button>
      </main>
    );
  }
}
