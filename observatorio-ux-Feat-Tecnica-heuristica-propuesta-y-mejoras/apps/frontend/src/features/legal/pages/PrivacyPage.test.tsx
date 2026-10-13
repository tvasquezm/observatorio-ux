import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrivacyPage } from './PrivacyPage';

describe('PrivacyPage', () => {
  it('declara las 2 cookies necesarias y que no hay seguimiento', () => {
    render(<PrivacyPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Privacidad y cookies' })).toBeInTheDocument();
    expect(screen.getByText('evaluadorToken')).toBeInTheDocument();
    expect(screen.getByText('csrfToken')).toBeInTheDocument();
    expect(screen.getByText(/No usamos cookies de analítica, publicidad ni seguimiento/)).toBeInTheDocument();
  });

  it('informa el almacenamiento del navegador de evaluadores y participantes', () => {
    render(<PrivacyPage />);

    expect(screen.getByText(/Participantes de un estudio:/)).toBeInTheDocument();
    expect(screen.getByText(/Docentes, estudiantes y administradores:/)).toBeInTheDocument();
  });
});
