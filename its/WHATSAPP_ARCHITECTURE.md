# WhatsApp Session Management - System Architecture

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     NEON POS System                         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           WhatsApp Inbox Page (Frontend)             │  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │     WhatsApp Session Modal (UI Component)      │  │  │
│  │  │  - Create/List/Update/Delete Sessions         │  │  │
│  │  │  - QR Code Display & Scanning                  │  │  │
│  │  │  - Real-time Status Monitoring                 │  │  │
│  │  │  - Connection Management                       │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                         ↓ ↑                           │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │   WhatsApp Session Service (Business Logic)    │  │  │
│  │  │  - API Communication Layer                     │  │  │
│  │  │  - Error Handling & Validation                 │  │  │
│  │  │  - Bearer Token Management                     │  │  │
│  │  │  - Response Type Conversion                    │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ↓ ↑                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Backend API Endpoints (PHP)               │  │
│  │  /api/whatsapp-sessions/sync.php                     │  │
│  │  /api/whatsapp-sessions/list.php                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ↓ ↑                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         PostgreSQL Database (Neon)                   │  │
│  │  - whatsapp_sessions (session data)                  │  │
│  │  - whatsapp_session_logs (event logs)                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                    WasenderAPI (External)                   │
│  https://www.wasenderapi.com/api                           │
│  - Session Management Endpoints                            │
│  - WhatsApp Connection Service                             │
│  - QR Code Generation                                      │
│  - Message Delivery                                        │
└─────────────────────────────────────────────────────────────┘
                         ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                 WhatsApp Servers (Meta)                     │
│  - User Authentication                                      │
│  - Message Routing                                         │
│  - Media Storage                                           │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Component Breakdown

### 1. Frontend Layer

#### **WhatsAppInboxPage.tsx**
- Main container for WhatsApp functionality
- Manages message inbox and conversations
- Hosts session management button
- Coordinates between components

**Key Responsibilities:**
- Display inbox messages
- Handle user interactions
- Manage modal visibility
- Trigger session refresh on connect

#### **WhatsAppSessionModal.tsx**
- Session management interface
- QR code display and polling
- Session CRUD operations
- Real-time status updates

**Features:**
- Create new sessions
- Display QR codes
- Monitor connection status
- Manage existing sessions
- Show session details

### 2. Service Layer

#### **whatsappSessionService.ts**
- Centralized API communication
- Type-safe request/response handling
- Bearer token management
- Error handling and retry logic

**API Methods:**
```typescript
getAllSessions()        → GET /api/whatsapp-sessions
createSession()         → POST /api/whatsapp-sessions
getSessionDetails()     → GET /api/whatsapp-sessions/{id}
updateSession()         → PUT /api/whatsapp-sessions/{id}
deleteSession()         → DELETE /api/whatsapp-sessions/{id}
connectSession()        → POST /api/whatsapp-sessions/{id}/connect
getQRCode()            → GET /api/whatsapp-sessions/{id}/qr-code
getSessionStatus()      → GET /api/whatsapp-sessions/{id}/status
disconnectSession()     → POST /api/whatsapp-sessions/{id}/disconnect
restartSession()        → POST /api/whatsapp-sessions/{id}/restart
```

### 3. Backend Layer

#### **sync.php**
- Syncs WasenderAPI sessions to local DB
- Creates or updates session records
- Maintains event logs

#### **list.php**
- Retrieves sessions from local DB
- Formats data for frontend
- Applies filters and sorting

### 4. Database Layer

#### **whatsapp_sessions**
Stores session configuration and state

#### **whatsapp_session_logs**
Audit trail of all session events

## 🔄 Data Flow Diagrams

### Creating a Session

```
User Input (Modal Form)
    ↓
WhatsAppSessionModal.createSession()
    ↓
whatsappSessionService.createSession(payload)
    ↓
HTTP POST → WasenderAPI /api/whatsapp-sessions
    ↓
WasenderAPI creates session
    ↓
Returns session data (with ID, API key, etc.)
    ↓
Service returns to component
    ↓
Modal refreshes session list
    ↓
Success toast notification
    ↓
Call sync.php to save locally
    ↓
Database record created
```

