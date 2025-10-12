# 📂 Categories Guide - How to Use Categories in Your App

## ✅ Current Status

**All 47 categories** from your backup are now successfully imported into your Neon database and ready to use!

## 🎯 Where Categories Are Used in Your App

### 1. **Inventory Management** (`/inventory`)
   - **CategoriesTab Component**: Manage all categories
   - **CategoryTree Component**: View hierarchical category structure
   - Path: `src/features/lats/components/inventory-management/CategoriesTab.tsx`

### 2. **POS System** (`/pos`)
   - **ExpandableCategories Component**: Filter products by category
   - **Product Search**: Search within categories
   - Path: `src/features/lats/components/pos/ExpandableCategories.tsx`

### 3. **Product Forms**
   - **CategorySelector Component**: Select category when creating/editing products
   - Path: `src/features/forms/components/CategorySelector.tsx`

### 4. **Settings**
   - **CategoryManagementPage**: Full category CRUD operations
   - Path: `src/features/settings/pages/CategoryManagementPage.tsx`

---

## 🔧 How to Fetch Categories in Your Code

### Option 1: Using the `useCategories` Hook (Simple)

```typescript
import { useCategories } from '@/hooks/useCategories';

function MyComponent() {
  const { categories, loading, error, refetch } = useCategories({
    activeOnly: true,      // Only get active categories
    searchQuery: '',       // Optional search
    autoFetch: true        // Auto-fetch on mount
  });

  if (loading) return <div>Loading categories...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {categories.map(category => (
        <div key={category.id}>
          {category.icon} {category.name}
        </div>
      ))}
    </div>
  );
}
```

### Option 2: Using the `useOptimizedCategories` Hook (Better Performance)

```typescript
import { useOptimizedCategories } from '@/features/lats/hooks/useOptimizedCategories';

function MyComponent() {
  const { 
    categories, 
    loading, 
    error, 
    refetch,
    getCategoryById,
    search 
  } = useOptimizedCategories({
    activeOnly: false,
    forceRefresh: false    // Uses cache when available
  });

  return (
    <div>
      <input 
        onChange={(e) => search(e.target.value)}
        placeholder="Search categories..."
      />
      {categories.map(category => (
        <div key={category.id} style={{ color: category.color }}>
          {category.name} - {category.description}
        </div>
      ))}
    </div>
  );
}
```

### Option 3: Using the Category Service (Direct Access)

```typescript
import { categoryService } from '@/features/lats/lib/categoryService';

async function loadCategories() {
  try {
    // Get all categories
    const allCategories = await categoryService.getCategories();
    
    // Get only active categories
    const activeCategories = await categoryService.getActiveCategories();
    
    // Get active categories excluding spare parts
    const mainCategories = await categoryService.getActiveCategoriesExcludingSpare();
    
    // Search categories
    const searchResults = await categoryService.searchCategories('phone');
    
    // Get a specific category
    const category = await categoryService.getCategoryById('some-id');
    
    // Get category stats
    const stats = await categoryService.getCategoryStats();
    console.log(stats); // { total: 47, active: 47, inactive: 0, ... }
    
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}
```

### Option 4: Using Supabase Client (Raw Queries)

```typescript
import { supabase } from '@/lib/supabaseClient';

async function fetchCategories() {
  // Get all categories
  const { data, error } = await supabase
    .from('lats_categories')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data;
}

// Get active categories only
async function fetchActiveCategories() {
  const { data, error } = await supabase
    .from('lats_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
    .order('name');
  
  return data;
}

// Get root categories (no parent)
async function fetchRootCategories() {
  const { data } = await supabase
    .from('lats_categories')
    .select('*')
    .is('parent_id', null)
    .eq('is_active', true);
  
  return data;
}
```

---

## 📊 Category Data Structure

Each category has the following fields:

