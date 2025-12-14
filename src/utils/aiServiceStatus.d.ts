export interface AIServiceStatus {
    isAvailable: boolean;
    lastError?: string;
    lastErrorTime?: number;
    retryAfter?: number;
    requestCount: number;
    maxRequestsPerMinute: number;
}
export declare class AIServiceStatusManager {
    private static instance;
    private status;
    private constructor();
    static getInstance(): AIServiceStatusManager;
    updateStatus(update: Partial<AIServiceStatus>): void;
    getStatus(): AIServiceStatus;
    isServiceAvailable(): boolean;
    getStatusMessage(): string;
    getStatusColor(): 'green' | 'yellow' | 'red';
    incrementRequestCount(): void;
    markServiceUnavailable(error: string, retryAfterMs?: number): void;
}
export declare const aiServiceStatus: AIServiceStatusManager;
export declare function getAIServiceStatusMessage(): string;
export declare function isAIServiceReady(): boolean;
export declare function logAIServiceStatus(): void;
//# sourceMappingURL=aiServiceStatus.d.ts.map