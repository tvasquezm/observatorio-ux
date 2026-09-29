import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import './styles/theme.css';
import App from './App';
import { ToastContainer } from './shared/components/ToastContainer';
import { ConfirmDialog } from './shared/components/ui/ConfirmDialog';
import { AppErrorBoundary } from './shared/components/AppErrorBoundary';

// Instancia única de TanStack Query para toda la app. Si en algún punto
// necesitas configurar retry/staleTime globales, es acá.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = error && typeof error === 'object' && 'status' in error
          ? Number(error.status)
          : 0;
        return status >= 400 && status < 500 ? false : failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});

const router = createBrowserRouter([{ path: '*', element: <><App /><ToastContainer /><ConfirmDialog /></> }]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
