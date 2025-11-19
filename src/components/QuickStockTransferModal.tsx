import React, { useState } from 'react';
import Modal from '../features/shared/components/ui/Modal';
import GlassInput from '../features/shared/components/ui/GlassInput';
import { Package, X, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Branch {
  id: string;
  name: string;
}

interface TransferStockParams {
  productId: string;
  variantId?: string;
  fromBranchId: string;
  toBranchId: string;
  quantity: number;
  notes?: string;
  status: 'pending' | 'completed' | 'cancelled';
}

interface QuickStockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  productId?: string;
  variantId?: string;
  initialQuantity?: number;
}

const QuickStockTransferModal: React.FC<QuickStockTransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  productId,
  variantId,
  initialQuantity = 1,
}) => {
  // Mock currentBranch
  const currentBranch: Branch = { id: 'current-branch', name: 'Current Branch' };
  
  // Mock branches data
  const branches: Branch[] = [
    { id: 'branch1', name: 'Nairobi' },
    { id: 'branch2', name: 'Mombasa' },
    { id: 'branch3', name: 'Kisumu' }
  ];
  
  // Filter out current branch from available branches
  const availableBranches = branches.filter(branch => branch.id !== currentBranch.id);
  
  // Mock transferStock function - replace with actual implementation
  const transferStock = async (params: TransferStockParams) => {
    // In a real implementation, this would be an API call
    console.log('Transferring stock:', params);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        console.log('Stock transfer completed');
        resolve();
      }, 1000);
    });
  };
  
  const [formData, setFormData] = useState({
    fromBranchId: currentBranch.id,
    toBranchId: '',
    quantity: initialQuantity,
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productId) {
      toast.error('No product selected for transfer');
      return;
    }
    
    if (!formData.toBranchId || formData.toBranchId === formData.fromBranchId) {
      toast.error('Please select a valid destination branch');
      return;
    }
    
    if (formData.quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      await transferStock({
        productId,
        variantId,
        fromBranchId: formData.fromBranchId,
        toBranchId: formData.toBranchId,
        quantity: formData.quantity,
        notes: formData.notes,
        status: 'completed',
      });
      
      toast.success('Stock transferred successfully');
      onClose();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error transferring stock:', error);
      toast.error('Failed to transfer stock. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transfer Stock"
      icon={<Package className="text-blue-500" size={20} />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            From Branch
          </label>
          <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-md">
            {currentBranch?.name || 'N/A'}
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="toBranchId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            To Branch <span className="text-red-500">*</span>
          </label>
          <select
            id="toBranchId"
            value={formData.toBranchId}
            onChange={(e) => setFormData({...formData, toBranchId: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            required
          >
            <option value="">Select a branch</option>
            {availableBranches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Quantity <span className="text-red-500">*</span>
          </label>
          <GlassInput
            type="number"
            id="quantity"
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
            required
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
          />
        </div>
        
        <div className="flex items-center justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isSubmitting}
          >
            <X size={16} className="mr-2" />
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting || !formData.toBranchId}
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <ArrowRight size={16} className="mr-2" />
            Transfer Stock
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default QuickStockTransferModal;
