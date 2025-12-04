export interface GeminiResponse {
    success: boolean;
    data?: string;
    error?: string;
}
export interface GeminiConfig {
    model: string;
    temperature: number;
    maxTokens: number;
}
declare class GeminiService {
    private apiKey;
    private baseUrl;
    private config;
    private requestCount;
    private lastRequestTime;
    private readonly maxRequestsPerMinute;
    private readonly minRequestInterval;
    private serviceAvailable;
    private lastErrorTime;
    private readonly errorCooldown;
    private consecutiveErrors;
    private readonly maxConsecutiveErrors;
    private requestQueue;
    private isProcessingQueue;
    private static hasShownApiKeyWarning;
    constructor();
    /**
     * Fetch Gemini API key from database
     */
    private loadApiKeyFromDatabase;
    setApiKey(key: string): void;
    private isServiceEnabled;
    private canMakeRequest;
    private updateRequestTracking;
    private markServiceUnavailable;
    private resetErrorCount;
    private processQueue;
    private queueRequest;
    testConnection(): Promise<GeminiResponse>;
    chat(messages: Array<{
        role: 'user' | 'model';
        content: string;
    }>): Promise<GeminiResponse>;
    generateCustomerResponse(customerQuery: string, context?: string): Promise<GeminiResponse>;
    generateInventoryResponse(query: string, productData?: any): Promise<GeminiResponse>;
    analyzeExpense(description: string, amount: number): Promise<GeminiResponse>;
    private getFallbackCustomerResponse;
    private getFallbackInventoryResponse;
    private getFallbackExpenseAnalysis;
    private categorizeExpense;
    getRateLimitStatus(): {
        requestsRemaining: number;
        timeSinceLastRequest: number;
        canMakeRequest: boolean;
        serviceStatus: string;
        maxRequestsPerMinute: number;
        minRequestInterval: number;
        errorCooldown: number;
        isEnabled: boolean;
    };
    isServiceAvailable(): boolean;
}
declare const geminiService: GeminiService;
export default geminiService;
//# sourceMappingURL=geminiService.d.ts.map