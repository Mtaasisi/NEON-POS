import React, { createContext, useContext, useState, useEffect } from 'react';
import { Customer, CustomerNote, PromoMessage, LoyaltyLevel, CustomerTag } from '../types';
import { AuthContext } from './AuthContext';
import { fetchAllCustomers, addCustomerToDb, updateCustomerInDb } from '../lib/customerApi';
import { addCustomerNote, addPromoMessage } from '../lib/customerExtrasApi';
import { supabase } from '../lib/supabaseClient';
import { useCustomers as useCustomersHook } from '../hooks/useCustomers';

interface CustomersContextType {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  refreshCustomers: () => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'joinedDate' | 'promoHistory' | 'payments'>) => Promise<Customer>;
  updateCustomer: (customerId: string, updates: Partial<Customer>) => Promise<boolean>;
  markCustomerAsRead: (customerId: string) => Promise<boolean>;
  addNote: (customerId: string, content: string) => Promise<boolean>;
  sendPromo: (customerId: string, promo: Omit<PromoMessage, 'id' | 'sentAt' | 'status'>) => Promise<boolean>;
  addPoints: (customerId: string, points: number, reason: string) => boolean;
  getCustomerById: (id: string) => Customer | undefined;
  getCustomersByLoyalty: (level: Customer['loyaltyLevel']) => Customer[];
  getInactiveCustomers: (days: number) => Customer[];
  clearCache: () => void;
}

const CustomersContext = createContext<CustomersContextType | undefined>(undefined);

export const useCustomers = () => {
  const context = useContext(CustomersContext);
  if (!context) {
    // Silently handle HMR issues - only throw error in production
    if (import.meta.env.PROD) {
      throw new Error('useCustomers must be used within a CustomersProvider');
    }
    // Return a fallback context during development HMR
    return {
      customers: [],
      loading: true,
      error: null,
      refreshCustomers: async () => {},
      addCustomer: async () => ({} as Customer),
      updateCustomer: async () => false,
      markCustomerAsRead: async () => false,
      addNote: async () => false,
      sendPromo: async () => false,
      addPoints: () => false,
      getCustomerById: () => undefined,
      getCustomersByLoyalty: () => [],
      getInactiveCustomers: () => [],
      clearCache: () => {}
    } as CustomersContextType;
  }
  return context;
};

// Export the context for debugging
export { CustomersContext };

// Helper to count visits (assuming notes with 'checked in' or similar)
function getVisitCount(customer: Customer) {
  if (!customer || !customer.id) return 0; // Ensure id exists
  if (!customer.notes) return 0;
  return customer.notes.filter(n => n.content && n.content.toLowerCase().includes('checked in')).length;
}
// Helper to detect complaints
function hasComplaint(notes: CustomerNote[]) {
  if (!notes) return false;
  return notes.some(n => n.content && (n.content.toLowerCase().includes('complaint') || n.content.toLowerCase().includes('complain')));
}

