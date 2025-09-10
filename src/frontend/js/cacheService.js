// Cache Service per ottimizzare le query
(function() {
    'use strict';
    
    // Evita duplicazioni
    if (window.cacheService) {
        console.warn('CacheService already loaded');
        return;
    }

    class CacheService {
        constructor() {
            this.cache = new Map();
            this.cacheTTL = new Map(); // Time To Live per ogni chiave
            this.defaultTTL = 5 * 60 * 1000; // 5 minuti di default
        }

        // Genera chiave cache dalle funzioni e parametri
        generateKey(functionName, params = {}) {
            const sortedParams = Object.keys(params)
                .sort()
                .reduce((result, key) => {
                    result[key] = params[key];
                    return result;
                }, {});
            
            return `${functionName}_${JSON.stringify(sortedParams)}`;
        }

        // Controlla se un elemento è ancora valido
        isValid(key) {
            const expiry = this.cacheTTL.get(key);
            return expiry && Date.now() < expiry;
        }

        // Ottieni dati dalla cache
        get(key) {
            if (this.isValid(key)) {
                console.log(`[Cache] HIT: ${key}`);
                return this.cache.get(key);
            } else {
                console.log(`[Cache] MISS: ${key}`);
                this.cache.delete(key);
                this.cacheTTL.delete(key);
                return null;
            }
        }

        // Salva dati in cache
        set(key, data, ttl = this.defaultTTL) {
            console.log(`[Cache] SET: ${key} (TTL: ${ttl}ms)`);
            this.cache.set(key, data);
            this.cacheTTL.set(key, Date.now() + ttl);
        }

        // Rimuovi da cache
        delete(key) {
            console.log(`[Cache] DELETE: ${key}`);
            this.cache.delete(key);
            this.cacheTTL.delete(key);
        }

        // Pulisci cache scaduta
        cleanup() {
            const now = Date.now();
            for (const [key, expiry] of this.cacheTTL.entries()) {
                if (now >= expiry) {
                    this.cache.delete(key);
                    this.cacheTTL.delete(key);
                }
            }
        }

        // Pulisci tutta la cache
        clear() {
            console.log('[Cache] CLEAR ALL');
            this.cache.clear();
            this.cacheTTL.clear();
        }

        // Invalida cache per pattern
        invalidatePattern(pattern) {
            console.log(`[Cache] INVALIDATE PATTERN: ${pattern}`);
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.delete(key);
                }
            }
        }

        // Wrapper per API calls con cache
        async withCache(functionName, apiCall, params = {}, ttl = this.defaultTTL) {
            const key = this.generateKey(functionName, params);
            
            // Prova prima dalla cache
            const cachedData = this.get(key);
            if (cachedData !== null) {
                return cachedData;
            }

            // Se non in cache, esegui API call
            try {
                const data = await apiCall();
                this.set(key, data, ttl);
                return data;
            } catch (error) {
                console.error(`[Cache] API call failed for ${key}:`, error);
                throw error;
            }
        }

        // Statiche cache
        getStats() {
            return {
                size: this.cache.size,
                keys: Array.from(this.cache.keys()),
                memoryUsage: this.estimateMemoryUsage()
            };
        }

        // Stima uso memoria (approssimativo)
        estimateMemoryUsage() {
            let size = 0;
            for (const [key, value] of this.cache.entries()) {
                size += key.length * 2; // chars are 2 bytes
                size += JSON.stringify(value).length * 2;
            }
            return size; // bytes
        }
    }

    // Crea istanza globale
    const cacheServiceInstance = new CacheService();
    
    // Cleanup automatico ogni 2 minuti
    setInterval(() => {
        cacheServiceInstance.cleanup();
    }, 2 * 60 * 1000);

    // Esporta per l'uso globale
    window.cacheService = cacheServiceInstance;
    window.CacheService = CacheService;

    console.log('[Cache] CacheService loaded and available globally');

})();
