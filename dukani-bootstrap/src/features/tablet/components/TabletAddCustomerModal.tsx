import React, { useEffect, useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
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
        notes: notes
          ? [{ id: Date.now().toString(), content: notes, createdAt: new Date().toISOString(), createdBy: 'system' }]
          : [],
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

  const sharedInput =
    'w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm';
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
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Add Customer</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Fast lane: essentials at top */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className={sharedInput}
              placeholder="Customer name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <input
              className={`${sharedInput} ${phoneError ? 'border-red-300 focus:ring-red-500' : ''}`}
              placeholder="Phone number"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError) setPhoneError('');
              }}
            />
            {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={hasWhatsapp}
                onChange={(e) => setHasWhatsapp(e.target.checked)}
              />
              <span className="text-sm text-gray-700">WhatsApp same as phone</span>
            </div>
            {!hasWhatsapp && (
              <input
                className={sharedInput}
                placeholder="WhatsApp number"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            )}
            <select
              className={sharedInput}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="">Select region</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <select
              className={sharedInput}
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
            >
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            <select
              className={sharedInput}
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
            >
              <option value="">How did they hear about us?</option>
              {referralSources.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <select
              className={sharedInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
            >
              <option value="">Email (optional)</option>
            </select>
          </div>

          {/* Optional details (collapsed by default for speed) */}
          <div className="border border-gray-200 rounded-xl">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3"
              onClick={() => setShowOptional((v) => !v)}
            >
              <span className="text-sm font-semibold text-gray-900">Optional details</span>
              {showOptional ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showOptional && (
              <div className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                <div>
                  <label className="text-sm font-semibold text-gray-900 mb-2 block">Notes</label>
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

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full py-3 rounded-lg text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60"
          >
            {isLoading ? 'Adding...' : 'Add Customer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TabletAddCustomerModal;