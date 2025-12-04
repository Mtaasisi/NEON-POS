export declare const APP_CONFIG: {
    websocket: {
        maxRetries: number;
        baseDelay: number;
        reconnectInterval: number;
    };
    images: {
        maxFileSize: number;
        maxWidth: number;
        maxHeight: number;
        quality: number;
        allowedTypes: string[];
        loading: {
            timeout: number;
            retryAttempts: number;
            useFallbacks: boolean;
            blockUnreliableUrls: boolean;
        };
    };
    api: {
        baseUrl: any;
        timeout: number;
        maxRetries: number;
    };
    realtime: {
        enabled: boolean;
        stockUpdateInterval: number;
        productUpdateInterval: number;
        connection: {
            maxRetries: number;
            retryDelay: number;
            maxRetryDelay: number;
            connectionTimeout: number;
            cooldownPeriod: number;
            circuitBreakerTimeout: number;
        };
    };
    audio: {
        enabled: boolean;
        volume: number;
        sounds: {
            notification: string;
            error: string;
            success: string;
        };
    };
    errors: {
        showNotifications: boolean;
        logToConsole: boolean;
        retryOnFailure: boolean;
    };
    development: {
        debugMode: boolean;
        mockData: boolean;
        logLevel: string;
    };
    http: {
        maxHeaderSize: number;
        requestTimeout: number;
        retryAttempts: number;
    };
    ai: {
        enabled: boolean;
        gemini: {
            enabled: boolean;
            maxRequestsPerMinute: number;
            minRequestInterval: number;
            errorCooldown: number;
        };
        fallback: {
            enabled: boolean;
        };
    };
};
export declare const getConfig: () => {
    websocket: {
        maxRetries: number;
        baseDelay: number;
        reconnectInterval: number;
    };
    images: {
        maxFileSize: number;
        maxWidth: number;
        maxHeight: number;
        quality: number;
        allowedTypes: string[];
        loading: {
            timeout: number;
            retryAttempts: number;
            useFallbacks: boolean;
            blockUnreliableUrls: boolean;
        };
    };
    api: {
        baseUrl: any;
        timeout: number;
        maxRetries: number;
    };
    realtime: {
        enabled: boolean;
        stockUpdateInterval: number;
        productUpdateInterval: number;
        connection: {
            maxRetries: number;
            retryDelay: number;
            maxRetryDelay: number;
            connectionTimeout: number;
            cooldownPeriod: number;
            circuitBreakerTimeout: number;
        };
    };
    audio: {
        enabled: boolean;
        volume: number;
        sounds: {
            notification: string;
            error: string;
            success: string;
        };
    };
    errors: {
        showNotifications: boolean;
        logToConsole: boolean;
        retryOnFailure: boolean;
    };
    development: {
        debugMode: boolean;
        mockData: boolean;
        logLevel: string;
    };
    http: {
        maxHeaderSize: number;
        requestTimeout: number;
        retryAttempts: number;
    };
    ai: {
        enabled: boolean;
        gemini: {
            enabled: boolean;
            maxRequestsPerMinute: number;
            minRequestInterval: number;
            errorCooldown: number;
        };
        fallback: {
            enabled: boolean;
        };
    };
};
declare const _default: {
    websocket: {
        maxRetries: number;
        baseDelay: number;
        reconnectInterval: number;
    };
    images: {
        maxFileSize: number;
        maxWidth: number;
        maxHeight: number;
        quality: number;
        allowedTypes: string[];
        loading: {
            timeout: number;
            retryAttempts: number;
            useFallbacks: boolean;
            blockUnreliableUrls: boolean;
        };
    };
    api: {
        baseUrl: any;
        timeout: number;
        maxRetries: number;
    };
    realtime: {
        enabled: boolean;
        stockUpdateInterval: number;
        productUpdateInterval: number;
        connection: {
            maxRetries: number;
            retryDelay: number;
            maxRetryDelay: number;
            connectionTimeout: number;
            cooldownPeriod: number;
            circuitBreakerTimeout: number;
        };
    };
    audio: {
        enabled: boolean;
        volume: number;
        sounds: {
            notification: string;
            error: string;
            success: string;
        };
    };
    errors: {
        showNotifications: boolean;
        logToConsole: boolean;
        retryOnFailure: boolean;
    };
    development: {
        debugMode: boolean;
        mockData: boolean;
        logLevel: string;
    };
    http: {
        maxHeaderSize: number;
        requestTimeout: number;
        retryAttempts: number;
    };
    ai: {
        enabled: boolean;
        gemini: {
            enabled: boolean;
            maxRequestsPerMinute: number;
            minRequestInterval: number;
            errorCooldown: number;
        };
        fallback: {
            enabled: boolean;
        };
    };
};
export default _default;
//# sourceMappingURL=appConfig.d.ts.map