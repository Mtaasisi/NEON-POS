import React, { useState, useEffect } from 'react';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import { Palette, Sun, Moon, Monitor, Save, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme, Theme } from '../../../context/ThemeContext';

interface AppearanceSettingsProps {
  isActive: boolean;
}

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ isActive }) => {
  const { theme: currentTheme, setTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState<Theme>(currentTheme);
  const [accentColor, setAccentColor] = useState(() => 
    localStorage.getItem('accentColor') || '#3B82F6'
  );
  const [fontSize, setFontSize] = useState(() => 
    localStorage.getItem('fontSize') || 'medium'
  );

  // Update selected theme when current theme changes
  useEffect(() => {
    setSelectedTheme(currentTheme);
  }, [currentTheme]);

  const handleThemeChange = (newTheme: Theme) => {
    setSelectedTheme(newTheme);
    setTheme(newTheme);
    toast.success(`Theme changed to ${newTheme === 'dark' ? 'Dark' : newTheme === 'dark-cards' ? 'Dark Cards' : 'Light'}`);
  };

  const handleSave = () => {
    // Save other appearance settings
    localStorage.setItem('accentColor', accentColor);
    localStorage.setItem('fontSize', fontSize);
    toast.success('Appearance settings saved successfully');
  };

  if (!isActive) return null;

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2 mb-6">
          <Palette className="w-5 h-5 text-indigo-600" />
          Appearance Settings
        </h3>

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
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Font Size
            </label>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <GlassButton
            onClick={handleSave}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </GlassButton>
        </div>
      </GlassCard>
    </div>
  );
};

export default AppearanceSettings;
