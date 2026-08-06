export const CACHE_SERVICE_PORT = Symbol('CACHE_SERVICE_PORT');

export interface CacheServicePort {
  addToBlacklist(token: string, ttlSeconds: number): Promise<void>;
  isBlacklisted(token: string): Promise<boolean>;
}
