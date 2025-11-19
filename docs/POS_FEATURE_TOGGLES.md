# POS Feature Toggles System

## Overview

The POS system now includes a comprehensive feature toggle system that allows you to enable or disable optional features based on your business needs. This provides flexibility in customizing the POS experience without removing functionality from the codebase.

## Available Features

### 1. **Delivery Management** 🚚
- **Description**: Enable delivery orders, driver assignment, and delivery tracking features
- **Key Capabilities**:
  - Driver Tracking
  - Delivery Areas
  - Fee Management
- **When Enabled**: Delivery options will appear in the sales flow
- **Default State**: Disabled

### 2. **Loyalty Program** 💎
- **Description**: Reward customers with points, track loyalty tiers, and offer member discounts
- **Key Capabilities**:
  - Points System
  - Member Discounts
  - Rewards Management
- **When Enabled**: Loyalty features appear in POS and customer interfaces
- **Default State**: Enabled

### 3. **Customer Profiles** 👤
- **Description**: Save customer information, purchase history, and preferences for personalized service
- **Key Capabilities**:
  - Purchase History
  - Contact Information Management
  - Customer Preferences
- **When Enabled**: Customer selection and management available in POS
- **Default State**: Enabled

### 4. **Payment Tracking** 💰
- **Description**: Track partial payments, payment plans, and outstanding balances for customers
- **Key Capabilities**:
  - Partial Payments
  - Payment Plans
  - Balance Tracking
- **When Enabled**: Payment tracking modal and features enabled
- **Default State**: Enabled

### 5. **Dynamic Pricing** ⚡
- **Description**: Enable time-based pricing, bulk discounts, and promotional pricing rules
- **Key Capabilities**:
  - Happy Hour Pricing
  - Bulk Discounts
  - Promotional Rules
- **When Enabled**: Dynamic pricing rules are applied in sales
- **Default State**: Enabled

## How to Use

### Accessing Feature Settings

1. Open the POS system
2. Click on **Settings** (gear icon)
3. Navigate to the **Features** tab
4. Toggle features on/off as needed
5. Click **Save Settings** to apply changes

### Feature States

Each feature has a toggle switch with two states:
- **Active** (Green) - Feature is enabled and functional
- **Inactive** (Gray) - Feature is disabled and hidden from UI

### Important Notes

- **Changes Take Effect Immediately**: After saving, the POS interface updates to show/hide features
- **Persisted Settings**: Feature states are saved to browser localStorage and persist across sessions
- **User Feedback**: When users try to access a disabled feature, they receive a helpful error message directing them to enable it in settings

## Technical Implementation

### Storage

Features are stored in browser `localStorage` under the key `lats-pos-features`:

```javascript
{
  "enableDelivery": false,
  "enableLoyaltyProgram": true,
  "enableCustomerProfiles": true,
  "enablePaymentTracking": true,
  "enableDynamicPricing": true
}
```

### Hook Usage

The `usePOSFeatures()` hook provides access to feature states:

```typescript
import { usePOSFeatures } from '../hooks/usePOSFeatures';

const MyComponent = () => {
  const { 
    features,
    isDeliveryEnabled, 
    isLoyaltyEnabled,
    isCustomerProfilesEnabled,
    isPaymentTrackingEnabled,
    isDynamicPricingEnabled
  } = usePOSFeatures();

  // Use the checkers
  if (isDeliveryEnabled()) {
    // Show delivery options
  }
};
```

### Conditional Rendering

Features are conditionally rendered based on their enabled state:

```tsx
{/* Only render if feature is enabled */}
{isDeliveryEnabled() && (
  <DeliverySection
    isOpen={showDeliverySection}
    onClose={() => setShowDeliverySection(false)}
  />
)}
```

### Feature Guards

Functions that trigger feature modals include guards:

```typescript
const handleShowDeliverySection = () => {
  if (!isDeliveryEnabled()) {
    toast.error('Delivery Management feature is disabled. Enable it in POS Settings > Features');
    return;
  }
  setShowDeliverySection(true);
};
```

## Files Modified

1. **`src/features/lats/hooks/usePOSFeatures.ts`** (NEW)
   - Custom hook for managing feature toggles
   - Provides feature state and checker functions

2. **`src/features/lats/components/pos/FeaturesTab.tsx`**
   - Settings UI for toggling features
   - Saves to localStorage

3. **`src/features/lats/pages/POSPageOptimized.tsx`**
   - Integrated feature toggles throughout POS
   - Added conditional rendering for features
   - Added feature guards for modal triggers

## Testing the Features

### Test Plan

1. **Disable a Feature**:
   - Go to Settings > Features
   - Toggle a feature off (e.g., Delivery Management)
   - Save settings
   - Try to access the feature from POS UI
   - Expected: Error message appears

2. **Enable a Feature**:
   - Go to Settings > Features
   - Toggle a feature on (e.g., Customer Profiles)
   - Save settings
   - Access the feature from POS UI
   - Expected: Feature works normally

3. **Persistence Test**:
   - Toggle some features
   - Save settings
   - Refresh the page
   - Expected: Feature states persist

## Troubleshooting

### Features Not Working After Enabling

**Solution**: Clear browser cache and localStorage, then re-enable features:
```javascript
localStorage.removeItem('lats-pos-features');
```

### Toggle Not Saving

**Solution**: Check browser console for errors. Ensure localStorage is available and not full.

### Features Still Visible When Disabled

**Solution**: Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R) to clear cached components.

## Future Enhancements

Potential improvements to the feature toggle system:

1. **Database Storage**: Store feature preferences in database for multi-device sync
2. **Role-Based Features**: Different feature sets for different user roles
3. **Feature Analytics**: Track which features are most used
4. **A/B Testing**: Test different feature combinations
5. **Feature Locks**: Require certain permissions to enable features
6. **Migration Tool**: Bulk enable/disable features for all users

## Support

For issues or questions about feature toggles:
1. Check this documentation
2. Review console logs for error messages
3. Verify localStorage contains correct feature states
4. Contact system administrator if issues persist

---

**Last Updated**: October 27, 2025
**Version**: 1.0.0

