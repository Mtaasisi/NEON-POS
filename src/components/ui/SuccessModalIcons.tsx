/**
 * Pre-configured Success Modal Icons
 * Use these for consistent design across all forms
 */

import React from 'react';
import {
  UserPlus,
  Package,
  DollarSign,
  ShoppingCart,
  Wrench,
  FileText,
  Send,
  CheckCircle,
  Upload,
  Download,
  Calendar,
  Settings,
  Trash2,
  Edit,
  Copy,
  Star,
  TrendingUp,
  Users,
  Bell,
  Gift,
} from 'lucide-react';

// Base icon wrapper for consistency
const IconWrapper: React.FC<{
  children: React.ReactNode;
  gradient: string;
  shadowColor: string;
}> = ({ children, gradient, shadowColor }) => (
  <div
    style={{
      background: gradient,
      borderRadius: '50%',
      width: 80,
      height: 80,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: `0 8px 24px ${shadowColor}`,
    }}
  >
    {children}
  </div>
);

// Icon configurations for different actions
export const SuccessIcons = {
  // CUSTOMER ACTIONS (Purple)
  customerAdded: (
    <IconWrapper
      gradient="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
      shadowColor="rgba(139, 92, 246, 0.3)"
    >
      <UserPlus size={48} color="white" strokeWidth={2.5} />
    </IconWrapper>
  ),

  customerUpdated: (
    <IconWrapper
      gradient="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
      shadowColor="rgba(139, 92, 246, 0.3)"
    >
      <Edit size={48} color="white" strokeWidth={2.5} />
    </IconWrapper>
  ),

  // PRODUCT ACTIONS (Blue)
  productAdded: (
    <IconWrapper
      gradient="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
      shadowColor="rgba(59, 130, 246, 0.3)"
    >
      <Package size={48} color="white" strokeWidth={2.5} />
    </IconWrapper>
  ),

  productUpdated: (
    <IconWrapper
      gradient="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
      shadowColor="rgba(59, 130, 246, 0.3)"
    >
      <Edit size={48} color="white" strokeWidth={2.5} />
    </IconWrapper>
  ),

  // PAYMENT ACTIONS (Green) - Default success color
  paymentReceived: (
    <IconWrapper
      gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
      shadowColor="rgba(16, 185, 129, 0.3)"
    >
      <DollarSign size={48} color="white" strokeWidth={2.5} />
    </IconWrapper>
  ),

  saleCompleted: (
    <IconWrapper
      gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
      shadowColor="rgba(16, 185, 129, 0.3)"
    >
      <ShoppingCart size={48} color="white" strokeWidth={2.5} />
    </IconWrapper>
  ),

  // REPAIR/DEVICE ACTIONS (Orange)
  repairCreated: (
    <IconWrapper
      gradient="linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
      shadowColor="rgba(249, 115, 22, 0.3)"
    >
      <Wrench size={48} color="white" strokeWidth={2.5} />
    </IconWrapper>
  ),

  repairCompleted: (
    <IconWrapper
      gradient="linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
      shadowColor="rgba(249, 115, 22, 0.3)"
    >
      <CheckCircle size={48} color="white" strokeWidth={2.5} />
    </IconWrapper>
  ),

  // DOCUMENT/ORDER ACTIONS (Indigo)
  orderCreated: (
    <IconWrapper
      gradient="linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
      shadowColor="rgba(99, 102, 241, 0.3)"
    >
      <FileText size={48} color="white" strokeWidth={2.5} />
    </IconWrapper>
  ),

  // MESSAGE ACTIONS (Cyan)
  messageSent: (
    <IconWrapper
      gradient="linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)"
      shadowColor="rgba(6, 182, 212, 0.3)"
    >
      <Send size={48} color="white" strokeWidth={2.5} />
    </IconWrapper>
  ),

  notificationSent: (
    <IconWrapper
      gradient="linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)"
      shadowColor="rgba(6, 182, 212, 0.3)"
    >
      <Bell size={48} color="white" strokeWidth={2.5} />
    </IconWrapper>
  ),

  // IMPORT/EXPORT ACTIONS (Slate)
  dataImported: (
    <IconWrapper
      gradient="linear-gradient(135deg, #64748b 0%, #475569 100%)"
      shadowColor="rgba(100, 116, 139, 0.3)"
    >
      <Upload size={48} color="white" strokeWidth={2.5} />
    </IconWrapper>
  ),

  dataExported: (
    <IconWrapper
      gradient="linear-gradient(135deg, #64748b 0%, #475569 100%)"
      shadowColor="rgba(100, 116, 139, 0.3)"
    >
      <Download size={48} color="white" strokeWidth={2.5} />
    </IconWrapper>
  ),

  // APPOINTMENT ACTIONS (Pink)
  appointmentBooked: (
    <IconWrapper
      gradient="linear-gradient(135deg, #ec4899 0%, #db2777 100%)"
      shadowColor="rgba(236, 72, 153, 0.3)"
    >
      <Calendar size={48} color="white" strokeWidth={2.5} />
    </IconWrapper>
  ),

  // SETTINGS ACTIONS (Gray)
  settingsSaved: (
    <IconWrapper
      gradient="linear-gradient(135deg, #6b7280 0%, #4b5563 100%)"
      shadowColor="rgba(107, 114, 128, 0.3)"
    >
      <Settings size={48} color="white" strokeWidth={2.5} />
    </IconWrapper>
  ),

  // DELETE ACTIONS (Red)
  itemDeleted: (
    <IconWrapper
      gradient="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
      shadowColor="rgba(239, 68, 68, 0.3)"
    >
      <Trash2 size={48} color="white" strokeWidth={2.5} />
    </IconWrapper>
  ),

  // COPY/DUPLICATE ACTIONS (Teal)
  itemDuplicated: (
    <IconWrapper
      gradient="linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)"
      shadowColor="rgba(20, 184, 166, 0.3)"
    >
      <Copy size={48} color="white" strokeWidth={2.5} />
    </IconWrapper>
  ),

  // LOYALTY/POINTS ACTIONS (Amber)
  pointsAwarded: (
    <IconWrapper
      gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
      shadowColor="rgba(245, 158, 11, 0.3)"
    >
      <Star size={48} color="white" strokeWidth={2.5} />
    </IconWrapper>
  ),

  rewardRedeemed: (
    <IconWrapper
      gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
      shadowColor="rgba(245, 158, 11, 0.3)"
    >
      <Gift size={48} color="white" strokeWidth={2.5} />
    </IconWrapper>
  ),

  // ANALYTICS/REPORT ACTIONS (Emerald)
  reportGenerated: (
    <IconWrapper
      gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
      shadowColor="rgba(16, 185, 129, 0.3)"
    >
      <TrendingUp size={48} color="white" strokeWidth={2.5} />
    </IconWrapper>
  ),

  // TEAM ACTIONS (Violet)
  teamMemberAdded: (
    <IconWrapper
      gradient="linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)"
      shadowColor="rgba(124, 58, 237, 0.3)"
    >
      <Users size={48} color="white" strokeWidth={2.5} />
    </IconWrapper>
  ),

  // GENERIC SUCCESS (Green)
  success: (
    <IconWrapper
      gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
      shadowColor="rgba(16, 185, 129, 0.3)"
    >
      <CheckCircle size={48} color="white" strokeWidth={2.5} />
    </IconWrapper>
  ),
};

// Color themes for custom implementations
export const SuccessColors = {
  customer: {
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    shadow: 'rgba(139, 92, 246, 0.3)',
    name: 'Purple',
  },
  product: {
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    shadow: 'rgba(59, 130, 246, 0.3)',
    name: 'Blue',
  },
  payment: {
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    shadow: 'rgba(16, 185, 129, 0.3)',
    name: 'Green',
  },
  repair: {
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    shadow: 'rgba(249, 115, 22, 0.3)',
    name: 'Orange',
  },
  order: {
    gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    shadow: 'rgba(99, 102, 241, 0.3)',
    name: 'Indigo',
  },
  message: {
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    shadow: 'rgba(6, 182, 212, 0.3)',
    name: 'Cyan',
  },
  appointment: {
    gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    shadow: 'rgba(236, 72, 153, 0.3)',
    name: 'Pink',
  },
  loyalty: {
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    shadow: 'rgba(245, 158, 11, 0.3)',
    name: 'Amber',
  },
};

export default SuccessIcons;

