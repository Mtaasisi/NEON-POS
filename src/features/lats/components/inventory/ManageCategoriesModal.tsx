// ManageCategoriesModal component - For managing categories in inventory page
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Plus, X, Tag, Edit, Trash2, Folder, Info, Package
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';
import { useDialog } from '../../../shared/hooks/useDialog';
import CategoryFormModal from './CategoryFormModal';
import { useInventoryStore } from '../../stores/useInventoryStore';
import { Product } from '../../types/inventory';

interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  color?: string;
  icon?: string;
  is_active: boolean;
  sort_order: number;
  metadata?: Record<string, string>;
  created_at: string;
  updated_at: string;
  productsCount?: number;
}

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onCategoryUpdate?: () => void;
}

const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoryUpdate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { confirm } = useDialog();
  
  // Get products from store
  const { products, loadProducts } = useInventoryStore();
  
  // Load products when modal opens
  useEffect(() => {
    if (isOpen && products.length === 0) {
      loadProducts().catch(err => {
        console.error('Error loading products:', err);
      });
    }
  }, [isOpen, products.length, loadProducts]);
  
  // Group products by category
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    products.forEach(product => {
      // Handle different category field formats
      const categoryId = (product as any).categoryId || 
                        (product as any).category_id || 
                        (product.category as any)?.id ||
                        'uncategorized';
      
      if (!grouped[categoryId]) {
        grouped[categoryId] = [];
      }
      grouped[categoryId].push(product);
    });
    return grouped;
  }, [products]);

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Additional scroll prevention for html element
  useEffect(() => {
    if (isOpen) {
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';

      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [isOpen]);

  // Filter and sort categories - always show in grid
  const filteredAndSortedCategories = useMemo(() => {
    let filtered = categories;

    // Apply search filter
    if (searchQuery) {
      filtered = categories.filter((category) => {
        const matchesSearch =
          category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          category.description?.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesSearch;
      });
    }

    // Sort by sort_order and then by name
    filtered.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [categories, searchQuery]);

  if (!isOpen) return null;

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const handleDeleteCategory = async (category: Category) => {
    const confirmed = await confirm(
      `Are you sure you want to delete "${category.name}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      // Call delete API
      const { deleteCategory } = await import('../../../../lib/categoryApi');
      await deleteCategory(category.id);
      
      // Invalidate category cache to ensure fresh data
      const { categoryService } = await import('../../lib/categoryService');
      categoryService.invalidateCache();
      
      toast.success('Category deleted successfully');
      onCategoryUpdate?.();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const handleDeleteCategoryFromForm = async (categoryId: string) => {
    try {
      setIsDeleting(true);
      
      // Call delete API
      const { deleteCategory } = await import('../../../../lib/categoryApi');
      await deleteCategory(categoryId);
      
      // Invalidate category cache to ensure fresh data
      const { categoryService } = await import('../../lib/categoryService');
      categoryService.invalidateCache();
      
      toast.success('Category deleted successfully');
      
      // Close form and reset
      setShowCategoryForm(false);
      setShowAddCategoryForm(false);
      setEditingCategory(null);
      onCategoryUpdate?.();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
      throw error; // Re-throw so form can handle it
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmitCategory = async (data: any) => {
    try {
      setIsSubmitting(true);
      
      if (editingCategory) {
        // Update existing category
        const { updateCategory } = await import('../../../../lib/categoryApi');
        await updateCategory(editingCategory.id, data);
        toast.success('Category updated successfully');
      } else {
        // Create new category
        const { createCategory } = await import('../../../../lib/categoryApi');
        await createCategory(data);
        toast.success('Category created successfully');
      }
      
      // Invalidate category cache to ensure fresh data
      const { categoryService } = await import('../../lib/categoryService');
      categoryService.invalidateCache();
      
      setShowCategoryForm(false);
      setShowAddCategoryForm(false);
      setEditingCategory(null);
      onCategoryUpdate?.();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };


  return createPortal(
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]"
      style={{ 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        overflow: 'hidden',
        overscrollBehavior: 'none'
      }}
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="category-modal-title"
      onClick={(e) => {
        // Only close if clicking directly on the backdrop, not on child modals
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header - Fixed */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <Tag className="w-8 h-8 text-white" />
            </div>
            
            {/* Text */}
            <div>
              <h3 id="category-modal-title" className="text-2xl font-bold text-gray-900 mb-2">Manage Categories</h3>
              <p className="text-sm text-gray-600">View, edit, and manage your product categories</p>
            </div>
          </div>
        </div>

        {/* Fixed Search Section */}
        <div className="p-6 pb-0 flex-shrink-0">
          <div className="flex gap-3 mb-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search categories by name or description..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
          </div>

          {/* Results Count */}
          <div className="text-sm text-gray-600 mb-4">
            {filteredAndSortedCategories.length} of {categories.length} categories
          </div>
        </div>

        {/* Scrollable Categories Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedCategories.map((category) => {
              const categoryProducts = productsByCategory[category.id] || [];
              const parent = categories.find(c => c.id === category.parent_id);
              
              return (
                <div
                  key={category.id}
                  onClick={() => handleEditCategory(category)}
                  className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-indigo-400 hover:shadow-lg transition-all duration-200 flex flex-col cursor-pointer"
                >
                  {/* Category Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-2xl"
                      style={{ backgroundColor: category.color ? `${category.color}20` : '#EEF2FF' }}
                    >
                      {category.icon || '📁'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900 text-sm truncate">{category.name}</h4>
                        {category.is_active && (
                          <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></span>
                        )}
                      </div>
                      {parent && (
                        <p className="text-xs text-indigo-600 mb-1">
                          Parent: {parent.name}
                        </p>
                      )}
                      {category.description && (
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {category.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Category Stats */}
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-3 pb-3 border-b border-gray-200">
                    <div className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      <span>Products: <strong>{categoryProducts.length}</strong></span>
                    </div>
                    {category.color && (
                      <div 
                        className="w-4 h-4 rounded border border-gray-300"
                        style={{ backgroundColor: category.color }}
                      ></div>
                    )}
                  </div>

                  {/* Products Preview */}
                  {categoryProducts.length > 0 && (
                    <div className="mb-3 space-y-1 max-h-32 overflow-y-auto">
                      {categoryProducts.slice(0, 5).map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Could navigate to product or show product details
                          }}
                        >
                          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0"></div>
                          <span className="truncate flex-1">{product.name}</span>
                          {product.variants && product.variants.length > 0 && (
                            <span className="text-gray-400 text-xs">
                              {product.variants.length} var
                            </span>
                          )}
                        </div>
                      ))}
                      {categoryProducts.length > 5 && (
                        <div className="text-xs text-gray-400 text-center pt-1">
                          +{categoryProducts.length - 5} more products
                        </div>
                      )}
                    </div>
                  )}

                  {/* Empty State */}
                  {categoryProducts.length === 0 && (
                    <div className="mb-3 text-center py-4 text-xs text-gray-400 bg-gray-50 rounded-lg">
                      No products in this category
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      Order: {category.sort_order}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCategory(category);
                        }}
                        className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Edit category"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(category);
                        }}
                        className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredAndSortedCategories.length === 0 && (
            <div className="text-center py-12">
              <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No categories found</h3>
              <p className="text-gray-500">Try adjusting your search or create a new category</p>
            </div>
          )}
        </div>

        {/* Footer with Add Button */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            onClick={() => {
              setEditingCategory(null);
              setShowAddCategoryForm(true);
              setShowCategoryForm(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-semibold shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add New Category
          </button>
        </div>
      </div>

      {/* Category Form Modal */}
      {showCategoryForm && (
        <CategoryFormModal
          isOpen={showCategoryForm}
          onClose={() => {
            setShowCategoryForm(false);
            setShowAddCategoryForm(false);
            setEditingCategory(null);
          }}
          onSubmit={handleSubmitCategory}
          onDelete={editingCategory ? handleDeleteCategoryFromForm : undefined}
          parentCategories={categories}
          loading={isSubmitting}
          deleting={isDeleting}
          editingCategory={editingCategory}
        />
      )}
    </div>,
    document.body
  );
};

export default ManageCategoriesModal;

