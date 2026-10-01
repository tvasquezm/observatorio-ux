interface Entrada<V> {
  value: V;
  expiresAt: number;
}

/**
 * Cache en memoria con TTL y tope de entradas (descarta la más antigua).
 * Vive en el proceso: con más de una réplica de backend cada una tiene la
 * suya, y un cambio tarda como máximo `ttlMs` en verse en las demás.
 */
export class TtlCache<V> {
  private readonly entries = new Map<string, Entrada<V>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 5000,
  ) {}

  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V): void {
    this.entries.delete(key);
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }
}