### Connecting a Session (QR Flow)

```
User clicks "Connect"
    ↓
WhatsAppSessionModal.connectSession(session)
    ↓
whatsappSessionService.connectSession(sessionId)
    ↓
HTTP POST → WasenderAPI /api/whatsapp-sessions/{id}/connect
    ↓
WasenderAPI initiates connection
    ↓
Start Polling Loop (every 2s):
    │
    ├→ getQRCode() → Display QR
    │
    └→ getSessionStatus()
          ↓
       Status = "connecting"? → Continue polling
          ↓
       Status = "connected"? → Stop polling
          ↓
       Show success message
          ↓
       Reload sessions
          ↓
       Trigger onSessionConnected()
          ↓
       Reload inbox messages
```

### Message Reception Flow

```
Customer sends WhatsApp message
    ↓
WhatsApp Servers
    ↓
WasenderAPI receives message
    ↓
WasenderAPI webhook triggers
    ↓
POST → /api/whatsapp/webhook.php
    ↓
Webhook saves to whatsapp_incoming_messages
    ↓
Real-time subscription notifies frontend
    ↓
WhatsAppInboxPage updates conversation list
    ↓
User sees new message in inbox
```

## 🔐 Security Architecture

### Authentication Flow

```
Frontend Request
    ↓
whatsappSessionService.getHeaders()
    ↓
Retrieve Bearer Token from integrations
    ↓
Add to Authorization header
    ↓
Send to WasenderAPI
    ↓
WasenderAPI validates token
    ↓
Process request
    ↓
Return response
```

### Security Layers

1. **Bearer Token Authentication**
   - Stored securely in integrations table
   - Not exposed in frontend code
   - Loaded dynamically per request

2. **HTTPS Enforcement**
   - All API calls use HTTPS
   - Certificate validation
   - Encrypted data transmission

3. **Database Security**
   - Prepared statements (SQL injection prevention)
   - Foreign key constraints
   - Access control

4. **Session Isolation**
   - Each session has unique API key
   - Webhook secrets for verification
   - Independent connection state

## 📡 Real-time Communication

### Polling Mechanism

```javascript
// QR Code Polling (2-second intervals)
setInterval(async () => {
  // 1. Check for QR code
  const qrResult = await getQRCode(sessionId);
  if (qrResult.qr_code) {
    displayQRCode(qrResult.qr_code);
  }
  
  // 2. Check connection status
  const statusResult = await getSessionStatus(sessionId);
  if (statusResult.status === 'connected') {
    stopPolling();
    showSuccess();
    reloadSessions();
  }
}, 2000);

// Timeout after 60 seconds
setTimeout(() => {
  stopPolling();
  showTimeout();
}, 60000);
```

### Database Subscriptions

```javascript
// Supabase real-time subscription
supabase
  .channel('whatsapp_incoming')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'whatsapp_incoming_messages'
  }, (payload) => {
    // New message received
    loadMessages();
  })
  .subscribe();
```

## 🎨 UI State Management

### Modal States

```
┌─────────────────────────────────────┐
│         CLOSED                      │
│  (showSessionModal = false)         │
└─────────────────────────────────────┘
              ↓ User clicks "Sessions"
┌─────────────────────────────────────┐
│         LOADING                     │
│  (loading = true)                   │
│  Fetching sessions...               │
└─────────────────────────────────────┘
              ↓ Sessions loaded
┌─────────────────────────────────────┐
│       SESSION LIST                  │
│  Display all sessions               │
│  Show action buttons                │
└─────────────────────────────────────┘
              ↓ User clicks "Connect"
┌─────────────────────────────────────┐
│     QR CODE VIEW                    │
│  (selectedSession != null)          │
│  (loadingQR = true)                 │
└─────────────────────────────────────┘
              ↓ QR code received
┌─────────────────────────────────────┐
│   QR CODE DISPLAY                   │
│  Show QR + instructions             │
│  Poll for status                    │
└─────────────────────────────────────┘
              ↓ Status = connected
┌─────────────────────────────────────┐
│       SUCCESS                       │
│  Show toast notification            │
│  Close QR view                      │
│  Reload session list                │
└─────────────────────────────────────┘
```

