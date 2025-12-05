# 📊 Useful SQL Queries for WhatsApp Inbox

## 🔌 Connect to Database

```bash
psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
```

---

## 📥 View All Incoming Messages

```sql
SELECT 
    from_phone,
    message_text,
    is_read,
    replied,
    received_at
FROM whatsapp_incoming_messages 
ORDER BY received_at DESC 
LIMIT 10;
```

---

## 📊 Message Statistics

```sql
SELECT 
    COUNT(*) as total_messages,
    SUM(CASE WHEN is_read = false THEN 1 ELSE 0 END) as unread_count,
    SUM(CASE WHEN is_read = true THEN 1 ELSE 0 END) as read_count,
    SUM(CASE WHEN replied = false THEN 1 ELSE 0 END) as unreplied_count,
    SUM(CASE WHEN replied = true THEN 1 ELSE 0 END) as replied_count
FROM whatsapp_incoming_messages;
```

---

## 👥 Messages with Customer Names

```sql
SELECT 
    c.name as customer_name,
    m.from_phone,
    m.message_text,
    m.is_read,
    m.replied,
    m.received_at
FROM whatsapp_incoming_messages m
LEFT JOIN customers c ON m.customer_id = c.id
ORDER BY m.received_at DESC 
LIMIT 10;
```

---

## 📬 Unread Messages Only

```sql
SELECT 
    from_phone,
    message_text,
    received_at
FROM whatsapp_incoming_messages 
WHERE is_read = false
ORDER BY received_at DESC;
```

---

## 💬 Messages Need Reply

```sql
SELECT 
    from_phone,
    message_text,
    is_read,
    received_at
FROM whatsapp_incoming_messages 
WHERE replied = false
ORDER BY received_at DESC;
```

---

## 🔧 Mark All Messages as Unread

```sql
UPDATE whatsapp_incoming_messages 
SET is_read = false
WHERE is_read = true
RETURNING from_phone, message_text, is_read;
```

---

## 📝 Mark Specific Message as Unread

```sql
-- By phone number
UPDATE whatsapp_incoming_messages 
SET is_read = false
WHERE from_phone = '255746605561'
RETURNING *;

-- By message ID
UPDATE whatsapp_incoming_messages 
SET is_read = false
WHERE id = 'your-message-id-here'
RETURNING *;
```

---

## 📤 View Outgoing Messages

```sql
SELECT 
    phone_number,
    message,
    status,
    created_at
FROM whatsapp_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 📊 Conversation History (Incoming + Outgoing)

```sql
-- Incoming messages
SELECT 
    'received' as direction,
    from_phone as phone,
    message_text as message,
    is_read,
    replied,
    received_at as timestamp
FROM whatsapp_incoming_messages

UNION ALL

-- Outgoing messages
SELECT 
    'sent' as direction,
    phone_number as phone,
    message,
    NULL as is_read,
    NULL as replied,
    created_at as timestamp
FROM whatsapp_logs

ORDER BY timestamp DESC
LIMIT 20;
```

---

## 🔍 Search Messages by Text

```sql
SELECT 
    from_phone,
    message_text,
    is_read,
    received_at
FROM whatsapp_incoming_messages 
WHERE message_text ILIKE '%search term%'
ORDER BY received_at DESC;
```

---

## 🗑️ Delete Test Messages

```sql
-- ⚠️ BE CAREFUL - This deletes messages permanently!

-- Delete specific message
DELETE FROM whatsapp_incoming_messages 
WHERE from_phone = '255746605561'
RETURNING *;

-- Delete old test messages
DELETE FROM whatsapp_incoming_messages 
WHERE message_text LIKE '%TEST%' OR message_text LIKE '%test%'
RETURNING *;
```

---

## 🔧 Fix Broken Customer Links

```sql
-- Find messages without customer links
SELECT 
    from_phone,
    message_text,
    customer_id
FROM whatsapp_incoming_messages 
WHERE customer_id IS NULL
LIMIT 10;

-- Link messages to customers manually
UPDATE whatsapp_incoming_messages 
SET customer_id = (
    SELECT id FROM customers 
    WHERE phone = whatsapp_incoming_messages.from_phone 
    LIMIT 1
)
WHERE customer_id IS NULL;
```

---

## 📊 Daily Message Stats

```sql
SELECT 
    DATE(received_at) as date,
    COUNT(*) as total_messages,
    SUM(CASE WHEN is_read = false THEN 1 ELSE 0 END) as unread,
    SUM(CASE WHEN replied = true THEN 1 ELSE 0 END) as replied
FROM whatsapp_incoming_messages 
GROUP BY DATE(received_at)
ORDER BY date DESC
LIMIT 30;
```

---

## 🎯 Quick Checks

### Check if table exists
```sql
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'whatsapp_incoming_messages'
);
```

### Check table structure
```sql
\d whatsapp_incoming_messages
```

### Count total messages
```sql
SELECT COUNT(*) FROM whatsapp_incoming_messages;
```

### View latest message
```sql
SELECT * FROM whatsapp_incoming_messages 
ORDER BY received_at DESC 
LIMIT 1;
```

---

## 🚪 Exit psql

```sql
\q
```

---

## 💡 Tips

1. **End queries with semicolon** (;)
2. **Use \q to quit** psql
3. **Use arrow keys** to recall previous commands
4. **Use \d** to describe tables
5. **Use \dt** to list all tables
6. **Use \l** to list databases

---

## 🎯 Most Useful Queries for Daily Use

### Quick Status Check
```sql
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN is_read = false THEN 1 ELSE 0 END) as unread,
    SUM(CASE WHEN replied = false THEN 1 ELSE 0 END) as need_reply
FROM whatsapp_incoming_messages;
```

### View Recent Activity
```sql
SELECT 
    from_phone,
    LEFT(message_text, 50) as message,
    is_read,
    replied,
    TO_CHAR(received_at, 'YYYY-MM-DD HH24:MI') as received
FROM whatsapp_incoming_messages 
ORDER BY received_at DESC 
LIMIT 5;
```

### Mark Today's Messages as Unread
```sql
UPDATE whatsapp_incoming_messages 
SET is_read = false
WHERE DATE(received_at) = CURRENT_DATE
RETURNING from_phone, message_text;
```

