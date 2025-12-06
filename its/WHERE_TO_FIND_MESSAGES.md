# 📥 Where to Find Received WhatsApp Messages

## 🎯 3 Ways to View Incoming Messages

---

## ✅ Method 1: Database Query (Available NOW!)

### View All Incoming Messages:

```bash
psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -c "
SELECT 
  from_phone,
  message_text,
  is_read,
  replied,
  created_at
FROM whatsapp_incoming_messages 
ORDER BY created_at DESC 
LIMIT 20;
"
```

### View with Customer Names:

```bash
psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -c "
SELECT 
  c.name as customer_name,
  m.from_phone,
  m.message_text,
  m.is_read,
  m.replied,
  m.created_at
FROM whatsapp_incoming_messages m
LEFT JOIN customers c ON m.customer_id = c.id
ORDER BY m.created_at DESC 
LIMIT 20;
"
```

### View Unread Messages Only:

```bash
psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -c "
SELECT 
  from_phone,
  message_text,
  created_at
FROM whatsapp_incoming_messages 
WHERE is_read = false
ORDER BY created_at DESC;
"
```

### View Messages from Specific Customer:

```bash
psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -c "
SELECT 
  from_phone,
  message_text,
  created_at
FROM whatsapp_incoming_messages 
WHERE from_phone = '255746605561'  -- Replace with customer phone
ORDER BY created_at DESC;
"
```

---

## ✅ Method 2: WhatsApp Inbox Page (After you add it)

I created a complete Inbox UI for you!

**File:** `src/features/whatsapp/pages/WhatsAppInboxPage.tsx`

### To Add to Your Website:

1. **Import in your routes** (e.g., `src/App.tsx` or routing file):

```typescript
import WhatsAppInboxPage from './features/whatsapp/pages/WhatsAppInboxPage';

// Add route:
<Route path="/whatsapp/inbox" element={<WhatsAppInboxPage />} />
```

2. **Add menu link** in your navigation:

```typescript
{
  name: 'WhatsApp Inbox',
  path: '/whatsapp/inbox',
  icon: MessageCircle
}
```

3. **Rebuild and upload:**

```bash
npm run build
# Upload dist/ to Hostinger
```

### Features of Inbox Page:

- ✅ View all incoming messages
- ✅ Filter: All / Unread / Need Reply
- ✅ Reply to messages directly
- ✅ Mark as read
- ✅ Link to customer details
- ✅ Auto-refresh every 10 seconds
- ✅ Shows customer names
- ✅ View media attachments

**Access at:** `https://dukani.site/whatsapp/inbox`

---

## ✅ Method 3: Customer Detail View (Widget)

I also created a widget to show incoming messages in customer details!

**File:** `src/features/whatsapp/components/IncomingMessagesWidget.tsx`

### Add to CustomerDetailModal:

In `src/features/customers/components/CustomerDetailModal.tsx`:

```typescript
import IncomingMessagesWidget from '../../whatsapp/components/IncomingMessagesWidget';

// Inside the modal, add:
<div className="mt-6">
  <h3 className="text-lg font-semibold mb-3">Recent Messages from Customer</h3>
  <IncomingMessagesWidget customerId={customer.id} limit={5} />
</div>
```

**This shows:**
- Last 5 messages from this specific customer
- Quick reply option
- Auto-refreshes

---

## 📊 All Available Data Fields

### whatsapp_incoming_messages Table:

```sql
SELECT * FROM whatsapp_incoming_messages LIMIT 1;
```

**Fields available:**
- `id` - Unique message ID
- `message_id` - WhatsApp message ID
- `from_phone` - Sender's phone number
- `customer_id` - Linked customer (if found)
- `message_text` - The actual message
- `message_type` - text, image, video, etc.
- `media_url` - Link to media file (if any)
- `is_read` - Whether you've read it
- `replied` - Whether you've replied
- `replied_at` - When you replied
- `replied_by` - Who replied
- `received_at` - When message arrived
- `created_at` - When stored in database

---

## 🔍 Useful Queries

### Get Conversation with Customer:

