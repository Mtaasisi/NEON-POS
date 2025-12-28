// Feature Toggle Service
// Manages feature toggles for production builds

import { FeatureToggle, FeatureToggleState, FeatureModule, ModuleToggleState, FEATURE_TOGGLES, FEATURE_MODULES } from '../types/featureToggles';

export class FeatureToggleService {
  private static instance: FeatureToggleService;
  private toggleStates: FeatureToggleState = {};
  private moduleStates: ModuleToggleState = {};
  private initialized = false;

  private constructor() {}

  static getInstance(): FeatureToggleService {
    if (!FeatureToggleService.instance) {
      FeatureToggleService.instance = new FeatureToggleService();
    }
    return FeatureToggleService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load toggle states and module states from database
      const { unifiedSettingsService } = await import('../lib/unifiedSettingsService');

      const savedToggles = await unifiedSettingsService.getSettingsByCategory('system', 'feature_toggles');
      const savedModules = await unifiedSettingsService.getSettingsByCategory('system', 'feature_modules');

      // Initialize feature states with defaults and merge saved states
      this.toggleStates = {};
      FEATURE_TOGGLES.forEach(toggle => {
        const savedValue = savedToggles[toggle.key]?.value;
        this.toggleStates[toggle.key] = savedValue !== undefined ? savedValue : toggle.defaultEnabled;
      });

      // Initialize module states with defaults and merge saved states
      this.moduleStates = {};
      FEATURE_MODULES.forEach(module => {
        const savedValue = savedModules[module.key]?.value;
        this.moduleStates[module.key] = savedValue !== undefined ? savedValue : module.defaultEnabled;
      });

      this.initialized = true;
      console.log('🔧 Feature toggles initialized:', this.toggleStates);
      console.log('🔧 Feature modules initialized:', this.moduleStates);
    } catch (error) {
      console.error('Failed to initialize feature toggles:', error);
      // Fallback to defaults
      FEATURE_TOGGLES.forEach(toggle => {
        this.toggleStates[toggle.key] = toggle.defaultEnabled;
      });
      FEATURE_MODULES.forEach(module => {
        this.moduleStates[module.key] = module.defaultEnabled;
      });
      this.initialized = true;
    }
  }

  async saveToggleState(key: string, enabled: boolean): Promise<void> {
    try {
      const { unifiedSettingsService } = await import('../lib/unifiedSettingsService');
      await unifiedSettingsService.setSetting('system', 'feature_toggles', key, enabled, 'boolean');
      this.toggleStates[key] = enabled;
      console.log(`🔧 Feature toggle ${key} set to ${enabled}`);
    } catch (error) {
      console.error(`Failed to save feature toggle ${key}:`, error);
      throw error;
    }
  }

  async saveMultipleToggleStates(states: FeatureToggleState): Promise<void> {
    try {
      const { unifiedSettingsService } = await import('../lib/unifiedSettingsService');
      const promises = Object.entries(states).map(([key, enabled]) =>
        unifiedSettingsService.setSetting('system', 'feature_toggles', key, enabled, 'boolean')
      );
      await Promise.all(promises);

      // Update local state
      Object.assign(this.toggleStates, states);
      console.log('🔧 Multiple feature toggles saved:', states);
    } catch (error) {
      console.error('Failed to save multiple feature toggles:', error);
      throw error;
    }
  }

  isEnabled(key: string): boolean {
    // In development, all features are enabled by default unless explicitly disabled
    if (import.meta.env.MODE === 'development') {
      return this.toggleStates[key] !== false;
    }

    // In production, respect the toggle settings
    return this.toggleStates[key] === true;
  }

  getToggleState(key: string): boolean {
    return this.toggleStates[key] ?? false;
  }

  getAllToggleStates(): FeatureToggleState {
    return { ...this.toggleStates };
  }

  getAvailableToggles(): FeatureToggle[] {
    const isProduction = import.meta.env.MODE === 'production';
    const isDevelopment = import.meta.env.MODE === 'development';

    return FEATURE_TOGGLES.filter(toggle => {
      // Filter based on environment
      if (toggle.productionOnly && !isProduction) return false;
      if (toggle.developmentOnly && !isDevelopment) return false;

      return true;
    });
  }

  getTogglesByCategory(category: string): FeatureToggle[] {
    return this.getAvailableToggles().filter(toggle => toggle.category === category);
  }

  resetToDefaults(): void {
    FEATURE_TOGGLES.forEach(toggle => {
      this.toggleStates[toggle.key] = toggle.defaultEnabled;
    });
  }

  // Check if a feature can be enabled (considering dependencies)
  canEnableFeature(key: string): { canEnable: boolean; reason?: string } {
    const toggle = FEATURE_TOGGLES.find(t => t.key === key);
    if (!toggle) {
      return { canEnable: false, reason: 'Feature not found' };
    }

    // Check dependencies
    if (toggle.dependencies) {
      for (const dep of toggle.dependencies) {
        if (!this.isEnabled(dep)) {
          const depToggle = FEATURE_TOGGLES.find(t => t.key === dep);
          return {
            canEnable: false,
            reason: `Requires ${depToggle?.name || dep} to be enabled first`
          };
        }
      }
    }

    return { canEnable: true };
  }

  // Utility method to check multiple features at once
  areFeaturesEnabled(...keys: string[]): boolean {
    return keys.every(key => this.isEnabled(key));
  }

  // Get features that require restart
  getFeaturesRequiringRestart(): string[] {
    return FEATURE_TOGGLES
      .filter(toggle => toggle.requiresRestart && this.toggleStates[toggle.key] !== toggle.defaultEnabled)
      .map(toggle => toggle.key);
  }

  // Module-related methods
  getModules(): FeatureModule[] {
    return FEATURE_MODULES;
  }

  getModuleByKey(key: string): FeatureModule | undefined {
    return FEATURE_MODULES.find(module => module.key === key);
  }

  isModuleEnabled(moduleKey: string): boolean {
    const module = this.getModuleByKey(moduleKey);
    if (!module) return false;

    // In development, modules are enabled if they have defaultEnabled: true
    if (import.meta.env.MODE === 'development') {
      return module.defaultEnabled;
    }

    // In production, check if module is saved in database, otherwise use default
    if (this.moduleStates[moduleKey] !== undefined) {
      return this.moduleStates[moduleKey];
    }

    return module.defaultEnabled;
  }

  async toggleModule(moduleKey: string, enabled: boolean): Promise<void> {
    const module = this.getModuleByKey(moduleKey);
    if (!module) {
      throw new Error(`Module ${moduleKey} not found`);
    }

    try {
      const { unifiedSettingsService } = await import('../lib/unifiedSettingsService');

      // Save module state
      await unifiedSettingsService.saveSetting('system', 'feature_modules', moduleKey, enabled);
      this.moduleStates[moduleKey] = enabled;

      // If disabling module, disable all features in the module
      // If enabling module, enable all features in the module (respecting individual feature states)
      for (const featureKey of module.features) {
        if (!enabled) {
          // When disabling module, disable all features
          await this.saveToggleState(featureKey, false);
        } else {
          // When enabling module, enable features based on their individual states or defaults
          const feature = FEATURE_TOGGLES.find(f => f.key === featureKey);
          if (feature) {
            const currentState = this.toggleStates[featureKey];
            // Keep current state if it exists, otherwise use default
            const newState = currentState !== undefined ? currentState : feature.defaultEnabled;
            await this.saveToggleState(featureKey, newState);
          }
        }
      }

      console.log(`🔧 Module ${moduleKey} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error(`Failed to toggle module ${moduleKey}:`, error);
      throw error;
    }
  }

  getModuleStates(): ModuleToggleState {
    return { ...this.moduleStates };
  }

  // Get features belonging to a module
  getModuleFeatures(moduleKey: string): FeatureToggle[] {
    const module = this.getModuleByKey(moduleKey);
    if (!module) return [];

    return FEATURE_TOGGLES.filter(toggle => module.features.includes(toggle.key));
  }

  // Check if all features in a module are enabled
  isModuleFullyEnabled(moduleKey: string): boolean {
    const module = this.getModuleByKey(moduleKey);
    if (!module) return false;

    return module.features.every(featureKey => this.isEnabled(featureKey));
  }

  // Check if any features in a module are enabled
  hasModuleAnyEnabledFeatures(moduleKey: string): boolean {
    const module = this.getModuleByKey(moduleKey);
    if (!module) return false;

    return module.features.some(featureKey => this.isEnabled(featureKey));
  }
}

// Export singleton instance
export const featureToggleService = FeatureToggleService.getInstance();

// Export convenience functions
export const isFeatureEnabled = (key: string): boolean => featureToggleService.isEnabled(key);
export const areFeaturesEnabled = (...keys: string[]): boolean => featureToggleService.areFeaturesEnabled(...keys);