export const CustomersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.currentUser || null;

  // Use the new hook for better request management
  const { customers, loading, error, refetch, clearCache } = useCustomersHook({
    light: true, // Use lightweight query for faster initial loading
    autoFetch: !!currentUser,
    cacheKey: 'customers-context'
  });

  const refreshCustomers = async () => {
    await refetch();
  };

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'joinedDate' | 'promoHistory' | 'payments'>): Promise<Customer> => {
    try {
      console.log('🚀 CustomersContext.addCustomer: Starting customer creation...');
      console.log('📝 Customer data received:', {
        name: customerData.name,
        phone: customerData.phone,
        email: customerData.email,
        gender: customerData.gender,
        city: customerData.city,
        hasNotes: !!customerData.notes
      });

      // Use fallback system user if not authenticated (Neon direct mode)
      const effectiveUser = currentUser || {
        id: 'system',
        email: 'system@neon.direct',
        user_metadata: { name: 'System User' }
      };
      
      if (!currentUser) {
        console.warn('⚠️ No authenticated user, using system user for customer creation');
      } else {
        console.log('✅ User authenticated:', currentUser.id);
      }
      
      const newCustomerId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      console.log('🆔 Generated customer ID:', newCustomerId);
      
      // Always set colorTag to 'new' for new customers
      const newCustomer = {
        id: newCustomerId,
        name: customerData.name,
        email: customerData.email || '',
        phone: customerData.phone,
        gender: customerData.gender || 'other',
        city: customerData.city || '',
        joinedDate: timestamp,
        loyaltyLevel: 'interested' as LoyaltyLevel,
        colorTag: 'new' as CustomerTag, // always new
        referredBy: customerData.referredBy || undefined,
        referrals: [],
        totalSpent: 0,
        points: 0,
        lastVisit: timestamp,
        isActive: true,

        referralSource: customerData.referralSource || undefined,
        birthMonth: customerData.birthMonth || undefined,
        birthDay: customerData.birthDay || undefined,
        initialNotes: typeof customerData.notes === 'string' ? customerData.notes : '',
        notes: [],
        promoHistory: [],
        payments: [],
        devices: [],
        createdBy: effectiveUser.id,
      };
      
      console.log('📦 Prepared customer object for database:', {
        id: newCustomer.id,
        name: newCustomer.name,
        phone: newCustomer.phone,
        loyaltyLevel: newCustomer.loyaltyLevel,
        colorTag: newCustomer.colorTag,
        points: newCustomer.points
      });
      
      console.log('💾 Calling addCustomerToDb...');
      const dbCustomer = await addCustomerToDb(newCustomer);
      
      if (!dbCustomer) {
        console.error('❌ CustomersContext.addCustomer: addCustomerToDb returned null/undefined');
        throw new Error('Failed to add customer to database - no data returned');
      }
      
      console.log('✅ Customer added to database successfully:', dbCustomer.id);
      
      // Add a note about the welcome points
      try {
        console.log('📝 Adding welcome note...');
        const noteContent = `Welcome! 10 points awarded for new customer registration.`;
        const noteData = {
          id: crypto.randomUUID(),
          note: noteContent,
          created_by: effectiveUser.id,
          created_at: new Date().toISOString(),
          customer_id: newCustomerId
        };
        const { data: noteResult, error: noteError } = await supabase.from('customer_notes').insert(noteData);
        
        if (noteError) {
          console.error('⚠️  Failed to add welcome note:', {
            error: noteError.message,
            code: noteError.code,
            details: noteError.details,
            hint: noteError.hint
          });
        } else {
          console.log('✅ Welcome note added successfully');
        }
      } catch (noteError: any) {
        console.error('⚠️  Exception while adding welcome note:', {
          message: noteError?.message,
          stack: noteError?.stack
        });
      }
      
      console.log('🎉 CustomersContext.addCustomer: Customer creation completed successfully!');
      
      // The setCustomers call is now handled by the useCustomers hook's onSuccess
      return {
        ...(dbCustomer as any),
        notes: (dbCustomer as any).notes || [],
        promoHistory: (dbCustomer as any).promoHistory || [],
        payments: (dbCustomer as any).payments || [],
        devices: (dbCustomer as any).devices || []
      } as Customer;
    } catch (error: any) {
      console.error('═══════════════════════════════════════════════════════');
      console.error('❌ CUSTOMER CREATION FAILED');
      console.error('═══════════════════════════════════════════════════════');
      console.error('Error Type:', error?.constructor?.name || 'Unknown');
      console.error('Error Message:', error?.message || 'No message');
      console.error('Error Code:', error?.code || 'No code');
      console.error('Error Details:', error?.details || 'No details');
      console.error('Error Hint:', error?.hint || 'No hint');
      console.error('Full Error Object:', error);
      console.error('Stack Trace:', error?.stack || 'No stack trace');
      console.error('═══════════════════════════════════════════════════════');
      throw error;
    }
  };

  // Also auto-update after any updateCustomer call
  const updateCustomer = async (customerId: string, updates: Partial<Customer>): Promise<boolean> => {
    try {
      console.log('🔧 CustomersContext: Starting customer update for ID:', customerId);
      console.log('🔧 CustomersContext: Updates received:', updates);
      
      // Use fallback system user if not authenticated (Neon direct mode)
      const effectiveUser = currentUser || {
        id: 'system',
        email: 'system@neon.direct',
        user_metadata: { name: 'System User' }
      };
      
      if (!currentUser) {
        console.warn('⚠️ No authenticated user, using system user for customer update');
      }
      // Fetch current customer for logic
      const current = customers.find(c => c.id === customerId);
              let newColorTag = current?.colorTag || 'new';
      let newIsActive = current?.isActive ?? true;
      const notes = updates.notes || current?.notes || [];
      // Check for complaints
      if (hasComplaint(notes)) {
        newColorTag = 'complainer';
      } else {
        // Check visit count for VIP
        // Always pass a valid Customer object with id
        const visitCount = getVisitCount({ ...current, ...updates, notes, id: customerId } as Customer);
        if (visitCount >= 10) {
          newColorTag = 'vip';
        } else {
          newColorTag = 'new';
        }
      }
      // Check inactivity (12 months)
      const lastVisit = updates.lastVisit || current?.lastVisit;
      if (lastVisit) {
        const lastVisitDate = new Date(lastVisit).getTime();
        const now = Date.now();
        if (now - lastVisitDate > 365 * 24 * 60 * 60 * 1000) {
          newIsActive = false;
        } else {
          newIsActive = true;
        }
      }
      
      const finalUpdates = { ...updates, colorTag: newColorTag as CustomerTag, isActive: newIsActive };
      console.log('🔧 CustomersContext: Final update data:', finalUpdates);
      
      // Always enforce colorTag and isActive
      const updated = await updateCustomerInDb(customerId, finalUpdates);
      if (!updated) return false;
      // Auto-mark active/inactive after update
      const now = Date.now();
      const lastVisitMs = new Date(updated.lastVisit).getTime();
      const shouldBeActive = (now - lastVisitMs) < 90 * 24 * 60 * 60 * 1000;
      let final = updated;
      if (updated.isActive !== shouldBeActive) {
        const fixed = await updateCustomerInDb(customerId, { isActive: shouldBeActive });
        final = fixed
          ? {
              ...(fixed as any),
              notes: (fixed as any).notes || [],
              promoHistory: (fixed as any).promoHistory || [],
              payments: (fixed as any).payments || [],
              devices: (fixed as any).devices || []
            }
          : {
              ...(updated as any),
              notes: (updated as any).notes || [],
              promoHistory: (updated as any).promoHistory || [],
              payments: (updated as any).payments || [],
              devices: (updated as any).devices || []
            };
      } else {
        final = {
          ...(updated as any),
          notes: (updated as any).notes || [],
          promoHistory: (updated as any).promoHistory || [],
          payments: (updated as any).payments || [],
          devices: (updated as any).devices || []
        };
      }
      // The setCustomers call is now handled by the useCustomers hook's onSuccess
      return true;
    } catch (error) {
      console.error('Error updating customer:', error);
      return false;
    }
  };

  const markCustomerAsRead = async (customerId: string) => {
    try {
      // Use fallback system user if not authenticated (Neon direct mode)
      const effectiveUser = currentUser || {
        id: 'system',
        email: 'system@neon.direct',
        user_metadata: { name: 'System User' }
      };
      
      // Note: isRead field doesn't exist in the database schema
      // This function is kept for compatibility but does nothing
      // Consider implementing this feature by adding is_read column to customers table
      // or tracking read status in a separate table
      
      console.log('markCustomerAsRead called but not implemented (no is_read column in schema)');
      return true;
    } catch (error) {
      console.error('Error marking customer as read:', error);
      return false;
    }
  };

  const addNote = async (customerId: string, content: string) => {
    // Use fallback system user if not authenticated (Neon direct mode)
    const effectiveUser = currentUser || {
      id: 'system',
      email: 'system@neon.direct',
      user_metadata: { name: 'System User' }
    };
    
    const newNote: CustomerNote = {
      id: `note-${Date.now()}`,
      content,
      createdBy: effectiveUser.id,
      createdAt: new Date().toISOString()
    };
    const dbNote = await addCustomerNote(newNote, customerId);
    if (!dbNote) return false;
    // The setCustomers call is now handled by the useCustomers hook's onSuccess
    return true;
  };

  const sendPromo = async (customerId: string, promo: Omit<PromoMessage, 'id' | 'sentAt' | 'status'>) => {
    // Use fallback system user if not authenticated (Neon direct mode)
    const effectiveUser = currentUser || {
      id: 'system',
      email: 'system@neon.direct',
      user_metadata: { name: 'System User' }
    };
    
    const newPromo: PromoMessage = {
      ...promo,
      id: `promo-${Date.now()}`,
      sentAt: new Date().toISOString(),
      status: 'sent'
    };
    const dbPromo = await addPromoMessage(newPromo, customerId);
    if (!dbPromo) return false;
    // The setCustomers call is now handled by the useCustomers hook's onSuccess
    return true;
  };

  const addPoints = (customerId: string, points: number, reason: string) => {
    // Use fallback system user if not authenticated (Neon direct mode)
    const effectiveUser = currentUser || {
      id: 'system',
      email: 'system@neon.direct',
      user_metadata: { name: 'System User' }
    };
    
    // The setCustomers call is now handled by the useCustomers hook's onSuccess

    // Add note about points
    addNote(customerId, `Added ${points} points - ${reason}`);
    
    return true;
  };

  const getCustomerById = (id: string) => {
    return customers.find(customer => customer.id === id);
  };

  const getCustomersByLoyalty = (level: Customer['loyaltyLevel']) => {
    return customers.filter(customer => customer.loyaltyLevel === level);
  };

  const getInactiveCustomers = (days: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return customers.filter(customer => {
      const lastVisitDate = new Date(customer.lastVisit);
      return lastVisitDate < cutoffDate;
    });
  };

  return (
    <CustomersContext.Provider value={{
      customers,
      loading,
      error,
      refreshCustomers,
      addCustomer,
      updateCustomer,
      markCustomerAsRead,
      addNote,
      sendPromo,
      addPoints,
      getCustomerById,
      getCustomersByLoyalty,
      getInactiveCustomers,
      clearCache
    }}>
      {children}
    </CustomersContext.Provider>
  );
};

// Add default export for better HMR support
export default CustomersProvider;