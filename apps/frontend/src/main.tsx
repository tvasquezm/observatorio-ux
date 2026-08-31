import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { ToastContainer } from './shared/components/ToastContainer';

// Instancia única de TanStack Query para toda la app. Si en algún punto
// necesitas configurar retry/staleTime globales, es acá.
const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />

        {/*
          Fuera de <App /> pero dentro del mismo árbol: se monta UNA sola
          vez acá, nunca dentro de una feature. Su posicionamiento es
          fixed (ver ToastContainer.tsx), así que flota sobre cualquier
          pantalla — Persona, Journey Map, Momentos Críticos, lo que sea
          que renderice el router adentro de <App />.
        */}
        <ToastContainer />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
