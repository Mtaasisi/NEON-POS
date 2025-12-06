# Scheduled Bulk Messages - Quick Reference

## 🎯 What Is This?

A complete scheduled bulk messaging system that allows you to:
- ✅ Schedule SMS and WhatsApp messages
- ✅ Send once or recurring (daily, weekly, monthly)
- ✅ Run in background (server) or browser
- ✅ Track progress and execution history
- ✅ Personalize messages with variables
- ✅ Anti-ban protection for WhatsApp

## 🚀 Quick Start

### 1. Setup (One-Time)

```bash
./setup-scheduled-messages.sh
```

This will:
- Create database tables
- Install dependencies
- Verify configuration

### 2. Start Servers

```bash
# Terminal 1: Backend
cd server && npm start

# Terminal 2: Frontend
npm run dev
```

### 3. Access

Navigate to: **http://localhost:5173/sms/scheduled**

## 📋 Features

### Dual Execution Modes

**Server Mode** (Recommended)
- ✅ Runs in background
- ✅ No browser needed
- ✅ More reliable
- ✅ Automatic execution

**Browser Mode**
- ✅ No server setup needed
- ✅ Runs in browser tab
- ✅ Can minimize tab
- ⚠️ Browser must be open

### Schedule Types

| Type | Description | Example |
|------|-------------|---------|
| **Once** | Send one time | Birthday greeting |
| **Daily** | Every day | Daily reminders |
| **Weekly** | Every week | Weekend sales |
| **Monthly** | Every month | Newsletter |

### Message Personalization

Use variables in your messages:
- `{name}` - Recipient's name
- `{phone}` - Phone number
- `{date}` - Current date
- `{time}` - Current time

Example:
```
Hi {name}, your appointment is on {date} at {time}
```

## 📁 Files Created

### Backend
```
server/src/
├── services/scheduledMessagesService.ts    # Background scheduler
└── routes/scheduled-messages.ts            # API endpoints

server/src/index.ts                          # Updated with routes
```

### Frontend
```
src/
├── services/browserSchedulerService.ts                         # Browser scheduler
├── features/sms/pages/ScheduledMessagesPage.tsx               # Management page
└── features/sms/components/ScheduleBulkMessageModal.tsx       # Scheduling wizard

public/scheduler-worker.js                                      # Web Worker

src/lib/routeRegistry.ts                                        # Updated with route
src/App.tsx                                                     # Updated with route
```

### Database
```
migrations/create_scheduled_bulk_messages.sql                   # Complete schema

Tables created:
- scheduled_bulk_messages          # Main table
- scheduled_message_executions     # Execution history
- bulk_message_templates           # Reusable templates
- message_recipient_lists          # Saved recipient lists
```

### Documentation
```
SCHEDULED_BULK_MESSAGES_GUIDE.md    # Complete guide (this file)
SCHEDULED_MESSAGES_README.md        # Quick reference
setup-scheduled-messages.sh         # Setup script
```

## 🎮 Usage Examples

### 1. One-Time Message

```javascript
{
  name: "Birthday Greeting - John",
  message_type: "whatsapp",
  message_content: "Happy Birthday {name}! 🎉",
  recipients: [{ phone: "+255123456789", name: "John" }],
  schedule_type: "once",
  scheduled_for: "2025-12-25T09:00:00Z",
  execution_mode: "server"
}
```

### 2. Daily Reminder

```javascript
{
  name: "Daily Store Opening",
  message_type: "sms",
  message_content: "We're open 9 AM - 6 PM today!",
  schedule_type: "recurring_daily",
  scheduled_for: "2025-12-15T08:00:00Z",
  recurrence_end_date: "2026-12-31T23:59:59Z",
  execution_mode: "server"
}
```

### 3. Weekly Promotion

```javascript
{
  name: "Weekend Sale",
  message_type: "whatsapp",
  message_content: "Weekend sale! 20% off everything!",
  media_url: "https://example.com/sale.jpg",
  media_type: "image",
  schedule_type: "recurring_weekly",
  scheduled_for: "2025-12-20T09:00:00Z",
  execution_mode: "server"
}
```

## 🔧 Common Tasks

### View All Scheduled Messages

```bash
curl http://localhost:8000/api/scheduled-messages?user_id=USER_ID
```

### Create Scheduled Message

```bash
curl -X POST http://localhost:8000/api/scheduled-messages \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "USER_ID",
    "name": "Test Message",
    "message_type": "sms",
    "message_content": "Test",
    "recipients": [{"phone": "+255123456789", "name": "Test"}],
    "schedule_type": "once",
    "scheduled_for": "2025-12-15T10:00:00Z",
    "execution_mode": "server"
  }'
```

