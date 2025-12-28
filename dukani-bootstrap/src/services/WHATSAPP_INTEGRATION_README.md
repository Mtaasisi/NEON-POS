# WhatsApp Integration with WasenderAPI

This integration allows you to send WhatsApp messages through your app using WasenderAPI.

## Setup

1. **Get WasenderAPI Credentials**
   - Sign up at [WasenderAPI](https://wasenderapi.com)
   - Create a WhatsApp session
   - Get your API Key (Bearer Token) and Session ID

2. **Configure in Admin Settings**
   - Go to **Admin Settings → Integrations**
   - Find **WasenderAPI** integration
   - Enter your:
     - **API Key (Bearer Token)**: Your WasenderAPI bearer token
     - **WhatsApp Session ID**: Your WhatsApp session ID
   - **API Base URL**: `https://wasenderapi.com/api` (default)

3. **Enable the Integration**
   - Toggle the integration to **Enabled**
   - Save the configuration

## Usage

### Basic Text Message

```typescript
import whatsappService from './services/whatsappService';

// Send a simple text message
const result = await whatsappService.sendMessage(
  '255712345678', // Phone number (with country code, no +)
  'Hello! This is a test message from your app.'
);

if (result.success) {
  console.log('Message sent!', result.message_id);
} else {
  console.error('Failed:', result.error);
}
```

### Send Image with Caption

```typescript
const result = await whatsappService.sendMessage(
  '255712345678',
  'Check out this image!',
  {
    message_type: 'image',
    media_url: 'https://example.com/image.jpg',
    caption: 'This is the image caption'
  }
);
```

### Send Document

```typescript
const result = await whatsappService.sendMessage(
  '255712345678',
  'Please find the document attached',
  {
    message_type: 'document',
    media_url: 'https://example.com/document.pdf',
    caption: 'Invoice #12345'
  }
);
```

### Send Location

```typescript
const result = await whatsappService.sendMessage(
  '255712345678',
  '', // Empty message for location
  {
    message_type: 'location',
    location: {
      latitude: -6.7924,
      longitude: 39.2083,
      name: 'Dar es Salaam',
      address: 'City Center'
    }
  }
);
```

### Reply to a Message

```typescript
const result = await whatsappService.sendMessage(
  '255712345678',
  'This is a reply',
  {
    quoted_message_id: 'message_id_from_previous_message'
  }
);
```

## Message Types Supported

- **text**: Plain text messages
- **image**: Images with optional caption
- **video**: Videos with optional caption
- **document**: PDFs, files with optional caption
- **audio**: Audio files
- **location**: Location pins
- **contact**: Contact cards

## Phone Number Format

The service automatically formats phone numbers:
- Removes `+` and non-digit characters
- Converts `0` prefix` to country code (255 for Tanzania)
- Ensures proper country code format

Examples:
- `+255712345678` → `255712345678`
- `0712345678` → `255712345678`
- `712345678` → `255712345678`

## Logging

All WhatsApp messages are automatically logged to the `whatsapp_logs` table with:
- Recipient phone number
- Message content
- Message type
- Status (sent, delivered, read, failed, pending)
- Timestamps
- Error messages (if failed)

## Get Logs

```typescript
// Get all logs
const logs = await whatsappService.getWhatsAppLogs();

// Get logs with filters
const filteredLogs = await whatsappService.getWhatsAppLogs({
  search: '255712345678',
  status: 'sent'
});
```

## Get Statistics

```typescript
const stats = await whatsappService.getWhatsAppStats();
console.log(stats);
// {
//   total: 100,
//   sent: 95,
//   failed: 3,
//   pending: 2,
//   delivered: 90,
//   read: 85
// }
```

## Database Schema

The service expects a `whatsapp_logs` table with the following structure:

```sql
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone TEXT NOT NULL,
  message TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  sent_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  device_id UUID,
  customer_id UUID,
  message_id TEXT,
  media_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_recipient ON whatsapp_logs(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON whatsapp_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created ON whatsapp_logs(created_at DESC);
```

## Error Handling

The service handles errors gracefully:
- Network errors are caught and logged
- Invalid phone numbers are formatted automatically
- Missing configuration shows helpful error messages
- All errors are logged to the database

## Integration with Existing Features

The WhatsApp service is already integrated into:
- **Device Repair Status Updates** - Send WhatsApp notifications when device status changes
- **Repair Status Grid** - Send messages from the repair management interface

You can use it anywhere in your app by importing:

```typescript
import whatsappService from './services/whatsappService';
```

## Troubleshooting

### "WhatsApp provider not configured"
- Go to Admin Settings → Integrations
- Find WasenderAPI integration
- Enter your API Key and Session ID
- Enable the integration

### "Network error"
- Check your internet connection
- Verify the API URL is correct
- Check WasenderAPI service status

### "Invalid phone number"
- Ensure phone number includes country code
- Remove any special characters
- Use format: `255712345678` (no + sign)

## API Reference

For full WasenderAPI documentation, visit:
https://wasenderapi.com/api-docs

