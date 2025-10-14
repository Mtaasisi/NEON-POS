# 🚀 Inventory Settings - Quick Start

## ⚡ Get Started in 3 Steps

### Step 1️⃣: Run Database Migration (2 minutes)

1. Open [Neon Console](https://console.neon.tech)
2. Go to SQL Editor
3. Copy & paste `CREATE-INVENTORY-SETTINGS-TABLE.sql`
4. Click **Run** ▶️

✅ **Verify:** Run this query - should return ~100 settings
```sql
SELECT COUNT(*) FROM admin_settings WHERE category = 'inventory';
```

---

### Step 2️⃣: Start Your App

```bash
npm run dev
```

---

### Step 3️⃣: Access Inventory Settings

1. Login to your app
2. Go to **Admin** → **Settings**
3. Click **"Inventory"** in the sidebar 📦

---

## 📋 What You Can Configure

### 🔹 Stock Management
- Low stock threshold (default: 10)
- Critical stock threshold (default: 5)
- Auto-reorder settings
- Maximum stock levels

### 🔹 Pricing & Valuation
- Default markup % (default: 30%)
- Price rounding (nearest/up/down)
- Cost calculation (FIFO/LIFO/Average)
- Dynamic pricing

### 🔹 Notifications
- ✉️ Email alerts
- 📱 SMS alerts
- 💬 WhatsApp alerts
- Low stock warnings
- Expiry alerts

### 🔹 Tracking
- Barcode scanning
- Serial numbers
- Batch/Lot tracking
- QR codes
- Location tracking

### 🔹 Multi-Branch
- Branch isolation
- Inter-branch transfers
- Stock visibility
- Auto-sync

### 🔹 Security
- Manager approvals
- Audit logging
- PIN protection
- Historical data locking

### 🔹 Performance
- Data caching
- Lazy loading
- Search indexing
- Analytics

---

## 💻 Use in Your Code

### Quick Hook Usage
```tsx
import { useInventorySettings } from '../hooks/useInventorySettings';

function MyComponent() {
  const { settings, updateSetting } = useInventorySettings();
  
  return (
    <div>
      Low Stock: {settings?.low_stock_threshold}
      <button onClick={() => updateSetting('low_stock_threshold', 20)}>
        Update
      </button>
    </div>
  );
}
```

### Check Stock Alerts
```tsx
const { settings } = useInventorySettings();

if (product.quantity <= settings.low_stock_threshold) {
  showAlert('Low Stock Warning!');
}
```

---

## 🎯 Key Features

✅ **100+ Settings** - Comprehensive inventory control  
✅ **Real-time Save** - Changes persist immediately  
✅ **Export/Import** - Backup and restore settings  
✅ **Type-Safe** - Full TypeScript support  
✅ **Auditable** - All changes logged  
✅ **Mobile Friendly** - Responsive design  

---

## 🔧 Quick Actions

### Reset to Defaults
Click **"Reset"** button in settings page

### Export Settings
Click **"Export"** - Downloads JSON file

### Import Settings  
Click **"Import"** - Select your JSON file

---

## 📞 Need Help?

See full documentation: `INVENTORY-SETTINGS-SETUP-GUIDE.md`

---

**You're all set! 🎉** When you click to change any setting and save, it will:
1. ✅ Save to your Neon database
2. ✅ Update in real-time across your app
3. ✅ Persist after page refresh
4. ✅ Log the change for audit trail

Happy configuring! 📦

