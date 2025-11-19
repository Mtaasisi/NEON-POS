// SupplierCard component - Displays supplier in a card format with view details option
import React from 'react';
import { Building2, Mail, Phone, MapPin, Star, MoreVertical, Eye, Edit2, Trash2, Globe } from 'lucide-react';
import { getCountryFlag, formatCountryDisplay } from '../../../../utils/countryFlags';

interface Supplier {
  id: string;
  name: string;
  company_name?: string;
  description?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  payment_terms?: string;
  preferred_currency?: string;
  exchange_rate?: number;
  notes?: string;
  rating?: number;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

interface SupplierCardProps {
  supplier: Supplier;
  onView: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
}

const SupplierCard: React.FC<SupplierCardProps> = ({
  supplier,
  onView,
  onEdit,
  onDelete
}) => {
  const [showMenu, setShowMenu] = React.useState(false);

  // Render rating stars
  const renderRating = (rating?: number) => {
    if (!rating) return null;
    
    const stars = [];
    const fullStars = Math.floor(rating);
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />);
    }
    const emptyStars = 5 - fullStars;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-3 h-3 text-gray-300" />);
    }
    
    return (
      <div className="flex items-center gap-1">
        {stars}
        <span className="text-xs text-gray-600 ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden group">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-md">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">{supplier.name}</h4>
              {supplier.company_name && (
                <p className="text-xs text-gray-600 truncate">{supplier.company_name}</p>
              )}
            </div>
          </div>
          
          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-white/50 rounded-lg transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>
            
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={() => {
                      onView(supplier);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                  <button
                    onClick={() => {
                      onEdit(supplier);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      onDelete(supplier);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Rating */}
        <div className="flex items-center gap-3 mt-3">
          {renderRating(supplier.rating)}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3">
        {/* Description */}
        {supplier.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{supplier.description}</p>
        )}

        {/* Contact Info */}
        <div className="space-y-2">
          {supplier.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="truncate">{supplier.email}</span>
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{supplier.phone}</span>
            </div>
          )}
          {(supplier.city || supplier.country) && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="flex items-center gap-1.5">
                {supplier.country && (
                  <span className="text-lg leading-none">{getCountryFlag(supplier.country)}</span>
                )}
                <span>
                  {supplier.city && supplier.country 
                    ? `${supplier.city}, ${supplier.country}` 
                    : supplier.city || supplier.country
                  }
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Currency Info */}
        {supplier.preferred_currency && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Currency:</span>
              <span className="font-medium text-gray-900">{supplier.preferred_currency}</span>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <button
          onClick={() => onView(supplier)}
          className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          View Details
        </button>
      </div>
    </div>
  );
};

export default SupplierCard;

