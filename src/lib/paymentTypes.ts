export interface PaymentProvider {
  id: string;
  name: string;
  type: 'mobile_money' | 'bank_transfer' | 'card_processor' | 'cash' | 'crypto';
  status: 'active' | 'inactive' | 'maintenance';
  configuration: {
    apiKey?: string;
    secretKey?: string;
    webhookUrl?: string;
    merchantId?: string;
    terminalId?: string;
    currency: string;
    fees: {
      percentage: number;
      fixed: number;
      minimum: number;
      maximum: number;
    };
    limits: {
      daily: number;
      monthly: number;
      perTransaction: number;
    };
    supportedMethods: string[];
    processingTime: string;
    settlementTime: string;
  };
  metadata: {
    description?: string;
    website?: string;
    supportEmail?: string;
    supportPhone?: string;
    documentation?: string;
  };
  performance: {
    successRate: number;
    averageResponseTime: number;
    totalTransactions: number;
    totalVolume: number;
    lastUsed?: string;
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface PaymentAnalytics {
  totalRevenue: number;
  totalTransactions: number;
  successRate: number;
  averageTicketSize: number;
  topPaymentMethod: string;
  peakHour: string;
  growthRate: number;
  riskFactors: string[];
}

export interface PaymentInsights {
  trends: {
    revenue: number;
    transactions: number;
    successRate: number;
    averageTicket: number;
  };
  recommendations: string[];
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export interface ProviderMetrics {
  totalProviders: number;
  activeProviders: number;
  totalVolume: number;
  averageSuccessRate: number;
  topPerformer: string;
  recentFailures: number;
}