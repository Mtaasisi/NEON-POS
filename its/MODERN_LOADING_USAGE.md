# Modern Loading Spinner - Usage Guide

## Overview
A consistent, modern loading spinner has been implemented across the app using glassmorphism design.

## Component Location
`src/components/ui/ModernLoadingOverlay.tsx`

## Basic Usage

### 1. Import the component
```typescript
import ModernLoadingOverlay from '../../../../components/ui/ModernLoadingOverlay';
```

### 2. Use in your component

#### Fullscreen Loading (Default)
```typescript
{isLoading && <ModernLoadingOverlay />}
```

#### With Custom Message
```typescript
{isLoading && <ModernLoadingOverlay message="Loading products..." />}
```

#### Different Colors
```typescript
{isLoading && <ModernLoadingOverlay color="green" />}
{isLoading && <ModernLoadingOverlay color="orange" />}
{isLoading && <ModernLoadingOverlay color="purple" />}
```

#### Inline Loading (for cards/containers)
```typescript
{isLoading && (
  <ModernLoadingOverlay 
    fullscreen={false} 
    size={60}
    message="Loading data..."
  />
)}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `message` | `string` | `undefined` | Optional message to display below spinner |
| `size` | `number` | `80` | Size of the spinner in pixels |
| `color` | `'blue' \| 'green' \| 'purple' \| 'orange' \| 'white'` | `'blue'` | Color theme of the spinner |
| `fullscreen` | `boolean` | `true` | Whether to show as fullscreen overlay |
| `zIndex` | `number` | `9999` | Custom z-index for the overlay |

## Examples

### Example 1: Page Loading
```typescript
const MyPage = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div>
      {isLoading && <ModernLoadingOverlay />}
      {/* Your page content */}
    </div>
  );
};
```

### Example 2: Data Fetching
```typescript
const MyComponent = () => {
  const [isFetching, setIsFetching] = useState(false);

  const fetchData = async () => {
    setIsFetching(true);
    try {
      // Fetch data
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div>
      {isFetching && <ModernLoadingOverlay message="Fetching data..." />}
      {/* Your component content */}
    </div>
  );
};
```

### Example 3: Card Loading
```typescript
const MyCard = () => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="bg-white rounded-lg p-6">
      {isLoading ? (
        <ModernLoadingOverlay 
          fullscreen={false} 
          size={50}
          color="blue"
        />
      ) : (
        <div>Card content</div>
      )}
    </div>
  );
};
```

## Already Updated Components

✅ **EnhancedInventoryTab.tsx** - Product loading
✅ **PurchaseOrdersTab.tsx** - Purchase orders loading
✅ **ProductModal.tsx** - Image loading (uses CircularProgress directly)
✅ **LoginPage.tsx** - Authentication check & login loading
✅ **CircularProgress.tsx** - Updated blue gradient (pure blue, no green)

## Migration Guide

### Old Pattern (Replace this):
```typescript
<div className="flex items-center justify-center py-12">
  <CircularProgress size={64} strokeWidth={5} color="blue" />
  <p className="text-gray-600">Loading...</p>
</div>
```

### New Pattern (Use this):
```typescript
<ModernLoadingOverlay />
```

or with message:
```typescript
<ModernLoadingOverlay message="Loading..." />
```

## Design Features

- 🎨 Modern glassmorphism design
- 🌈 Subtle gradient background on card
- 🔵 Pure blue spinner gradient (no green)
- ⚡ Instant appearance (no fade-in animation)
- 📱 Responsive and works on all screen sizes
- 🎯 Consistent across entire app

## Notes

- The loading overlay appears instantly without fade-in animation for better perceived performance
- The spinner uses a pure blue gradient (blue-500 through blue-800) without green tones
- Default z-index is 9999 to ensure it appears above all content
- The glassmorphism effect uses minimal blur for sharpness

