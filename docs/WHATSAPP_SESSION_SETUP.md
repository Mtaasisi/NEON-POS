# WhatsApp Session Management Setup Guide

This guide explains how to set up and manage WhatsApp Business sessions using WasenderAPI integration in your NEON POS system.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [WasenderAPI Configuration](#wasenderapi-configuration)
4. [Creating Your First Session](#creating-your-first-session)
5. [Connecting WhatsApp](#connecting-whatsapp)
6. [Managing Sessions](#managing-sessions)
7. [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

- Active WasenderAPI account with API credentials
- PostgreSQL database (provided)
- WhatsApp Business account or regular WhatsApp account
- Smartphone with WhatsApp installed

## 📊 Database Setup

### Step 1: Run the migration

Execute the following SQL script on your PostgreSQL database:

```bash
psql "postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" -f migrations/create_whatsapp_sessions_table.sql
```

Or manually run the SQL from `migrations/create_whatsapp_sessions_table.sql`

This creates two tables:
- `whatsapp_sessions` - Stores session information
- `whatsapp_session_logs` - Tracks session events

### Database Connection String
```
postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## 🔑 WasenderAPI Configuration

### Step 1: Get API Credentials

1. Go to [WasenderAPI Dashboard](https://wasenderapi.com/dashboard)
2. Navigate to **API Settings**
3. Copy your **Personal Access Token** or **Bearer Token**

### Step 2: Configure in NEON POS

1. Go to **Admin Settings** → **Integrations**
2. Find **WhatsApp (WasenderAPI)** integration
3. Enter your Bearer Token
4. Save settings

## 🚀 Creating Your First Session

### Step 1: Open Session Manager

1. Navigate to **WhatsApp Inbox** page
2. Click the **Sessions** button in the header (blue button with phone icon)

### Step 2: Create New Session

1. Click **New Session** button
2. Fill in the form:
   - **Session Name**: e.g., "Business WhatsApp" (required)
   - **Phone Number**: Your WhatsApp number in international format, e.g., "+255712345678" (required)
   - **Account Protection**: ✅ Recommended (prevents ban)
   - **Log Messages**: ✅ Recommended (stores message history)
   - **Auto-Read Messages**: Optional (marks messages as read automatically)
   - **Auto-Reject Calls**: Optional (rejects incoming calls)

3. Click **Create Session**

## 📱 Connecting WhatsApp

### Step 1: Initiate Connection

1. In the Sessions list, find your newly created session
2. Click the **Connect** button
3. Wait for QR code to appear (usually 2-5 seconds)

### Step 2: Scan QR Code

1. Open WhatsApp on your smartphone
2. Go to **Settings** → **Linked Devices**
3. Tap **Link a Device**
4. Scan the QR code displayed on screen
5. Wait for confirmation (status will change to "Connected")

### QR Code Timeout

- QR codes expire after 60 seconds
- If expired, click **Connect** again to generate a new one

## 🎛️ Managing Sessions

### Session Status

- **🟢 Connected**: WhatsApp is active and ready to send/receive messages
- **🔴 Disconnected**: WhatsApp is not connected, need to reconnect
- **🟡 Connecting**: Connection in progress
- **🟠 QR Ready**: QR code generated, waiting for scan

### Available Actions

#### For Connected Sessions:
- **Disconnect**: Logout WhatsApp session
- **Restart**: Restart the connection (useful for fixing issues)
- **Delete**: Permanently remove session

#### For Disconnected Sessions:
- **Connect**: Generate QR code and connect
- **Delete**: Permanently remove session

### Session Settings

Each session includes:
- **Account Protection**: Anti-ban features enabled
- **Logging**: Message history storage
- **Webhook URL**: For receiving real-time message notifications
- **API Key**: Unique key for this session

## 🔍 Viewing Session Details

### Session Information
- Name and phone number
- Connection status
- Last connected time
- Created/updated timestamps

### Session Logs
View connection events:
- Session created
- Connected/disconnected events
- QR code generation
- Errors and issues

## 💬 Using Connected Sessions

Once your session is connected:

1. **Inbox**: Messages from customers appear automatically in WhatsApp Inbox
2. **Send Messages**: Use "New Message" or "Bulk Send" features
3. **Reply**: Quick reply to conversations
4. **Media**: Send images, videos, documents, audio
5. **Advanced**: Polls, locations, and more

## 🛠️ Troubleshooting

### QR Code Not Appearing

**Solution:**
1. Check your WasenderAPI subscription is active
2. Verify Bearer Token is correct in integrations settings
3. Refresh the page and try again
4. Check browser console for errors

### Connection Keeps Dropping

**Solution:**
1. Click **Restart** on the session
2. Ensure your WhatsApp account is not logged in elsewhere
3. Check if account protection is enabled
4. Contact WasenderAPI support if issue persists

### "Session Limit Reached" Error

**Solution:**
- Your WasenderAPI plan has a session limit
- Upgrade your plan or delete unused sessions
- Check your plan limits in WasenderAPI dashboard

### Messages Not Appearing in Inbox

**Solution:**
1. Verify session status is "Connected"
2. Check webhook is configured correctly:
   - **Webhook URL**: `https://yourdomain.com/api/whatsapp/webhook.php`
   - **Webhook Events**: `messages.received`, `messages.upsert`, `session.status`
3. Ensure `log_messages` is enabled for the session
4. Check database connection

### API Errors

**Common Errors:**

- **401 Unauthorized**: Invalid Bearer Token
  - Solution: Update token in integrations settings

- **403 Forbidden**: Session limit reached
  - Solution: Upgrade plan or delete sessions

- **404 Not Found**: Session doesn't exist
  - Solution: Recreate the session

- **500 Server Error**: WasenderAPI issue
  - Solution: Check WasenderAPI status page

## 📚 API Documentation

Full WasenderAPI documentation: [https://wasenderapi.com/api-docs](https://wasenderapi.com/api-docs)

### Key Endpoints Used:

- `GET /api/whatsapp-sessions` - Get all sessions
- `POST /api/whatsapp-sessions` - Create session
- `GET /api/whatsapp-sessions/{id}` - Get session details
- `POST /api/whatsapp-sessions/{id}/connect` - Connect session
- `GET /api/whatsapp-sessions/{id}/qr-code` - Get QR code
- `GET /api/whatsapp-sessions/{id}/status` - Check status
- `POST /api/whatsapp-sessions/{id}/disconnect` - Disconnect
- `POST /api/whatsapp-sessions/{id}/restart` - Restart
- `DELETE /api/whatsapp-sessions/{id}` - Delete session

## 🔐 Security Best Practices

1. **Keep Bearer Token Secret**: Never share your API token
2. **Use HTTPS**: Always use secure connections
3. **Enable Account Protection**: Prevents WhatsApp bans
4. **Rotate API Keys**: Regenerate keys periodically
5. **Monitor Sessions**: Check logs regularly for suspicious activity

## 📞 Support

### Getting Help

1. **Documentation**: Check this guide first
2. **WasenderAPI Support**: [https://wasenderapi.com/help](https://wasenderapi.com/help)
3. **Email**: support@wasenderapi.com
4. **Phone**: +1 (914) 520-4638

### Reporting Issues

When reporting issues, include:
- Session ID
- Error message
- Steps to reproduce
- Screenshot (if applicable)
- Browser console logs

## 🎯 Best Practices

### Session Naming
- Use descriptive names: "Sales Team", "Support Bot", "Marketing"
- Include purpose or team in name
- Avoid special characters

### Phone Numbers
- Always use international format: `+[country code][number]`
- Example: `+255712345678` (Tanzania)
- No spaces or special characters

### Connection Management
- Don't connect same number on multiple sessions
- Keep session connected during business hours
- Restart if experiencing issues
- Delete unused sessions

### Message Handling
- Enable message logging for audit trail
- Use auto-read sparingly (may appear impersonal)
- Monitor inbox regularly
- Set up webhooks for real-time notifications

## 🚀 Advanced Features

### Multiple Sessions
- Run multiple WhatsApp numbers simultaneously
- Each session is independent
- No interference between sessions
- Ideal for teams or departments

### Webhooks
Configure webhooks to receive:
- Incoming messages
- Message status updates
- Session status changes
- QR code updates
- Connection events

### API Integration
Use session API key for:
- Custom integrations
- Third-party tools
- Automation scripts
- External applications

## 📈 Monitoring & Analytics

### Session Health
Monitor:
- Connection uptime
- Message delivery rate
- Response times
- Error rates

### Message Logs
Track:
- Sent messages
- Received messages
- Failed deliveries
- Delivery times

---

**Last Updated**: December 2025
**Version**: 1.0.0
**WasenderAPI Version**: Latest

For more information, visit [WasenderAPI Documentation](https://wasenderapi.com/api-docs)

