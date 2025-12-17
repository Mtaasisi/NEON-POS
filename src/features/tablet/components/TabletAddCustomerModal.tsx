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
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
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
    setEmail('');
    setPhoneError('');
    setHasWhatsapp(true);
    setShowOptional(false);
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
        email: email || '',
        gender: gender || 'male',
        city: city || '',
        whatsapp: hasWhatsapp ? formatTanzaniaWhatsAppNumber(whatsapp || phone) : '',
        referralSource: referralSource || '',
        birthMonth: birthMonth || '',
        birthDay: birthDay || '',
        notes: notes,
        company: company || '',
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="relative bg-white rounded-2xl w-[680px] max-h-[90vh] overflow-y-auto">
        {/* top-left close button (circular) */}
        <div className="absolute -top-4 -left-4">
          <button
            onClick={onClose}
            className="w-12 h-12 bg-white shadow-md rounded-full flex items-center justify-center"
            aria-label="Close"
          >
            <X size={28} className="text-gray-700" />
          </button>
        </div>

        {/* top-right check button */}
        <div className="absolute -top-4 -right-4">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-12 h-12 bg-gray-100 shadow-sm rounded-full flex items-center justify-center"
            aria-label="Save"
          >
            <CheckCircle size={26} className="text-white bg-blue-500 rounded-full p-0.5" />
          </button>
        </div>

        {/* centered title */}
        <div className="pt-6 pb-2 flex justify-center">
          <h2 className="text-lg font-bold text-gray-900">New Contact</h2>
        </div>

        {/* avatar + add photo */}
        <div className="flex flex-col items-center pt-4 pb-2">
          <div className="w-36 h-36 rounded-full bg-gradient-to-b from-blue-200 to-blue-500 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="0" className="text-white">
              <circle cx="12" cy="8" r="5" fill="white" />
            </svg>
          </div>
          <button className="bg-gray-100 rounded-full px-6 py-2 text-sm font-medium text-gray-800">Add Photo</button>
        </div>

        {/* form grouped card */}
        <div className="px-6 pb-6">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4">
              <div className="py-4 border-b border-gray-200">
                <input
                  className="w-full bg-transparent placeholder-gray-500 text-base focus:outline-none"
                  placeholder="First name"
                  value={name.split(' ')[0] || ''}
                  onChange={(e) => setName(`${e.target.value} ${name.split(' ')[1] || ''}`)}
                />
              </div>
              <div className="py-4 border-b border-gray-200">
                <input
                  className="w-full bg-transparent placeholder-gray-500 text-base focus:outline-none"
                  placeholder="Last name"
                  value={name.split(' ')[1] || ''}
                  onChange={(e) => setName(`${name.split(' ')[0] || ''} ${e.target.value}`)}
                />
              </div>
              <div className="py-4">
                <input
                  className="w-full bg-transparent placeholder-gray-500 text-base focus:outline-none"
                  placeholder="Company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* add phone / add email rows */}
          <div className="mt-4 space-y-4">
            <div className="bg-white rounded-xl px-6 py-4 shadow-sm flex items-center space-x-4">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                <PlusCircle size={16} />
              </div>
              <span className="text-base text-gray-800 lowercase">add phone</span>
            </div>
            <div className="bg-white rounded-xl px-6 py-4 shadow-sm flex items-center space-x-4">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                <PlusCircle size={16} />
              </div>
              <span className="text-base text-gray-800 lowercase">add email</span>
            </div>
          </div>

          {/* details rows */}
          <div className="mt-6 bg-white rounded-xl px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-base text-gray-800">WhatsApp same as phone</span>
              <input
                type="checkbox"
                checked={hasWhatsapp}
                onChange={(e) => setHasWhatsapp(e.target.checked)}
                className="form-checkbox h-4 w-4 text-blue-600 rounded"
              />
            </div>
            {!hasWhatsapp && (
              <div className="py-3 border-b border-gray-100">
                <input
                  className="w-full bg-transparent placeholder-gray-500 text-base focus:outline-none"
                  placeholder="WhatsApp number"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </div>
            )}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-base text-gray-800">Region</span>
              <select
                className="bg-transparent text-base focus:outline-none"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">Select region</option>
                {regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-base text-gray-800">Gender</span>
              <select
                className="bg-transparent text-base focus:outline-none"
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
              >
                <option value="">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-base text-gray-800">Source</span>
              <select
                className="bg-transparent text-base focus:outline-none"
                value={referralSource}
                onChange={(e) => setReferralSource(e.target.value)}
              >
                <option value="">How did they hear about us?</option>
                {referralSources.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabletAddCustomerModal;
