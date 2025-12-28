import React, { useState } from 'react';
import { Package, FileText, Check, Eye, EyeOff } from 'lucide-react';
import CategoryInput from '../../../shared/components/ui/CategoryInput';
import { 
  formatSpecificationValue, 
  parseSpecification, 
  getSpecificationCount 
} from '../../lib/specificationUtils';

interface ProductInformationFormProps {
  formData: {
    name: string;
    description: string;
    sku: string;
    categoryId: string;
    condition: string;
    specification?: string;
    isCustomerPortalVisible?: boolean;
    customerPortalSpecification?: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  categories: any[];
  currentErrors: Record<string, string>;
  isCheckingName: boolean;
  nameExists: boolean;
  onNameCheck: (name: string) => void;
  onSpecificationsClick?: () => void;
  useVariants?: boolean;
  onGenerateSKU?: () => string;
}

const ProductInformationForm: React.FC<ProductInformationFormProps> = ({
  formData,
  setFormData,
  categories,
  currentErrors,
  isCheckingName,
  nameExists,
  onNameCheck,
  onSpecificationsClick,
  useVariants = false,
  onGenerateSKU
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  return (
    <div className="mb-6">
      {/* Product Information Card */}
      <div className="border-2 rounded-2xl bg-white shadow-sm border-gray-200 mb-6">
        {/* Header - Clickable to expand/collapse */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Product Information</h3>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Name & Model */}
              <div>
                <label 
                  htmlFor="product-name"
                  className={`block mb-2 text-xs font-medium ${currentErrors.name ? 'text-red-600' : 'text-gray-700'}`}
                >
                  Product Name & Model *
                </label>
                <div className="relative">
                  <input
                    id="product-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, name: e.target.value }));
                      onNameCheck(e.target.value);
                    }}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors text-gray-900 font-medium ${
                      currentErrors.name 
                        ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}
                    placeholder="iPhone 14 Pro Max"
                    required
                  />
                  {isCheckingName && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    </div>
                  )}
                </div>
                {currentErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{currentErrors.name}</p>
                )}
                {nameExists && (
                  <p className="mt-1 text-sm text-amber-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    A product with this exact name already exists
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label 
                  htmlFor="category"
                  className={`block mb-2 text-xs font-medium ${currentErrors.categoryId ? 'text-red-600' : 'text-gray-700'}`}
                >
                  Category *
                </label>
                <CategoryInput
                  value={formData.categoryId}
                  onChange={(categoryId) => setFormData(prev => ({ ...prev, categoryId }))}
                  categories={categories}
                  placeholder="Select a category"
                  required
                  error={currentErrors.categoryId}
                />
                {currentErrors.categoryId && (
                  <p className="mt-1 text-sm text-red-600">{currentErrors.categoryId}</p>
                )}
              </div>

              {/* SKU Field - Hidden (Auto-generated) */}
              {/* <div className="md:col-span-2">
                <label 
                  htmlFor="sku"
                  className={`block mb-2 text-xs font-medium ${currentErrors.sku ? 'text-red-600' : 'text-gray-700'}`}
                >
                  SKU (Stock Keeping Unit)
                </label>
                <div className="relative">
                  <input
                    id="sku"
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    className={`w-full px-4 py-3 pr-24 border-2 rounded-xl focus:outline-none transition-colors font-mono text-sm font-medium ${
                      currentErrors.sku 
                        ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}
                    placeholder="Auto-generated SKU"
                    maxLength={50}
                  />
                  {onGenerateSKU && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, sku: onGenerateSKU() }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Generate new SKU"
                    >
                      Regenerate
                    </button>
                  )}
                </div>
                {currentErrors.sku && (
                  <p className="mt-1 text-sm text-red-600">{currentErrors.sku}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Unique identifier for this product</p>
              </div> */}

              {/* Condition */}
              <div className="md:col-span-2">
                <label 
                  htmlFor="condition"
                  className={`block mb-2 text-xs font-medium ${currentErrors.condition ? 'text-red-600' : 'text-gray-700'}`}
                >
                  Condition *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'new', label: 'New', color: 'bg-green-500 hover:bg-green-600 border-green-500' },
                    { value: 'used', label: 'Used', color: 'bg-blue-500 hover:bg-blue-600 border-blue-500' },
                    { value: 'refurbished', label: 'Refurbished', color: 'bg-purple-500 hover:bg-purple-600 border-purple-500' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, condition: option.value }))}
                      className={`py-3 px-6 rounded-xl border-2 transition-all duration-200 font-semibold text-base ${
                        formData.condition === option.value
                          ? `${option.color} text-white shadow-lg`
                          : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700 hover:border-gray-400'
                      } ${currentErrors.condition ? 'border-red-500' : ''}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {currentErrors.condition && (
                  <p className="mt-1 text-sm text-red-600">{currentErrors.condition}</p>
                )}
              </div>
            </div>

            {/* Customer Portal Visibility Toggle */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    formData.isCustomerPortalVisible !== false ? 'bg-green-500' : 'bg-gray-400'
                  }`}>
                    {formData.isCustomerPortalVisible !== false ? (
                      <Eye className="w-5 h-5 text-white" />
                    ) : (
                      <EyeOff className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">
                      Customer Portal Visibility
                    </h4>
                    <p className="text-xs text-gray-600">
                      {formData.isCustomerPortalVisible !== false
                        ? 'Product is visible to customers in the portal'
                        : 'Product is hidden from customers in the portal'
                      }
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isCustomerPortalVisible !== false}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      isCustomerPortalVisible: e.target.checked
                    }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>

            {/* Description */}
            <div>
              <label 
                htmlFor="description"
                className={`block mb-2 text-xs font-medium ${currentErrors.description ? 'text-red-600' : 'text-gray-700'}`}
              >
                Description (optional)
              </label>
              <div className="relative">
                {isDescriptionExpanded ? (
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 resize-none ${
                      currentErrors.description 
                        ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}
                    placeholder="Brief description..."
                    maxLength={500}
                    rows={4}
                    onBlur={() => setIsDescriptionExpanded(false)}
                    autoFocus
                  />
                ) : (
                  <input
                    id="description"
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 ${
                      currentErrors.description 
                        ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}
                    placeholder="Brief description..."
                    maxLength={200}
                    onFocus={() => setIsDescriptionExpanded(true)}
                  />
                )}
              </div>
              {currentErrors.description && (
                <p className="mt-1 text-sm text-red-600">{currentErrors.description}</p>
              )}
              {isDescriptionExpanded && (
                <p className="mt-1 text-sm text-gray-500">
                  {formData.description.length}/500 characters
                </p>
              )}
            </div>
          
          {/* Customer Portal Specifications - shown only when product is visible in customer portal */}
          {formData.isCustomerPortalVisible !== false && (
            <div className="mt-4">
              <label
                htmlFor="customer-portal-specs"
                className={`block mb-2 text-xs font-medium ${currentErrors.customerPortalSpecification ? 'text-red-600' : 'text-gray-700'}`}
              >
                Customer Portal Specifications (optional)
              </label>
              <textarea
                id="customer-portal-specs"
                value={formData.customerPortalSpecification || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, customerPortalSpecification: e.target.value }))}
                placeholder="Advanced specifications for the customer portal — paste or type detailed specs here."
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 resize-vertical ${
                  currentErrors.customerPortalSpecification
                    ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-200'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                }`}
                rows={4}
                maxLength={2000}
              />
              {currentErrors.customerPortalSpecification && (
                <p className="mt-1 text-sm text-red-600">{currentErrors.customerPortalSpecification}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                You can paste larger/advanced specifications here for display in the customer portal.
              </p>
            </div>
          )}

            {/* Specification - Only show when not using variants AND when onSpecificationsClick is provided */}
            {!useVariants && onSpecificationsClick && (
              <div>
                <label 
                  className={`block mb-2 text-xs font-medium ${currentErrors.specification ? 'text-red-600' : 'text-gray-700'}`}
                >
                  Specification (optional)
                </label>
                <button
                  type="button"
                  onClick={() => onSpecificationsClick()}
                  className="group w-full bg-white border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-300 p-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center group-hover:bg-blue-600 transition-all duration-300 shadow-md">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        {formData.specification && formData.specification.length > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      
                      <div className="text-left flex-1">
                        <h4 className="text-base font-bold text-gray-900 group-hover:text-blue-900 transition-colors duration-300">
                          Product Specifications
                        </h4>
                        {formData.specification && formData.specification.length > 0 ? (
                          <div className="mt-2">
                            <div className="grid grid-cols-2 gap-2 max-h-16 overflow-y-auto">
                              {(() => {
                                const specs = parseSpecification(formData.specification);
                                return Object.entries(specs).slice(0, 4).map(([key, value]) => (
                                  <div key={key} className="bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
                                    <div className="text-xs font-medium text-blue-800 truncate">{key.replace(/_/g, ' ')}</div>
                                    <div className="text-xs text-blue-600 truncate">{formatSpecificationValue(key, value)}</div>
                                  </div>
                                ));
                              })()}
                            </div>
                            {(() => {
                              const specs = parseSpecification(formData.specification);
                              return Object.keys(specs).length > 4 && (
                                <div className="text-xs text-blue-600 mt-1">
                                  +{Object.keys(specs).length - 4} more specifications
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600 mt-1">
                            Add detailed product specifications
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {formData.specification && formData.specification.length > 0 && (
                        <div className="px-3 py-1 bg-green-500 text-white text-sm font-bold rounded-full shadow-md">
                          {getSpecificationCount(formData.specification)}
                        </div>
                      )}
                      
                      <div className="w-8 h-8 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-all duration-300">
                        <svg className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
                {currentErrors.specification && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {currentErrors.specification}
                  </p>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductInformationForm;
