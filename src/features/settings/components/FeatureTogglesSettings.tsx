import React, { useState, useEffect } from 'react';
import { Settings, ToggleLeft, ToggleRight, AlertTriangle, Info, RefreshCw, Package, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSettingsSave } from '../../../context/SettingsSaveContext';
import { FeatureModule, FeatureToggle, MODULE_CATEGORIES } from '../../../types/featureToggles';
import { featureToggleService } from '../../../services/featureToggleService';
import FeatureToggleDemo from '../../../components/FeatureToggleDemo';

interface FeatureTogglesSettingsProps {
  isActive?: boolean;
}

const FeatureTogglesSettings: React.FC<FeatureTogglesSettingsProps> = ({ isActive }) => {
  const { registerSaveHandler, unregisterSaveHandler, setHasChanges } = useSettingsSave();
  const [modules, setModules] = useState<FeatureModule[]>([]);
  const [moduleStates, setModuleStates] = useState<Record<string, boolean>>({});
  const [featureStates, setFeatureStates] = useState<Record<string, boolean>>({});
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadFeatureModules = async () => {
      try {
        setLoading(true);
        await featureToggleService.initialize();

        const allModules = featureToggleService.getModules();
        const moduleStatesData = featureToggleService.getModuleStates();
        const featureStatesData = featureToggleService.getAllToggleStates();

        setModules(allModules);
        setModuleStates(moduleStatesData);
        setFeatureStates(featureStatesData);
      } catch (error) {
        console.error('Error loading feature modules:', error);
        toast.error('Failed to load feature modules');
      } finally {
        setLoading(false);
      }
    };

    loadFeatureModules();
  }, []);

  useEffect(() => {
    const handleSave = async () => {
      if (saving) return;

      try {
        setSaving(true);

        // Save module states
        for (const [moduleKey, enabled] of Object.entries(moduleStates)) {
          await featureToggleService.toggleModule(moduleKey, enabled);
        }

        // Save individual feature states
        await featureToggleService.saveMultipleToggleStates(featureStates);

        // Check if any features require restart
        const restartRequired = featureToggleService.getFeaturesRequiringRestart();
        if (restartRequired.length > 0) {
          toast.success('Feature modules saved! Some changes may require app restart.', {
            duration: 5000,
          });
        } else {
          toast.success('Feature modules saved successfully!');
        }
      } catch (error) {
        console.error('Error saving feature modules:', error);
        toast.error('Failed to save feature modules');
        throw error;
      } finally {
        setSaving(false);
      }
    };

    registerSaveHandler('feature-toggles', handleSave);
    return () => unregisterSaveHandler('feature-toggles');
  }, [moduleStates, featureStates, registerSaveHandler, unregisterSaveHandler, saving]);

  useEffect(() => {
    setHasChanges(true);
  }, [moduleStates, featureStates, setHasChanges]);

  const handleModuleToggle = (moduleKey: string, enabled: boolean) => {
    setModuleStates(prev => ({
      ...prev,
      [moduleKey]: enabled
    }));
  };

  const handleFeatureToggle = (featureKey: string, enabled: boolean) => {
    // Check if feature can be enabled
    if (enabled) {
      const canEnable = featureToggleService.canEnableFeature(featureKey);
      if (!canEnable.canEnable) {
        toast.error(canEnable.reason || 'Cannot enable this feature');
        return;
      }
    }

    setFeatureStates(prev => ({
      ...prev,
      [featureKey]: enabled
    }));
  };

  const toggleModuleExpansion = (moduleKey: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleKey)) {
        newSet.delete(moduleKey);
      } else {
        newSet.add(moduleKey);
      }
      return newSet;
    });
  };

  const resetToDefaults = () => {
    const defaultModuleStates: Record<string, boolean> = {};
    const defaultFeatureStates: Record<string, boolean> = {};

    modules.forEach(module => {
      defaultModuleStates[module.key] = module.defaultEnabled;
    });

    featureToggleService.getAvailableToggles().forEach(toggle => {
      defaultFeatureStates[toggle.key] = toggle.defaultEnabled;
    });

    setModuleStates(defaultModuleStates);
    setFeatureStates(defaultFeatureStates);
    toast.success('Reset to default settings');
  };

  const getModulesByCategory = (category: string) => {
    return modules.filter(module => module.category === category);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading feature toggles...</span>
      </div>
    );
  }

  const isProduction = import.meta.env.MODE === 'production';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-2xl p-8 border-b border-gray-200">
        <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
            <Settings className="w-8 h-8 text-white" />
          </div>

          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Feature Toggles</h3>
            <p className="text-sm text-gray-600">
              {isProduction
                ? 'Control which features are enabled in your production environment'
                : 'Feature toggles are always enabled in development mode'
              }
            </p>
            {isProduction && (
              <div className="mt-2 flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-medium">Production Mode - Changes affect live users</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <div className="flex justify-end">
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          disabled={saving}
        >
          <RefreshCw className="w-4 h-4" />
          Reset to Defaults
        </button>
      </div>

      {/* Feature Modules */}
      <div className="space-y-6">
        {Object.entries(MODULE_CATEGORIES)
          .sort(([, a], [, b]) => a.priority - b.priority)
          .map(([categoryKey, category]) => {
          const categoryModules = getModulesByCategory(categoryKey);

          if (categoryModules.length === 0) return null;

          return (
            <div key={categoryKey} className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-4 h-4 ${category.color} rounded-full`}></div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{category.name}</h4>
                  <p className="text-sm text-gray-600">{category.description}</p>
                </div>
              </div>

              <div className="space-y-4">
                {categoryModules.map((module) => {
                  const isModuleEnabled = moduleStates[module.key] ?? false;
                  const moduleFeatures = featureToggleService.getModuleFeatures(module.key);
                  const isExpanded = expandedModules.has(module.key);

                  return (
                    <div key={module.key} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Module Header */}
                      <div
                        className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                          isModuleEnabled ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => toggleModuleExpansion(module.key)}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-10 h-10 ${module.color} rounded-lg flex items-center justify-center`}>
                            <Package className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-900">{module.name}</h5>
                            <p className="text-sm text-gray-600">{module.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {moduleFeatures.length > 0 && (
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                              {moduleFeatures.length} feature{moduleFeatures.length !== 1 ? 's' : ''}
                            </span>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleModuleToggle(module.key, !isModuleEnabled);
                            }}
                            className={`relative inline-flex items-center cursor-pointer`}
                          >
                            <input
                              type="checkbox"
                              checked={isModuleEnabled}
                              onChange={(e) => handleModuleToggle(module.key, e.target.checked)}
                              disabled={saving}
                              className="sr-only peer"
                            />
                            <div className={`w-11 h-6 rounded-full peer-focus:outline-none transition-all ${
                              isModuleEnabled
                                ? 'bg-blue-600 peer-focus:ring-blue-300'
                                : 'bg-gray-200 peer-focus:ring-gray-300'
                            }`}>
                              <div className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white border border-gray-300 rounded-full transition-all ${
                                isModuleEnabled ? 'translate-x-full border-white' : ''
                              }`}></div>
                            </div>
                          </button>

                          {moduleFeatures.length > 0 && (
                            isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                            )
                          )}
                        </div>
                      </div>

                      {/* Module Features */}
                      {isExpanded && moduleFeatures.length > 0 && (
                        <div className="border-t border-gray-200 bg-gray-25">
                          <div className="p-4 space-y-3">
                            {moduleFeatures.map((feature) => {
                              const isFeatureEnabled = featureStates[feature.key] ?? false;
                              const canEnable = featureToggleService.canEnableFeature(feature.key);

                              return (
                                <div
                                  key={feature.key}
                                  className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
                                    isFeatureEnabled
                                      ? 'border-green-300 bg-green-50 hover:border-green-400'
                                      : 'border-gray-200 hover:border-gray-300'
                                  } ${!canEnable.canEnable ? 'opacity-60' : ''}`}
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-semibold text-gray-900">{feature.name}</span>
                                      {feature.requiresRestart && (
                                        <Info className="w-4 h-4 text-amber-500" title="Requires app restart" />
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-600">{feature.description}</p>
                                    {!canEnable.canEnable && canEnable.reason && (
                                      <p className="text-xs text-red-600 font-medium mt-1">{canEnable.reason}</p>
                                    )}
                                  </div>

                                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                                    <input
                                      type="checkbox"
                                      checked={isFeatureEnabled}
                                      onChange={(e) => handleFeatureToggle(feature.key, e.target.checked)}
                                      disabled={!canEnable.canEnable || saving}
                                      className="sr-only peer"
                                    />
                                    <div className={`w-10 h-5 rounded-full peer-focus:outline-none transition-all ${
                                      isFeatureEnabled
                                        ? 'bg-green-600 peer-focus:ring-green-300'
                                        : 'bg-gray-200 peer-focus:ring-gray-300'
                                    }`}>
                                      <div className={`absolute top-[1px] left-[1px] w-4 h-4 bg-white border border-gray-300 rounded-full transition-all ${
                                        isFeatureEnabled ? 'translate-x-full border-white' : ''
                                      }`}></div>
                                    </div>
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Demo Section */}
      <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <Info className="w-4 h-4 text-white" />
          </div>
          Feature Toggle Demo
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          See how feature toggles work in practice. This demo shows different ways to conditionally render features.
        </p>
        <FeatureToggleDemo />
      </div>

      {/* Info Panel */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h5 className="text-sm font-semibold text-blue-900 mb-1">How Feature Toggles Work</h5>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• <strong>Development:</strong> All features are enabled by default for testing</li>
              <li>• <strong>Production:</strong> Only enabled features will be available to users</li>
              <li>• <strong>Dependencies:</strong> Some features require others to be enabled first</li>
              <li>• <strong>Restart Required:</strong> Features marked with ⚠️ need app restart to take effect</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureTogglesSettings;
