import React, { useState, useEffect } from 'react';
import { X, Building, ChevronDown, MessageCircle, Plus, User, MapPin, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createSupplier, updateSupplier, type Supplier } from '../../../lib/supplierApi';

interface EnhancedAddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSupplierCreated: () => void;
  supplier?: Supplier | null; // Optional supplier for edit mode
}

interface ContactPerson {
  name: string;
  mobile: string;
}

const EnhancedAddSupplierModal: React.FC<EnhancedAddSupplierModalProps> = ({
  isOpen,
  onClose,
  onSupplierCreated,
  supplier
}) => {
  const isEditMode = !!supplier;
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);
  const [hasClickedAddContact, setHasClickedAddContact] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [convertingCoordinates, setConvertingCoordinates] = useState(false);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState('');
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [wechatQRCode, setWechatQRCode] = useState<string | null>(null);
  const [alipayQRCode, setAlipayQRCode] = useState<string | null>(null);
  const [bankAccount, setBankAccount] = useState('');

  // File input refs for manual triggering
  const wechatFileInputRef = React.useRef<HTMLInputElement>(null);
  const alipayFileInputRef = React.useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    phone: '',
    email: '',
    whatsapp: '',
    wechat: '',
    country: '',
    city: '',
    address: '',
    preferred_currency: '',
    tax_id: '',
    payment_terms: '',
    notes: ''
  });

  // Initialize form with supplier data when in edit mode
  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        company_name: supplier.company_name || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        whatsapp: supplier.whatsapp || '',
        wechat: supplier.wechat || '',
        country: supplier.country || '',
        city: supplier.city || '',
        address: supplier.address || '',
        preferred_currency: supplier.preferred_currency || '',
        tax_id: supplier.tax_id || '',
        payment_terms: supplier.payment_terms || '',
        notes: supplier.notes || ''
      });
      setWechatQRCode((supplier as any).wechat_qr_code || null);
      setAlipayQRCode((supplier as any).alipay_qr_code || null);
      setBankAccount((supplier as any).bank_account_details || '');
      
      // Extract product categories from notes if they exist
      if (supplier.notes) {
        const categoryMatch = supplier.notes.match(/Product Categories:(.*?)(?:\n\n|$)/s);
        if (categoryMatch) {
          const categories = categoryMatch[1].split(',').map(c => c.trim()).filter(Boolean);
          setProductCategories(categories);
        }
      }
    }
  }, [supplier]);

  // Country to currency mapping
  const countryCurrencyMap: { [key: string]: string } = {
    'Tanzania': 'TZS',
    'UAE': 'AED',
    'China': 'CNY',
    'Hong Kong': 'CNY',
    'USA': 'USD',
    'UK': 'EUR',
    'Germany': 'EUR',
    'France': 'EUR',
    'Japan': 'CNY',
    'South Korea': 'CNY',
    'Singapore': 'USD',
    'Thailand': 'CNY',
    'Vietnam': 'CNY',
    'Malaysia': 'CNY',
    'Indonesia': 'CNY',
    'Philippines': 'CNY',
    'Turkey': 'EUR',
    'Egypt': 'EUR',
    'South Africa': 'USD',
    'Nigeria': 'USD',
    'Ghana': 'USD',
    'Uganda': 'TZS',
    'Rwanda': 'TZS',
    'Ethiopia': 'TZS',
    'Morocco': 'EUR',
    'Saudi Arabia': 'AED',
    'Pakistan': 'CNY',
    'India': 'CNY',
    'Kenya': 'TZS'
  };

  // Load city suggestions from localStorage
  const loadCitySuggestions = (country: string) => {
    if (!country) {
      setCitySuggestions([]);
      return;
    }
    
    try {
      const savedData = localStorage.getItem('supplier_city_suggestions');
      if (savedData) {
        const allSuggestions: { [key: string]: string[] } = JSON.parse(savedData);
        setCitySuggestions(allSuggestions[country] || []);
      }
    } catch (error) {
      console.error('Error loading city suggestions:', error);
    }
  };

  // Save city suggestion to localStorage
  const saveCitySuggestion = (country: string, city: string) => {
    if (!country || !city.trim()) return;

    try {
      const savedData = localStorage.getItem('supplier_city_suggestions');
      const allSuggestions: { [key: string]: string[] } = savedData ? JSON.parse(savedData) : {};
      
      if (!allSuggestions[country]) {
        allSuggestions[country] = [];
      }
      
      // Add city if it doesn't exist
      if (!allSuggestions[country].includes(city.trim())) {
        allSuggestions[country].push(city.trim());
        localStorage.setItem('supplier_city_suggestions', JSON.stringify(allSuggestions));
      }
    } catch (error) {
      console.error('Error saving city suggestion:', error);
    }
  };

  // Detect if input looks like coordinates
  const isCoordinates = (text: string): boolean => {
    // Match patterns like: "-6.7924, 39.2083" or "-6.7924,39.2083" or "lat,lng"
    const coordPattern = /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/;
    return coordPattern.test(text.trim());
  };

  // Convert coordinates to address using OpenStreetMap Nominatim
  const convertCoordinatesToAddress = async (coordinates: string) => {
    try {
      const [lat, lng] = coordinates.split(',').map(c => c.trim());
      
      setConvertingCoordinates(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch address');
      }

      const data = await response.json();
      
      if (data.display_name) {
        // Update form with the address
        setFormData(prev => ({
          ...prev,
          address: data.display_name
        }));
        
        // Optionally update city and country if available
        if (data.address) {
          if (data.address.city || data.address.town || data.address.village) {
            const cityName = data.address.city || data.address.town || data.address.village;
            setFormData(prev => ({
              ...prev,
              city: cityName
            }));
          }
        }
        
        toast.success('Address found from coordinates!');
      } else {
        toast.error('Could not find address for these coordinates');
      }
    } catch (error) {
      console.error('Error converting coordinates:', error);
      toast.error('Failed to convert coordinates to address');
    } finally {
      setConvertingCoordinates(false);
    }
  };

  // Handle address input with coordinate detection
  const handleAddressChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    setFormData({
      ...formData,
      address: value
    });

    // Check if input looks like coordinates and convert
    if (isCoordinates(value)) {
      await convertCoordinatesToAddress(value);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // If country is changed, automatically set currency and load city suggestions
    if (name === 'country' && value) {
      const currency = countryCurrencyMap[value];
      loadCitySuggestions(value);
      
      // Clear payment QR codes if country is not China
      if (value !== 'China') {
        setWechatQRCode(null);
        setAlipayQRCode(null);
        setBankAccount('');
      }
      
      setFormData({
        ...formData,
        [name]: value,
        preferred_currency: currency || formData.preferred_currency
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
    });
    }
  };

  const addContactPerson = () => {
    setHasClickedAddContact(true);
    setContactPersons(prev => [...prev, { name: '', mobile: '' }]);
  };

  const removeContactPerson = (index: number) => {
    setContactPersons(prev => prev.filter((_, i) => i !== index));
  };

  const updateContactPerson = (index: number, field: keyof ContactPerson, value: string) => {
    setContactPersons(prev => prev.map((contact, i) => 
      i === index ? { ...contact, [field]: value } : contact
    ));
  };

  // Electronics-focused product categories
  const suggestedCategories = [
    'Smartphones & Tablets', 'Laptops & Computers', 'Accessories & Cables', 
    'Audio & Headphones', 'Cameras & Photography', 'Smart Home Devices',
    'Gaming Consoles', 'TV & Monitors', 'Wearables & Smartwatches',
    'Power Banks & Chargers', 'Storage Devices', 'Networking Equipment',
    'Drones & RC', 'Security Systems', 'LED Lights', 'Electronic Components'
  ];

  // Category colors for visual distinction
  const categoryColors = [
    'bg-blue-50 border-blue-300 text-blue-900',
    'bg-purple-50 border-purple-300 text-purple-900',
    'bg-green-50 border-green-300 text-green-900',
    'bg-orange-50 border-orange-300 text-orange-900',
    'bg-pink-50 border-pink-300 text-pink-900',
    'bg-indigo-50 border-indigo-300 text-indigo-900',
    'bg-teal-50 border-teal-300 text-teal-900',
    'bg-cyan-50 border-cyan-300 text-cyan-900',
  ];

  // Get color for a category (consistent based on category name)
  const getCategoryColor = (category: string) => {
    const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return categoryColors[hash % categoryColors.length];
  };

  // Load recently used categories from localStorage
  const loadRecentCategories = (): string[] => {
    try {
      const saved = localStorage.getItem('supplier_category_usage');
      if (saved) {
        const usage: { [key: string]: number } = JSON.parse(saved);
        // Sort by usage count (most used first)
        return Object.entries(usage)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([category]) => category);
      }
    } catch (error) {
      console.error('Error loading category usage:', error);
    }
    return [];
  };

  // Save category usage
  const saveCategoryUsage = (category: string) => {
    try {
      const saved = localStorage.getItem('supplier_category_usage');
      const usage: { [key: string]: number } = saved ? JSON.parse(saved) : {};
      
      usage[category] = (usage[category] || 0) + 1;
      localStorage.setItem('supplier_category_usage', JSON.stringify(usage));
    } catch (error) {
      console.error('Error saving category usage:', error);
    }
  };

  // Get smart suggestions (combine frequently used + default suggestions)
  const getSmartSuggestions = (): string[] => {
    const recentlyUsed = loadRecentCategories();
    const combined = [...recentlyUsed];
    
    // Add default suggestions that aren't already included
    for (const suggestion of suggestedCategories) {
      if (!combined.includes(suggestion) && combined.length < 8) {
        combined.push(suggestion);
      }
    }
    
    return combined.slice(0, 8);
  };

  // Add product category
  const addProductCategory = (category: string) => {
    const trimmedCategory = category.trim();
    if (trimmedCategory && !productCategories.includes(trimmedCategory)) {
      setProductCategories(prev => [...prev, trimmedCategory]);
      saveCategoryUsage(trimmedCategory); // Track usage
      setCategoryInput('');
    }
  };

  // Remove product category
  const removeProductCategory = (category: string) => {
    setProductCategories(prev => prev.filter(c => c !== category));
  };

  // Handle category input key press
  const handleCategoryKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (categoryInput.trim()) {
        addProductCategory(categoryInput);
      }
    }
  };

  // Handle QR code image upload
  const handleQRCodeUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'wechat' | 'alipay') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    try {
      // Convert to base64
      const reader = new FileReader();
      
      reader.onloadend = () => {
        try {
          const base64String = reader.result as string;
          if (!base64String) {
            toast.error('Failed to read image file');
            return;
          }
          
          if (type === 'wechat') {
            setWechatQRCode(base64String);
            toast.success('WeChat QR code uploaded');
          } else {
            setAlipayQRCode(base64String);
            toast.success('Alipay QR code uploaded');
          }
        } catch (error) {
          console.error('Error processing image:', error);
          toast.error('Failed to process image');
        }
      };
      
      reader.onerror = () => {
        console.error('FileReader error:', reader.error);
        toast.error('Failed to read image file. Please try again.');
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading QR code:', error);
      toast.error('Failed to upload image. Please try again.');
    }
    
    // Reset the input so the same file can be selected again if needed
    e.target.value = '';
  };

  // Remove QR code
  const removeQRCode = (type: 'wechat' | 'alipay') => {
    if (type === 'wechat') {
      setWechatQRCode(null);
    } else {
      setAlipayQRCode(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }

    try {
      setSubmitting(true);

      // Prepare contact persons data
      const validContactPersons = contactPersons.filter(cp => cp.name.trim() || cp.mobile.trim());
      const contactPersonData = validContactPersons.length > 0 
        ? validContactPersons.map(cp => `${cp.name}${cp.mobile ? ` (${cp.mobile})` : ''}`).join('; ')
        : undefined;

      // Prepare notes with product categories and payment info
      let finalNotes = formData.notes || '';
      
      // Add product categories
      if (productCategories.length > 0) {
        const categoriesText = `Product Categories: ${productCategories.join(', ')}`;
        finalNotes = finalNotes 
          ? `${categoriesText}\n\n${finalNotes}`
          : categoriesText;
      }
      
      // Add payment information note (just for reference)
      const paymentInfo = [];
      if (bankAccount) paymentInfo.push(`Bank Account Details Available`);
      if (wechatQRCode) paymentInfo.push('WeChat Pay QR Code: Uploaded');
      if (alipayQRCode) paymentInfo.push('Alipay QR Code: Uploaded');
      
      if (paymentInfo.length > 0) {
        const paymentText = `\n\nPayment Information:\n${paymentInfo.join('\n')}`;
        finalNotes = finalNotes ? `${finalNotes}${paymentText}` : paymentText.trim();
      }

      const supplierData = {
        name: formData.name,
        company_name: formData.company_name || undefined,
        contact_person: contactPersonData,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        whatsapp: formData.whatsapp || undefined,
        wechat: formData.wechat || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        country: formData.country || undefined,
        tax_id: formData.tax_id || undefined,
        payment_terms: formData.payment_terms || undefined,
        preferred_currency: formData.preferred_currency || undefined,
        notes: finalNotes || undefined,
        wechat_qr_code: wechatQRCode || undefined,
        alipay_qr_code: alipayQRCode || undefined,
        bank_account_details: bankAccount || undefined,
        is_active: true
      } as any;

      if (isEditMode && supplier) {
        // Update existing supplier
        await updateSupplier(supplier.id, supplierData);
        toast.success('Supplier updated successfully!');
      } else {
        // Create new supplier
        await createSupplier(supplierData);
        toast.success('Supplier created successfully!');
      }

      // Save city suggestion for future use
      if (formData.country && formData.city) {
        saveCitySuggestion(formData.country, formData.city);
      }

      onSupplierCreated();
      onClose();
    } catch (error: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} supplier:`, error);
      toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} supplier`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - respects sidebar and topbar */}
      <div 
        className="fixed bg-black/50"
        onClick={onClose}
        style={{
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          zIndex: 35
        }}
      />
      
      {/* Modal Container */}
      <div 
        className="fixed flex items-center justify-center p-4"
        style={{
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          zIndex: 50,
          pointerEvents: 'none'
        }}
      >
        <div 
          className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          style={{ pointerEvents: 'auto' }}
        >
          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {isEditMode ? 'Edit Supplier' : 'Add New Supplier'}
                </h3>
                <p className="text-xs text-gray-500">
                  {isEditMode ? 'Update supplier information' : 'Create new supplier information'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Supplier Identity & Contact */}
          <div className="mb-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Supplier Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter supplier name"
                  className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors text-gray-900 border-gray-200 focus:border-blue-500"
                  disabled={submitting}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  placeholder="Enter company name"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+255 123 456 789"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    placeholder="+255 123 456 789"
                    className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                    disabled={submitting}
                  />
                  <MessageCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                </div>
              </div>
            </div>
            
            {/* Contact Persons Section */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-600" />
                  <h5 className="text-sm font-semibold text-gray-700">Contact Persons</h5>
                  {contactPersons.length > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {contactPersons.length}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={addContactPerson}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  disabled={submitting}
                >
                  <Plus className="w-4 h-4" />
                  Add Contact
                </button>
              </div>

              {/* Contact Persons List */}
              {contactPersons.length > 0 && (
                <div className="space-y-2">
                  {contactPersons.map((contact, index) => (
                    <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-blue-900">Contact {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeContactPerson(index)}
                          className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                          title="Remove"
                          disabled={submitting}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input
                            type="text"
                          placeholder="Name"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                            value={contact.name}
                            onChange={(e) => updateContactPerson(index, 'name', e.target.value)}
                            disabled={submitting}
                          />
                          <input
                            type="tel"
                            placeholder="+255 123 456 789"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                            value={contact.mobile}
                            onChange={(e) => updateContactPerson(index, 'mobile', e.target.value)}
                            disabled={submitting}
                          />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {hasClickedAddContact && contactPersons.length === 0 && (
                <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <p className="text-sm text-gray-500">No contact persons added</p>
                </div>
              )}
            </div>
          </div>

          {/* Products & Specialization */}
          <div className="mb-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Products & Specialization</h4>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  onKeyPress={handleCategoryKeyPress}
                  onFocus={() => setShowCategorySuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                  placeholder="e.g., Smartphones & Tablets, Laptops..."
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => addProductCategory(categoryInput)}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  disabled={submitting || !categoryInput.trim()}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Selected Categories */}
              {productCategories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {productCategories.map((category, index) => {
                    const recentlyUsed = loadRecentCategories();
                    const usageCount = (() => {
                      try {
                        const saved = localStorage.getItem('supplier_category_usage');
                        if (saved) {
                          const usage: { [key: string]: number } = JSON.parse(saved);
                          return usage[category] || 0;
                        }
                      } catch (error) {
                        return 0;
                      }
                      return 0;
                    })();
                    const isFrequentlyUsed = recentlyUsed.includes(category);
                    
                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-2 px-3 py-1.5 border-2 rounded-lg text-sm font-medium ${getCategoryColor(category)}`}
                      >
                        {category}
                        {isFrequentlyUsed && usageCount > 2 && (
                          <span className="text-xs px-1.5 py-0.5 bg-white/50 rounded-full">
                            {usageCount}×
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeProductCategory(category)}
                          className="hover:scale-110 transition-transform"
                          disabled={submitting}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick Suggestions - Show on focus */}
              {showCategorySuggestions && (
                <div className="flex flex-wrap gap-2">
                  {getSmartSuggestions().map((category) => (
                    !productCategories.includes(category) && (
                      <button
                        key={category}
                        type="button"
                        onClick={() => addProductCategory(category)}
                        className={`px-2 py-1 text-xs rounded-lg transition-all border ${getCategoryColor(category)} opacity-50 hover:opacity-100 hover:scale-105`}
                        disabled={submitting}
                      >
                        + {category}
                      </button>
                    )
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="mb-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Location</h4>
            <div className={`grid grid-cols-1 gap-4 ${formData.country === 'China' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                  disabled={submitting}
                >
                  <option value="">Select country</option>
                  <option value="Tanzania">🇹🇿 Tanzania</option>
                  <option value="USA">🇺🇸 USA</option>
                  <option value="UAE">🇦🇪 UAE</option>
                  <option value="China">🇨🇳 China</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                  list="city-suggestions"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                  disabled={submitting}
                />
                <datalist id="city-suggestions">
                  {citySuggestions.map((city, index) => (
                    <option key={index} value={city} />
                  ))}
                </datalist>
              </div>
              
              {/* WeChat ID - Only show for China */}
              {formData.country === 'China' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WeChat ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="wechat"
                    value={formData.wechat}
                    onChange={handleChange}
                    placeholder="Enter WeChat ID"
                    className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                    disabled={submitting}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-[#09B83E] rounded flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="white">
                      <path d="M8.5 6c-2.8 0-5 1.9-5 4.3 0 1.4.7 2.6 1.8 3.4l-.5 1.5 1.7-.9c.6.2 1.3.3 2 .3 2.8 0 5-1.9 5-4.3S11.3 6 8.5 6zm-1 5.8c-.4 0-.8-.3-.8-.8s.3-.8.8-.8.8.3.8.8-.4.8-.8.8zm2.5 0c-.4 0-.8-.3-.8-.8s.3-.8.8-.8.8.3.8.8-.4.8-.8.8z"/>
                      <path d="M15.5 11c-.3 0-.5 0-.8.1 0 .1 0 .3 0 .4 0 2.9-2.6 5.2-5.7 5.2-.4 0-.7 0-1.1-.1 1 1.3 2.8 2.2 4.9 2.2.5 0 1-.1 1.5-.2l1.3.7-.4-1.2c.9-.6 1.5-1.6 1.5-2.7 0-1.8-1.5-3.4-3.2-4.4z"/>
                    </svg>
                  </div>
                  </div>
                </div>
              )}
              <div className={formData.country === 'China' ? 'md:col-span-3' : 'md:col-span-2'}>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  Address
                  <span className="text-xs text-gray-500 font-normal flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    (or paste coordinates)
                  </span>
                </label>
                <div className="relative">
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleAddressChange}
                    rows={2}
                    placeholder="Enter address or coordinates (e.g., -6.7924, 39.2083)"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900 resize-none"
                    disabled={submitting || convertingCoordinates}
                  />
                  {convertingCoordinates && (
                    <div className="absolute right-3 top-3 flex items-center gap-2 text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                      <span className="text-xs font-medium">Converting...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information - Only for Chinese Suppliers */}
          {formData.country === 'China' && (
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                Payment Information
                <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">🇨🇳 China</span>
              </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* WeChat Pay QR Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WeChat Pay QR Code
                </label>
                {!wechatQRCode ? (
                  <div 
                    onClick={() => !submitting && wechatFileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg transition-colors ${
                      submitting 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'cursor-pointer hover:border-green-500 hover:bg-green-50'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-xs text-gray-500">Upload WeChat QR</p>
                      <p className="text-xs text-gray-400">PNG, JPG (Max 2MB)</p>
                      <p className="text-xs text-blue-500 mt-1 font-medium">Click to browse</p>
                    </div>
                    <input
                      ref={wechatFileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleQRCodeUpload(e, 'wechat')}
                      disabled={submitting}
                    />
                  </div>
                ) : (
                  <div className="relative w-full h-32 border-2 border-green-300 rounded-lg overflow-hidden bg-green-50">
                    <img
                      src={wechatQRCode}
                      alt="WeChat QR Code"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => removeQRCode('wechat')}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  disabled={submitting}
                >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-green-600/90 text-white text-xs py-1 px-2 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      WeChat Pay
                    </div>
                  </div>
                )}
              </div>

              {/* Alipay QR Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alipay QR Code
                </label>
                {!alipayQRCode ? (
                  <div 
                    onClick={() => !submitting && alipayFileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg transition-colors ${
                      submitting 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'cursor-pointer hover:border-blue-500 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-xs text-gray-500">Upload Alipay QR</p>
                      <p className="text-xs text-gray-400">PNG, JPG (Max 2MB)</p>
                      <p className="text-xs text-blue-500 mt-1 font-medium">Click to browse</p>
                    </div>
                    <input
                      ref={alipayFileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleQRCodeUpload(e, 'alipay')}
                      disabled={submitting}
                    />
                  </div>
                ) : (
                  <div className="relative w-full h-32 border-2 border-blue-300 rounded-lg overflow-hidden bg-blue-50">
                    <img
                      src={alipayQRCode}
                      alt="Alipay QR Code"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => removeQRCode('alipay')}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      disabled={submitting}
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-blue-600/90 text-white text-xs py-1 px-2 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      Alipay
                    </div>
                  </div>
                )}
              </div>

              {/* Bank Account */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Account Details (Optional)
                </label>
                <textarea
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  rows={2}
                  placeholder="Bank name, Account number, SWIFT/BIC code, etc."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900 resize-none"
                  disabled={submitting}
                />
              </div>
            </div>
          </div>
          )}

          {/* Advanced Options */}
          <div className="mb-5">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border-2 border-gray-200"
            >
              <span className="text-sm font-semibold text-gray-700">Advanced Options</span>
              <ChevronDown 
                className={`w-5 h-5 text-gray-600 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              />
            </button>

            {showAdvanced && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="supplier@example.com"
                    className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors text-gray-900 border-gray-200 focus:border-blue-500"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax ID
                  </label>
                  <input
                    type="text"
                    name="tax_id"
                    value={formData.tax_id}
                    onChange={handleChange}
                    placeholder="Enter tax ID"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    name="payment_terms"
                    value={formData.payment_terms}
                    onChange={handleChange}
                    placeholder="e.g., Net 30, Cash on Delivery"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Additional notes or comments"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900 resize-none"
                    disabled={submitting}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditMode ? 'Update Supplier' : 'Create Supplier'
              )}
            </button>
          </div>
          <p className="text-xs text-center text-gray-500 mt-2">
            * Required fields must be filled
          </p>
        </form>
        </div>
      </div>
    </>
  );
};

export default EnhancedAddSupplierModal;

