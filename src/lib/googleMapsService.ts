// Google Maps API Service
// Handles loading, initialization, and error handling for Google Maps

interface GoogleMapsConfig {
  apiKey?: string;
  libraries?: string[];
  version?: string;
}

class GoogleMapsService {
  private static instance: GoogleMapsService;
  private isLoaded = false;
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;
  private error: string | null = null;

  private constructor() {}

  static getInstance(): GoogleMapsService {
    if (!GoogleMapsService.instance) {
      GoogleMapsService.instance = new GoogleMapsService();
    }
    return GoogleMapsService.instance;
  }

  /**
   * Fetch Google Maps API key from database first, then fall back to env variable
   */
  private async getApiKey(): Promise<string | null> {
    try {
      // Try to get from database first
      const { getIntegration } = await import('./integrationsApi');
      const integration = await getIntegration('GOOGLE_MAPS');
      
      if (integration && integration.is_enabled && integration.credentials?.api_key) {
        console.log('✅ Google Maps API key loaded from database');
        return integration.credentials.api_key;
      }
      
      // Fall back to environment variable
      const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (envKey) {
        console.log('✅ Google Maps API key loaded from environment');
        return envKey;
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ Error fetching Google Maps credentials from database, using env variable:', error);
      return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || null;
    }
  }

  async load(config: GoogleMapsConfig = {}): Promise<void> {
    // If already loaded, return immediately
    if (this.isLoaded) {
      return Promise.resolve();
    }

    // If already loading, return the existing promise
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    // Check if Google Maps is already available
    if (window.google && window.google.maps) {
      this.isLoaded = true;
      console.log('✅ Google Maps already loaded');
      return Promise.resolve();
    }

    this.isLoading = true;
    this.error = null;

    this.loadPromise = new Promise(async (resolve, reject) => {
      try {
        // Get API key from config, database, or environment
        const apiKey = config.apiKey || await this.getApiKey();
        
        if (!apiKey || apiKey === 'YOUR_API_KEY') {
          const error = 'Google Maps API key not configured. Please set VITE_GOOGLE_MAPS_API_KEY environment variable.';
          console.error('❌', error);
          this.error = error;
          this.isLoading = false;
          reject(new Error(error));
          return;
        }

        const libraries = config.libraries || ['geometry', 'marker'];
        const version = config.version || 'weekly';
        
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libraries.join(',')}&v=${version}&loading=async`;
        script.async = true;
        script.defer = true;
        
        script.onerror = (error) => {
          clearTimeout(timeout);
          const errorMsg = 'Failed to load Google Maps API script';
          console.error('❌', errorMsg, error);
          this.error = errorMsg;
          this.isLoading = false;
          reject(new Error(errorMsg));
        };

        // Add timeout
        const timeout = setTimeout(() => {
          const timeoutMsg = 'Google Maps API loading timed out';
          console.error('❌', timeoutMsg);
          this.error = timeoutMsg;
          this.isLoading = false;
          reject(new Error(timeoutMsg));
        }, 10000); // 10 second timeout

        script.onload = () => {
          clearTimeout(timeout);
          
          // Wait for the actual Google Maps API to be fully initialized
          const checkGoogleMapsReady = () => {
            if (window.google?.maps?.Map && window.google?.maps?.marker) {
              console.log('✅ Google Maps API loaded successfully');
              this.isLoaded = true;
              this.isLoading = false;
              resolve();
            } else {
              // Check again after a short delay
              setTimeout(checkGoogleMapsReady, 50);
            }
          };
          
          checkGoogleMapsReady();
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error('❌ Error setting up Google Maps script:', error);
        this.error = `Setup error: ${error}`;
        this.isLoading = false;
        reject(error);
      }
    });

    return this.loadPromise;
  }

  isReady(): boolean {
    return this.isLoaded && !!(window.google?.maps?.Map && window.google?.maps?.marker);
  }

  getError(): string | null {
    return this.error;
  }

  // Test the API by creating a simple map
  async testAPI(): Promise<boolean> {
    if (!this.isReady()) {
      console.error('❌ Google Maps API not ready for testing');
      return false;
    }

    try {
      const testDiv = document.createElement('div');
      testDiv.style.width = '100px';
      testDiv.style.height = '100px';
      testDiv.style.position = 'absolute';
      testDiv.style.top = '-9999px';
      document.body.appendChild(testDiv);
      
      const testMap = new window.google.maps.Map(testDiv, {
        center: { lat: 0, lng: 0 },
        zoom: 1
      });
      
      document.body.removeChild(testDiv);
      console.log('✅ Google Maps API test successful');
      return true;
    } catch (error) {
      console.error('❌ Google Maps API test failed:', error);
      return false;
    }
  }

  // Get the Google Maps object safely
  getGoogleMaps(): any {
    if (!this.isReady()) {
      throw new Error('Google Maps API not ready');
    }
    return window.google.maps;
  }

  // Reset the service (useful for testing)
  reset(): void {
    this.isLoaded = false;
    this.isLoading = false;
    this.loadPromise = null;
    this.error = null;
  }
}

// Export singleton instance
export const googleMapsService = GoogleMapsService.getInstance();

// Export types
export type { GoogleMapsConfig };
