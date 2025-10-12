import React from 'react';
import { useOptimizedCategories } from '@/features/lats/hooks/useOptimizedCategories';
import { Tag, Loader, AlertCircle, CheckCircle, XCircle, Folder } from 'lucide-react';

/**
 * CategoryDisplay Component
 * 
 * A simple component to display all categories from your database.
 * You can use this as a reference or drop it into any page.
 * 
 * Usage:
 * import CategoryDisplay from '@/components/CategoryDisplay';
 * 
 * function MyPage() {
 *   return <CategoryDisplay />;
 * }
 */
const CategoryDisplay: React.FC = () => {
  const { categories, loading, error, refetch, search } = useOptimizedCategories({
    activeOnly: false,  // Show all categories (active and inactive)
    autoFetch: true     // Fetch automatically on mount
  });

  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query) {
      search(query);
    } else {
      refetch();
    }
  };

  // Group categories by whether they have a parent
  const rootCategories = categories.filter(cat => !cat.parent_id);
  const childCategories = categories.filter(cat => cat.parent_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading categories...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12 text-red-600">
        <AlertCircle className="w-8 h-8 mr-3" />
        <div>
          <p className="font-medium">Error loading categories</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📂 Categories
        </h1>
        <p className="text-gray-600">
          All {categories.length} categories from your database
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Tag className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total</p>
              <p className="text-2xl font-bold text-blue-900">{categories.length}</p>
            </div>
            <Folder className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Active</p>
              <p className="text-2xl font-bold text-green-900">
                {categories.filter(c => c.is_active).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Root</p>
              <p className="text-2xl font-bold text-purple-900">{rootCategories.length}</p>
            </div>
            <Tag className="w-8 h-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Subcategories</p>
              <p className="text-2xl font-bold text-orange-900">{childCategories.length}</p>
            </div>
            <Folder className="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      {categories.length === 0 ? (
        <div className="text-center py-12">
          <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No categories found</p>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                refetch();
              }}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-all duration-200 hover:scale-105"
            >
              {/* Category Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1">
                  {category.icon && (
                    <span className="text-2xl">{category.icon}</span>
                  )}
                  {category.color && !category.icon && (
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                  )}
                  <h3 className="font-semibold text-gray-900 line-clamp-1">
                    {category.name}
                  </h3>
                </div>
                {category.is_active ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                )}
              </div>

              {/* Description */}
              {category.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {category.description}
                </p>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {category.parent_id && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                    Subcategory
                  </span>
                )}
                {category.sort_order > 0 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    Order: {category.sort_order}
                  </span>
                )}
                {category.metadata && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    Has metadata
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={() => refetch()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl"
        >
          Refresh Categories
        </button>
      </div>
    </div>
  );
};

export default CategoryDisplay;

