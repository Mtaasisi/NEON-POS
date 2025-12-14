import React, { useState, useEffect } from 'react';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import { Palette, Sun, Moon, Monitor, Save, Check, Type } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme, Theme } from '../../../context/ThemeContext';
import { useGeneralSettings } from '../../../hooks/usePOSSettings';
import { useSettingsSave } from '../../../context/SettingsSaveContext';

interface AppearanceSettingsProps {
  isActive: boolean;
}

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ isActive }) => {
  const { theme: currentTheme, setTheme } = useTheme();
  const { settings: generalSettings, updateSettings, loading } = useGeneralSettings();
  const { registerSaveHandler, unregisterSaveHandler, setHasChanges } = useSettingsSave();
  
  const [selectedTheme, setSelectedTheme] = useState<Theme>(currentTheme);
  const [accentColor, setAccentColor] = useState(() => 
    localStorage.getItem('accentColor') || '#3B82F6'
  );
  const [fontSize, setFontSize] = useState<'tiny' | 'extra-small' | 'small' | 'medium' | 'large'>(() => 
    (localStorage.getItem('fontSize') as 'tiny' | 'extra-small' | 'small' | 'medium' | 'large') || 'medium'
  );

  // Sync font size from database settings
  useEffect(() => {
    if (generalSettings?.font_size) {
      setFontSize(generalSettings.font_size);
    }
  }, [generalSettings]);

  // Update selected theme when current theme changes
  useEffect(() => {
    setSelectedTheme(currentTheme);
  }, [currentTheme]);

  const handleThemeChange = (newTheme: Theme) => {
    setSelectedTheme(newTheme);
    setTheme(newTheme);
    toast.success(`Theme changed to ${newTheme === 'dark' ? 'Dark' : newTheme === 'dark-cards' ? 'Dark Cards' : 'Light'}`);
  };

  // Apply font size to the document immediately
  const applyFontSize = (size: 'tiny' | 'extra-small' | 'small' | 'medium' | 'large') => {
    const root = document.documentElement;
    const fontSizeMap = {
      'tiny': '11px',
      'extra-small': '12px',
      'small': '14px',
      'medium': '16px',
      'large': '18px'
    };
    root.style.fontSize = fontSizeMap[size];
    localStorage.setItem('fontSize', size);
  };

  const handleFontSizeChange = async (newSize: 'tiny' | 'extra-small' | 'small' | 'medium' | 'large') => {
    setFontSize(newSize);
    applyFontSize(newSize);
    
    // Save to database
    try {
      await updateSettings({ font_size: newSize });
      toast.success(`Font size changed to ${newSize.replace('-', ' ')}`);
      
      // Dispatch event so other parts of the app can react
      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { type: 'general' } }));
    } catch (error) {
      console.error('Failed to save font size:', error);
      toast.error('Failed to save font size setting');
    }
  };

  useEffect(() => {
    const handleSave = async () => {
    // Save other appearance settings
    localStorage.setItem('accentColor', accentColor);
    toast.success('Appearance settings saved successfully');
  };
    
    registerSaveHandler('appearance-settings', handleSave);
    return () => unregisterSaveHandler('appearance-settings');
  }, [accentColor, registerSaveHandler, unregisterSaveHandler]);

  useEffect(() => {
    setHasChanges(true);
  }, [accentColor, setHasChanges]);

  if (!isActive) return null;

  return (
    <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full flex flex-col overflow-hidden relative">
      {/* Icon Header - Fixed - Matching Store Management style */}
      <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-pink-600 rounded-full flex items-center justify-center shadow-lg">
            <Palette className="w-8 h-8 text-white" />
          </div>
          
          {/* Text */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Appearance Settings</h3>
            <p className="text-sm text-gray-600">Customize theme, colors, and font size</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content Section */}
      <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
        <div className="py-6">
          <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-6">

        <div className="space-y-6">
          {/* Theme Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Theme Mode
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light' as Theme, label: 'Light', icon: Sun, desc: 'Bright & Clean', preview: 'bg-gradient-to-br from-blue-50 to-indigo-100' },
                { value: 'dark' as Theme, label: 'Dark', icon: Moon, desc: 'Easy on Eyes', preview: 'bg-gradient-to-br from-slate-800 to-slate-900' },
                { value: 'dark-cards' as Theme, label: 'Dark Pro', icon: Monitor, desc: 'Premium Dark', preview: 'bg-gradient-to-br from-slate-900 to-gray-900' }
              ].map(({ value, label, icon: Icon, desc, preview }) => (
                <button
                  key={value}
                  onClick={() => handleThemeChange(value)}
                  className={`relative p-4 rounded-xl border-2 transition-all overflow-hidden group ${
                    selectedTheme === value
                      ? 'border-indigo-500 bg-indigo-50 shadow-lg scale-105'
                      : 'border-gray-300 bg-white hover:bg-gray-50 hover:border-indigo-300'
                  }`}
                >
                  {/* Theme Preview */}
                  <div className={`absolute top-2 right-2 w-8 h-8 rounded-md ${preview} opacity-40 group-hover:opacity-60 transition-opacity`}></div>
                  
                  {/* Check Icon */}
                  {selectedTheme === value && (
                    <div className="absolute top-2 left-2">
                      <Check className="w-5 h-5 text-indigo-600" />
                    </div>
                  )}
                  
                  <Icon className={`w-8 h-8 mx-auto mb-2 mt-2 ${selectedTheme === value ? 'text-indigo-600' : 'text-gray-600'}`} />
                  <div className={`text-sm font-semibold mb-1 ${selectedTheme === value ? 'text-indigo-700' : 'text-gray-700'}`}>{label}</div>
                  <div className="text-xs text-gray-500">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Accent Color
            </label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-16 h-12 rounded-lg border-2 border-white/20 cursor-pointer"
              />
              <span className="text-white">{accentColor}</span>
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Type className="w-4 h-4 text-indigo-600" />
              Font Size (Affects Entire App)
            </label>
            <div className="space-y-2">
              <select
                value={fontSize}
                onChange={(e) => handleFontSizeChange(e.target.value as 'tiny' | 'extra-small' | 'small' | 'medium' | 'large')}
                disabled={loading}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <option value="tiny">Tiny (11px) - Ultra Compact ✨</option>
                <option value="extra-small">Extra Small (12px) - Very Compact</option>
                <option value="small">Small (14px) - Compact</option>
                <option value="medium">Medium (16px) - Default ⭐</option>
                <option value="large">Large (18px) - Comfortable</option>
              </select>
            </div>
          </div>
        </div>
        
        </div>
      </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;
