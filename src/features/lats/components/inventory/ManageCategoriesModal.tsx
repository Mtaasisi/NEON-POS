// ManageCategoriesModal component - For managing categories in inventory page
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Plus, X, Tag, Edit, Trash2, Folder, Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';
import { useDialog } from '../../../shared/hooks/useDialog';
import CategoryForm from './CategoryForm';

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
  const { confirm } = useDialog();

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

  // Filter and sort categories
  const filteredAndSortedCategories = useMemo(() => {
    let filtered = categories.filter((category) => {
      const matchesSearch =
        !searchQuery ||
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });

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
      toast.success('Category deleted successfully');
      onCategoryUpdate?.();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
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

  const handleViewDetails = (category: Category) => {
    // For now, just edit - can be enhanced later with a detail view
    handleEditCategory(category);
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
            {filteredAndSortedCategories.map((category) => (
              <div
                key={category.id}
                onClick={() => handleViewDetails(category)}
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
                    {category.description && (
                      <p className="text-xs text-gray-600 truncate">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Category Stats */}
                <div className="flex items-center justify-between text-xs text-gray-600 mb-3 pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-1">
                    <Folder className="w-4 h-4" />
                    <span>Products: <strong>{category.productsCount || 0}</strong></span>
                  </div>
                  {category.color && (
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded border border-gray-300"
                        style={{ backgroundColor: category.color }}
                      ></div>
                    </div>
                  )}
                </div>

                {/* Sort Order */}
                <div className="text-xs text-gray-500">
                  Order: {category.sort_order}
                </div>
              </div>
            ))}
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
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[80]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CategoryForm
              category={editingCategory || undefined}
              parentCategories={categories}
              onSubmit={handleSubmitCategory}
              onCancel={() => {
                setShowCategoryForm(false);
                setShowAddCategoryForm(false);
                setEditingCategory(null);
              }}
              loading={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default ManageCategoriesModal;

