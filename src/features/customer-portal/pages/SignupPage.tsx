import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Phone, 
  User, 
  Eye, 
  EyeOff, 
  ShoppingBag,
  CheckCircle,
  AlertCircle,
  MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';

interface SignupFormData {
  name: string;
  phone: string;
  gender: 'male' | 'female' | 'other' | '';
  password: string;
  confirmPassword: string;
  city: string;
  birthMonth: string;
  birthDay: string;
  referralSource: string;
  acceptTerms: boolean;
}

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<SignupFormData>({
    name: '',
    phone: '',
    gender: '',
    password: '',
    confirmPassword: '',
    city: '',
    birthMonth: '',
    birthDay: '',
    referralSource: '',
    acceptTerms: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<SignupFormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<SignupFormData> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10,15}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }


    // Password validation (optional for customer portal)
    if (formData.password) {
      if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    // Terms acceptance
    if (!formData.acceptTerms) {
      toast.error('Please accept the terms and conditions');
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof SignupFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Check if phone number already exists
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', formData.phone)
        .single();

      if (existingCustomer) {
        toast.error('Phone number already registered. Please login instead.');
        setLoading(false);
        return;
      }

      // Create new customer with collected information
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert([
          {
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            whatsapp: formData.phone.trim(), // Use phone as WhatsApp by default
            gender: formData.gender || null,
            city: formData.city.trim() || null,
            birth_month: formData.birthMonth || null,
            birth_day: formData.birthDay || null,
            referral_source: formData.referralSource.trim() || null,
            points: 0,
            loyalty_level: 'interested',
            total_spent: 0,
            is_active: true,
            joined_date: new Date().toISOString().split('T')[0],
            // If password provided, hash it (for future implementation)
            // For now, password is optional and stored as is
            // In production, use proper password hashing
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Signup error:', error);
        throw new Error(error.message);
      }

      if (!newCustomer) {
        throw new Error('Failed to create account');
      }

      // Store customer ID in localStorage
      localStorage.setItem('customer_id', newCustomer.id);

      toast.success('Account created successfully! Welcome! 🎉');

      // Redirect to dashboard
      setTimeout(() => {
        navigate('/customer-portal/dashboard');
      }, 1000);

    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-600 flex flex-col">
      {/* Header */}
      <div className="pt-8 pb-6 px-6 text-center">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <ShoppingBag size={40} className="text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
        <p className="text-green-100">Join us and start shopping today!</p>
      </div>

      {/* Signup Form */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 py-8 overflow-y-auto">
        <form onSubmit={handleSignup} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User size={20} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
                className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.name}
              </p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone size={20} className="text-gray-400" />
              </div>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="0712345678"
                className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.phone && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Gender (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <select
              value={formData.gender}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* City (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MapPin size={20} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="Your city"
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Birthday (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Birthday <span className="text-gray-400 text-xs">(Optional - for birthday rewards)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={formData.birthMonth}
                onChange={(e) => handleInputChange('birthMonth', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Month</option>
                <option value="January">January</option>
                <option value="February">February</option>
                <option value="March">March</option>
                <option value="April">April</option>
                <option value="May">May</option>
                <option value="June">June</option>
                <option value="July">July</option>
                <option value="August">August</option>
                <option value="September">September</option>
                <option value="October">October</option>
                <option value="November">November</option>
                <option value="December">December</option>
              </select>
              <select
                value={formData.birthDay}
                onChange={(e) => handleInputChange('birthDay', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
          </div>

          {/* How did you hear about us? (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How did you hear about us? <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <select
              value={formData.referralSource}
              onChange={(e) => handleInputChange('referralSource', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select source</option>
              <option value="friend">Friend or Family</option>
              <option value="social_media">Social Media</option>
              <option value="google">Google Search</option>
              <option value="advertisement">Advertisement</option>
              <option value="walk_in">Walk-in</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Password (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Create a password (optional)"
                className={`w-full pl-12 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center"
              >
                {showPassword ? (
                  <EyeOff size={20} className="text-gray-400" />
                ) : (
                  <Eye size={20} className="text-gray-400" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          {formData.password && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm your password"
                  className={`w-full pl-12 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} className="text-gray-400" />
                  ) : (
                    <Eye size={20} className="text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          )}

          {/* Terms & Conditions */}
          <div className="flex items-start gap-3 py-2">
            <input
              type="checkbox"
              id="acceptTerms"
              checked={formData.acceptTerms}
              onChange={(e) => handleInputChange('acceptTerms', e.target.checked)}
              className="mt-1 w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <label htmlFor="acceptTerms" className="text-sm text-gray-700">
              I accept the{' '}
              <button type="button" className="text-green-600 font-medium hover:underline">
                Terms & Conditions
              </button>
              {' '}and{' '}
              <button type="button" className="text-green-600 font-medium hover:underline">
                Privacy Policy
              </button>
            </label>
          </div>

          {/* Benefits Preview */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-green-900 flex items-center gap-2">
              <CheckCircle size={18} className="text-green-600" />
              Benefits of Creating an Account
            </h3>
            <ul className="space-y-1 text-sm text-green-800">
              <li className="flex items-center gap-2">
                <span className="text-green-600">•</span>
                <span>Earn loyalty points on every purchase</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">•</span>
                <span>Track your orders and delivery status</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">•</span>
                <span>Get exclusive deals and early access</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">•</span>
                <span>Faster checkout with saved information</span>
              </li>
            </ul>
          </div>

          {/* Signup Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Creating Account...</span>
              </div>
            ) : (
              'Create Account'
            )}
          </button>

          {/* OR Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">OR</span>
            </div>
          </div>

          {/* Guest Browsing */}
          <button
            type="button"
            onClick={() => navigate('/customer-portal/products')}
            className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 active:scale-95 transition-all"
          >
            Continue as Guest
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/customer-portal/login')}
              className="text-green-600 font-bold hover:underline"
            >
              Login
            </button>
          </p>
        </div>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl">
          <p className="text-sm text-gray-600 text-center">
            Need help? Contact us at{' '}
            <a href="tel:+255712345678" className="text-blue-600 font-medium">
              +255 712 345 678
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;

