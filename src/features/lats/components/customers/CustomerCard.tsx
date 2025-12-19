// CustomerCard component for LATS module
import React from 'react';
import { LATS_CLASSES } from '../../tokens';
import GlassCard from '../../../shared/components/ui/GlassCard';
import GlassButton from '../../../shared/components/ui/GlassButton';
import GlassBadge from '../../../shared/components/ui/GlassBadge';
import { t } from '../../lib/i18n/t';
import { format } from '../../lib/format';
import { Customer } from '../../../types';

interface CustomerCardProps {
  customer: Customer;
  onEdit?: (customer: Customer) => void;
  onView?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
  onContact?: (customer: Customer, method: string) => void;
  onSelect?: (customer: Customer) => void;
  selected?: boolean;
  variant?: 'default' | 'compact' | 'minimal';
  showActions?: boolean;
  className?: string;
}

const CustomerCard: React.FC<CustomerCardProps> = ({
  customer,
  onEdit,
  onView,
  onDelete,
  onContact,
  onSelect,
  selected = false,
  variant = 'default',
  showActions = true,
  className = ''
}) => {
  // Get customer status based on real data
  const getCustomerStatus = () => {
    if (!customer.isActive) return 'inactive';
    if (customer.colorTag === 'vip' || customer.loyaltyLevel === 'platinum') return 'vip';
    if (customer.loyaltyLevel === 'gold') return 'premium';
    if (customer.loyaltyLevel === 'silver' || customer.loyaltyLevel === 'bronze') return 'regular';
    if (customer.colorTag === 'new') return 'new';
    return 'regular';
  };

  const customerStatus = getCustomerStatus();

  // Get status badge
  const getStatusBadge = () => {
    switch (customerStatus) {
      case 'vip':
        return <GlassBadge variant="warning" size="sm">VIP Customer</GlassBadge>;
      case 'premium':
        return <GlassBadge variant="primary" size="sm">Premium</GlassBadge>;
      case 'regular':
        return <GlassBadge variant="success" size="sm">Regular</GlassBadge>;
      case 'new':
        return <GlassBadge variant="info" size="sm">New Customer</GlassBadge>;
      case 'inactive':
        return <GlassBadge variant="error" size="sm">Inactive</GlassBadge>;
      default:
        return null;
    }
  };

  // Get contact icon
  const getContactIcon = (method: string) => {
    switch (method) {
      case 'phone':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        );
      case 'email':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'whatsapp':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
          </svg>
        );
      case 'sms':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
    }
  };

  // Handle contact
  const handleContact = (method: string) => {
    onContact?.(customer, method);
  };

  // Handle selection
  const handleSelect = () => {
    onSelect?.(customer);
  };

  // Compact variant
  if (variant === 'compact') {
    return (
      <GlassCard className={`p-4 hover:bg-lats-surface/50 transition-colors ${selected ? 'ring-2 ring-lats-primary bg-lats-primary/5' : ''} ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {onSelect && (
              <input
                type="checkbox"
                checked={selected}
                onChange={handleSelect}
                className="rounded border-lats-glass-border text-lats-primary focus:ring-lats-primary/50"
              />
            )}
            
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {customer.profileImage ? (
                <img
                  src={customer.profileImage}
                  alt={customer.name}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 bg-lats-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-lats-primary">
                    {customer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-lats-text truncate">{customer.name}</h3>
                  {getStatusBadge()}
                </div>
                <div className="text-sm text-lats-text-secondary truncate">
                  {customer.phone} • {customer.city || 'No location'}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <GlassBadge variant="primary" size="xs">
                    {customer.points || 0} pts
                  </GlassBadge>
                  <span className="text-xs text-lats-text-secondary">
                    {format.currency(customer.totalSpent || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {showActions && (
            <div className="flex items-center gap-1">
              {onView && (
                <GlassButton
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(customer)}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  }
                />
              )}
              {onEdit && (
                <GlassButton
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(customer)}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  }
                />
              )}
            </div>
          )}
        </div>
      </GlassCard>
    );
  }

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <div className={`p-2 hover:bg-lats-surface/30 rounded-lats-radius-md transition-colors ${selected ? 'bg-lats-primary/10 ring-1 ring-lats-primary' : ''} ${className}`}>
        <div className="flex items-center gap-2">
          {onSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={handleSelect}
              className="rounded border-lats-glass-border text-lats-primary focus:ring-lats-primary/50"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-lats-text truncate">{customer.name}</div>
            <div className="text-sm text-lats-text-secondary truncate">{customer.phone}</div>
          </div>
          {getStatusBadge()}
        </div>
      </div>
    );
  }

  // Default variant - matching tablet POS design
  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white shadow-sm hover:shadow-lg hover:scale-[1.02] hover:border-blue-300 cursor-pointer transition-all duration-300 p-4">
      {/* Avatar and Name */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
          {customer.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 truncate">
            {customer.name || 'Unnamed customer'}
          </h3>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-1 mb-3">
        {customer.phone && (
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-phone">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
            <span className="truncate">{customer.phone}</span>
          </div>
        )}
        {customer.email && (
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-mail">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <span className="truncate">{customer.email}</span>
          </div>
        )}
      </div>

      {/* Stats (if available) */}
      {(customer.points !== undefined || customer.totalSpent !== undefined) && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
          <div className="text-center">
            <div className="text-xs text-gray-500">Points</div>
            <div className="font-semibold text-gray-900 text-sm">{customer.points || 0}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Spent</div>
            <div className="font-semibold text-gray-900 text-sm">
              TSh {customer.totalSpent ? customer.totalSpent.toLocaleString() : '0'}
            </div>
          </div>
        </div>
      )}

      {/* Select Button */}
      <button className="w-full mt-3 bg-blue-600 text-white py-2 px-3 rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors">
        Select Customer
      </button>
    </div>
  );
};

export default CustomerCard;
