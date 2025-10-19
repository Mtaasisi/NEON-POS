// AddExternalProductModal component for LATS module
import React, { useState, useEffect } from 'react';
import PriceInput from '../../../../shared/components/ui/PriceInput';
import { X, Package, DollarSign, Hash, Tag, Plus, Search, UserPlus, Layers } from 'lucide-react';
import { getCategories } from '../../../../lib/categoryApi';
import CategoryInput from '../../../shared/components/ui/CategoryInput';

import { createExternalProduct } from '../../../../lib/externalProductApi';

interface ExternalProductData {
  name: string;
  sku: string;
  price: number;
  quantity: number;
  category: string;

  barcode?: string;
  notes?: string;
  // Enhanced fields for supplier tracking and returns
  supplierName: string;
  supplierPhone?: string;
  purchaseDate: string;
  purchasePrice: number;
  purchaseQuantity: number;
  warrantyInfo?: string;
  returnPolicy?: string;
  productCondition: 'new' | 'used' | 'refurbished';
}

interface AddExternalProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: (product: ExternalProductData) => void;
}

const AddExternalProductModal: React.FC<AddExternalProductModalProps> = ({
  isOpen,
  onClose,
  onProductAdded
}) => {
  const [formData, setFormData] = useState<ExternalProductData>({
    name: '',
    sku: '',
    price: 0,
    quantity: 1,
    category: '',
    barcode: '',
    notes: '',
    // Enhanced fields for supplier tracking and returns
    supplierName: '',
    supplierPhone: '',
    purchaseDate: '',
    purchasePrice: 0,
    purchaseQuantity: 1,
    warrantyInfo: '',
    returnPolicy: '',
    productCondition: 'new'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  const [loadingData, setLoadingData] = useState(false);

  // Fetch categories when modal opens
  useEffect(() => {
    const fetchData = async () => {
      if (isOpen) {
        setLoadingData(true);
        try {
          const categoriesData = await getCategories();
          
          setCategories(categoriesData);
          
          // Auto-fill purchase date and generate SKU
          const today = new Date().toISOString().split('T')[0];
          const timestamp = Date.now().toString().slice(-6);
          const random = Math.random().toString(36).substring(2, 5).toUpperCase();
          const sku = `EXT-${timestamp}-${random}`;
          
          setFormData(prev => ({
            ...prev,
            purchaseDate: today,
            sku: sku
          }));
        } catch (error) {
          console.error('Error fetching categories:', error);
        } finally {
          setLoadingData(false);
        }
      }
    };
    
    fetchData();
  }, [isOpen]);

  const handleInputChange = (field: keyof ExternalProductData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced validation
    if (!formData.name.trim()) {
      alert('Please enter a product name');
      return;
    }
    
    if (!formData.sku.trim()) {
      alert('Please enter a SKU or generate one');
      return;
    }
    
    if (formData.price <= 0) {
      alert('Please enter a valid price greater than 0');
      return;
    }
    
    if (formData.quantity <= 0) {
      alert('Please enter a valid quantity greater than 0');
      return;
    }
    
    if (!formData.supplierName.trim()) {
      alert('Please enter a supplier name');
      return;
    }
    

    
    if (formData.purchasePrice <= 0) {
      alert('Please enter a valid purchase price greater than 0');
      return;
    }
    
    if (formData.purchaseQuantity <= 0) {
      alert('Please enter a valid purchase quantity greater than 0');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Save to database first
      const productData = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        category: formData.category.trim() || null,
        barcode: formData.barcode?.trim() || null,
        supplier_name: formData.supplierName.trim(),
        supplier_phone: formData.supplierPhone?.trim() || null,
        purchase_date: formData.purchaseDate,
        purchase_price: formData.purchasePrice,
        purchase_quantity: formData.purchaseQuantity,
        selling_price: formData.price,
        warranty_info: formData.warrantyInfo?.trim() || null,
        product_condition: formData.productCondition,
        notes: formData.notes?.trim() || null
      };
      
      const savedProduct = await createExternalProduct(productData);
      console.log('✅ External product saved to database:', savedProduct);
      
      // Validate the product data before calling onProductAdded
      const validatedProduct = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        price: formData.price,
        quantity: formData.quantity,
        category: formData.category.trim(),
        barcode: formData.barcode?.trim() || '',
        notes: formData.notes?.trim() || '',
        // Enhanced fields for supplier tracking and returns
        supplierName: formData.supplierName.trim(),
        supplierPhone: formData.supplierPhone?.trim(),
        purchaseDate: formData.purchaseDate,
        purchasePrice: formData.purchasePrice,
        purchaseQuantity: formData.purchaseQuantity,
        warrantyInfo: formData.warrantyInfo?.trim(),
        returnPolicy: formData.returnPolicy?.trim(),
        productCondition: formData.productCondition
      };
      
      onProductAdded(validatedProduct);
      
      // Reset form after successful submission
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.random().toString(36).substring(2, 5).toUpperCase();
      const newSku = `EXT-${timestamp}-${random}`;
      
      setFormData({
        name: '',
        sku: newSku,
        price: 0,
        quantity: 1,
        category: '',
        barcode: '',
        notes: '',
        // Enhanced fields for supplier tracking and returns
        supplierName: '',
        supplierPhone: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        purchasePrice: 0,
        purchaseQuantity: 1,
        warrantyInfo: '',
        returnPolicy: '',
        productCondition: 'new'
      });
      
      setShowNotes(false);
      setShowSupplierSuggestions(false);
      
    } catch (error) {
      console.error('Error adding external product:', error);
      alert('Failed to add external product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };





  // TODO: Replace with real database queries
  // This should fetch actual suppliers from your database
  const mockSuppliers: any[] = [];

  const filteredSuppliers = mockSuppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(formData.supplierName.toLowerCase()) ||
    supplier.phone.includes(formData.supplierName)
  );

  const handleSupplierSelect = (supplier: any) => {
    setFormData(prev => ({
      ...prev,
      supplierName: supplier.name,
      supplierPhone: supplier.phone
    }));
    setShowSupplierSuggestions(false);
  };

  const handleCreateNewSupplier = () => {
    setShowSupplierSuggestions(false);
    // Focus on supplier name field for manual entry
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Add External Product</h2>
                <p className="text-sm text-gray-600">Quick entry for products not in inventory</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Product Information */}
            <div className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full py-3 pl-10 pr-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-colors"
                      placeholder="Enter product name"
                      required
                    />
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU/QrCode/Serial <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                      className="w-full py-3 pl-10 pr-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-colors"
                      placeholder="Auto-generated SKU"
                      required
                    />
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <CategoryInput
                    value={formData.category}
                    onChange={(categoryId) => {
                      const selectedCategory = categories.find(cat => cat.id === categoryId);
                      handleInputChange('category', selectedCategory?.name || '');
                    }}
                    categories={categories}
                    placeholder="Select category"
                    disabled={loadingData}
                    className="w-full"
                  />
                </div>
                

              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Condition <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'new', label: 'New', color: 'bg-green-500 hover:bg-green-600 border-green-500' },
                    { value: 'used', label: 'Used', color: 'bg-blue-500 hover:bg-blue-600 border-blue-500' },
                    { value: 'refurbished', label: 'Refurbished', color: 'bg-purple-500 hover:bg-purple-600 border-purple-500' }
                  ].map((condition) => (
                    <button
                      key={condition.value}
                      type="button"
                      onClick={() => handleInputChange('productCondition', condition.value as 'new' | 'used' | 'refurbished')}
                      className={`px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all ${
                        formData.productCondition === condition.value
                          ? `${condition.color} text-white`
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {condition.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Supplier Information */}
            <div className="space-y-4">
              
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.supplierName}
                    onChange={(e) => {
                      handleInputChange('supplierName', e.target.value);
                      setShowSupplierSuggestions(e.target.value.length > 0);
                    }}
                    onFocus={() => setShowSupplierSuggestions(formData.supplierName.length > 0)}
                    onBlur={() => setTimeout(() => setShowSupplierSuggestions(false), 200)}
                    className="w-full py-3 pl-10 pr-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-colors"
                    placeholder="Enter supplier name"
                    required
                  />
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
                
                {/* Supplier Suggestions Dropdown */}
                {showSupplierSuggestions && filteredSuppliers.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {filteredSuppliers.map((supplier) => (
                      <div
                        key={supplier.id}
                        onClick={() => handleSupplierSelect(supplier)}
                        className="p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{supplier.name}</div>
                        <div className="text-sm text-gray-600">{supplier.phone}</div>
                      </div>
                    ))}
                    
                    <button
                      onClick={handleCreateNewSupplier}
                      className="w-full p-3 border-t border-gray-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                      <UserPlus className="w-4 h-4" />
                      Create New Supplier
                    </button>
                  </div>
                )}
              </div>


            </div>

            {/* Purchase & Pricing Information */}
            <div className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purchase Price (TZS) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <PriceInput
                      value={formData.purchasePrice}
                      onChange={(value) => handleInputChange('purchasePrice', value)}
                      placeholder="0"
                      className="w-full py-3 pl-10 pr-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-colors"
                      required
                    />
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purchase Quantity <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={formData.purchaseQuantity}
                      onChange={(e) => handleInputChange('purchaseQuantity', parseInt(e.target.value) || 1)}
                      className="w-full py-3 pl-10 pr-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-colors"
                      required
                    />
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selling Price (TZS) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <PriceInput
                    value={formData.price}
                    onChange={(value) => handleInputChange('price', value)}
                    placeholder="0"
                    className="w-full py-3 pl-10 pr-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-colors"
                    required
                  />
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
              </div>


            </div>

                    {/* Warranty & Return Information */}
        <div className="space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Warranty (Months)
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {[0, 3, 6, 12].map((months) => (
                    <button
                      key={months}
                      type="button"
                      onClick={() => handleInputChange('warrantyInfo', months === 0 ? 'No warranty' : `${months} months`)}
                      className={`px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all ${
                        formData.warrantyInfo === (months === 0 ? 'No warranty' : `${months} months`)
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {months === 0 ? 'None' : `${months}m`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Notes - Optional with Plus Button */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Additional Notes
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNotes(!showNotes)}
                    className="p-1.5 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded transition-colors"
                  >
                    <Plus className={`w-4 h-4 transition-transform ${showNotes ? 'rotate-45' : ''}`} />
                  </button>
                </div>
                {showNotes && (
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="w-full py-3 px-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-colors resize-none"
                    placeholder="Any additional notes about the product or supplier"
                    rows={3}
                  />
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-800">Order Summary</h4>
                <div className="text-right">
                  <div className="text-2xl font-bold text-orange-600">
                    TZS {formData.price.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 font-medium mt-1">
                    Profit: TZS {((formData.price - formData.purchasePrice) * formData.quantity).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-gray-600">
                  <span className="font-medium text-gray-800">{formData.name || 'Product name'}</span>
                </div>
                <div className="text-right text-gray-600">
                  <span className="font-medium text-gray-800">{formData.supplierName || 'Supplier'}</span>
                </div>
                <div className="text-gray-600">{formData.category || 'No category'}</div>
                <div className="text-right">
                  <span className="px-2 py-1 bg-white rounded text-xs font-medium capitalize text-gray-700">
                    {formData.productCondition}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 mt-6 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.name || !formData.sku || formData.price <= 0}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              >
                {isSubmitting ? 'Adding Product...' : 'Add to Cart'}
              </button>
            </div>
            

          </form>
        </div>
      </div>
    </div>
  );
};

export default AddExternalProductModal;

