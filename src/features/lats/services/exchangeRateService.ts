/**
 * Exchange Rate Service
 * Centralized service for fetching and managing exchange rates
 * Priority: Database > Settings > Environment > Hardcoded defaults
 */

import { supabase } from '../../../lib/supabaseClient';

export interface ExchangeRate {
  from_currency: string;
  to_currency: string;
  rate: number;
  source: 'database' | 'api' | 'manual' | 'default';
  last_updated: string;
}

class ExchangeRateService {
  private static instance: ExchangeRateService;
  private cache: Map<string, { rate: number; timestamp: number; source: string }> = new Map();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  // Default fallback rates (TZS as base currency)
  private readonly DEFAULT_RATES: Record<string, number> = {
    'USD_TZS': 2500,
    'EUR_TZS': 2700,
    'GBP_TZS': 3200,
    'KES_TZS': 18,
    'CNY_TZS': 350,
    'TZS_USD': 0.0004,
    'TZS_EUR': 0.00037,
    'TZS_GBP': 0.00031,
    'TZS_KES': 0.056,
    'TZS_CNY': 0.0029,
  };

  private constructor() {}

  public static getInstance(): ExchangeRateService {
    if (!ExchangeRateService.instance) {
      ExchangeRateService.instance = new ExchangeRateService();
    }
    return ExchangeRateService.instance;
  }

