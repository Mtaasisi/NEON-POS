// Utility functions for supplier data processing

/**
 * Extract product categories from supplier notes
 * Notes format: "Product Categories: Category1, Category2, Category3\n\nOther notes..."
 */
export const extractProductCategories = (notes?: string): string[] => {
  if (!notes) return [];
  
  const match = notes.match(/Product Categories:\s*([^\n]+)/);
  if (!match) return [];
  
  const categoriesText = match[1];
  return categoriesText
    .split(',')
    .map(cat => cat.trim())
    .filter(cat => cat.length > 0);
};

/**
 * Get color class for a category (consistent based on category name)
 */
export const getCategoryColor = (category: string): string => {
  const categoryColors = [
    'bg-blue-50 border-blue-300 text-blue-900',
    'bg-purple-50 border-purple-300 text-purple-900',
    'bg-green-50 border-green-300 text-green-900',
    'bg-orange-50 border-orange-300 text-orange-900',
    'bg-pink-50 border-pink-300 text-pink-900',
    'bg-indigo-50 border-indigo-300 text-indigo-900',
    'bg-teal-50 border-teal-300 text-teal-900',
    'bg-cyan-50 border-cyan-300 text-cyan-900',
  ];

  const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return categoryColors[hash % categoryColors.length];
};

/**
 * Get shortened category name for compact display
 */
export const getShortenedCategory = (category: string, maxLength: number = 20): string => {
  if (category.length <= maxLength) return category;
  return category.substring(0, maxLength - 3) + '...';
};

/**
 * Check if supplier is from China
 */
export const isChineseSupplier = (country?: string): boolean => {
  return country === 'China' || country === 'CN';
};

/**
 * Get country flag emoji
 */
export const getCountryFlag = (country?: string): string => {
  const flagMap: { [key: string]: string } = {
    'Tanzania': '🇹🇿',
    'USA': '🇺🇸',
    'UAE': '🇦🇪',
    'China': '🇨🇳',
    'Germany': '🇩🇪',
    'Kenya': '🇰🇪',
    'UK': '🇬🇧',
    'India': '🇮🇳',
    'Japan': '🇯🇵',
  };
  
  return flagMap[country || ''] || '🌍';
};

