# 📱 SMS Credential Fetch Flow

## 🔄 Complete Flow from Database to SMS Send

### 1️⃣ **Database Query Location**
**File:** `src/lib/integrationsApi.ts` (Line 88-100)

```typescript
export async function getIntegration(integrationName: string): Promise<Integration | null> {
  const { data, error } = await supabase
    .from('lats_pos_integrations_settings')           // ← TABLE NAME
    .select('*')                                        // ← SELECT ALL FIELDS
    .eq('integration_name', integrationName)            // ← WHERE integration_name = 'SMS_GATEWAY'
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;                                          // ← Returns full integration object
}
```

**SQL Equivalent:**
```sql
SELECT * 
FROM lats_pos_integrations_settings 
WHERE integration_name = 'SMS_GATEWAY' 
LIMIT 1;
```

---

### 2️⃣ **SMS Service Initialization**
**File:** `src/services/smsService.ts` (Line 60-79)

```typescript
private async initializeService() {
  console.log('🔧 Initializing SMS service from integrations...');
  
  // Import and call getIntegration
  const { getIntegration } = await import('../lib/integrationsApi');
  const integration = await getIntegration('SMS_GATEWAY');  // ← FETCHES FROM DATABASE
  
  if (!integration || !integration.is_enabled) {
    console.warn('⚠️ SMS integration not configured.');
    return;
  }

  // Extract from CREDENTIALS field (JSONB)
  this.apiKey = integration.credentials?.api_key || null;           // ← 'Inauzwa'
  this.apiPassword = integration.credentials?.api_password || null; // ← '@Masika10'
  
  // Extract from CONFIG field (JSONB)
  this.apiUrl = integration.config?.api_url || 'https://mshastra.com/sendurl.aspx';
  
  console.log('✅ SMS credentials loaded from integrations');
}
```

---

### 3️⃣ **When Sending SMS**
**File:** `src/services/smsService.ts` (Line 408-414)

```typescript
// Get fresh credentials from integrations for all fields
const { getIntegration } = await import('../lib/integrationsApi');
const integration = await getIntegration('SMS_GATEWAY');  // ← FETCHES AGAIN (FRESH DATA)

const senderId = integration?.credentials?.sender_id || 'LATS POS';        // ← From credentials
const apiUrl = integration?.config?.api_url || this.apiUrl;                 // ← From config
const apiKey = integration?.credentials?.api_key || this.apiKey;            // ← From credentials
const apiPassword = integration?.credentials?.api_password || this.apiPassword; // ← From credentials
```

---

### 4️⃣ **Database Structure**

**Table:** `lats_pos_integrations_settings`

```
┌─────────────────────┬──────────────────────────────────────────┐
│ Column              │ Value                                    │
├─────────────────────┼──────────────────────────────────────────┤
│ integration_name    │ 'SMS_GATEWAY'                            │
│ integration_type    │ 'sms'                                    │
│ provider_name       │ 'MShastra'                               │
│ is_enabled          │ true                                     │
│ is_active           │ true                                     │
│                     │                                          │
│ credentials (JSONB) │ {                                        │
│                     │   "api_key": "Inauzwa",          ← AUTH  │
│                     │   "api_password": "@Masika10",   ← AUTH  │
│                     │   "sender_id": "INAUZWA"         ← AUTH  │
│                     │ }                                        │
│                     │                                          │
│ config (JSONB)      │ {                                        │
│                     │   "api_url": "https://mshastra.com/...", │
│                     │   "priority": "High",                    │
│                     │   "country_code": "ALL",                 │
│                     │   "max_retries": 3,                      │
│                     │   "timeout": 30000                       │
│                     │ }                                        │
└─────────────────────┴──────────────────────────────────────────┘
```

---

### 5️⃣ **Full Call Chain**

```
1. User clicks "Send SMS" in UI
   ↓
2. CustomerDetailModal.tsx → calls smsService.sendSMS()
   ↓
3. smsService.ts → sendSMS() → calls sendSMSToProvider()
   ↓
4. sendSMSToProvider() → calls getIntegration('SMS_GATEWAY')
   ↓
5. integrationsApi.ts → getIntegration() → queries database
   ↓
6. Database query:
   SELECT * FROM lats_pos_integrations_settings 
   WHERE integration_name = 'SMS_GATEWAY'
   ↓
7. Returns integration object with credentials and config
   ↓
8. Extracts: api_key, api_password, sender_id, api_url
   ↓
9. Sends to backend proxy at localhost:8000/api/sms-proxy
   ↓
10. Backend constructs URL and calls MShastra API
    ↓
11. MShastra responds: "Send Successful"
```

---

### 6️⃣ **To Verify in Your Database**

Run this SQL to see exactly what's stored:

```sql
SELECT 
  integration_name,
  provider_name,
  is_enabled,
  
  -- Show credentials field formatted
  jsonb_pretty(credentials) as credentials_pretty,
  
  -- Show config field formatted
  jsonb_pretty(config) as config_pretty,
  
  -- Extract individual values
  credentials->>'api_key' as username,
  credentials->>'api_password' as password,
  credentials->>'sender_id' as sender,
  config->>'api_url' as api_url
  
FROM lats_pos_integrations_settings
WHERE integration_name = 'SMS_GATEWAY';
```

---

### 7️⃣ **Key Files Involved**

1. **Database Table:** `lats_pos_integrations_settings`
2. **API Layer:** `src/lib/integrationsApi.ts` → `getIntegration()`
3. **Service Layer:** `src/services/smsService.ts` → Uses credentials
4. **Backend Proxy:** `server/src/routes/sms.ts` → Forwards to MShastra
5. **MShastra API:** `https://mshastra.com/sendurl.aspx` → Sends SMS

---

### 8️⃣ **Important Notes**

- ✅ Credentials are fetched **fresh** on every SMS send (not cached)
- ✅ The function checks `is_enabled` and `is_active` flags
- ✅ If database has no record, it returns `null`
- ✅ Credentials are stored in JSONB format for flexibility
- ✅ Two separate fields: `credentials` (auth) and `config` (settings)

