import type { PersonaContenido } from './api/persona.api';
import type { ProcessStep } from '../../shared/components/TechniqueProcess';

export const ETIQUETAS_CAMPOS: Record<string, string> = {
  hobbies: 'Hobbies',
  habilidades: 'Habilidades',
  objetivos: 'Objetivos',
  necesidades: 'Necesidades',
  motivaciones: 'Motivaciones',
  frustraciones: 'Frustraciones / barreras',
  comportamientos: 'Comportamientos',
  expectativas: 'Expectativas',
  caracteristicasDistintivas: 'Características distintivas',
  evidencia: 'Evidencia que sustenta el perfil',
  familia: 'Familia o contexto familiar',
  fotografiaUrl: 'URL de fotografía',
  contextoDeUso: 'Contexto de uso',
  rolEnServicio: 'Rol en el servicio',
  relacionConServicio: 'Relación con el servicio',
  observacionesValidacion: 'Observaciones de validación',
};

export function iniciales(nombre: string): string {
  return nombre.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
}

const cuenta = (...listas: (string[] | undefined)[]) =>
  listas.reduce((total, lista) => total + (lista?.length ?? 0), 0);

export function procesoPersona(c: PersonaContenido): ProcessStep[] {
  const basicos = Boolean(c.ocupacion?.trim()) || c.edad !== undefined;
  const querer = cuenta(c.objetivos, c.necesidades, c.motivaciones);
  const barreras = cuenta(c.frustraciones, c.comportamientos);
  const evidencia = c.evidencia?.length ?? 0;
  const validada = c.estadoValidacion === 'VALIDADA';

  return [
    {
      id: 'identidad',
      label: 'Identidad',
      detail: basicos ? 'Datos básicos' : 'Faltan ocupación o edad',
      done: c.nombreCompleto.trim() !== '' && basicos,
    },
    { id: 'objetivos', label: 'Objetivos y necesidades', detail: `${querer} registrados`, done: querer > 0 },
    { id: 'barreras', label: 'Frustraciones y conducta', detail: `${barreras} registrados`, done: barreras > 0 },
    {
      id: 'relacion',
      label: 'Relación con el servicio',
      detail: c.rolEnServicio?.trim() || c.relacionConServicio?.trim() ? 'Descrita' : 'Sin describir',
      done: Boolean(c.rolEnServicio?.trim() || c.relacionConServicio?.trim()),
    },
    {
      id: 'evidencia',
      label: 'Evidencia',
      detail: evidencia > 0 ? `${evidencia} ${evidencia === 1 ? 'fuente' : 'fuentes'}` : 'Sin evidencia',
      done: evidencia > 0,
    },
    { id: 'validacion', label: 'Confirmación del perfil', detail: validada ? 'Perfil confirmado' : 'Aún sin confirmar', done: validada },
  ];
}
