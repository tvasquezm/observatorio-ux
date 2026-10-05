import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardSortingGuide } from './CardSortingGuide';

describe('CardSortingGuide', () => {
  it('muestra los 8 pasos del curso en orden', () => {
    render(<CardSortingGuide />);
    const list = screen.getByRole('list', { name: 'Pasos para realizar un card sorting' });
    const titles = Array.from(list.querySelectorAll('summary')).map((el) =>
      el.textContent?.replace(/^\d+/, ''),
    );
    expect(titles).toEqual([
      'Inventario de contenidos',
      'Definir el usuario para el test',
      'Crear las tarjetas',
      'Registrar los resultados',
      'Realizar las pruebas',
      'Hacer preguntas',
      'Registrar la disposición final',
      'Extraer conclusiones',
    ]);
  });

  it('incluye la regla del 50% y dónde ver el consenso', () => {
    render(<CardSortingGuide />);
    expect(screen.getByText(/más del 50% de las veces/)).toBeInTheDocument();
    expect(screen.getByText(/Agrupaciones dominantes/)).toBeInTheDocument();
  });

  it('explica la jerarquía de 2 niveles y las preguntas', () => {
    render(<CardSortingGuide />);
    expect(screen.queryByText(/aún no está disponible/)).not.toBeInTheDocument();
    expect(screen.getByText(/jerarquizar en 2 niveles/)).toBeInTheDocument();
    expect(screen.getByText(/hasta 5, opcionales/)).toBeInTheDocument();
  });

  it('explica el grupo de 3 como sesiones independientes', () => {
    render(<CardSortingGuide />);
    expect(screen.getByText(/invita a las 3 personas por separado/)).toBeInTheDocument();
    expect(screen.getByText(/No hay sesión conjunta/)).toBeInTheDocument();
  });
});
