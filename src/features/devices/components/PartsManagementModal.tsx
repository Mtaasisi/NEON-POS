import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Package, Plus, Edit, Trash2, Save } from 'lucide-react';
import GlassButton from '../../shared/components/ui/GlassButton';
import { toast } from 'react-hot-toast';
import SuccessModal from '../../../components/ui/SuccessModal';
import { useSuccessModal } from '../../../hooks/useSuccessModal';
import { SuccessIcons } from '../../../components/ui/SuccessModalIcons';

interface RepairPart {
  id: string;
  name: string;
  description: string;
  quantity: number;
  cost: number;
  status: 'ordered' | 'shipped' | 'received' | 'installed';
  supplier: string;
  estimatedArrival?: string;
  notes?: string;
}

interface PartsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (part: RepairPart) => void;
  editingPart?: RepairPart | null;
}

const PartsManagementModal: React.FC<PartsManagementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingPart
}) => {
  const successModal = useSuccessModal();
  const [formData, setFormData] = useState<Omit<RepairPart, 'id'>>({
    name: editingPart?.name || '',
    description: editingPart?.description || '',
    quantity: editingPart?.quantity || 1,
    cost: editingPart?.cost || 0,
    status: editingPart?.status || 'ordered',
    supplier: editingPart?.supplier || '',
    estimatedArrival: editingPart?.estimatedArrival || '',
    notes: editingPart?.notes || ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Part name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    if (formData.cost <= 0) {
      newErrors.cost = 'Cost must be greater than 0';
    }

    if (!formData.supplier.trim()) {
      newErrors.supplier = 'Supplier is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    const partData: RepairPart = {
      id: editingPart?.id || `part_${Date.now()}`,
      ...formData
    };

    onSave(partData);
    
    // Show success modal
    successModal.show(
      editingPart 
        ? `${formData.name} has been updated successfully!`
        : `${formData.name} has been added to repair parts!`,
      {
        title: editingPart ? 'Part Updated! ✅' : 'Part Added! ✅',
        icon: SuccessIcons.repairCompleted,
        autoCloseDelay: 3000,
      }
    );
    
    onClose();
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-[99999]"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Container */}
      <div 
        className="fixed inset-0 flex items-center justify-center z-[100000] p-4 pointer-events-none"
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden relative pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
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
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <Package className="w-8 h-8 text-white" />
              </div>
              
              {/* Text */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {editingPart ? 'Edit Part' : 'Add New Part'}
                </h2>
                <p className="text-sm text-gray-600">
                  {editingPart ? 'Update part information' : 'Add a new part to the repair order'}
                </p>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
            <form onSubmit={handleSubmit} className="py-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Part Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Screen Assembly"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Supplier *
                  </label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => handleInputChange('supplier', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                      errors.supplier ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., TechParts Ltd"
                  />
                  {errors.supplier && <p className="text-red-500 text-sm mt-1">{errors.supplier}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  rows={3}
                  placeholder="Detailed description of the part..."
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
              </div>

              {/* Quantity and Cost */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                      errors.quantity ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.quantity && <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cost (TSH) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formData.cost}
                    onChange={(e) => handleInputChange('cost', parseInt(e.target.value) || 0)}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                      errors.cost ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0"
                  />
                  {errors.cost && <p className="text-red-500 text-sm mt-1">{errors.cost}</p>}
                </div>
              </div>

              {/* Status and ETA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value as RepairPart['status'])}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="ordered">Ordered</option>
                    <option value="shipped">Shipped</option>
                    <option value="received">Received</option>
                    <option value="installed">Installed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Estimated Arrival
                  </label>
                  <input
                    type="date"
                    value={formData.estimatedArrival}
                    onChange={(e) => handleInputChange('estimatedArrival', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                  rows={3}
                  placeholder="Additional notes about this part..."
                />
              </div>

              {/* Cost Summary */}
              <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Total Cost:</span>
                  <span className="text-xl font-bold text-gray-900">
                    {(formData.cost * formData.quantity).toLocaleString()} TSH
                  </span>
                </div>
              </div>
            </form>
          </div>

          {/* Fixed Footer */}
          <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl font-semibold"
              >
                <Save className="w-5 h-5" />
                {editingPart ? 'Update Part' : 'Add Part'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Success Modal */}
      <SuccessModal {...successModal.props} />
    </>,
    document.body
  );
};

export default PartsManagementModal;
