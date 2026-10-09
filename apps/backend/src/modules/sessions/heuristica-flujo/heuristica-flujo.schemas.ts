import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

const texto = z.string().max(10000);
const identificador = z.string().min(1).max(150);
const unico = (ids: string[]) => new Set(ids).size === ids.length;
const ids = (max: number) => z.array(identificador).max(max).refine(unico, 'Identificadores repetidos');
const origen = z.strictObject({ metodologiaId: identificador, autor: texto.min(1), fuente: texto.min(1), version: texto.min(1), tipo: texto.min(1) });
const criterio = z.strictObject({ id: identificador, nombre: texto.min(1), descripcion: texto, categoria: texto.min(1), origen, peso: z.number().finite().positive().max(10000) });
const nivel = z.strictObject({ id: identificador, etiqueta: texto.min(1), significado: texto.min(1), valor: z.number().finite().optional() });
const escala = z.strictObject({
  tipo: z.enum(['categorica', 'ordinal', 'numerica', 'cualitativa']),
  niveles: z.array(nivel).min(1).max(100).refine(v => unico(v.map(n => n.id)), 'Niveles repetidos'),
  sentido: z.enum(['mayor_mejor', 'menor_mejor', 'sin_orden']), fuente: texto.min(1),
  formula: z.literal('media_ponderada').optional(),
}).superRefine((v, ctx) => {
  if (v.formula && (v.tipo !== 'numerica' || v.sentido === 'sin_orden' || v.niveles.some(n => n.valor === undefined))) ctx.addIssue({ code: 'custom', message: 'La media requiere escala numérica explícita, valores y sentido.' });
  if (v.tipo === 'numerica' && v.niveles.some(n => n.valor === undefined)) ctx.addIssue({ code: 'custom', message: 'Los niveles numéricos requieren valor.' });
});
export const metodologiaSchema = z.strictObject({
  id: identificador, nombre: texto.min(1), autor: texto.min(1), fuente: texto.min(1), version: texto.min(1), tipo: texto.min(1), ambito: texto,
  criterios: z.array(criterio).min(1).max(500).refine(v => unico(v.map(c => c.id)), 'Criterios repetidos'), escala, protegida: z.boolean(),
});
export const configuracionSchema = z.strictObject({
  nombre: z.string().max(200),
  producto: z.strictObject({ clave: z.string().max(200), nombre: z.string().max(200), version: z.string().max(200), url: z.string().max(2000).refine(v => !v || /^https?:\/\//i.test(v) && URL.canParse(v), 'URL HTTP(S) inválida'), dispositivo: z.string().max(200) }),
  objetivo: texto, tareas: texto, pantallas: texto, exclusiones: texto, metodologia: metodologiaSchema,
  evaluadorIds: ids(5).min(1), lectorIds: ids(100),
});
export const respuestaSchema = z.strictObject({ criterioId: identificador, valor: identificador.nullable(), noAplica: z.boolean(), motivo: texto, notas: texto });
export const hallazgoSchema = z.strictObject({
  id: identificador, criterioIds: ids(500), titulo: z.string().max(300), pantalla: texto, descripcion: texto, recomendacion: texto,
  severidad: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]), prioridad: z.enum(['BAJA', 'MEDIA', 'ALTA', 'URGENTE']), notas: texto, evidenciaIds: ids(50),
});
export const revisionSchema = z.strictObject({ revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) });
export const configuracionBodySchema = revisionSchema.extend({ configuracion: configuracionSchema });
export const trabajoSchema = revisionSchema.extend({
  respuestas: z.array(respuestaSchema).max(500).refine(v => unico(v.map(r => r.criterioId)), 'Respuestas repetidas'),
  hallazgos: z.array(hallazgoSchema).max(1000).refine(v => unico(v.map(h => h.id)), 'Hallazgos repetidos'),
});
export const consensoSchema = revisionSchema.extend({
  criterios: z.array(respuestaSchema.extend({ justificacion: texto })).max(500).refine(v => unico(v.map(c => c.criterioId)), 'Criterios repetidos'),
  hallazgos: z.array(hallazgoSchema.extend({ origenIds: ids(5000), decision: z.enum(['PENDIENTE', 'ACEPTADO', 'DESCARTADO']), justificacion: texto })).max(5000).refine(v => unico(v.map(h => h.id)), 'Hallazgos repetidos'),
});
export const anotacionesSchema = revisionSchema.extend({ anotaciones: z.array(z.strictObject({
  id: identificador, tipo: z.enum(['rectangulo', 'circulo', 'flecha', 'destacado', 'texto']),
  x: z.number().finite().min(0).max(1), y: z.number().finite().min(0).max(1), x2: z.number().finite().min(0).max(1), y2: z.number().finite().min(0).max(1),
  color: z.string().regex(/^#[a-fA-F0-9]{6}$/), texto: z.string().max(1000),
}).refine(v => v.tipo !== 'texto' || !!v.texto.trim(), 'Texto de anotación requerido')).max(100).refine(v => unico(v.map(a => a.id)), 'Anotaciones repetidas') });
export const comparacionSchema = revisionSchema.extend({ previaId: z.uuid(), vinculos: z.array(z.strictObject({
  anteriorId: identificador.nullable(), actualId: identificador.nullable(),
  estado: z.enum(['SOLUCIONADO', 'PERMANECE', 'MEJORO', 'EMPEORO', 'NUEVO', 'NO_VERIFICADO', 'NO_COMPARABLE']), justificacion: texto.min(1).refine(v => !!v.trim()),
})).max(5000) });

export function validar<T>(schema: z.ZodType<T>, body: unknown): T {
  const resultado = schema.safeParse(body);
  if (!resultado.success) throw new BadRequestException({ message: 'Datos inválidos.', errores: resultado.error.issues.map(i => ({ campo: i.path.join('.'), mensaje: i.message })) });
  return resultado.data;
}
