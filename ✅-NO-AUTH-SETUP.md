# ✅ Setup Without Supabase Auth

This guide is for databases that **don't have** `auth.users` table.

---

## 🚀 Quick Setup

### Step 1: Create the Table

Run this in your Neon console:

```sql
-- File: CREATE-INTEGRATIONS-SETTINGS.sql
```

✅ **Fixed!** No more `auth.users` dependency!

---

## 🔑 Getting Your User ID

Since you don't have Supabase auth, you need to manage user_id yourself.

### Option A: Use a Fixed User ID (Single User)

If you're the only user, just use a fixed UUID:

```sql
-- Generate a user ID once
SELECT gen_random_uuid();
-- Example result: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

-- Save this ID somewhere safe!
```

### Option B: Create a Simple Users Table

```sql
-- Create a simple users table
CREATE TABLE IF NOT EXISTS app_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert yourself
INSERT INTO app_users (email, name) 
VALUES ('your@email.com', 'Your Name')
RETURNING id;

-- Save this ID!
```

---

## 📝 Adding Your First Integration

Replace `'YOUR_USER_ID'` with the ID you got above:

```sql
INSERT INTO lats_pos_integrations_settings (
  user_id,
  integration_name,
  integration_type,
  provider_name,
  is_enabled,
  is_test_mode,
  environment,
  credentials,
  config,
  description
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890', -- Your user_id here!
  'SMS_GATEWAY',
  'sms',
  'Twilio',
  true,
  true,
  'test',
  jsonb_build_object(
    'account_sid', 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'auth_token', 'your_auth_token',
    'messaging_service_sid', 'MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  ),
  jsonb_build_object(
    'default_sender', '+1234567890',
    'max_retries', 3
  ),
  'Twilio SMS Gateway'
);
```

---

## 🔍 Viewing Your Integrations

### View All

```sql
SELECT 
  integration_name,
  provider_name,
  is_enabled,
  environment
FROM lats_pos_integrations_settings;
```

### View Specific User's Integrations

```sql
SELECT 
  integration_name,
  provider_name,
  is_enabled
FROM lats_pos_integrations_settings
WHERE user_id = 'YOUR_USER_ID';
```

---

## 🔧 Using in TypeScript

Update the API code to pass user_id manually:

```typescript
import { supabase } from '@/lib/supabase';

// Store your user_id somewhere accessible
const CURRENT_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

// Get all integrations
export async function getAllIntegrations() {
  const { data, error } = await supabase
    .from('lats_pos_integrations_settings')
    .select('*')
    .eq('user_id', CURRENT_USER_ID)
    .order('integration_type', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Get specific integration
export async function getIntegration(integrationName: string) {
  const { data, error } = await supabase
    .from('lats_pos_integrations_settings')
    .select('*')
    .eq('integration_name', integrationName)
    .eq('user_id', CURRENT_USER_ID)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

// Create new integration
export async function createIntegration(integration: any) {
  const { data, error } = await supabase
    .from('lats_pos_integrations_settings')
    .insert({
      ...integration,
      user_id: CURRENT_USER_ID, // Use your fixed user_id
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update integration
export async function updateIntegration(
  integrationName: string,
  updates: any
) {
  const { data, error } = await supabase
    .from('lats_pos_integrations_settings')
    .update(updates)
    .eq('integration_name', integrationName)
    .eq('user_id', CURRENT_USER_ID)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

---

## 🔐 Better: Use Environment Variable

Instead of hardcoding, use an environment variable:

```typescript
// .env.local
NEXT_PUBLIC_APP_USER_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890

// In your code
const CURRENT_USER_ID = process.env.NEXT_PUBLIC_APP_USER_ID!;
```

---

## 🎯 Alternative: Use Session/Cookie

If you have user login (non-Supabase), get user_id from session:

```typescript
// Example with NextAuth
import { getServerSession } from 'next-auth';

export async function getAllIntegrations() {
  const session = await getServerSession();
  const userId = session?.user?.id; // Your user ID from auth system

  const { data, error } = await supabase
    .from('lats_pos_integrations_settings')
    .select('*')
    .eq('user_id', userId)
    .order('integration_type', { ascending: true });

  if (error) throw error;
  return data || [];
}
```

---

## 🔒 Security Note

Without RLS (Row Level Security), any query can access any row. Options:

### Option 1: Handle in Your App
Always filter by user_id in your queries (as shown above)

### Option 2: Use Database Users
Create database roles with restricted access

### Option 3: Add Application-Level Security
Use middleware to validate user_id before queries

---

## ✅ Verification

Test that it works:

```sql
-- 1. Create a test integration
INSERT INTO lats_pos_integrations_settings (
  user_id,
  integration_name,
  integration_type,
  provider_name,
  is_enabled,
  credentials
) VALUES (
  'YOUR_USER_ID',
  'TEST_INTEGRATION',
  'test',
  'Test Provider',
  true,
  '{"test_key": "test_value"}'::jsonb
);

-- 2. Query it
SELECT * FROM lats_pos_integrations_settings 
WHERE integration_name = 'TEST_INTEGRATION';

-- 3. Update it
UPDATE lats_pos_integrations_settings 
SET is_enabled = false 
WHERE integration_name = 'TEST_INTEGRATION';

-- 4. Delete it
DELETE FROM lats_pos_integrations_settings 
WHERE integration_name = 'TEST_INTEGRATION';
```

If all these work, you're good to go! ✅

---

## 📚 Next Steps

1. Save your user_id somewhere safe
2. Add your real integrations (SMS, Email, etc.)
3. Use the templates from `📋-INTEGRATION-TEMPLATES.md`
4. Follow the usage guide in `📖-INTEGRATIONS-USAGE-GUIDE.md`

---

## 🆘 Still Having Issues?

### Error: "column user_id does not exist"
Run `CREATE-INTEGRATIONS-SETTINGS.sql` again

### Error: "invalid input syntax for type uuid"
Make sure user_id is a valid UUID format

### Can't find my integrations
Check if user_id matches:
```sql
SELECT user_id, integration_name FROM lats_pos_integrations_settings;
```

---

## 🎉 You're All Set!

The table is created and ready to use without Supabase auth!

