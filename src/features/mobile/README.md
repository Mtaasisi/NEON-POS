# Mobile POS Application

A modern, mobile-optimized interface for your POS system with a clean and intuitive design inspired by modern business applications.

## 🚀 Features

### Current Pages
- **Dashboard** - Overview with sales statistics, alerts, and recent activity
- **POS** - Point of Sale interface for processing transactions
- **Inventory** - Product management with search, filters, and stock tracking
- **Clients** - Customer management and contact information
- **More** - Settings, reports, and additional features

## 📱 Design Features

- **Bottom Navigation** - Easy thumb-friendly navigation
- **Floating Action Button (FAB)** - Quick access to create new items
- **Modern UI** - Clean cards, smooth transitions, and intuitive layouts
- **Status Indicators** - Color-coded status badges for inventory levels
- **Search & Filter** - Fast product and customer search
- **Responsive Design** - Optimized for mobile screens

## 🎨 UI Components

### Layout Components
- `MobileLayout` - Main layout with bottom navigation and FAB
- `MobileHeader` - Page headers with back button support

### UI Components
- `MobileCard` - Reusable card component with header and body
- `MobileButton` - Customizable button with variants (primary, secondary, outline, danger)

## 🛣️ Routes

All mobile routes are under the `/mobile` path:

- `/mobile` or `/mobile/dashboard` - Dashboard home
- `/mobile/pos` - Point of Sale
- `/mobile/inventory` - Inventory management
- `/mobile/clients` - Client management
- `/mobile/more` - Settings and more options

## 🔧 Usage

### Accessing the Mobile App

1. **Web Browser**: Navigate to `http://localhost:5173/mobile` (development)
2. **Android App**: Build with Capacitor to run as a native Android app

### Development

```bash
# Run development server
npm run dev

# Access mobile interface
# Open browser to http://localhost:5173/mobile
```

### Building for Android

```bash
# Build the web app
npm run build

# Sync with Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android

# Or run directly on device
npx cap run android
```

## 📲 Android Configuration

The app is already configured with Capacitor:
- App ID: `com.lats.pos`
- App Name: `LATS-POS`
- Web Directory: `dist`

## 🎯 Next Steps

### Recommended Additions
1. **Create/Edit Forms** - Add product/customer creation screens
2. **Reports** - Add mobile-optimized reports view
3. **Settings** - Complete settings implementation
4. **Offline Support** - Implement offline data caching
5. **Push Notifications** - Add notification support for alerts
6. **Barcode Scanner** - Integrate camera for barcode scanning
7. **Receipt Printing** - Bluetooth printer integration

## 🔐 Authentication

The mobile routes are protected with the same authentication system as the main app. Users must be logged in to access mobile pages.

## 💡 Tips

- **Navigation**: The active tab is highlighted in blue
- **FAB Button**: Click the blue + button to create new items (implement as needed)
- **Search**: Use the search bar for quick product/customer lookup
- **Filters**: Toggle filters for better inventory browsing

## 🎨 Customization

### Colors
The app uses a consistent color scheme:
- Primary: Blue (#3B82F6)
- Success: Green (#10B981)
- Warning: Yellow (#F59E0B)
- Danger: Red (#EF4444)

### Typography
- Headings: Bold, Sans-serif
- Body: Regular, Sans-serif
- Small text: 12px for metadata and labels

## 📝 Development Notes

- All pages use mock data currently
- Replace mock data with real API calls from your existing services
- Components are fully typed with TypeScript
- Uses Tailwind CSS for styling
- Follows React best practices with hooks and functional components

## 🐛 Known Limitations

- Create/Edit functionality needs to be implemented
- Some "More" menu items navigate to placeholder routes
- Real-time updates not yet implemented
- Needs integration with existing POS backend services

## 📚 File Structure

```
src/features/mobile/
├── components/
│   ├── MobileLayout.tsx      # Main layout with navigation
│   ├── MobileHeader.tsx       # Reusable header component
│   ├── MobileButton.tsx       # Button component
│   ├── MobileCard.tsx         # Card component
│   └── index.ts               # Component exports
├── pages/
│   ├── MobileDashboard.tsx    # Dashboard page
│   ├── MobilePOS.tsx          # POS page
│   ├── MobileInventory.tsx    # Inventory page
│   ├── MobileClients.tsx      # Clients page
│   ├── MobileMore.tsx         # More/Settings page
│   └── index.ts               # Page exports
├── index.ts                   # Main exports
└── README.md                  # This file
```

## 🤝 Contributing

When adding new features:
1. Follow the existing component patterns
2. Use TypeScript for type safety
3. Keep mobile UX in mind (touch targets, spacing)
4. Test on actual mobile devices when possible

---

Built with ❤️ for LATS POS System

