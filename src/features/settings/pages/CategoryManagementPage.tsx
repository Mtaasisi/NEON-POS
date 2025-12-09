import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../../../features/shared/components/ui/BackButton';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Plus, Edit, Trash2, Search, Filter, X, Save, RotateCcw, Tag, Smartphone, Laptop, Monitor, Headphones, Camera, Gamepad2, Printer, Watch, Speaker, Keyboard, Mouse, Router, Server, HardDrive, Package, Eye, MessageCircle, Users, Star, UserPlus } from 'lucide-react';
import { 
  createCategory, 
  updateCategory, 
  deleteCategory, 
  restoreCategory,
  Category,
  CreateCategoryData,
  UpdateCategoryData
} from '../../../lib/categoryApi';
import { useOptimizedCategories } from '../../lats/hooks/useOptimizedCategories';
import { useAuth } from '../../../context/AuthContext';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import { useDialog } from '../../shared/hooks/useDialog';

interface CategoryFormData {
  name: string;
  description: string;
  color: string;
}

const CategoryManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use optimized categories hook
  const { categories, loading, error, refetch } = useOptimizedCategories({
    activeOnly: true,
    autoFetch: true
  });

  // Color options for category selection
  const colorOptions = [
    { value: '#3B82F6', label: 'Blue' },
    { value: '#10B981', label: 'Green' },
    { value: '#8B5CF6', label: 'Purple' },
    { value: '#F59E0B', label: 'Orange' },
    { value: '#EF4444', label: 'Red' },
    { value: '#EC4899', label: 'Pink' },
    { value: '#6366F1', label: 'Indigo' },
    { value: '#EAB308', label: 'Yellow' },
    { value: '#14B8A6', label: 'Teal' },
    { value: '#06B6D4', label: 'Cyan' },
    { value: '#F97316', label: 'Amber' },
    { value: '#059669', label: 'Emerald' },
    { value: '#7C3AED', label: 'Violet' },
    { value: '#475569', label: 'Slate' },
    { value: '#E11D48', label: 'Rose' },
    { value: '#0284C7', label: 'Sky' },
    { value: '#84CC16', label: 'Lime' },
    { value: '#C026D3', label: 'Fuchsia' },
    { value: '#EA580C', label: 'Orange' },
    { value: '#4F46E5', label: 'Indigo' },
    { value: '#6B7280', label: 'Gray' }
  ];

  useEffect(() => {
    // Component loaded
  }, []);

  useEffect(() => {
    filterCategories();
  }, [categories, searchQuery]);

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast.error('Failed to fetch categories: ' + error);
    }
  }, [error]);

  const filterCategories = () => {
    let filtered = categories;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(category =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCategories(filtered);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
  };

  const handleSubmitCategory = async (categoryData: any) => {
    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryData);
        toast.success('Category updated successfully!');
      } else {
        await createCategory(categoryData);
        toast.success('Category created successfully!');
      }
      await refetch(); // Use optimized refetch
    } catch (error: any) {
      toast.error(error.message || 'Failed to save category');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (await confirm(`Are you sure you want to delete ${category.name}?`)) {
      try {
        await deleteCategory(category.id);
        toast.success('Category deleted successfully!');
        await refetch(); // Use optimized refetch
      } catch (error: any) {
        toast.error('Failed to delete category');
      }
    }
  };

  const handleRestoreCategory = async (category: Category) => {
    toast.error('Restore functionality not available - categories are permanently deleted');
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const handleCloseForm = () => {
    setShowCategoryForm(false);
    setEditingCategory(null);
  };

  const getCategoryColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      '#3B82F6': 'bg-blue-100 text-blue-800',
      '#10B981': 'bg-green-100 text-green-800',
      '#8B5CF6': 'bg-purple-100 text-purple-800',
      '#F59E0B': 'bg-orange-100 text-orange-800',
      '#EF4444': 'bg-red-100 text-red-800',
      '#EC4899': 'bg-pink-100 text-pink-800',
      '#6366F1': 'bg-indigo-100 text-indigo-800',
      '#EAB308': 'bg-yellow-100 text-yellow-800',
      '#14B8A6': 'bg-teal-100 text-teal-800',
      '#06B6D4': 'bg-cyan-100 text-cyan-800',
      '#F97316': 'bg-amber-100 text-amber-800',
      '#059669': 'bg-emerald-100 text-emerald-800',
      '#7C3AED': 'bg-violet-100 text-violet-800',
      '#475569': 'bg-slate-100 text-slate-800',
      '#E11D48': 'bg-rose-100 text-rose-800',
      '#0284C7': 'bg-sky-100 text-sky-800',
      '#84CC16': 'bg-lime-100 text-lime-800',
      '#C026D3': 'bg-fuchsia-100 text-fuchsia-800',
      '#EA580C': 'bg-orange-100 text-orange-800',
      '#4F46E5': 'bg-indigo-100 text-indigo-800',
      '#6B7280': 'bg-gray-100 text-gray-800'
    };
    return colorMap[color] || colorMap['#6B7280'];
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Wrapper Container - Single rounded container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Fixed Header Section */}
        <div className="p-8 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Icon */}
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <Tag className="w-8 h-8 text-white" />
              </div>
              
              {/* Text */}
        <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Category Management</h1>
                <p className="text-sm text-gray-600">
                  Manage device categories and their colors
                </p>
        </div>
      </div>

            {/* Back Button */}
            <BackButton to="/dashboard" label="" className="!w-12 !h-12 !p-0 !rounded-full !bg-blue-600 hover:!bg-blue-700 !shadow-lg flex items-center justify-center" iconClassName="text-white" />
          </div>
        </div>

        {/* Main Container - Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 text-center hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
          <div className="text-2xl font-bold text-blue-600">{categories.length}</div>
              <div className="text-sm font-semibold text-gray-600">Total Categories</div>
            </div>
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 text-center hover:bg-green-100 hover:border-green-300 transition-all shadow-sm hover:shadow-md">
          <div className="text-2xl font-bold text-green-600">{categories.filter(c => c.description).length}</div>
              <div className="text-sm font-semibold text-gray-600">With Description</div>
            </div>
            <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-5 text-center hover:bg-purple-100 hover:border-purple-300 transition-all shadow-sm hover:shadow-md">
          <div className="text-2xl font-bold text-purple-600">{new Set(categories.map(c => c.color)).size}</div>
              <div className="text-sm font-semibold text-gray-600">Color Variants</div>
            </div>
      </div>

      {/* Controls */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
                <button
              onClick={() => setShowCategoryForm(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              <Plus size={16} />
              Add Category
                </button>
              </div>
            </div>
          </div>

      {/* Categories Grid */}
      {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner size="lg" color="blue" />
              <p className="mt-4 text-gray-600 font-medium">Loading categories...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-gray-200 text-center py-12 shadow-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Tag className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No categories found</h3>
              <p className="text-gray-600 mb-6">
            {searchQuery 
              ? 'Try adjusting your search' 
              : 'Get started by creating your first category'
            }
          </p>
          {!searchQuery && (
                <button
              onClick={() => setShowCategoryForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              <Plus size={16} />
              Create First Category
                </button>
          )}
            </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCategories.map(category => (
                <div key={category.id} className="bg-white border-2 border-gray-200 rounded-2xl shadow-sm relative group hover:shadow-md transition-all">
              {/* Category Color Display */}
              <div className="flex items-center justify-center h-32 mb-4 rounded-lg" style={{ backgroundColor: category.color + '20' }}>
                <div 
                  className="text-4xl font-bold rounded-full w-16 h-16 flex items-center justify-center"
                  style={{ backgroundColor: category.color, color: 'white' }}
                >
                  {category.name.charAt(0)}
                </div>
              </div>

              {/* Category Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-lg">{category.name}</h3>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  </div>
                </div>

                {category.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{category.description}</p>
                )}

                {/* Color Badge */}
                <div className="flex flex-wrap gap-1">
                  <span 
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getCategoryColorClasses(category.color)}`}
                    style={{ backgroundColor: category.color + '20', color: category.color }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }}></div>
                    {category.color}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>Created: {new Date(category.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(category)}
                      className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                      title="Edit Category"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category)}
                      className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseForm();
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Add New Category'}
              </h2>
              <button
                onClick={handleCloseForm}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const categoryData = {
                name: formData.get('name') as string,
                description: formData.get('description') as string,
                color: formData.get('color') as string
              };
              handleSubmitCategory(categoryData);
              handleCloseForm();
            }} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                  <input
                    name="name"
                    type="text"
                    defaultValue={editingCategory?.name || ''}
                    className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Enter category name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <select
                    name="color"
                    defaultValue={editingCategory?.color || '#3B82F6'}
                    className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  >
                    {colorOptions.map(color => (
                      <option key={color.value} value={color.value}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  defaultValue={editingCategory?.description || ''}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  placeholder="Enter category description"
                  rows={3}
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      {editingCategory ? 'Updating...' : 'Adding...'}
                    </div>
                  ) : (
                    editingCategory ? 'Update Category' : 'Add Category'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagementPage; 