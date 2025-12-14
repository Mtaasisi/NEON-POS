import React, { useState } from 'react';
import { Package, FileText, Hash, Building, Check } from 'lucide-react';

interface SparePartInformationFormProps {
  formData: {
    name: string;
    partNumber: string;
    spareType: string; // Changed from categoryId to spareType
    brand: string;
    supplierId: string;
    condition: string;
    description: string;
    serialNumbers?: string[];
    useSerialNumbers?: boolean;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  suppliers: any[];
  currentErrors: Record<string, string>;
  spareTypes: Array<{ value: string; label: string }>;
  spareTypeSearch: string;
  setSpareTypeSearch: (value: string) => void;
  showSpareTypeSuggestions: boolean;
  setShowSpareTypeSuggestions: (value: boolean) => void;
  filteredSpareTypes: Array<{ value: string; label: string }>;
  quantity?: number;
}

const SparePartInformationForm: React.FC<SparePartInformationFormProps> = ({
  formData,
  setFormData,
  suppliers,
  currentErrors,
  spareTypes,
  spareTypeSearch,
  setSpareTypeSearch,
  showSpareTypeSuggestions,
  setShowSpareTypeSuggestions,
  filteredSpareTypes,
  quantity = 0
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  const selectedSpareType = spareTypes.find(type => type.value === formData.spareType);

  return (
    <div className="mb-6">
      {/* Spare Part Information Card */}
      <div className="border-2 rounded-2xl bg-white shadow-sm border-gray-200 mb-6">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Spare Part Information</h3>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Part Name */}
              <div>
                <label 
                  htmlFor="spare-part-name"
                  className={`block mb-2 text-xs font-medium ${currentErrors.name ? 'text-red-600' : 'text-gray-700'}`}
                >
                  Part Name *
                </label>
                <div className="relative">
                  <input
                    id="spare-part-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors text-gray-900 font-medium ${
                      currentErrors.name 
                        ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}
                    placeholder="e.g., iPhone 14 Screen"
                    required
                  />
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                </div>
                {currentErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{currentErrors.name}</p>
                )}
              </div>

              {/* Spare Type */}
              <div>
                <label 
                  htmlFor="spare-type"
                  className={`block mb-2 text-xs font-medium ${currentErrors.spareType ? 'text-red-600' : 'text-gray-700'}`}
                >
                  Spare Type *
                </label>
                <div className="relative">
                  <input
                    id="spare-type"
                    type="text"
                    value={spareTypeSearch || selectedSpareType?.label || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSpareTypeSearch(value);
                      setShowSpareTypeSuggestions(true);
                      if (!value) {
                        setFormData(prev => ({ ...prev, spareType: '' }));
                      }
                    }}
                    onFocus={() => {
                      setShowSpareTypeSuggestions(true);
                      if (!formData.spareType) {
                        setSpareTypeSearch('');
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowSpareTypeSuggestions(false), 200);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowSpareTypeSuggestions(false);
                      }
                      if (e.key === 'Enter' && filteredSpareTypes.length === 1) {
                        e.preventDefault();
                        setFormData(prev => ({ ...prev, spareType: filteredSpareTypes[0].value }));
                        setSpareTypeSearch('');
                        setShowSpareTypeSuggestions(false);
                      }
                    }}
                    placeholder="Search or select spare type..."
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors text-gray-900 font-medium ${
                      currentErrors.spareType 
                        ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}
                    required
                  />
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  {formData.spareType && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, spareType: '' }));
                        setSpareTypeSearch('');
                        setShowSpareTypeSuggestions(false);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  
                  {/* Spare Type Suggestions Dropdown */}
                  {showSpareTypeSuggestions && filteredSpareTypes.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      {filteredSpareTypes.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, spareType: type.value }));
                            setSpareTypeSearch('');
                            setShowSpareTypeSuggestions(false);
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                            formData.spareType === type.value ? 'bg-blue-50' : ''
                          }`}
                        >
                          <Package className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-900">{type.label}</span>
                          {formData.spareType === type.value && (
                            <Check className="w-4 h-4 text-blue-600 ml-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {currentErrors.spareType && (
                  <p className="mt-1 text-sm text-red-600">{currentErrors.spareType}</p>
                )}
              </div>


              {/* Brand */}
              <div>
                <label 
                  htmlFor="brand"
                  className="block mb-2 text-xs font-medium text-gray-700"
                >
                  Brand
                </label>
                <input
                  id="brand"
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors text-gray-900 font-medium"
                  placeholder="e.g., Apple, Samsung"
                />
              </div>

              {/* Supplier */}
              <div>
                <label 
                  htmlFor="supplier"
                  className="block mb-2 text-xs font-medium text-gray-700"
                >
                  Supplier
                </label>
                <div className="relative">
                  <select
                    id="supplier"
                    value={formData.supplierId}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplierId: e.target.value }))}
                    className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors text-gray-900 font-medium"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                </div>
              </div>

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
                    placeholder="Describe the spare part, its specifications, and any important details..."
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
                <FileText className={`absolute left-4 text-gray-400 transition-all duration-200 ${
                  isDescriptionExpanded ? 'top-4' : 'top-1/2 -translate-y-1/2'
                }`} size={16} />
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
          </form>
        </div>
      </div>
    </div>
  );
};

export default SparePartInformationForm;
