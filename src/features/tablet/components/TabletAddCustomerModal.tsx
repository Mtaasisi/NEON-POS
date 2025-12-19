import React, { useEffect, useState } from 'react';
import { X, ChevronDown, ChevronUp, PlusCircle, ChevronRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCustomers } from '../../../context/CustomersContext';
import { formatTanzaniaPhoneNumber, formatTanzaniaWhatsAppNumber } from '../../../lib/phoneUtils';

interface TabletAddCustomerModalProps {
  onClose: () => void;
  onSuccess: (customer: any) => void;
}

const TabletAddCustomerModal: React.FC<TabletAddCustomerModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const { addCustomer } = useCustomers();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [city, setCity] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [notes, setNotes] = useState('');
  const [hasWhatsapp, setHasWhatsapp] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  const reset = () => {
    setName('');
    setPhone('');
    setWhatsapp('');
    setGender('');
    setCity('');
    setReferralSource('');
    setNotes('');
    setBirthMonth('');
    setBirthDay('');
    setPhoneError('');
    setHasWhatsapp(true);
  };

  useEffect(() => {
    if (hasWhatsapp && phone) setWhatsapp(phone);
  }, [hasWhatsapp, phone]);

  const isValid = () => {
    if (!name.trim()) {
      toast.error('Customer name is required');
      return false;
    }
    if (!phone.trim()) {
      setPhoneError('Phone number is required');
      toast.error('Phone number is required');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!isValid()) return;
    try {
      setIsLoading(true);
      const payload = {
        name: name.trim(),
        phone: formatTanzaniaPhoneNumber(phone),
        email: '',
        gender: gender || 'male',
        city: city || '',
        whatsapp: hasWhatsapp ? formatTanzaniaWhatsAppNumber(whatsapp || phone) : '',
        referralSource: referralSource || '',
        birthMonth: birthMonth || '',
        birthDay: birthDay || '',
        notes: notes,
        loyaltyLevel: 'interested' as const,
        colorTag: 'new' as const,
        referrals: [],
        totalSpent: 0,
        points: 0,
        lastVisit: new Date().toISOString(),
        isActive: true,
        devices: [],
      };

      const customer = await addCustomer(payload);
      if (customer) {
        toast.success('Customer added');
        onSuccess(customer);
        reset();
        onClose();
      }
    } catch (error: any) {
      console.error('Error adding customer:', error);
      toast.error(error.message || 'Failed to add customer');
    } finally {
      setIsLoading(false);
    }
  };

  const sharedInput = 'flex-1 bg-transparent focus:outline-none text-base';
  const regions = [
    'Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Mbeya', 'Tanga', 'Morogoro',
    'Iringa', 'Tabora', 'Kigoma', 'Mara', 'Kagera', 'Shinyanga', 'Singida',
    'Rukwa', 'Ruvuma', 'Lindi', 'Mtwara', 'Pwani', 'Manyara', 'Geita',
    'Simiyu', 'Katavi', 'Njombe', 'Songwe'
  ];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const referralSources = [
    'Walk-in', 'Facebook', 'Instagram', 'WhatsApp', 'Google', 'Friend Referral',
    'Returning Customer', 'Advertisement', 'Other'
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>

            {/* Text */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Add New Customer
              </h3>
              <p className="text-sm text-gray-600">
                Enter customer details below
              </p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-gray-700 mb-2 font-medium">
                Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full py-3 pl-12 pr-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-colors text-gray-900"
                  placeholder="Enter customer name"
                  required
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              {!name.trim() && <div className="mt-1 text-sm text-red-600">Name is required</div>}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full py-3 pl-12 pr-4 border-2 rounded-xl focus:outline-none transition-colors text-gray-900 ${
                    phoneError ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
                  }`}
                  placeholder="e.g., 0712345678"
                  required
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              {phoneError && <div className="mt-1 text-sm text-red-600">{phoneError}</div>}
            </div>

            {/* WhatsApp */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-gray-700 font-medium">WhatsApp</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasWhatsapp"
                    checked={hasWhatsapp}
                    onChange={(e) => setHasWhatsapp(e.target.checked)}
                    className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                  />
                  <label htmlFor="hasWhatsapp" className="text-sm text-gray-600">Has WhatsApp</label>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  disabled={!hasWhatsapp}
                  className={`w-full py-3 pl-12 pr-4 border-2 rounded-xl focus:outline-none transition-colors ${
                    hasWhatsapp ? 'border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-gray-900' : 'border-gray-200 bg-gray-50 text-gray-500'
                  }`}
                  placeholder={hasWhatsapp ? "Enter WhatsApp number" : "WhatsApp disabled"}
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
            </div>

            {/* Region & Gender on the same row */}
            <div className="md:col-span-1">
              <label className="block text-gray-700 mb-2 font-medium">Region</label>
              <div className="relative">
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full min-h-[48px] py-3 pl-4 pr-10 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-colors text-gray-900"
                >
                  <option value="">Select region</option>
                  {regions.map((region) => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              </div>
            </div>

            <div className="md:col-span-1 flex flex-col justify-end">
              <label className="block text-gray-700 mb-2 font-medium">Gender <span className="text-red-500">*</span></label>
              <div className="flex gap-3">
                {[
                  { value: 'male', label: 'Male', icon: '👨' },
                  { value: 'female', label: 'Female', icon: '👩' }
                ].map(option => {
                  const isSelected = gender === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setGender(option.value as 'male' | 'female')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all duration-200 cursor-pointer relative h-[52px] ${
                        isSelected
                          ? option.value === 'male'
                            ? 'bg-orange-600 text-white border-orange-600 shadow-lg'
                            : 'bg-pink-600 text-white border-pink-600 shadow-lg'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-md'
                      }`}
                      style={{ userSelect: 'none' }}
                    >
                      <span className="text-lg">{option.icon}</span>
                      <span className="font-medium">{option.label}</span>
                    </button>
                  );
                })}
              </div>
              {!gender && <div className="mt-1 text-sm text-red-600">Gender is required</div>}
            </div>

            {/* Birthday */}
            <div className="md:col-span-2">
              <label className="block text-gray-700 mb-2 font-medium">Birthday</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <select
                    value={birthMonth}
                    onChange={(e) => setBirthMonth(e.target.value)}
                    className="w-full py-3 pl-4 pr-10 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-colors text-gray-900"
                  >
                    <option value="">Select month</option>
                    {months.map((month) => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">🎂</span>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                </div>
                <div className="relative">
                  <select
                    value={birthDay}
                    onChange={(e) => setBirthDay(e.target.value)}
                    className="w-full py-3 pl-4 pr-10 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-colors text-gray-900"
                  >
                    <option value="">Select day</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day.toString()}>{day}</option>
                    ))}
                  </select>
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">🎉</span>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                </div>
              </div>
            </div>

            {/* Referral Source */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">How did you hear about us?</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {referralSources.map((source) => {
                  const selected = referralSource === source;
                  return (
                    <button
                      key={source}
                      type="button"
                      onClick={() => setReferralSource(source)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        selected ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={{ userSelect: 'none' }}
                    >
                      <span className={selected ? 'text-white' : 'text-gray-500'}>📢</span>
                      <span className="text-xs">{source}</span>
                    </button>
                  );
                })}
              </div>
            </div>


            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-gray-700 mb-2 font-medium">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full min-h-[48px] py-3 px-4 border-2 border-gray-300 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none transition-colors text-gray-900 resize-none"
                placeholder="Additional notes"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 flex-shrink-0 bg-white px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Adding...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Customer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TabletAddCustomerModal;
