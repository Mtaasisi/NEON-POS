import React, { useState, useEffect } from 'react';
import { useCustomers } from '../../../context/CustomersContext';
import toast from 'react-hot-toast';
import { Customer } from '../../../types';
import { formatTanzaniaPhoneNumber, formatTanzaniaWhatsAppNumber } from '../../../lib/phoneUtils';
import SuccessModal from '../../../components/ui/SuccessModal';
import { useSuccessModal } from '../../../hooks/useSuccessModal';
import { SuccessIcons } from '../../../components/ui/SuccessModalIcons';
import MobileFullScreenSheet from './MobileFullScreenSheet';
import {
  SheetInputField,
  SheetInputGroup,
  SheetSectionDivider,
  SheetCollapsibleSection,
  SheetContentSpacer
} from './MobileSheetContent';

interface MobileAddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated?: (customer: Customer) => void;
  onAddAnother?: () => void;
}

const MobileAddCustomerModal: React.FC<MobileAddCustomerModalProps> = ({
  isOpen,
  onClose,
  onCustomerCreated,
  onAddAnother
}) => {
  const { addCustomer } = useCustomers();
  const successModal = useSuccessModal();
  
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [city, setCity] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // UI state
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [hasWhatsapp, setHasWhatsapp] = useState(true);

  // Tanzania regions
  const tanzaniaRegions = [
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

  // Auto-fill WhatsApp with phone number
  useEffect(() => {
    if (hasWhatsapp && phone && !whatsapp) {
      setWhatsapp(phone);
    }
  }, [phone, hasWhatsapp]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setName('');
    setPhone('');
    setWhatsapp('');
    setGender('');
    setCity('');
    setBirthMonth('');
    setBirthDay('');
    setReferralSource('');
    setNotes('');
    setHasWhatsapp(true);
    setShowMoreOptions(false);
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

      const customerPayload = {
        name: name.trim(),
        phone: formatTanzaniaPhoneNumber(phone),
        email: '',
        gender: gender || 'male',
        city: city || '',
        whatsapp: hasWhatsapp ? formatTanzaniaWhatsAppNumber(whatsapp || phone) : '',
        referralSource: referralSource || '',
        birthMonth: birthMonth || '',
        birthDay: birthDay || '',
        notes: notes ? [{ id: Date.now().toString(), content: notes, createdAt: new Date().toISOString(), createdBy: 'system' }] : [],
        loyaltyLevel: 'interested' as const,
        colorTag: 'new' as const,
        referrals: [],
        totalSpent: 0,
        points: 0,
        lastVisit: new Date().toISOString(),
        isActive: true,
        devices: [],
      };

      const customer = await addCustomer(customerPayload);

      if (customer) {
        successModal.show(
          `${customer.name} has been added to your customer list!`,
          {
            title: 'Customer Added! 🎉',
            icon: SuccessIcons.customerAdded,
            autoCloseDelay: 0,
            actionButtons: [
              {
                label: 'Add Another',
                onClick: () => {
                  successModal.hide();
                  resetForm();
                  if (onAddAnother) onAddAnother();
                },
                variant: 'primary',
              },
              {
                label: 'Done',
                onClick: () => {
                  successModal.hide();
                  onClose();
                },
                variant: 'secondary',
              }
            ],
          }
        );

        if (onCustomerCreated) {
          onCustomerCreated(customer);
        }
      }
    } catch (error: any) {
      console.error('Error adding customer:', error);
      toast.error(error.message || 'Failed to add customer');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <MobileFullScreenSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Add Customer"
        subtitle={phone ? formatTanzaniaPhoneNumber(phone) : 'New Customer'}
        leftButtonText="Cancel"
        rightButtonText={isLoading ? 'Adding...' : 'Add'}
        rightButtonDisabled={isLoading || !name.trim() || !phone.trim()}
        onRightButtonClick={handleSubmit}
      >
        {/* SECTION 1: Basic Info - Input Fields */}
        <SheetInputGroup>
          <SheetInputField
            placeholder="Customer name"
            value={name}
            onChange={setName}
            autoFocus
          />
          <SheetInputField
            placeholder="Phone number"
            value={phone}
            onChange={setPhone}
            type="tel"
          />
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="tel"
                placeholder="WhatsApp number"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                disabled={!hasWhatsapp}
                className="flex-1 outline-none bg-transparent border-0 p-0 disabled:text-gray-400"
                style={{
                  fontSize: '17px',
                  fontWeight: '400',
                  color: whatsapp ? '#000000' : '#C7C7CC',
                  letterSpacing: '-0.41px'
                }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={hasWhatsapp}
                  onChange={(e) => setHasWhatsapp(e.target.checked)}
                  className="w-4 h-4 text-blue-500 rounded"
                />
                <span 
                  className="text-gray-500"
                  style={{
                    fontSize: '13px',
                    fontWeight: '400',
                    letterSpacing: '-0.08px'
                  }}
                >
                  Same as phone
                </span>
              </label>
            </div>
          </div>
        </SheetInputGroup>

        <SheetSectionDivider />

        {/* SECTION 2: Gender Selection - Following Rate/Quantity pattern from image */}
        <div className="border-t border-b border-gray-200">
          <div style={{ padding: '14px 16px' }}>
            <div className="flex items-center justify-between">
              <span 
                className="text-gray-900"
                style={{
                  fontSize: '17px',
                  fontWeight: '400',
                  letterSpacing: '-0.41px'
                }}
              >
                Gender
              </span>
              <span 
                className="text-gray-900 font-semibold"
                style={{
                  fontSize: '17px',
                  letterSpacing: '-0.41px'
                }}
              >
                {gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : '--'}
              </span>
            </div>
          </div>
          <div className="border-t border-gray-200" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`flex-1 rounded-lg font-medium transition-all ${
                  gender === 'male'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
                style={{
                  fontSize: '15px',
                  padding: '10px 16px',
                  letterSpacing: '-0.24px'
                }}
              >
                Male
              </button>
              <button
                type="button"
                onClick={() => setGender('female')}
                className={`flex-1 rounded-lg font-medium transition-all ${
                  gender === 'female'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
                style={{
                  fontSize: '15px',
                  padding: '10px 16px',
                  letterSpacing: '-0.24px'
                }}
              >
                Female
              </button>
            </div>
          </div>
        </div>

        <SheetSectionDivider />

        {/* SECTION 3: More Options - Collapsible */}
        <SheetCollapsibleSection
          title="More options"
          subtitle="Location, birthday, referral source"
          isOpen={showMoreOptions}
          onToggle={() => setShowMoreOptions(!showMoreOptions)}
        >
          <div style={{ padding: '16px', paddingTop: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* City/Region */}
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-gray-100 border-0 rounded-lg text-gray-900 outline-none"
                style={{
                  fontSize: '15px',
                  fontWeight: '400',
                  padding: '12px 16px',
                  letterSpacing: '-0.24px'
                }}
              >
                <option value="">City / Region</option>
                {tanzaniaRegions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>

              {/* Birthday */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <select
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(e.target.value)}
                  className="flex-1 bg-gray-100 border-0 rounded-lg text-gray-900 outline-none"
                  style={{
                    fontSize: '15px',
                    fontWeight: '400',
                    padding: '12px 16px',
                    letterSpacing: '-0.24px'
                  }}
                >
                  <option value="">Month</option>
                  {months.map((month, index) => (
                    <option key={month} value={String(index + 1)}>
                      {month}
                    </option>
                  ))}
                </select>
                <select
                  value={birthDay}
                  onChange={(e) => setBirthDay(e.target.value)}
                  className="bg-gray-100 border-0 rounded-lg text-gray-900 outline-none"
                  style={{
                    fontSize: '15px',
                    fontWeight: '400',
                    padding: '12px 16px',
                    letterSpacing: '-0.24px',
                    width: '96px'
                  }}
                >
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={String(day)}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              {/* Referral Source */}
              <select
                value={referralSource}
                onChange={(e) => setReferralSource(e.target.value)}
                className="w-full bg-gray-100 border-0 rounded-lg text-gray-900 outline-none"
                style={{
                  fontSize: '15px',
                  fontWeight: '400',
                  padding: '12px 16px',
                  letterSpacing: '-0.24px'
                }}
              >
                <option value="">How did they find us?</option>
                {referralSources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>

              {/* Notes */}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (Optional)"
                rows={3}
                className="w-full bg-gray-100 border-0 rounded-lg placeholder-gray-400 outline-none resize-none"
                style={{
                  fontSize: '15px',
                  fontWeight: '400',
                  padding: '12px 16px',
                  letterSpacing: '-0.24px',
                  color: notes ? '#000000' : '#C7C7CC'
                }}
              />
            </div>
          </div>
        </SheetCollapsibleSection>

        <SheetContentSpacer />
      </MobileFullScreenSheet>

      {/* Success Modal */}
      <SuccessModal {...successModal.props} />
    </>
  );
};

export default MobileAddCustomerModal;