  /**
   * Get exchange rate from one currency to another
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string = 'TZS'): Promise<ExchangeRate> {
    // Same currency, rate is 1
    if (fromCurrency === toCurrency) {
      return {
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: 1,
        source: 'default',
        last_updated: new Date().toISOString()
      };
    }

    const cacheKey = `${fromCurrency}_${toCurrency}`;

    // Check cache first
    const cached = this.getCachedRate(cacheKey);
    if (cached) {
      return {
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: cached.rate,
        source: cached.source as any,
        last_updated: new Date(cached.timestamp).toISOString()
      };
    }

    // Try fetching from database/integrations settings
    const dbRate = await this.fetchFromDatabase(fromCurrency, toCurrency);
    if (dbRate) {
      this.cacheRate(cacheKey, dbRate.rate, 'database');
      return dbRate;
    }

    // Try fetching from latest purchase order
    const poRate = await this.fetchFromPurchaseOrders(fromCurrency, toCurrency);
    if (poRate) {
      this.cacheRate(cacheKey, poRate.rate, 'manual');
      return poRate;
    }

    // Fallback to default rates
    const defaultRate = this.getDefaultRate(fromCurrency, toCurrency);
    this.cacheRate(cacheKey, defaultRate, 'default');

    console.warn(`⚠️ Using default exchange rate for ${fromCurrency} to ${toCurrency}: ${defaultRate}`);

    return {
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: defaultRate,
      source: 'default',
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Fetch exchange rate from database/integrations
   */
  private async fetchFromDatabase(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null> {
    try {
      // Check if there's an exchange rate stored in integrations or settings
      const { data, error } = await supabase
        .from('integration_settings')
        .select('config')
        .eq('integration_type', 'exchange_rates')
        .single();

      if (!error && data?.config) {
        const key = `${fromCurrency}_${toCurrency}`;
        const rate = data.config[key];
        
        if (rate && typeof rate === 'number') {
          console.log(`✅ Found exchange rate in database: ${fromCurrency} to ${toCurrency} = ${rate}`);
          return {
            from_currency: fromCurrency,
            to_currency: toCurrency,
            rate,
            source: 'database',
            last_updated: new Date().toISOString()
          };
        }
      }
    } catch (error) {
      console.error('Error fetching exchange rate from database:', error);
    }

    return null;
  }

  /**
   * Fetch latest exchange rate from purchase orders
   */
  private async fetchFromPurchaseOrders(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null> {
    try {
      const { data, error } = await supabase
        .from('lats_purchase_orders')
        .select('currency, exchange_rate, exchange_rate_date, base_currency')
        .eq('currency', fromCurrency)
        .eq('base_currency', toCurrency)
        .not('exchange_rate', 'is', null)
        .order('exchange_rate_date', { ascending: false })
        .limit(1)
        .single();

      if (!error && data && data.exchange_rate) {
        console.log(`✅ Loaded latest exchange rate from PO: ${fromCurrency} to ${toCurrency} = ${data.exchange_rate}`);
        return {
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate: parseFloat(data.exchange_rate),
          source: 'manual',
          last_updated: data.exchange_rate_date || new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('Error fetching exchange rate from purchase orders:', error);
    }

    return null;
  }

  /**
   * Get default/hardcoded rate
   */
  private getDefaultRate(fromCurrency: string, toCurrency: string): number {
    const directKey = `${fromCurrency}_${toCurrency}`;
    const inverseKey = `${toCurrency}_${fromCurrency}`;

    if (this.DEFAULT_RATES[directKey]) {
      return this.DEFAULT_RATES[directKey];
    }

    if (this.DEFAULT_RATES[inverseKey]) {
      return 1 / this.DEFAULT_RATES[inverseKey];
    }

    // If no rate found, try converting through TZS
    if (fromCurrency !== 'TZS' && toCurrency !== 'TZS') {
      const fromToTzs = this.DEFAULT_RATES[`${fromCurrency}_TZS`];
      const tzsToTarget = this.DEFAULT_RATES[`TZS_${toCurrency}`];
      
      if (fromToTzs && tzsToTarget) {
        return fromToTzs * tzsToTarget;
      }
    }

    // Ultimate fallback
    console.warn(`⚠️ No exchange rate found for ${fromCurrency} to ${toCurrency}, using 1`);
    return 1;
  }

  /**
   * Convert amount from one currency to another
   */
  async convertAmount(amount: number, fromCurrency: string, toCurrency: string = 'TZS'): Promise<number> {
    if (fromCurrency === toCurrency) return amount;
    
    const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency);
    return amount * exchangeRate.rate;
  }

  /**
   * Save exchange rate to database for future use
   */
  async saveExchangeRate(fromCurrency: string, toCurrency: string, rate: number): Promise<boolean> {
    try {
      // Try to get existing settings
      const { data: existing } = await supabase
        .from('integration_settings')
        .select('config')
        .eq('integration_type', 'exchange_rates')
        .single();

      const currentConfig = existing?.config || {};
      const key = `${fromCurrency}_${toCurrency}`;
      currentConfig[key] = rate;

      // Also save inverse rate
      const inverseKey = `${toCurrency}_${fromCurrency}`;
      currentConfig[inverseKey] = 1 / rate;

      // Upsert the settings
      const { error } = await supabase
        .from('integration_settings')
        .upsert({
          integration_type: 'exchange_rates',
          is_enabled: true,
          provider: 'manual',
          config: currentConfig,
          status: 'active',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'integration_type'
        });

      if (error) throw error;

      // Update cache
      this.cacheRate(key, rate, 'database');
      this.cacheRate(inverseKey, 1 / rate, 'database');

      console.log(`✅ Saved exchange rate: ${fromCurrency} to ${toCurrency} = ${rate}`);
      return true;
    } catch (error) {
      console.error('Error saving exchange rate:', error);
      return false;
    }
  }

  /**
   * Cache management
   */
  private getCachedRate(key: string): { rate: number; timestamp: number; source: string } | null {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached;
    }
    return null;
  }

  private cacheRate(key: string, rate: number, source: string): void {
    this.cache.set(key, {
      rate,
      timestamp: Date.now(),
      source
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('✅ Exchange rate cache cleared');
  }

  /**
   * Get all supported currency pairs with rates
   */
  async getAllRates(): Promise<ExchangeRate[]> {
    const currencies = ['USD', 'EUR', 'GBP', 'KES', 'CNY', 'TZS'];
    const rates: ExchangeRate[] = [];

    for (const from of currencies) {
      for (const to of currencies) {
        if (from !== to) {
          const rate = await this.getExchangeRate(from, to);
          rates.push(rate);
        }
      }
    }

    return rates;
  }
}

// Export singleton instance
export const exchangeRateService = ExchangeRateService.getInstance();
export default exchangeRateService;

