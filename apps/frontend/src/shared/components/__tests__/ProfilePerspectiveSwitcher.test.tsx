import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProfilePerspectiveSwitcher } from '../ProfilePerspectiveSwitcher';

describe('ProfilePerspectiveSwitcher', () => {
  it('permite al administrador seleccionar las tres perspectivas', () => {
    const onChange = vi.fn();
    render(
      <ProfilePerspectiveSwitcher accountRole="ADMIN" activeRole="ADMIN" onChange={onChange} />,
    );

    expect(screen.getByText('Administrador', { selector: '.perspective-status b' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver como Estudiante' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Ver como Docente' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Ver como Administrador' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Ver como Administrador' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByRole('button', { name: 'Ver como Administrador' }).querySelector('.perspective-check'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ver como Estudiante' }));
    expect(onChange).toHaveBeenCalledWith('ESTUDIANTE');
  });

  it('deja dos opciones al docente y una al estudiante', () => {
    const { rerender } = render(
      <ProfilePerspectiveSwitcher accountRole="DOCENTE" activeRole="DOCENTE" onChange={() => {}} />,
    );

    expect(screen.getByRole('button', { name: 'Ver como Estudiante' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Ver como Docente' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Administrador: no disponible/ })).toBeDisabled();

    rerender(
      <ProfilePerspectiveSwitcher accountRole="ESTUDIANTE" activeRole="ESTUDIANTE" onChange={() => {}} />,
    );

    expect(screen.getByRole('button', { name: 'Ver como Estudiante' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Docente: no disponible/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Administrador: no disponible/ })).toBeDisabled();
  });
});
