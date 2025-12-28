import React, { useState, useEffect } from 'react';
import { Palette, Sun, Moon, Monitor, Check, Type, Image, Upload, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme, Theme } from '../../../context/ThemeContext';
import { useGeneralSettings } from '../../../hooks/usePOSSettings';
import { useSettingsSave } from '../../../context/SettingsSaveContext';
import { useBranch } from '../../../context/BranchContext';
import { useAuth } from '../../../context/AuthContext';
import { wallpaperOptions, changeWallpaper, getCurrentWallpaper, getCustomBackgrounds, addCustomBackground, removeCustomBackground as removeCustomBackgroundUtil, loadBranchBackgroundFromDatabase, saveBranchBackgroundToDatabase, uploadCustomBackgroundToStorage, fetchCustomBackgroundsFromDatabase, deleteCustomBackground, type WallpaperOption } from '../../../lib/backgroundUtils';

interface AppearanceSettingsProps {
  isActive: boolean;
}

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ isActive }) => {
  const { theme: currentTheme, setTheme } = useTheme();
  const { settings: generalSettings, updateSettings, loading } = useGeneralSettings();
  const { registerSaveHandler, unregisterSaveHandler, setHasChanges } = useSettingsSave();
  const { currentBranch } = useBranch();
  const { currentUser } = useAuth();

  const [selectedTheme, setSelectedTheme] = useState<Theme>(currentTheme);
  const [accentColor, setAccentColor] = useState('#3B82F6');
  const [fontSize, setFontSize] = useState<'tiny' | 'extra-small' | 'small' | 'medium' | 'large'>('medium');
  const [selectedBackground, setSelectedBackground] = useState(() => getCurrentWallpaper(currentBranch?.id));
  const [customBackgrounds, setCustomBackgrounds] = useState<string[]>(() => getCustomBackgrounds());
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [isBranchSpecific, setIsBranchSpecific] = useState(false);
  const [overlayLevel, setOverlayLevel] = useState<'none' | 'low' | 'medium' | 'high'>('low');

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

  // Load appearance settings from database
  useEffect(() => {
    const loadAppearanceSettings = async () => {
      try {
        const { unifiedSettingsService } = await import('../../../lib/unifiedSettingsService');
        const { getCurrentBranchId } = await import('../../../lib/branchAwareApi');
        const currentBranchId = getCurrentBranchId();

        const accentColorValue = await unifiedSettingsService.getSetting('branch', 'appearance', 'accent_color', undefined, currentBranchId);
        const fontSizeValue = await unifiedSettingsService.getSetting('branch', 'appearance', 'font_size', undefined, currentBranchId);
        const overlayLevelValue = await unifiedSettingsService.getSetting('branch', 'appearance', 'overlay_level', undefined, currentBranchId);

        if (accentColorValue) setAccentColor(accentColorValue);
        if (fontSizeValue) setFontSize(fontSizeValue as 'tiny' | 'extra-small' | 'small' | 'medium' | 'large');
        if (overlayLevelValue) setOverlayLevel(overlayLevelValue as 'none' | 'low' | 'medium' | 'high');
      } catch (error) {
        console.error('Error loading appearance settings from database:', error);
        // Fallback to localStorage
        const savedAccentColor = localStorage.getItem('accentColor');
        const savedFontSize = localStorage.getItem('fontSize') as 'tiny' | 'extra-small' | 'small' | 'medium' | 'large';
        const savedOverlayLevel = localStorage.getItem('overlayLevel') as 'none' | 'low' | 'medium' | 'high';

        if (savedAccentColor) setAccentColor(savedAccentColor);
        if (savedFontSize) setFontSize(savedFontSize || 'medium');
        if (savedOverlayLevel) setOverlayLevel(savedOverlayLevel || 'low');
      }
    };

    loadAppearanceSettings();
  }, []);

  // Load branch-specific background and custom images when branch changes
  useEffect(() => {
    const loadBranchBackground = async () => {
      if (currentBranch?.id) {
        try {
          // First check localStorage for immediate response
          const localBackground = getCurrentWallpaper(currentBranch.id);
          if (localBackground) {
            setSelectedBackground(localBackground);
            setIsBranchSpecific(localBackground !== getCurrentWallpaper());
          }

          // Then check database for branch-specific setting
          const dbBackground = await loadBranchBackgroundFromDatabase(currentBranch.id);
          if (dbBackground) {
            setSelectedBackground(dbBackground);
            setIsBranchSpecific(true);
            // Apply the branch background
            changeWallpaper(dbBackground, currentBranch.id);
          } else {
            // Fall back to global setting
            const globalBackground = getCurrentWallpaper();
            setSelectedBackground(globalBackground);
            setIsBranchSpecific(false);
          }

          // Load custom backgrounds from database
          const dbCustomBackgrounds = await fetchCustomBackgroundsFromDatabase(currentBranch.id);
          if (dbCustomBackgrounds.length > 0) {
            // Update local storage and state with database images
            const localBackgrounds = getCustomBackgrounds();
            const combinedBackgrounds = [...localBackgrounds];

            // Add database images that aren't already in local storage
            dbCustomBackgrounds.forEach(dbBg => {
              if (!combinedBackgrounds.includes(dbBg.image_url)) {
                combinedBackgrounds.push(dbBg.image_url);
              }
            });

            setCustomBackgrounds(combinedBackgrounds);
            localStorage.setItem('customBackgrounds', JSON.stringify(combinedBackgrounds));

            // Add database backgrounds to wallpaper options
            dbCustomBackgrounds.forEach(dbBg => {
              const customWallpaperOption: WallpaperOption = {
                id: `custom-db-${dbBg.id}`,
                name: `DB: ${dbBg.name}`,
                cssClass: 'custom-background',
                preview: `url(${dbBg.image_url})`
              };

              // Only add if not already present
              if (!wallpaperOptions.find(w => w.id === customWallpaperOption.id)) {
                wallpaperOptions.push(customWallpaperOption);
              }
            });
          }

        } catch (error) {
          console.error('Failed to load branch background:', error);
          // Fall back to global setting
          const globalBackground = getCurrentWallpaper();
          setSelectedBackground(globalBackground);
          setIsBranchSpecific(false);
        }
      } else {
        // No branch selected, use global setting
        const globalBackground = getCurrentWallpaper();
        setSelectedBackground(globalBackground);
        setIsBranchSpecific(false);

        // Load global custom backgrounds from database
        try {
          const dbCustomBackgrounds = await fetchCustomBackgroundsFromDatabase();
          if (dbCustomBackgrounds.length > 0) {
            const localBackgrounds = getCustomBackgrounds();
            const combinedBackgrounds = [...localBackgrounds];

            dbCustomBackgrounds.forEach(dbBg => {
              if (!combinedBackgrounds.includes(dbBg.image_url)) {
                combinedBackgrounds.push(dbBg.image_url);
              }
            });

            setCustomBackgrounds(combinedBackgrounds);
            localStorage.setItem('customBackgrounds', JSON.stringify(combinedBackgrounds));
          }
        } catch (error) {
          console.error('Failed to load global custom backgrounds:', error);
        }
      }
    };

    loadBranchBackground();
  }, [currentBranch?.id]);

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
    // ✅ FIX: Font size is now saved via general settings update
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

  // Apply overlay CSS variables based on selected level
  useEffect(() => {
    const mapping = {
      none: { light: '0', lightSecondary: '0', dark: '0', darkSecondary: '0' },
      low: { light: '0.02', lightSecondary: '0.005', dark: '0.04', darkSecondary: '0.01' },
      medium: { light: '0.05', lightSecondary: '0.02', dark: '0.08', darkSecondary: '0.02' },
      high: { light: '0.12', lightSecondary: '0.06', dark: '0.18', darkSecondary: '0.08' }
    } as Record<string, { light: string; lightSecondary: string; dark: string; darkSecondary: string }>;

    const vals = mapping[overlayLevel];
    document.documentElement.style.setProperty('--overlay-light', vals.light);
    document.documentElement.style.setProperty('--overlay-light-secondary', vals.lightSecondary);
    document.documentElement.style.setProperty('--overlay-dark', vals.dark);
    document.documentElement.style.setProperty('--overlay-dark-secondary', vals.darkSecondary);
    // ✅ FIX: Save overlay level to database
    const saveOverlayLevel = async () => {
      try {
        const { unifiedSettingsService } = await import('../../../lib/unifiedSettingsService');
        const { getCurrentBranchId } = await import('../../../lib/branchAwareApi');
        const currentBranchId = getCurrentBranchId();
        await unifiedSettingsService.setSetting('branch', 'appearance', 'overlay_level', overlayLevel, 'string', undefined, currentBranchId);
      } catch (error) {
        console.error('Error saving overlay level to database:', error);
        // Fallback to localStorage
        localStorage.setItem('overlayLevel', overlayLevel);
      }
    };
    saveOverlayLevel();
  }, [overlayLevel]);

  const handleBackgroundSelect = async (wallpaperId: string) => {
    const branchId = currentBranch?.id;

    changeWallpaper(wallpaperId, branchId);
    setSelectedBackground(wallpaperId);
    setIsBranchSpecific(!!branchId);

    // Save to database if branch-specific
    if (branchId) {
      try {
        await saveBranchBackgroundToDatabase(branchId, wallpaperId);
      } catch (error) {
        console.error('Failed to save branch background to database:', error);
        toast.error('Background changed but failed to save to database');
        return;
      }
    }

    const branchName = branchId ? ` for ${currentBranch.name}` : '';
    toast.success(`Background changed successfully${branchName}`);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      toast.loading('Uploading image...', { id: 'upload' });

      // Upload to Supabase storage and save to database
      const uploadResult = await uploadCustomBackgroundToStorage(
        file,
        currentBranch?.id,
        currentUser?.id
      );

      // Cache the image locally for immediate use
      const reader = new FileReader();
      reader.onload = (e) => {
        const localImageUrl = e.target?.result as string;

        // Add to local custom backgrounds
        addCustomBackground(localImageUrl);
        const updatedCustomBackgrounds = getCustomBackgrounds();
        setCustomBackgrounds(updatedCustomBackgrounds);

        // Create custom wallpaper ID
        const customImageId = `custom-db-${uploadResult.id}`;

        // Update wallpaper options to include this custom image
        const customWallpaperOption: WallpaperOption = {
          id: customImageId,
          name: `Custom: ${file.name}`,
          cssClass: 'custom-background',
          preview: `url(${localImageUrl})`
        };

        // Add to wallpaper options
        wallpaperOptions.push(customWallpaperOption);

        // Select the new background
        handleBackgroundSelect(customImageId);

        toast.success('Custom background uploaded and saved!', { id: 'upload' });
      };

      reader.readAsDataURL(file);

    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error('Failed to upload image. Please try again.', { id: 'upload' });
    }
  };

  const removeCustomBackground = async (index: number) => {
    try {
      const customBackgrounds = getCustomBackgrounds();

      // Check if this is a database-stored image
      if (selectedBackground.startsWith('custom-db-')) {
        const dbId = selectedBackground.replace('custom-db-', '');

        // Try to delete from database (will fail gracefully if not found or no permission)
        try {
          await deleteCustomBackground(dbId);
        } catch (dbError) {
          console.warn('Could not delete from database, removing locally only:', dbError);
        }
      }

      // Remove from local storage
      removeCustomBackgroundUtil(index);
      const updatedCustomBackgrounds = getCustomBackgrounds();
      setCustomBackgrounds(updatedCustomBackgrounds);

      // If the currently selected background was a custom one and we removed it,
      // switch back to default
      if (selectedBackground.startsWith('custom-')) {
        // Find if the selected background matches this index
        const selectedIndex = wallpaperOptions.findIndex(w => w.id === selectedBackground);
        if (selectedIndex > -1 && wallpaperOptions[selectedIndex].preview.includes(customBackgrounds[index])) {
          handleBackgroundSelect('default');
        }
      }

      // Remove from wallpaper options
      wallpaperOptions.splice(
        wallpaperOptions.findIndex(w => w.preview.includes(customBackgrounds[index])),
        1
      );

      toast.success('Custom background removed');
    } catch (error) {
      console.error('Failed to remove custom background:', error);
      toast.error('Failed to remove background');
    }
  };

  useEffect(() => {
    const handleSave = async () => {
      try {
        // Import unified settings service dynamically
        const { unifiedSettingsService } = await import('../../../lib/unifiedSettingsService');

        // Save appearance settings to database
        await Promise.all([
          unifiedSettingsService.setSetting('user', 'appearance', 'accent_color', accentColor, 'string', currentUser?.id),
          unifiedSettingsService.setSetting('user', 'appearance', 'font_size', fontSize, 'string', currentUser?.id),
          unifiedSettingsService.setSetting('user', 'appearance', 'overlay_level', overlayLevel, 'string', currentUser?.id),
          unifiedSettingsService.setSetting('user', 'appearance', 'theme', selectedTheme, 'string', currentUser?.id),
        ]);

        // Save background selection (branch-specific or global)
        if (isBranchSpecific && currentBranch?.id) {
          // Persist branch-specific in localStorage and database
          localStorage.setItem(`selectedWallpaper_${currentBranch.id}`, selectedBackground);
          try {
            await saveBranchBackgroundToDatabase(currentBranch.id, selectedBackground);
          } catch (err) {
            console.warn('Failed to persist branch background to database on save:', err);
          }
        } else {
          // Persist global background
          localStorage.setItem('selectedWallpaper', selectedBackground);
          // Also try to save to general settings in DB if available
          try {
            await updateSettings({ background: selectedBackground });
          } catch (err) {
            console.warn('Failed to save global background to database:', err);
          }
        }

        toast.success('Appearance settings saved to database!');
        // Notify other parts of the app
        window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { type: 'appearance' } }));
      } catch (error) {
        console.error('Failed to save appearance settings:', error);
        toast.error('Failed to save appearance settings to database');
        throw error;
      }
    };

    registerSaveHandler('appearance-settings', handleSave);
    return () => unregisterSaveHandler('appearance-settings');
  }, [
    accentColor,
    selectedBackground,
    isBranchSpecific,
    currentBranch?.id,
    registerSaveHandler,
    unregisterSaveHandler,
    saveBranchBackgroundToDatabase,
    updateSettings,
  ]);

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
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Appearance Settings ✨</h3>
            <p className="text-sm text-gray-600">Customize theme, colors, font size, and backgrounds with branch-specific options</p>
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

          {/* Background Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Image className="w-4 h-4 text-indigo-600" />
              Background Settings
              {currentBranch && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                  Branch: {currentBranch.name}
                </span>
              )}
            </label>
                <div className="space-y-4">
                  {/* Current Background Display */}
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-900">Current Background</h4>
                      {currentBranch && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {isBranchSpecific ? 'Branch-specific' : 'Global setting'}
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isBranchSpecific}
                              onChange={(e) => {
                                if (e.target.checked && currentBranch?.id) {
                                  // Switch to branch-specific: use current global setting as branch setting
                                  const globalBackground = getCurrentWallpaper();
                                  changeWallpaper(globalBackground, currentBranch.id);
                                  setSelectedBackground(globalBackground);
                                  setIsBranchSpecific(true);
                                  toast.success(`Now using branch-specific background for ${currentBranch.name}`);
                                } else {
                                  // Switch to global: remove branch-specific setting
                                  localStorage.removeItem(`selectedWallpaper_${currentBranch?.id}`);
                                  const globalBackground = getCurrentWallpaper();
                                  changeWallpaper(globalBackground);
                                  setSelectedBackground(globalBackground);
                                  setIsBranchSpecific(false);
                                  toast.success(`Now using global background setting`);
                                }
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-16 h-12 rounded-lg border-2 border-gray-300 bg-cover bg-center"
                        style={{
                          backgroundImage: selectedBackground.startsWith('custom-')
                            ? `url(${customBackgrounds.find((_, index) => `custom-${Date.now() - (customBackgrounds.length - index - 1) * 1000}` === selectedBackground)})`
                            : wallpaperOptions.find(option => option.id === selectedBackground)?.preview || 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)'
                        }}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {wallpaperOptions.find(option => option.id === selectedBackground)?.name || 'Custom Background'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {currentBranch
                            ? (isBranchSpecific
                                ? `Branch-specific background for ${currentBranch.name}`
                                : 'Using global background setting')
                            : 'Click to change background'
                          }
                        </p>
                      </div>
                      <button
                        onClick={() => setShowBackgroundModal(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                      >
                        Change Background
                      </button>
                    </div>
                  </div>

                  {/* Upload Custom Background */}
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Upload Custom Background</h4>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer text-sm font-medium">
                        <Upload className="w-4 h-4" />
                        Upload Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      <div className="text-xs text-gray-500">
                        Max 5MB • JPG, PNG, GIF supported
                      </div>
                    </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Background Overlay</label>
                <div className="flex items-center gap-3">
                  <select
                    value={overlayLevel}
                    onChange={(e) => setOverlayLevel(e.target.value as 'none' | 'low' | 'medium' | 'high')}
                    className="px-3 py-2 border rounded bg-white"
                  >
                    <option value="none">None</option>
                    <option value="low">Low (default)</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <p className="text-xs text-gray-500">Control vignette/overlay intensity over wallpapers</p>
                </div>
              </div>

                {/* Custom Backgrounds List */}
                {customBackgrounds.length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      Your Custom Backgrounds
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        Synced to Cloud
                      </span>
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {customBackgrounds.map((imageUrl, index) => {
                        // Check if this is a database-stored image
                        const isDbStored = wallpaperOptions.some(w =>
                          w.id.startsWith('custom-db-') && w.preview.includes(imageUrl)
                        );

                        return (
                          <div key={index} className="relative group">
                            <div
                              className="w-full h-16 rounded-lg border-2 border-gray-300 bg-cover bg-center cursor-pointer hover:border-indigo-400 transition-colors"
                              style={{ backgroundImage: `url(${imageUrl})` }}
                              onClick={() => {
                                // Find the corresponding wallpaper option
                                const wallpaperOption = wallpaperOptions.find(w =>
                                  w.preview.includes(imageUrl)
                                );
                                if (wallpaperOption) {
                                  handleBackgroundSelect(wallpaperOption.id);
                                }
                              }}
                            />
                            {isDbStored && (
                              <div className="absolute top-1 left-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                            <button
                              onClick={() => removeCustomBackground(index)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              title="Remove background"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      🟢 Green dot indicates cloud-stored images • All images cached locally for offline use
                    </p>
                  </div>
                )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Selector Modal */}
      {showBackgroundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Choose Background</h2>
              <button
                onClick={() => setShowBackgroundModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Predefined Backgrounds */}
                {wallpaperOptions
                  .filter(option => !option.id.startsWith('custom-'))
                  .map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleBackgroundSelect(option.id)}
                    className={`relative p-4 rounded-xl border-2 transition-all duration-200 group ${
                      selectedBackground === option.id
                        ? 'border-indigo-500 shadow-lg scale-105'
                        : 'border-gray-200 hover:border-indigo-300 hover:scale-102'
                    }`}
                  >
                    <div
                      className="w-full h-20 rounded-lg mb-3 border border-gray-200"
                      style={{ background: option.preview }}
                    />
                    <p className="text-sm font-medium text-gray-700 text-center group-hover:text-indigo-600 transition-colors">
                      {option.name}
                    </p>
                    {selectedBackground === option.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}

                {/* Custom Backgrounds */}
                {customBackgrounds.map((imageUrl, index) => {
                  const customImageId = `custom-${Date.now() - (customBackgrounds.length - index - 1) * 1000}`;
                  return (
                    <button
                      key={customImageId}
                      onClick={() => handleBackgroundSelect(customImageId)}
                      className={`relative p-4 rounded-xl border-2 transition-all duration-200 group ${
                        selectedBackground === customImageId
                          ? 'border-indigo-500 shadow-lg scale-105'
                          : 'border-gray-200 hover:border-indigo-300 hover:scale-102'
                      }`}
                    >
                      <div
                        className="w-full h-20 rounded-lg mb-3 border border-gray-200 bg-cover bg-center"
                        style={{ backgroundImage: `url(${imageUrl})` }}
                      />
                      <p className="text-sm font-medium text-gray-700 text-center group-hover:text-indigo-600 transition-colors">
                        Custom {index + 1}
                      </p>
                      {selectedBackground === customImageId && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowBackgroundModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowBackgroundModal(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppearanceSettings;