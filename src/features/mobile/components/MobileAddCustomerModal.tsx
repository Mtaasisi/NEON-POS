import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Customer } from '../../../types';
import { supabase } from '../../../lib/supabaseClient';
import { useBranch } from '../../../context/BranchContext';
import MobileFullScreenSheet from './MobileFullScreenSheet';
import { X } from 'lucide-react';

interface MobileAddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated?: (customer: Customer) => void;
}

const MobileAddCustomerModal: React.FC<MobileAddCustomerModalProps> = ({
  isOpen,
  onClose,
  onCustomerCreated
}) => {
  const { currentBranch } = useBranch();
  
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setCity('');
    setAddress('');
    setNotes('');
  };

  const isValid = () => {
    if (!name.trim()) {
      toast.error('Customer name is required');
      return false;
    }
    if (!phone.trim()) {
      toast.error('Phone number is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!isValid()) return;

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('lats_customers')
        .insert({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          city: city.trim() || null,
          address: address.trim() || null,
          notes: notes.trim() || null,
          branch_id: currentBranch?.id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Customer added successfully!');
      onCustomerCreated?.(data as Customer);
      onClose();

    } catch (error: any) {
      console.error('Error adding customer:', error);
      toast.error(error.message || 'Failed to add customer');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileFullScreenSheet isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col h-full bg-neutral-100">
        {/* Header */}
        <div className="bg-white border-b border-neutral-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-primary-500 text-[17px] active:text-primary-600 transition-colors"
            >
              Cancel
            </button>
            <h2 className="text-[17px] font-semibold text-neutral-900 absolute left-1/2 transform -translate-x-1/2">Add Customer</h2>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !name.trim() || !phone.trim()}
              className="text-primary-500 text-[17px] font-semibold disabled:text-neutral-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 pb-safe-bottom">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Name */}
            <div className="px-4 py-3 border-b border-neutral-100">
              <label className="text-[15px] font-medium text-neutral-500 mb-1 block">
                Full Name <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter customer name"
                className="w-full bg-transparent focus:outline-none text-[16px] text-neutral-900"
                autoFocus
              />
            </div>

            {/* Phone */}
            <div className="px-4 py-3 border-b border-neutral-100">
              <label className="text-[15px] font-medium text-neutral-500 mb-1 block">
                Phone Number <span className="text-danger-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                className="w-full bg-transparent focus:outline-none text-[16px] text-neutral-900"
              />
            </div>

            {/* Email */}
            <div className="px-4 py-3 border-b border-neutral-100">
              <label className="text-[15px] font-medium text-neutral-500 mb-1 block">
                Email (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full bg-transparent focus:outline-none text-[16px] text-neutral-900"
              />
            </div>

            {/* City */}
            <div className="px-4 py-3 border-b border-neutral-100">
              <label className="text-[15px] font-medium text-neutral-500 mb-1 block">
                City (Optional)
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter city"
                className="w-full bg-transparent focus:outline-none text-[16px] text-neutral-900"
              />
            </div>

            {/* Address */}
            <div className="px-4 py-3">
              <label className="text-[15px] font-medium text-neutral-500 mb-1 block">
                Address (Optional)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter address"
                className="w-full bg-transparent focus:outline-none text-[16px] text-neutral-900"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden p-4">
            <label className="text-[15px] font-medium text-neutral-500 mb-2 block">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this customer"
              rows={4}
              className="w-full bg-neutral-50 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-[16px] resize-none px-3 py-2"
            />
          </div>
        </div>
      </div>
    </MobileFullScreenSheet>
  );
};

export default MobileAddCustomerModal;
