import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { METODOLOGIAS_HEURISTICAS } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, ConsensoFlujo } from '@observatorio-ux/shared-types';
import { ResumenCriterios } from './ResumenCriterios';

it('separa problemas, aciertos y no aplica con la clasificación de la escala', () => {
  const metodologia = structuredClone(METODOLOGIAS_HEURISTICAS.find(m => m.id === 'hassan-checklist-2003')!);
  metodologia.criterios = metodologia.criterios.slice(0, 3);
  const configuracion: ConfiguracionFlujo = { nombre: 'Prueba', producto: { clave: 'p', nombre: 'P', version: '', url: '', dispositivo: '' }, objetivo: '', tareas: '', pantallas: '', exclusiones: '', metodologia, evaluadorIds: [], lectorIds: [] };
  const consenso: ConsensoFlujo = { aprobadoPor: [], hallazgos: [], criterios: metodologia.criterios.map((c, i) => ({ criterioId: c.id, valor: i === 2 ? null : metodologia.escala.niveles.find(n => n.favorable === (i === 1))!.id, noAplica: i === 2, motivo: '', notas: '', justificacion: '' })) };
  render(<ResumenCriterios configuracion={configuracion} consenso={consenso} />);
  expect(within(screen.getByRole('region', { name: 'Problemas' })).getByText(metodologia.criterios[0].nombre)).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Aciertos' })).getByText(metodologia.criterios[1].nombre)).toBeInTheDocument();
  expect(screen.queryByText(metodologia.criterios[2].nombre)).not.toBeInTheDocument();
  expect(screen.getByText('1 no aplican.')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Problemas \(1\)/ })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Aciertos \(1\)/ })).toBeInTheDocument();
});
