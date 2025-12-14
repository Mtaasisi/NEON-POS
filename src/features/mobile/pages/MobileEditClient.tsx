import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

const MobileEditClient: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load customer data
  useEffect(() => {
    const loadCustomer = async () => {
      try {
        let { data: customer, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', clientId)
          .single();

        // Try lats_customers if customers table doesn't have the record
        if (!customer) {
          const latsResult = await supabase
            .from('lats_customers')
            .select('*')
            .eq('id', clientId)
            .single();
          
          customer = latsResult.data;
          error = latsResult.error;
        }

        if (error) throw error;
        if (!customer) throw new Error('Customer not found');

        setName(customer.name || '');
        setPhone(customer.phone || customer.mobile || customer.whatsapp || '');
        setEmail(customer.email || '');
        setCity(customer.city || '');
        setAddress(customer.address || customer.location_description || '');
        setNotes(customer.notes || '');

      } catch (error) {
        console.error('Error loading customer:', error);
        toast.error('Failed to load customer');
        navigate('/mobile/clients');
      } finally {
        setIsLoading(false);
      }
    };
    loadCustomer();
  }, [clientId, navigate]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    if (!phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    try {
      setIsSaving(true);

      // Try updating in customers table
      let { error } = await supabase
        .from('customers')
        .update({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          city: city.trim() || null,
          address: address.trim() || null,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId);

      // If not in customers table, try lats_customers
      if (error && error.code === 'PGRST116') {
        const latsUpdate = await supabase
          .from('lats_customers')
          .update({
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim() || null,
            city: city.trim() || null,
            address: address.trim() || null,
            notes: notes.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', clientId);

        if (latsUpdate.error) throw latsUpdate.error;
      } else if (error) {
        throw error;
      }

      toast.success('Customer updated successfully!');
      navigate(`/mobile/clients/${clientId}`);
    } catch (error: any) {
      console.error('Error updating customer:', error);
      toast.error(error.message || 'Failed to update customer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);

      // Try deleting from customers table
      let { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', clientId);

      // If not in customers table, try lats_customers
      if (error && error.code === 'PGRST116') {
        const latsDelete = await supabase
          .from('lats_customers')
          .delete()
          .eq('id', clientId);

        if (latsDelete.error) throw latsDelete.error;
      } else if (error) {
        throw error;
      }

      toast.success('Customer deleted successfully');
      navigate('/mobile/clients');
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast.error(error.message || 'Failed to delete customer');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3"></div>
          <p className="text-gray-500 text-[15px]">Loading customer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 safe-area-inset-top">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 active:bg-gray-100 rounded-full transition-all"
          >
            <ArrowLeft size={24} className="text-blue-500" strokeWidth={2.5} />
          </button>
          <h1 className="text-[20px] font-bold text-gray-900">Edit Customer</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 pb-20">
        {/* Name */}
        <div>
          <label className="text-[15px] font-semibold text-gray-900 mb-2 block">
            Full Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter customer name"
            className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-[16px]"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="text-[15px] font-semibold text-gray-900 mb-2 block">
            Phone Number *
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter phone number"
            className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-[16px]"
          />
        </div>

        {/* Email */}
        <div>
          <label className="text-[15px] font-semibold text-gray-900 mb-2 block">
            Email (Optional)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address"
            className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-[16px]"
          />
        </div>

        {/* City */}
        <div>
          <label className="text-[15px] font-semibold text-gray-900 mb-2 block">
            City (Optional)
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter city"
            className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-[16px]"
          />
        </div>

        {/* Address */}
        <div>
          <label className="text-[15px] font-semibold text-gray-900 mb-2 block">
            Address (Optional)
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter address"
            className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-[16px]"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-[15px] font-semibold text-gray-900 mb-2 block">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this customer"
            rows={4}
            className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-[16px] resize-none"
          />
        </div>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-full py-3.5 bg-red-50 text-red-600 rounded-xl font-semibold text-[16px] active:bg-red-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Trash2 size={20} strokeWidth={2.5} />
          {isDeleting ? 'Deleting...' : 'Delete Customer'}
        </button>
      </div>

      {/* Save Button */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 safe-area-inset-bottom">
        <button
          onClick={handleSave}
          disabled={isSaving || !name.trim() || !phone.trim()}
          className="w-full py-4 bg-blue-500 text-white rounded-2xl font-semibold text-[17px] active:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Save size={20} strokeWidth={2.5} />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default MobileEditClient;

