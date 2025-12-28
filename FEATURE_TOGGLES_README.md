# Feature Toggle System

This document explains how to use the new feature toggle system that allows you to control which features are enabled in production builds.

## Overview

The feature toggle system provides a way to conditionally enable/disable features based on the environment:

- **Development**: All features are enabled by default for testing
- **Production**: Only explicitly enabled features are available to users

## How It Works

### 1. Feature Definitions

Features are defined in `src/types/featureToggles.ts` with the following properties:

```typescript
interface FeatureToggle {
  key: string;              // Unique identifier
  name: string;             // Display name
  description: string;      // Feature description
  category: 'core' | 'advanced' | 'experimental' | 'beta';
  defaultEnabled: boolean;  // Default state
  productionOnly?: boolean; // Only show in production
  developmentOnly?: boolean; // Only show in development
  dependencies?: string[];   // Required features
  requiresRestart?: boolean; // Needs app restart
}
```

### 2. Admin Interface

Access feature toggles through:
**Admin Settings → Feature Toggles**

The interface shows:
- ✅ Core Features (essential functionality)
- 🔵 Advanced Features (enhanced capabilities)
- 🟠 Experimental Features (cutting-edge, potentially unstable)
- 🟣 Beta Features (testing phase)

### 3. Using Feature Guards

#### Method 1: FeatureGuard Component
```tsx
import { FeatureGuard } from '../components/FeatureGuard';

<FeatureGuard
  feature="ai_assistant"
  fallback={<div>AI Assistant is disabled</div>}
>
  <AIAssistantComponent />
</FeatureGuard>
```

#### Method 2: useFeatureToggle Hook
```tsx
import { useFeatureToggle } from '../components/FeatureGuard';

const MyComponent = () => {
  const aiEnabled = useFeatureToggle('ai_assistant');

  return (
    <div>
      {aiEnabled && <AIAssistantComponent />}
    </div>
  );
};
```

#### Method 3: useMultipleFeatures Hook
```tsx
import { useMultipleFeatures } from '../components/FeatureGuard';

const MyComponent = () => {
  const features = useMultipleFeatures('ai_assistant', 'advanced_analytics');

  return (
    <div>
      {features.ai_assistant && <AIAssistantComponent />}
      {features.advanced_analytics && <AnalyticsDashboard />}
    </div>
  );
};
```

#### Method 4: FeatureToggle Render Prop
```tsx
import { FeatureToggle } from '../components/FeatureGuard';

<FeatureToggle feature="customer_portal">
  {(isEnabled) => (
    isEnabled ? <CustomerPortal /> : <PortalDisabledMessage />
  )}
</FeatureToggle>
```

## Available Features

### Core Features (Always Recommended)
- **Loyalty Program**: Customer rewards and points system
- **Inventory Management**: Stock tracking and alerts
- **Customer Portal**: Self-service customer access
- **WhatsApp Integration**: Automated messaging
- **Payment Processing**: Credit card and mobile payments

### Advanced Features
- **AI Assistant**: Gemini-powered customer support
- **Advanced Analytics**: Detailed business reporting
- **Bulk Operations**: Import/export functionality
- **Multi-Branch Support**: Multiple store locations
- **Barcode Scanning**: Mobile inventory scanning

### Experimental Features
- **AR Try-On**: Augmented reality product visualization
- **Voice Commands**: Voice-activated POS
- **Predictive Pricing**: AI-powered pricing suggestions
- **Blockchain Tracking**: Immutable product tracking

### Beta Features
- **Subscription Billing**: Recurring payment management
- **Marketplace Integration**: External marketplace connections
- **Advanced Workflow**: Customizable business processes

## Configuration

Features are stored in the database under the `system.feature_toggles` category. The system automatically:

1. Initializes with default values on first run
2. Saves changes to the database
3. Applies toggles based on environment
4. Handles feature dependencies

## Environment Behavior

### Development Mode
- All features enabled by default
- Toggle settings are ignored
- Full functionality available for testing

### Production Mode
- Only enabled features are available
- Toggle settings control user access
- Disabled features are hidden from UI

## Adding New Features

1. **Define the feature** in `src/types/featureToggles.ts`:
```typescript
{
  key: 'my_new_feature',
  name: 'My New Feature',
  description: 'Description of what this feature does',
  category: 'advanced',
  defaultEnabled: false,
}
```

2. **Use feature guards** in your components:
```tsx
<FeatureGuard feature="my_new_feature">
  <MyNewFeatureComponent />
</FeatureGuard>
```

3. **Test in development** - feature will be enabled
4. **Configure in production** via Admin Settings

## Best Practices

1. **Use descriptive feature keys** (snake_case)
2. **Provide clear descriptions** for admin understanding
3. **Set appropriate categories** (core → beta)
4. **Handle disabled states gracefully** with good UX
5. **Test feature guards** in both environments
6. **Document feature dependencies** if any

## Troubleshooting

### Feature Not Showing
- Check if `productionOnly` or `developmentOnly` is set
- Verify feature is defined in `FEATURE_TOGGLES`
- Check browser console for errors

### Feature Not Working
- Confirm feature is enabled in Admin Settings
- Check for dependency requirements
- Verify database connectivity for toggle persistence

### Performance Issues
- Feature guards add minimal overhead
- Consider lazy loading for heavy features
- Use `showLoading` prop for async checks

## API Reference

### FeatureToggleService
```typescript
// Check if feature is enabled
featureToggleService.isEnabled('feature_key')

// Save toggle state
await featureToggleService.saveToggleState('feature_key', true)

// Get all toggle states
featureToggleService.getAllToggleStates()

// Check feature dependencies
featureToggleService.canEnableFeature('feature_key')
```

This system provides complete control over feature rollout while maintaining development flexibility and production safety.
