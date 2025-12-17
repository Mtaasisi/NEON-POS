import React, { useEffect, useState } from 'react';
import { X, ChevronDown, ChevronUp, PlusCircle, ChevronRight } from 'lucide-react';
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

  // Auto-fill WhatsApp when toggled
  useEffect(() => {
    if (hasWhatsapp && phone) {
      setWhatsapp(phone);
    }
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
      <div className="bg-white rounded-2xl w-[600px] h-[700px]">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Add Customer</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        <div className="flex flex-col items-center p-6">
          <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              className="text-blue-500"
            >
              <circle cx="12" cy="8" r="5"></circle>
              <path d="M20 21a8 8 0 0 0-16 0"></path>
            </svg>
          </div>
          <button className="text-blue-500 font-semibold text-sm">Add Photo</button>
        </div>

        <div className="p-0">
          {/* Fast lane: essentials at top */}
          <div className="divide-y divide-gray-200 border-t border-b border-gray-200">
            <div className="flex items-center px-6 py-3">
              <input
                className="flex-1 bg-transparent focus:outline-none text-base"
                placeholder="First name"
                value={name.split(' ')[0] || ''}
                onChange={(e) => setName(`${e.target.value} ${name.split(' ')[1] || ''}`)}
                autoFocus
              />
            </div>
            <div className="flex items-center px-6 py-3">
              <input
                className="flex-1 bg-transparent focus:outline-none text-base"
                placeholder="Last name"
                value={name.split(' ')[1] || ''}
                onChange={(e) => setName(`${name.split(' ')[0] || ''} ${e.target.value}`)}
              />
            </div>
            <div className="flex items-center px-6 py-3">
              <input
                className="flex-1 bg-transparent focus:outline-none text-base"
                placeholder="Company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center space-x-2">
                <span className="text-base text-gray-700">phone</span>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
              <input
                className={`text-right bg-transparent focus:outline-none text-base w-1/2 ${phoneError ? 'text-red-500' : ''}`}
                placeholder="+255 745 000 035"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneError) setPhoneError('');
                }}
              />
            </div>
            {phoneError && <p className="text-xs text-red-500 px-6 pb-2">{phoneError}</p>}
            <div className="flex items-center px-6 py-3 text-blue-500 font-semibold">
              <PlusCircle size={20} className="mr-2" />
              Add Phone
            </div>
            <div className="flex items-center px-6 py-3 text-blue-500 font-semibold">
              <PlusCircle size={20} className="mr-2" />
              Add Email
            </div>
          </div>

          <div className="divide-y divide-gray-200 border-b border-gray-200 mt-4">
            <div className="flex items-center px-6 py-3 justify-between">
              <span className="text-base text-gray-700">WhatsApp same as phone</span>
              <input
                type="checkbox"
                checked={hasWhatsapp}
                onChange={(e) => setHasWhatsapp(e.target.checked)}
                className="form-checkbox h-4 w-4 text-blue-600 rounded"
              />
            </div>
            {!hasWhatsapp && (
              <div className="flex items-center px-6 py-3">
                <input
                  className="flex-1 bg-transparent focus:outline-none text-base"
                  placeholder="WhatsApp number"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </div>
            )}
            <div className="flex items-center px-6 py-3 justify-between">
              <span className="text-base text-gray-700">Region</span>
              <select
                className="text-right bg-transparent focus:outline-none text-base"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">Select region</option>
                {regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center px-6 py-3 justify-between">
              <span className="text-base text-gray-700">Gender</span>
              <select
                className="text-right bg-transparent focus:outline-none text-base"
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
              >
                <option value="">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="flex items-center px-6 py-3 justify-between">
              <span className="text-base text-gray-700">How did they hear about us?</span>
              <select
                className="text-right bg-transparent focus:outline-none text-base"
                value={referralSource}
                onChange={(e) => setReferralSource(e.target.value)}
              >
                <option value="">Select option</option>
                {referralSources.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center px-6 py-3 justify-between">
              <span className="text-base text-gray-700">Email</span>
              <input
                className="text-right bg-transparent focus:outline-none text-base"
                placeholder="Optional"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Optional details (collapsed by default for speed) */}
          <div className="rounded-xl">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 rounded-lg"
              onClick={() => setShowOptional((v) => !v)}
            >
              <span className="text-base font-semibold text-gray-900">Optional details</span>
              {showOptional ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showOptional && (
              <div className="divide-y divide-gray-200 border-t border-gray-200">
                <div className="flex items-center px-6 py-3">
                  <select
                    className={sharedInput}
                    value={birthMonth}
                    onChange={(e) => setBirthMonth(e.target.value)}
                  >
                    <option value="">Birth month</option>
                    {months.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center px-6 py-3">
                  <input
                    className={sharedInput}
                    placeholder="Birth day (1-31)"
                    value={birthDay}
                    onChange={(e) => setBirthDay(e.target.value)}
                    type="number"
                    min={1}
                    max={31}
                  />
                </div>
                <div className="flex items-center px-6 py-3">
                  <textarea
                    className={`${sharedInput} resize-none`}
                    rows={3}
                    placeholder="Optional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full py-4 rounded-lg text-base font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60"
          >
            {isLoading ? 'Adding...' : 'Add Customer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TabletAddCustomerModal;