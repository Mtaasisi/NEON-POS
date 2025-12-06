# 📱 Inventory WhatsApp Notifications

## ✅ Implementation Complete

Your app now automatically sends WhatsApp notifications when inventory items are low on stock!

---

## 🎯 How It Works

### Automatic Detection
The system automatically checks for low stock after:
1. **Sales** - When items are sold and stock is reduced
2. **Stock Adjustments** - When stock is manually adjusted (added/removed/set)

### Alert Levels
The system detects three alert levels:

1. **Out of Stock** 🔴
   - Triggered when: `quantity === 0`
   - Message: "OUT OF STOCK - Immediate restocking required!"

2. **Critical** 🟠
   - Triggered when: `quantity <= min_quantity * 0.25`
   - Message: "CRITICAL - Stock is very low!"

3. **Low Stock** 🟡
   - Triggered when: `quantity <= min_quantity`
   - Message: "LOW STOCK - Consider restocking soon."

### Smart Routing
- Uses **smart notification service** (WhatsApp first, SMS fallback)
- Automatically checks if recipient number is on WhatsApp
- Falls back to SMS if WhatsApp is not available

### Cooldown Protection
- **1 hour cooldown** per product variant
- Prevents spam notifications for the same item
- Resets after successful notification

---

## ⚙️ Configuration

### Enable/Disable Notifications

**Location**: Admin Settings → Inventory Settings

**Settings to Configure**:
1. `whatsapp_notifications` - Enable/disable WhatsApp notifications
2. `low_stock_alerts` - Enable low stock alerts
3. `out_of_stock_alerts` - Enable out of stock alerts
4. `low_stock_threshold` - Default threshold (default: 10)
5. `critical_stock_threshold` - Critical threshold (default: 5)

### Set Notification Recipients

**Option 1: Via Admin Settings** (Recommended)
1. Go to Admin Settings → Inventory Settings
2. Set `low_stock_notification_phones` to a JSON array:
   ```json
   ["+1234567890", "+0987654321"]
   ```

**Option 2: Automatic Fallback**
If no recipients are configured, the system will use:
1. Business phone number (from `business_info` table)
2. Business WhatsApp number
3. Admin users' phone numbers

---

## 📋 Notification Message Format

```
🔴 *Low Stock Alert*

*Product:* iPhone 15 Pro (128GB)
*Current Stock:* 0
*Minimum Stock:* 5

⚠️ *OUT OF STOCK* - Immediate restocking required!
```

---

## 🔧 Technical Details

### Service Location
- **File**: `src/services/inventoryNotificationService.ts`
- **Export**: `inventoryNotificationService`

### Integration Points

1. **After Sales** (`src/lib/saleProcessingService.ts`)
   - Checks all variants that were sold
   - Sends notifications if any are low on stock

2. **After Stock Adjustments** (`src/features/lats/components/inventory/StockAdjustModal.tsx`)
   - Checks the adjusted variant
   - Sends notification if low on stock

### Key Methods

```typescript
// Check and send notification for a single variant
await inventoryNotificationService.sendLowStockNotification(variantId);

// Check multiple variants at once
await inventoryNotificationService.checkAndNotifyLowStock([variantId1, variantId2]);

// Clear cooldown (for testing)
inventoryNotificationService.clearCooldown(variantId);
```

---

## 🧪 Testing

### Test Low Stock Notification

1. **Set up a test product**:
   - Create a product with a variant
   - Set `min_quantity` to 5
   - Set `quantity` to 2

2. **Enable notifications**:
   - Go to Admin Settings → Inventory Settings
   - Enable `whatsapp_notifications`
   - Enable `low_stock_alerts`
   - Set notification recipient phone number

3. **Trigger notification**:
   - Make a sale that reduces stock below `min_quantity`
   - OR adjust stock to below `min_quantity`
   - You should receive a WhatsApp notification

### Clear Cooldown for Testing

```typescript
import { inventoryNotificationService } from './services/inventoryNotificationService';

// Clear cooldown to test immediately
inventoryNotificationService.clearCooldown(variantId);
```

---

## 📊 Notification Flow

```
Stock Update (Sale/Adjustment)
        ↓
Check Inventory Settings
        ↓
    Enabled?
        ↓
    YES → Check Cooldown
        ↓
    Not in Cooldown?
        ↓
    YES → Check Stock Level
        ↓
    Low Stock?
        ↓
    YES → Get Recipients
        ↓
    Send WhatsApp (Smart Routing)
        ↓
    Update Cooldown
```

---

## 🎛️ Settings Reference

### Inventory Settings (Admin Settings → Inventory)

| Setting | Default | Description |
|---------|---------|-------------|
| `whatsapp_notifications` | `false` | Enable WhatsApp notifications |
| `low_stock_alerts` | `true` | Enable low stock alerts |
| `out_of_stock_alerts` | `true` | Enable out of stock alerts |
| `low_stock_threshold` | `10` | Default low stock threshold |
| `critical_stock_threshold` | `5` | Critical stock threshold |
| `low_stock_notification_phones` | `[]` | Array of phone numbers to notify |

---

## 🚨 Troubleshooting

### Notifications Not Sending?

1. **Check Settings**:
   - Verify `whatsapp_notifications` is enabled
   - Verify `low_stock_alerts` or `out_of_stock_alerts` is enabled

2. **Check Recipients**:
   - Ensure notification recipients are configured
   - Check phone numbers are valid

3. **Check Cooldown**:
   - Wait 1 hour between notifications for same variant
   - Or clear cooldown for testing

4. **Check Stock Level**:
   - Verify item is actually low on stock
   - Check `min_quantity` is set correctly

5. **Check Logs**:
   - Look for console messages:
     - `📱 WhatsApp notifications disabled`
     - `📱 Notification cooldown active`
     - `📱 Sent X low stock WhatsApp notification(s)`

### Notification Sent but Not Received?

1. **Check WhatsApp Service**:
   - Verify WhatsApp API is configured
   - Check API credentials

2. **Check Smart Routing**:
   - System may have fallen back to SMS
   - Check SMS logs if WhatsApp fails

3. **Check Phone Number**:
   - Verify recipient phone number is correct
   - Ensure number is registered on WhatsApp

---

## ✅ Summary

- ✅ Automatic low stock detection
- ✅ WhatsApp notifications (with SMS fallback)
- ✅ Configurable alert levels
- ✅ Cooldown protection
- ✅ Multiple recipient support
- ✅ Integrated with sales and stock adjustments

**Next Steps**:
1. Enable notifications in Admin Settings → Inventory Settings
2. Configure notification recipient phone numbers
3. Test with a low stock item
