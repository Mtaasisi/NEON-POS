import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Tag, Plus, Trash2 } from 'lucide-react';
import CategoryForm from './CategoryForm';
import { CategoryFormData, Category } from '../../types/inventory';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  onDelete?: (categoryId: string) => Promise<void>;
  parentCategories?: Category[];
  loading?: boolean;
  deleting?: boolean;
  editingCategory?: Category | null;
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  parentCategories = [],
  loading = false,
  deleting = false,
  editingCategory = null
}) => {
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

  if (!isOpen) return null;

  const handleFormSubmit = () => {
    const form = document.getElementById('category-form') as HTMLFormElement;
    if (form) {
      form.requestSubmit();
    }
  };

  return createPortal(
    <div 
      className="fixed bg-black/60 flex items-center justify-center p-4 z-[99999]" 
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
      aria-labelledby="category-form-title"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden relative"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading || deleting}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header - Fixed */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
              editingCategory ? 'bg-indigo-600' : 'bg-green-600'
            }`}>
              {editingCategory ? (
                <Tag className="w-8 h-8 text-white" />
              ) : (
                <Plus className="w-8 h-8 text-white" />
              )}
            </div>
            
            {/* Text */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2" id="category-form-title">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <p className="text-sm text-gray-600">
                {editingCategory ? 'Update category information below' : 'Enter category details below'}
              </p>
            </div>
          </div>
        </div>

        {/* Form - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <CategoryForm
            category={editingCategory || undefined}
            parentCategories={parentCategories}
            onSubmit={onSubmit}
            onDelete={editingCategory ? onDelete : undefined}
            onCancel={onClose}
            loading={loading}
            deleting={deleting}
            renderActionsInModal={true}
          />
        </div>

        {/* Action Buttons - Fixed Footer */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 flex-shrink-0 bg-white px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading || deleting}
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          
          {editingCategory && onDelete && (
            <button
              type="button"
              onClick={async () => {
                if (confirm(`Are you sure you want to delete "${editingCategory.name}"? This action cannot be undone. Products using this category will have their category set to null.`)) {
                  try {
                    await onDelete(editingCategory.id);
                    onClose();
                  } catch (error) {
                    console.error('Error deleting category:', error);
                  }
                }
              }}
              disabled={loading || deleting}
              className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5" />
                  Delete
                </>
              )}
            </button>
          )}
          
          <button
            type="button"
            onClick={handleFormSubmit}
            disabled={loading || deleting}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                {editingCategory ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                {editingCategory ? (
                  <>
                    <Tag className="w-5 h-5" />
                    Update Category
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Create Category
                  </>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CategoryFormModal;
