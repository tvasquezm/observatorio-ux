import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OptionalTag } from './OptionalTag';

describe('OptionalTag', () => {
  it('marca la etiqueta del campo sin convertirlo en obligatorio', () => {
    render(<label>Notas<OptionalTag /><input /></label>);
    expect(screen.getByLabelText('Notas (opcional)')).not.toBeRequired();
  });
});
