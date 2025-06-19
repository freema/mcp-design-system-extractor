export class Cache {
  private cache: Map<string, { data: any; timestamp: number }>;
  private cacheDuration: number;

  constructor(cacheDurationMs: number = 300000) {
    // 5 minutes default
    this.cache = new Map();
    this.cacheDuration = cacheDurationMs;
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}
