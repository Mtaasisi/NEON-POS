import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { CustomerUser } from '../types';

interface CustomerAuthContextType {
  customer: CustomerUser | null;
  loading: boolean;
  login: (phone: string, otp?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  }
  return context;
};

export const useCustomerAuthLogic = () => {
  const [customer, setCustomer] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const savedCustomerId = localStorage.getItem('customer_id');
        if (savedCustomerId) {
          const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', savedCustomerId)
            .single();

          if (data && !error) {
            setCustomer({
              id: data.id,
              name: data.name,
              email: data.email,
              phone: data.phone,
              profileImage: data.profile_image,
              loyaltyPoints: data.points || 0,
              loyaltyTier: data.loyalty_tier,
              createdAt: data.created_at,
              lastPurchase: data.last_purchase_date
            });
          }
        }
      } catch (error) {
        console.error('Error checking customer session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (phone: string, _otp?: string) => {
    try {
      setLoading(true);
      
      // For now, simple phone-based login
      // In production, implement proper OTP verification
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .single();

      if (error) {
        throw new Error('Customer not found. Please register first.');
      }

      if (data) {
        const customerUser: CustomerUser = {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          profileImage: data.profile_image,
          loyaltyPoints: data.points || 0,
          loyaltyTier: data.loyalty_tier,
          createdAt: data.created_at,
          lastPurchase: data.last_purchase_date
        };

        setCustomer(customerUser);
        localStorage.setItem('customer_id', data.id);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setCustomer(null);
    localStorage.removeItem('customer_id');
  };

  return {
    customer,
    loading,
    login,
    logout,
    isAuthenticated: !!customer
  };
};

export { CustomerAuthContext };

