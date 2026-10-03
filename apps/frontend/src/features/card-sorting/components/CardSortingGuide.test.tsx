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

  it('indica con honestidad lo que la herramienta aún no hace', () => {
    render(<CardSortingGuide />);
    expect(screen.getByText(/jerarquizar aún no está disponible/)).toBeInTheDocument();
    expect(screen.getByText(/Aún no hay preguntas dentro de la herramienta/)).toBeInTheDocument();
  });
});
