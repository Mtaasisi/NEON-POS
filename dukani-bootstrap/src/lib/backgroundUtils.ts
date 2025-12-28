// Background/Wallpaper utility functions

export interface WallpaperOption {
  id: string;
  name: string;
  cssClass: string;
  preview: string;
}

export const wallpaperOptions: WallpaperOption[] = [
  {
    id: 'default',
    name: 'Default',
    cssClass: 'default-wallpaper',
    preview: 'radial-gradient(ellipse at center, #e0f7fa 0%, #b3e5fc 40%, #039be5 80%, #01579b 100%)'
  },
  {
    id: 's-curve-red-blue',
    name: 'S-Curve Red & Blue',
    cssClass: 's-curve-red-blue',
    preview: 'linear-gradient(135deg, #ff4757 0%, #00d2d3 100%)'
  },
  {
    id: 'warm-gradient',
    name: 'Warm Gradient',
    cssClass: 'warm-gradient',
    preview: 'linear-gradient(135deg, #ff6b35 0%, #f0f8ff 100%)'
  },
  {
    id: 'cool-gradient',
    name: 'Cool Gradient',
    cssClass: 'cool-gradient',
    preview: 'linear-gradient(135deg, #667eea 0%, #4facfe 100%)'
  },
  {
    id: 'sunset',
    name: 'Sunset',
    cssClass: 'sunset',
    preview: 'linear-gradient(135deg, #ff9a9e 0%, #ffafbd 100%)'
  },
  {
    id: 'ocean',
    name: 'Ocean',
    cssClass: 'ocean',
    preview: 'linear-gradient(135deg, #667db6 0%, #0082c8 100%)'
  },
  {
    id: 'forest',
    name: 'Forest',
    cssClass: 'forest',
    preview: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)'
  },
  {
    id: 'dark-mode',
    name: 'Dark Mode',
    cssClass: 'dark-mode',
    preview: 'linear-gradient(135deg, #1a1a1a 0%, #2d3748 100%)'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    cssClass: 'minimal',
    preview: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)'
  },

  // New vibrant color options
  {
    id: 'purple-dream',
    name: 'Purple Dream',
    cssClass: 'purple-dream',
    preview: 'linear-gradient(135deg, #a855f7 0%, #ec4899 25%, #f97316 50%, #eab308 75%, #22c55e 100%)'
  },
  {
    id: 'neon-city',
    name: 'Neon City',
    cssClass: 'neon-city',
    preview: 'linear-gradient(135deg, #ff0080 0%, #00ff80 25%, #8000ff 50%, #ff8000 75%, #0080ff 100%)'
  },
  {
    id: 'pastel-paradise',
    name: 'Pastel Paradise',
    cssClass: 'pastel-paradise',
    preview: 'linear-gradient(135deg, #fce7f3 0%, #e0e7ff 25%, #fef3c7 50%, #d1fae5 75%, #fce7f3 100%)'
  },
  {
    id: 'fire-and-ice',
    name: 'Fire & Ice',
    cssClass: 'fire-and-ice',
    preview: 'linear-gradient(135deg, #dc2626 0%, #ea580c 25%, #f59e0b 50%, #06b6d4 75%, #2563eb 100%)'
  },
  {
    id: 'emerald-glow',
    name: 'Emerald Glow',
    cssClass: 'emerald-glow',
    preview: 'linear-gradient(135deg, #065f46 0%, #047857 25%, #059669 50%, #10b981 75%, #34d399 100%)'
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    cssClass: 'royal-purple',
    preview: 'linear-gradient(135deg, #581c87 0%, #7c3aed 25%, #a855f7 50%, #c084fc 75%, #e9d5ff 100%)'
  },
  {
    id: 'coral-sunset',
    name: 'Coral Sunset',
    cssClass: 'coral-sunset',
    preview: 'linear-gradient(135deg, #dc2626 0%, #ea580c 25%, #f97316 50%, #fb923c 75%, #fed7aa 100%)'
  },
  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    cssClass: 'midnight-blue',
    preview: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 25%, #2563eb 50%, #3b82f6 75%, #60a5fa 100%)'
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    cssClass: 'golden-hour',
    preview: 'linear-gradient(135deg, #f59e0b 0%, #d97706 25%, #b45309 50%, #92400e 75%, #78350f 100%)'
  },
  {
    id: 'spring-bloom',
    name: 'Spring Bloom',
    cssClass: 'spring-bloom',
    preview: 'linear-gradient(135deg, #84cc16 0%, #22c55e 25%, #06b6d4 50%, #3b82f6 75%, #8b5cf6 100%)'
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    cssClass: 'cyberpunk',
    preview: 'linear-gradient(135deg, #ef4444 0%, #f97316 25%, #eab308 50%, #22c55e 75%, #3b82f6 100%)'
  },
  {
    id: 'arctic-blue',
    name: 'Arctic Blue',
    cssClass: 'arctic-blue',
    preview: 'linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 25%, #81d4fa 50%, #4fc3f7 75%, #29b6f6 100%)'
  }
];