```sql
SELECT 
  'sent' as direction,
  message as text,
  created_at
FROM whatsapp_logs 
WHERE recipient_phone = '255746605561'

UNION ALL

SELECT 
  'received' as direction,
  message_text as text,
  created_at
FROM whatsapp_incoming_messages
WHERE from_phone = '255746605561'

ORDER BY created_at DESC;
```

### Count Unread Messages:

```sql
SELECT COUNT(*) as unread_count
FROM whatsapp_incoming_messages
WHERE is_read = false;
```

### Messages by Customer:

```sql
SELECT 
  c.name,
  COUNT(*) as message_count,
  MAX(m.created_at) as last_message
FROM whatsapp_incoming_messages m
LEFT JOIN customers c ON m.customer_id = c.id
GROUP BY c.name
ORDER BY last_message DESC;
```

### Messages Today:

```sql
SELECT 
  from_phone,
  message_text,
  created_at
FROM whatsapp_incoming_messages
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC;
```

---

## 📱 Quick Access Methods

### Option A: Direct Database (Fastest)

```bash
# Create alias for easy access
alias whatsapp-inbox="psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -c 'SELECT from_phone, message_text, created_at FROM whatsapp_incoming_messages ORDER BY created_at DESC LIMIT 10;'"

# Then just run:
whatsapp-inbox
```

### Option B: Create Simple Script

Save this as `check-messages.sh`:

```bash
#!/bin/bash
psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -c "
SELECT 
  CASE 
    WHEN c.name IS NOT NULL THEN c.name
    ELSE m.from_phone
  END as from,
  m.message_text,
  CASE WHEN m.is_read THEN '✓' ELSE '●' END as status,
  m.created_at
FROM whatsapp_incoming_messages m
LEFT JOIN customers c ON m.customer_id = c.id
ORDER BY m.created_at DESC 
LIMIT 20;
"
```

Run:
```bash
chmod +x check-messages.sh
./check-messages.sh
```

### Option C: Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Table Editor
4. Select `whatsapp_incoming_messages` table
5. View all incoming messages in a nice UI

---

## 🎨 Add Inbox to Your Website Navigation

### In your TopBar or Sidebar:

```typescript
import { MessageCircle } from 'lucide-react';

// Add to navigation menu:
{
  name: 'WhatsApp',
  path: '/whatsapp/inbox',
  icon: MessageCircle,
  badge: unreadCount // Shows number of unread
}
```

---

## 🔔 Real-Time Notifications (Optional)

### Add Desktop Notifications:

```typescript
// In WhatsAppInboxPage.tsx, add:
useEffect(() => {
  const checkNewMessages = async () => {
    const { count } = await supabase
      .from('whatsapp_incoming_messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);

    if (count && count > 0) {
      new Notification(`${count} new WhatsApp message(s)`, {
        icon: '/logo.svg',
        body: 'Click to view messages'
      });
    }
  };

  // Request permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  // Check every minute
  const interval = setInterval(checkNewMessages, 60000);
  return () => clearInterval(interval);
}, []);
```

---

## 📊 Summary

| Method | Availability | Best For |
|--------|--------------|----------|
| **Database Query** | ✅ NOW | Quick checks, debugging |
| **Inbox Page** | After rebuild | Daily use, team collaboration |
| **Customer Widget** | After rebuild | Viewing customer conversations |
| **Supabase Dashboard** | ✅ NOW | Visual browsing |

---

## 🎯 Recommended Setup

1. **Use database queries** for now (works immediately)
2. **Add Inbox page** to your website (after next deployment)
3. **Add widget** to customer details (for conversation view)

---

## ✅ QUICK CHECK NOW

**See if any messages exist:**

```bash
psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -c "SELECT COUNT(*) as total_messages FROM whatsapp_incoming_messages;"
```

**View latest:**

```bash
psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -c "SELECT from_phone, message_text, created_at FROM whatsapp_incoming_messages ORDER BY created_at DESC LIMIT 5;"
```

---

## 🎊 After You Upload & Configure Webhook

**Messages will appear:**
1. ✅ In database (query anytime)
2. ✅ In Inbox page (if you add it)
3. ✅ In customer details (if you add widget)
4. ✅ In Supabase dashboard (visual view)

---

**For now, use database queries to check incoming messages!**

**After webhook is configured, messages will start appearing automatically!** 🎉