```typescript
interface Category {
  id: string;                           // UUID
  name: string;                         // Category name
  description?: string;                 // Description
  parent_id?: string;                   // Parent category ID (for hierarchy)
  color?: string;                       // Hex color code (e.g., "#FF6B35")
  icon?: string;                        // Icon emoji or name
  is_active: boolean;                   // Whether category is active
  sort_order: number;                   // Custom ordering
  metadata?: Record<string, any>;       // Additional data (JSON)
  created_at: string;                   // Creation timestamp
  updated_at: string;                   // Last update timestamp
  children?: Category[];                // Child categories (when loaded hierarchically)
}
```

---

## 📋 Your Current Categories (47 total)

### Main Categories:
- 📱 Mobile Phones, Android Phones, iPhones
- 💻 Laptop, MacBook, Business Laptops, Student Laptops, Gaming Laptops
- 🖥️ Desktop, Computers, CPU, Monitors
- 📟 Tablet, iPad, Android Tablets, Tablets
- 🔊 Audio & Sound, Bluetooth Speakers, Soundbars, Headphones
- 📺 TVs
- 🛜 Network Equipment

### Spare Parts:
- 🔧 Spare Parts (main category)
- 🔋 Batteries
- 📱 Screens
- ⌨️ Keyboards
- 🔌 Chargers, Charging Ports
- 🔩 Hinges
- 🔊 Speakers
- 🌀 Fans
- 🧠 Logic Boards
- 📷 Cameras
- 🔘 Buttons
- 🏠 Housings
- 🖱️ Touchpads
- 📹 Webcams
- 📡 WiFi Cards
- 💾 RAM Modules, SSD/HDD

### Accessories:
- 🎧 Phone Accessories
- 💻 Laptop Accessories
- 🎵 Audio Accessories
- 🖥️ Computer Accessories
- 📦 Accessories (general)

---

## 🚀 Quick Actions

### View Categories in Your App
1. Go to **Inventory** page → **Categories** tab
2. Or go to **Settings** → **Category Management**

### Filter Products by Category
1. Go to **POS** page
2. Use the category filter on the left sidebar
3. Click any category to see products in that category

### Add a New Category
```typescript
import { createCategory } from '@/lib/categoryApi';

const newCategory = await createCategory({
  name: 'New Category',
  description: 'Category description',
  color: '#3B82F6',
  icon: '📦',
  is_active: true,
  sort_order: 0
});
```

### Update a Category
```typescript
import { updateCategory } from '@/lib/categoryApi';

await updateCategory('category-id', {
  name: 'Updated Name',
  color: '#10B981'
});
```

---

## 🎨 Category Features

### ✅ Hierarchical Structure
- Create parent-child relationships using `parent_id`
- Build category trees for better organization
- Example: "Mobile Phones" → "Android Phones" → "Samsung Phones"

### ✅ Color Coding
- Each category can have a color (`color` field)
- Use hex color codes: `#FF6B35`, `#3B82F6`, etc.
- Great for visual organization in the UI

### ✅ Icons
- Add emojis or icon names to categories
- Example: 📱, 💻, 🔧, etc.

### ✅ Search & Filter
- Full-text search by name and description
- Filter by active/inactive status
- Filter to exclude spare parts

### ✅ Caching
- CategoryService uses intelligent caching (5-minute cache)
- Reduces database queries
- Force refresh when needed: `categoryService.forceRefresh()`

---

## 🔄 Refresh Categories

If you add/update categories in the database, refresh them in your app:

```typescript
// Using hooks
const { refetch } = useCategories();
await refetch();

// Using service
await categoryService.forceRefresh();

// Invalidate cache
categoryService.invalidateCache();
```

---

## 📞 Support

For more information, check:
- Category API: `src/lib/categoryApi.ts`
- Category Service: `src/features/lats/lib/categoryService.ts`
- Category Hooks: `src/hooks/useCategories.ts`
- Example Components: `src/features/lats/components/inventory-management/CategoriesTab.tsx`

---

**✅ All categories are imported and ready to use!**

