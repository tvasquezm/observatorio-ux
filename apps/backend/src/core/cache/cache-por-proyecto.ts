import { Subscription } from 'rxjs';
import { cambiosDeArtefactos } from '../../modules/artifacts/artifacts-eventos.js';

/**
 * Caché en memoria de vida corta para listados que muchas personas piden a la vez (analítica del docente).
 * - Dos peticiones simultáneas con el caché vacío comparten un solo cálculo.
 * - Cualquier aviso de cambio del proyecto (artefactos, integrantes, comentarios) borra sus entradas, así que
 *   tras un cambio nadie ve datos viejos; el plazo solo cubre lo que no emite aviso.
 * Vale con una sola instancia del backend, igual que los avisos en tiempo real.
 * Solo debe guardar datos iguales para todas las personas: el control de acceso se hace antes de consultarlo.
 */
export class CachePorProyecto<T> {
  private readonly entradas = new Map<string, { proyectoId: string; expira: number; valor: Promise<T> }>();
  private readonly suscripcion: Subscription;

  constructor(private readonly vidaMs = 20_000, private readonly maximo = 200) {
    this.suscripcion = cambiosDeArtefactos.subscribe((cambio) => this.invalidar(cambio.proyectoId));
  }

  async obtener(proyectoId: string, clave: string, calcular: () => Promise<T>): Promise<T> {
    const ahora = Date.now();
    const completa = `${proyectoId}|${clave}`;
    const existente = this.entradas.get(completa);
    if (existente && existente.expira > ahora) return existente.valor;

    const valor = calcular();
    if (this.entradas.size >= this.maximo) this.entradas.delete(this.entradas.keys().next().value as string);
    this.entradas.set(completa, { proyectoId, expira: ahora + this.vidaMs, valor });
    // Un cálculo fallido no se conserva: la siguiente petición lo intenta de nuevo.
    valor.catch(() => { if (this.entradas.get(completa)?.valor === valor) this.entradas.delete(completa); });
    return valor;
  }

  invalidar(proyectoId: string): void {
    for (const [clave, entrada] of this.entradas) if (entrada.proyectoId === proyectoId) this.entradas.delete(clave);
  }

  cerrar(): void {
    this.suscripcion.unsubscribe();
    this.entradas.clear();
  }
}
