// CategoryForm component for LATS module
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tag, X } from 'lucide-react';
import EmojiPicker from '../../../shared/components/ui/EmojiPicker';

// Validation schema
const categoryFormSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Category name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  parentId: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  icon: z.string().max(50, 'Icon name must be less than 50 characters').optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().min(0, 'Sort order must be 0 or greater').default(0),
  metadata: z.record(z.string()).optional()
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

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
}

interface CategoryFormProps {
  category?: Category;
  parentCategories?: Category[];
  onSubmit: (data: CategoryFormData) => Promise<void>;
  onDelete?: (categoryId: string) => Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
  loading?: boolean;
  deleting?: boolean;
  className?: string;
  renderActionsInModal?: boolean; // If true, don't render action buttons (modal will handle them)
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  category,
  parentCategories = [],
  onSubmit,
  onDelete,
  onCancel,
  onClose,
  loading = false,
  deleting = false,
  className = '',
  renderActionsInModal = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form setup
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    reset
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name || '',
      description: category?.description || '',
      parentId: category?.parent_id || '',
      color: category?.color || '#3B82F6',
      icon: category?.icon || '',
      isActive: category?.is_active ?? true,
      sortOrder: category?.sort_order || 0,
      metadata: category?.metadata || {}
    }
  });

  // Watch form values
  const watchedValues = watch();
  const isActive = watchedValues.isActive;

  // Handle form submission
  const handleFormSubmit = async (data: CategoryFormData) => {
    try {
      // Map form data to API format (camelCase to snake_case)
      const apiData = {
        name: data.name,
        description: data.description,
        parent_id: data.parentId,
        color: data.color,
        icon: data.icon,
        is_active: data.isActive,
        sort_order: data.sortOrder,
        metadata: data.metadata
      };
      
      await onSubmit(apiData);
      reset(data); // Reset form with new values
    } catch (error) {
      console.error('Category form submission error:', error);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    const cancelHandler = onCancel || onClose;
    if (!cancelHandler) {
      console.warn('CategoryForm: No cancel handler provided');
      return;
    }

    if (isDirty) {
      if (confirm('Are you sure you want to discard your changes?')) {
        reset();
        cancelHandler();
      }
    } else {
      cancelHandler();
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!category || !onDelete) return;

    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    try {
      await onDelete(category.id);
      setShowDeleteConfirm(false);
      const cancelHandler = onCancel || onClose;
      cancelHandler?.();
    } catch (error) {
      console.error('Category deletion error:', error);
      setShowDeleteConfirm(false);
    }
  };

  // Color options
  const colorOptions = [
    { value: '#3B82F6', label: 'Blue', color: '#3B82F6' },
    { value: '#10B981', label: 'Green', color: '#10B981' },
    { value: '#F59E0B', label: 'Yellow', color: '#F59E0B' },
    { value: '#EF4444', label: 'Red', color: '#EF4444' },
    { value: '#8B5CF6', label: 'Purple', color: '#8B5CF6' },
    { value: '#EC4899', label: 'Pink', color: '#EC4899' },
    { value: '#6B7280', label: 'Gray', color: '#6B7280' },
    { value: '#000000', label: 'Black', color: '#000000' }
  ];

  return (
    <form 
      id="category-form"
      onSubmit={handleSubmit(handleFormSubmit)} 
      className={`space-y-6 ${className}`}
    >
      {/* Delete Confirmation */}
      {showDeleteConfirm && category && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 mb-1">Delete Category?</h4>
              <p className="text-sm text-red-700 mb-3">
                Are you sure you want to delete "{category.name}"? This action cannot be undone.
                Products using this category will have their category set to null.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading || deleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Deleting...
                    </>
                  ) : (
                    'Yes, Delete'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={loading || deleting}
                  className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
        
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category Name <span className="text-red-500">*</span>
          </label>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <>
                <input
                  type="text"
                  placeholder="Enter category name"
                  value={field.value}
                  onChange={field.onChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  maxLength={100}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </>
            )}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description <span className="text-gray-400 text-xs">(optional)</span>
          </label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <>
                <textarea
                  placeholder="Enter category description"
                  value={field.value || ''}
                  onChange={field.onChange}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                  maxLength={500}
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.description && (
                    <p className="text-sm text-red-600">{errors.description.message}</p>
                  )}
                  <p className="text-xs text-gray-500 ml-auto">
                    {field.value?.length || 0}/500 characters
                  </p>
                </div>
              </>
            )}
          />
        </div>

        {/* Parent Category */}
        {parentCategories.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parent Category <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <Controller
              name="parentId"
              control={control}
              render={({ field }) => (
                <>
                  <select
                    value={field.value || ''}
                    onChange={field.onChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white"
                  >
                    <option value="">No parent (root category)</option>
                    {parentCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {errors.parentId && (
                    <p className="mt-1 text-sm text-red-600">{errors.parentId.message}</p>
                  )}
                </>
              )}
            />
          </div>
        )}
      </div>

      {/* Appearance */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Appearance</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Color
            </label>
            <Controller
              name="color"
              control={control}
              render={({ field }) => (
                <>
                  <div className="flex items-center gap-3">
                    <select
                      value={field.value || '#3B82F6'}
                      onChange={field.onChange}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white"
                    >
                      {colorOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div
                      className="w-12 h-12 rounded-lg border-2 border-gray-300"
                      style={{ backgroundColor: field.value || '#3B82F6' }}
                    />
                  </div>
                  {errors.color && (
                    <p className="mt-1 text-sm text-red-600">{errors.color.message}</p>
                  )}
                </>
              )}
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Icon
            </label>
            <Controller
              name="icon"
              control={control}
              render={({ field }) => (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Select an emoji icon"
                        value={field.value || ''}
                        onChange={field.onChange}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        maxLength={10}
                      />
                    </div>
                    <EmojiPicker
                      onEmojiSelect={(emoji) => field.onChange(emoji)}
                      trigger={
                        <button
                          type="button"
                          className="px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-xl"
                        >
                          😊
                        </button>
                      }
                    />
                    {field.value && (
                      <button
                        type="button"
                        onClick={() => field.onChange('')}
                        className="px-4 py-3 bg-red-50 border-2 border-red-200 rounded-xl hover:bg-red-100 transition-colors text-red-600 font-medium"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {field.value && (
                    <p className="mt-2 text-sm text-gray-600">
                      Preview: <span className="text-2xl">{field.value}</span>
                    </p>
                  )}
                  {errors.icon && (
                    <p className="mt-1 text-sm text-red-600">{errors.icon.message}</p>
                  )}
                </>
              )}
            />
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Advanced Settings</h3>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
          >
            {isExpanded ? 'Hide' : 'Show'} Advanced
            <svg 
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {isExpanded && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort Order
              </label>
              <Controller
                name="sortOrder"
                control={control}
                render={({ field }) => (
                  <>
                    <input
                      type="number"
                      placeholder="0"
                      value={field.value}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      min={0}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                    <p className="mt-1 text-xs text-gray-500">Lower numbers appear first</p>
                    {errors.sortOrder && (
                      <p className="mt-1 text-sm text-red-600">{errors.sortOrder.message}</p>
                    )}
                  </>
                )}
              />
            </div>

            {/* Active Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Active Status
              </label>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {field.value ? 'Category is active' : 'Category is inactive'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Inactive categories won't appear in product selection
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors ${
                        field.value ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                          field.value ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </div>
                    </label>
                  </div>
                )}
              />
            </div>
          </div>
        )}
      </div>

      {/* Form Actions - Only render if not in modal mode */}
      {!renderActionsInModal && (
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={!isDirty || deleting || showDeleteConfirm || loading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              category ? 'Update Category' : 'Create Category'
            )}
          </button>
          
          {category && onDelete && !showDeleteConfirm && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || deleting}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          )}
          
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading || deleting}
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      )}
    </form>
  );
};

// Export with display name for debugging
CategoryForm.displayName = 'CategoryForm';

export default CategoryForm;