## 🗄️ Database Design

### Entity Relationship

```
┌─────────────────────────────┐
│    whatsapp_sessions        │
│─────────────────────────────│
│ id (PK)                     │
│ wasender_session_id (UNIQUE)│
│ name                        │
│ phone_number                │
│ status                      │
│ account_protection          │
│ log_messages                │
│ webhook_url                 │
│ webhook_enabled             │
│ webhook_events (JSONB)      │
│ api_key                     │
│ webhook_secret              │
│ session_data (JSONB)        │
│ user_info (JSONB)           │
│ last_connected_at           │
│ created_at                  │
│ updated_at                  │
└─────────────────────────────┘
              │ 1
              │
              │ has many
              │
              ↓ ∞
┌─────────────────────────────┐
│  whatsapp_session_logs      │
│─────────────────────────────│
│ id (PK)                     │
│ session_id (FK)             │
│ event_type                  │
│ message                     │
│ metadata (JSONB)            │
│ created_at                  │
└─────────────────────────────┘
```

### Indexes for Performance

```sql
-- Status queries (filter connected sessions)
CREATE INDEX idx_whatsapp_sessions_status 
ON whatsapp_sessions(status);

-- Phone lookup (find session by number)
CREATE INDEX idx_whatsapp_sessions_phone 
ON whatsapp_sessions(phone_number);

-- WasenderAPI ID mapping
CREATE INDEX idx_whatsapp_sessions_wasender_id 
ON whatsapp_sessions(wasender_session_id);

-- Log queries (recent events)
CREATE INDEX idx_whatsapp_session_logs_session 
ON whatsapp_session_logs(session_id);

CREATE INDEX idx_whatsapp_session_logs_created 
ON whatsapp_session_logs(created_at DESC);
```

## 🚦 Error Handling Strategy

### Frontend Error Handling

```typescript
try {
  const result = await whatsappSessionService.someOperation();
  if (result.success) {
    // Handle success
    toast.success('Operation successful');
  } else {
    // Handle API error
    toast.error(result.error || 'Operation failed');
  }
} catch (error) {
  // Handle network/unexpected errors
  console.error('Unexpected error:', error);
  toast.error('An unexpected error occurred');
}
```

### Backend Error Handling

```php
try {
  // Database operation
  $stmt->execute();
  echo json_encode(['success' => true]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'error' => $e->getMessage()
  ]);
}
```

### WasenderAPI Error Mapping

| HTTP Code | Meaning | Frontend Action |
|-----------|---------|-----------------|
| 200 | Success | Process data |
| 401 | Unauthorized | Check Bearer Token |
| 403 | Forbidden | Show limit error |
| 404 | Not Found | Refresh session list |
| 500 | Server Error | Show retry option |

## 📈 Performance Optimization

### Caching Strategy

1. **Bearer Token Caching**
   - Loaded once per service instance
   - Reduces database queries

2. **Session List Caching**
   - Cached in component state
   - Refreshed after mutations

3. **QR Code Polling**
   - 2-second intervals (balanced)
   - Auto-stop after 60 seconds

### Database Query Optimization

1. **Indexed Columns**
   - Fast lookups by status, phone, ID
   - Composite indexes for common queries

2. **Limited Result Sets**
   - `LIMIT` clauses on log queries
   - Pagination for large datasets

3. **Prepared Statements**
   - Query plan caching
   - SQL injection prevention

## 🔄 Sync & Consistency

### Data Synchronization

```
WasenderAPI (Source of Truth)
    ↓ sync.php
Local Database (Cache)
    ↓ list.php
Frontend State (UI)
```

### Consistency Rules

1. **Session Creation**: WasenderAPI → Local DB
2. **Status Updates**: Polling from WasenderAPI
3. **Deletions**: WasenderAPI → Cascade to Local DB
4. **Updates**: WasenderAPI → Sync to Local DB

---

**Architecture Version**: 1.0.0  
**Last Updated**: December 2025  
**Designed for**: NEON POS WhatsApp Integration

