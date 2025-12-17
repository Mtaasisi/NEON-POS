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
    <div className="overlay">
      <div className="sheet">
        <div className="header">
          <button className="icon-btn" onClick={onClose} aria-label="close"><X size={18} /></button>
          <h1>New Contact</h1>
          <button className="icon-btn confirm" onClick={handleSubmit} aria-label="save"><CheckCircle size={18} /></button>
        </div>

        <div className="avatar-section">
          <div className="avatar">
            <div className="avatar-icon" />
          </div>
          <button className="add-photo">Add Photo</button>
        </div>

        <div className="card" role="group" aria-label="basic details">
          <input placeholder="First name" value={name.split(' ')[0] || ''} onChange={(e) => setName(`${e.target.value} ${name.split(' ')[1] || ''}`)} />
          <input placeholder="Last name" value={name.split(' ')[1] || ''} onChange={(e) => setName(`${name.split(' ')[0] || ''} ${e.target.value}`)} />
          <input placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>

        <div className="action-card" onClick={() => { /* add phone action */ }}>
          <div className="plus">+</div>
          <div>add phone</div>
        </div>

        <div className="action-card" onClick={() => { /* add email action */ }}>
          <div className="plus">+</div>
          <div>add email</div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ padding: '12px 16px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>WhatsApp same as phone</span>
              <input type="checkbox" checked={hasWhatsapp} onChange={(e) => setHasWhatsapp(e.target.checked)} />
            </label>
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #eee' }}>
            <select value={city} onChange={(e) => setCity(e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent' }}>
              <option value="">Select region</option>
              {regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #eee' }}>
            <select value={gender} onChange={(e) => setGender(e.target.value as any)} style={{ width: '100%', border: 'none', background: 'transparent' }}>
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #eee' }}>
            <select value={referralSource} onChange={(e) => setReferralSource(e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent' }}>
              <option value="">How did they hear about us?</option>
              {referralSources.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TabletAddCustomerModal;