// Wallpaper system uses CSS classes defined in index.css

// Helper function to safely remove CSS classes (handles spaces)
function removeCssClasses(element: HTMLElement, classString: string): void {
  const classes = classString.split(' ').filter(cls => cls.trim() !== '');
  classes.forEach(cls => {
    if (cls.trim()) {
      element.classList.remove(cls.trim());
    }
  });
}

// Helper function to safely add CSS classes (handles spaces)
function addCssClasses(element: HTMLElement, classString: string): void {
  const classes = classString.split(' ').filter(cls => cls.trim() !== '');
  classes.forEach(cls => {
    if (cls.trim()) {
      element.classList.add(cls.trim());
    }
  });
}

// Change wallpaper using CSS classes or custom images
// If branchId is provided, saves as branch-specific setting
export function changeWallpaper(wallpaperId: string, branchId?: string): void {
  // First check if it's a custom background
  if (wallpaperId.startsWith('custom-')) {
    // Reset all wallpaper classes first
    wallpaperOptions.forEach(w => {
      removeCssClasses(document.body, w.cssClass);
    });

    const customBackgrounds = JSON.parse(localStorage.getItem('customBackgrounds') || '[]');
    const customIndex = parseInt(wallpaperId.split('-')[1]);
    const imageUrl = customBackgrounds[customIndex];

    if (imageUrl) {
      // Apply custom background directly to body style
      document.body.style.backgroundImage = `url(${imageUrl})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundAttachment = 'fixed';

      // Save to localStorage
      localStorage.setItem('selectedWallpaper', wallpaperId);

      return;
    }
  }

  // Handle predefined wallpapers using CSS classes
  const wallpaper = wallpaperOptions.find(w => w.id === wallpaperId);
  if (!wallpaper) {
    console.warn(`Wallpaper "${wallpaperId}" not found`);
    return;
  }

  // Remove all wallpaper classes from body first
  wallpaperOptions.forEach(w => {
    removeCssClasses(document.body, w.cssClass);
  });

  // Reset any custom background styles
  document.body.style.backgroundImage = '';
  document.body.style.backgroundSize = '';
  document.body.style.backgroundPosition = '';
  document.body.style.backgroundRepeat = '';
  document.body.style.backgroundAttachment = '';

  // Add the selected wallpaper class
  addCssClasses(document.body, wallpaper.cssClass);

  // Save to localStorage (branch-specific or global)
  const storageKey = branchId ? `selectedWallpaper_${branchId}` : 'selectedWallpaper';
  localStorage.setItem(storageKey, wallpaperId);

  // Save to database if branchId is provided
  if (branchId) {
    saveBranchBackgroundToDatabase(branchId, wallpaperId).catch(error => {
      console.warn('Failed to save branch background to database:', error);
    });
  }
}

// Apply saved wallpaper on app startup (supports branch-specific backgrounds)
export function applySavedWallpaper(branchId?: string): void {
  const savedWallpaper = getCurrentWallpaper(branchId);
  if (savedWallpaper && savedWallpaper !== 'default') {
    changeWallpaper(savedWallpaper, branchId);
  } else {
    // Apply default wallpaper
    changeWallpaper('default', branchId);
  }
}

// Get current wallpaper ID (supports branch-specific backgrounds)
export function getCurrentWallpaper(branchId?: string): string {
  // First try branch-specific setting
  if (branchId) {
    const branchWallpaper = localStorage.getItem(`selectedWallpaper_${branchId}`);
    if (branchWallpaper) {
      return branchWallpaper;
    }
  }

  // Fall back to global setting
  const savedWallpaper = localStorage.getItem('selectedWallpaper');
  return savedWallpaper || 'default';
}

// Reset to default wallpaper
export function resetWallpaper(): void {
  changeWallpaper('default');
}

// Get custom backgrounds from localStorage
export function getCustomBackgrounds(): Array<{id: string, url: string, name: string, branchId?: string, createdAt: string}> {
  try {
    return JSON.parse(localStorage.getItem('customBackgrounds') || '[]');
  } catch (error) {
    console.error('Failed to parse custom backgrounds:', error);
    return [];
  }
}

// Add custom background
export function addCustomBackground(imageUrl: string, name?: string, branchId?: string): void {
  const customBackgrounds = getCustomBackgrounds();
  const id = `custom-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  customBackgrounds.push({
    id,
    url: imageUrl,
    name: name || 'Custom Image',
    branchId: branchId || 'global',
    createdAt: new Date().toISOString()
  });
  localStorage.setItem('customBackgrounds', JSON.stringify(customBackgrounds));
}

// Remove custom background
export function removeCustomBackground(index: number): void {
  const customBackgrounds = getCustomBackgrounds();
  if (index >= 0 && index < customBackgrounds.length) {
    customBackgrounds.splice(index, 1);
    localStorage.setItem('customBackgrounds', JSON.stringify(customBackgrounds));
  }
}

// Upload image as base64 and save to local storage
export async function uploadCustomBackgroundToStorage(
  file: File,
  branchId?: string,
  userId?: string
): Promise<{ id: string; publicUrl: string; filename: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const base64String = e.target?.result as string;

        // Generate unique ID
        const id = `custom-${Date.now()}-${Math.random().toString(36).substring(2)}`;

        // Save to local storage
        const customBackgrounds = getCustomBackgrounds();
        customBackgrounds.push({
          id,
          url: base64String,
          name: file.name,
          branchId: branchId || 'global',
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('customBackgrounds', JSON.stringify(customBackgrounds));

        resolve({
          id,
          publicUrl: base64String,
          filename: file.name
        });

      } catch (error) {
        console.error('Failed to process custom background:', error);
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

// Fetch custom backgrounds from local storage (simulates database)
export async function fetchCustomBackgroundsFromDatabase(branchId?: string): Promise<Array<{
  id: string;
  name: string;
  image_url: string;
  created_at: string;
}>> {
  try {
    const customBackgrounds = getCustomBackgrounds();

    // Filter by branch if specified
    const filtered = branchId
      ? customBackgrounds.filter(bg => bg.branchId === branchId || bg.branchId === 'global')
      : customBackgrounds;

    // Convert to the expected format
    return filtered.map(bg => ({
      id: bg.id,
      name: bg.name,
      image_url: bg.url,
      created_at: bg.createdAt
    }));
  } catch (error) {
    console.error('Failed to fetch custom backgrounds:', error);
    return [];
  }
}

// Delete custom background from local storage
export async function deleteCustomBackground(backgroundId: string): Promise<void> {
  try {
    const customBackgrounds = getCustomBackgrounds();
    const filteredBackgrounds = customBackgrounds.filter(bg => bg.id !== backgroundId);

    if (filteredBackgrounds.length !== customBackgrounds.length) {
      localStorage.setItem('customBackgrounds', JSON.stringify(filteredBackgrounds));
    } else {
      console.warn(`Background with id ${backgroundId} not found`);
    }
  } catch (error) {
    console.error('Failed to delete custom background:', error);
    throw error;
  }
}

// Enhanced add custom background function that syncs with database
export function addCustomBackgroundWithSync(imageUrl: string): void {
  // Add to local storage first
  const customBackgrounds = getCustomBackgrounds();
  customBackgrounds.push(imageUrl);
  localStorage.setItem('customBackgrounds', JSON.stringify(customBackgrounds));

  // Database sync is handled in the upload function
  console.log('Custom background added locally');
}

// Save branch background to database
export async function saveBranchBackgroundToDatabase(branchId: string, wallpaperId: string): Promise<void> {
  try {
    // Import supabase client dynamically to avoid circular dependencies
    const { supabase } = await import('./supabaseClient');

    const { error } = await supabase
      .from('store_locations')
      .update({ background_color: wallpaperId })
      .eq('id', branchId);

    if (error) {
      throw error;
    }

    console.log(`Branch background saved to database: ${branchId} -> ${wallpaperId}`);
  } catch (error) {
    console.error('Failed to save branch background to database:', error);
    throw error;
  }
}

// Load branch background from database
export async function loadBranchBackgroundFromDatabase(branchId: string): Promise<string | null> {
  try {
    // Import supabase client dynamically to avoid circular dependencies
    const { supabase } = await import('./supabaseClient');

    const { data, error } = await supabase
      .from('store_locations')
      .select('background_color')
      .eq('id', branchId)
      .single();

    if (error) {
      // If branch doesn't exist or no background set, return null
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data?.background_color || null;
  } catch (error) {
    console.error('Failed to load branch background from database:', error);
    return null;
  }
}
