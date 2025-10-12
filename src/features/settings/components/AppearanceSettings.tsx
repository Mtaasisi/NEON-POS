import React, { useState } from 'react';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import { Palette, Sun, Moon, Monitor, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AppearanceSettingsProps {
  isActive: boolean;
}

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ isActive }) => {
  const [theme, setTheme] = useState('system');
  const [accentColor, setAccentColor] = useState('#3B82F6');
  const [fontSize, setFontSize] = useState('medium');

  const handleSave = () => {
    // Save appearance settings
    localStorage.setItem('theme', theme);
    localStorage.setItem('accentColor', accentColor);
    localStorage.setItem('fontSize', fontSize);
    toast.success('Appearance settings saved');
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
              Theme
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: Monitor }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${theme === value ? 'text-indigo-600' : 'text-gray-600'}`} />
                  <span className={`text-sm ${theme === value ? 'text-indigo-700' : 'text-gray-700'}`}>{label}</span>
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