### Execute Message Now

```bash
curl -X POST http://localhost:8000/api/scheduled-messages/MESSAGE_ID/execute
```

### Pause Message

```bash
curl -X POST http://localhost:8000/api/scheduled-messages/MESSAGE_ID/pause
```

### Resume Message

```bash
curl -X POST http://localhost:8000/api/scheduled-messages/MESSAGE_ID/resume
```

## 🐛 Troubleshooting

### Scheduler Not Running

**Check Server Logs:**
```bash
# Should see:
# ✅ Server running on http://localhost:8000
# 📅 Scheduled Messages Service: STARTED
# Checking every 60s for pending messages
```

**If not running:**
1. Check Supabase credentials in `.env`
2. Restart server
3. Check for error messages

### Messages Not Sending

**1. Check message status:**
```sql
SELECT id, name, status, scheduled_for, error_message
FROM scheduled_bulk_messages
WHERE status = 'failed';
```

**2. Check execution history:**
```sql
SELECT * FROM scheduled_message_executions
ORDER BY executed_at DESC
LIMIT 10;
```

**3. Verify scheduled time:**
```sql
SELECT name, scheduled_for, NOW() as current_time
FROM scheduled_bulk_messages
WHERE status IN ('pending', 'scheduled');
```

### Browser Scheduler Issues

**Check if initialized:**
```javascript
// In browser console
console.log(browserScheduler.isWorkerInitialized());
```

**Start manually:**
```javascript
// In browser console
browserScheduler.start();
```

**Check for errors:**
```javascript
// In browser console - look for:
// "📅 [Scheduler]:" messages
```

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scheduled-messages` | List all messages |
| GET | `/api/scheduled-messages/:id` | Get message details |
| POST | `/api/scheduled-messages` | Create message |
| PUT | `/api/scheduled-messages/:id` | Update message |
| DELETE | `/api/scheduled-messages/:id` | Delete message |
| POST | `/api/scheduled-messages/:id/execute` | Execute now |
| POST | `/api/scheduled-messages/:id/pause` | Pause message |
| POST | `/api/scheduled-messages/:id/resume` | Resume message |
| GET | `/api/scheduled-messages/:id/executions` | Get execution history |
| GET | `/api/scheduled-messages/scheduler/status` | Scheduler status |

## 🔐 Security

- ✅ User authentication required
- ✅ Users can only access their own messages
- ✅ Role-based access (admin, customer-care)
- ✅ Data encryption in database
- ✅ Rate limiting enabled
- ✅ API key protection

## 📚 Additional Resources

- **Complete Guide**: `SCHEDULED_BULK_MESSAGES_GUIDE.md`
- **Setup Script**: `setup-scheduled-messages.sh`
- **Database Schema**: `migrations/create_scheduled_bulk_messages.sql`
- **API Docs**: `http://localhost:8000/api-docs`

## ✅ Pre-Launch Checklist

Before using in production:

- [ ] Database migration completed
- [ ] Backend server running
- [ ] Scheduler service started (check logs)
- [ ] SMS/WhatsApp credentials configured
- [ ] Test message sent successfully
- [ ] Browser scheduler working (if needed)
- [ ] Execution history verified
- [ ] No failed recipients in test
- [ ] Anti-ban settings configured
- [ ] End dates set for recurring messages

## 💡 Tips & Best Practices

1. **Use Server Mode** for important messages
2. **Test with small groups** before full campaigns
3. **Set end dates** for recurring messages
4. **Monitor execution history** regularly
5. **Use personalization** for better engagement
6. **Adjust delays** if hitting rate limits
7. **Check failed recipients** and retry
8. **Save templates** for commonly used messages

## 🆘 Need Help?

1. Read the **Complete Guide**: `SCHEDULED_BULK_MESSAGES_GUIDE.md`
2. Check **server logs** for errors
3. Review **execution history** in the UI
4. Test with **simple one-time message**
5. Check **database tables** for data

## 🎉 Quick Success Test

Run this to verify everything works:

1. Go to: http://localhost:5173/sms/scheduled
2. Click "Schedule New"
3. Create a test message:
   - Name: "Test"
   - Type: SMS
   - Message: "Test message"
   - Select 1 recipient (yourself)
   - Schedule: Tomorrow at 9 AM
   - Mode: Server
4. Click "Schedule Message"
5. Check the dashboard - message should appear
6. Click "Execute Now" to send immediately
7. Check your phone for the message

If you received the message: **✅ Success!**

## 📞 Support

For issues or questions:
- Check the troubleshooting section
- Review server logs
- Inspect database tables
- Test with minimal setup

---

**Happy Scheduling! 🚀**

Built with ❤️ for automated messaging

