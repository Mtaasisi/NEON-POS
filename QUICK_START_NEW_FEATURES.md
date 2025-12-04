# 🚀 Quick Start Guide - New Features

## ⚡ Get Up and Running in 10 Minutes

### Step 1: Install Dependencies (2 minutes)

All packages are already installed! If you need to reinstall:

```bash
npm install
```

### Step 2: Configure Environment Variables (3 minutes)

Add these to your `.env` file:

```bash
# Required
VITE_ENCRYPTION_KEY=your-32-char-key-here

# Optional but Recommended
VITE_SENDGRID_API_KEY=your-sendgrid-key
VITE_FROM_EMAIL=noreply@dukani.site
VITE_SENTRY_DSN=your-sentry-dsn
```

**Generate encryption key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Run Database Migrations (2 minutes)

Go to your Supabase SQL Editor and run these files in order:

1. `migrations/create_audit_logs_table.sql`
2. `migrations/create_email_logs_table.sql`  
3. `migrations/create_user_sessions_table.sql`

### Step 4: Update Your Code (3 minutes)

#### A. Initialize Services in `src/main.tsx`:

```typescript
import { initializeSentry } from './services/sentryService';
import { sessionManager } from './services/sessionManager';

// Add before ReactDOM.render
initializeSentry();

// Inside your auth success callback
sessionManager.initialize();
```

#### B. Add Password Strength to Login/Register Forms:

```typescript
import PasswordStrengthIndicator from './components/PasswordStrengthIndicator';

<PasswordStrengthIndicator 
  password={password}
  onChange={(result) => setIsPasswordValid(result.isValid)}
  showRequirements={true}
/>
```

#### C. Enable API Documentation in `server/src/index.ts`:

```typescript
import { setupSwagger } from './docs/swagger';

setupSwagger(app); // Add after middleware setup
```

### Step 5: Test It! (Optional)

```bash
# Start dev server
npm run dev

# In another terminal, start API server
cd server && npm run dev

# Visit API docs
open http://localhost:8000/api-docs
```

---

## 🎯 Features Overview

### 1. **XSS Protection** - Automatic

Import and use anywhere:
```typescript
import { sanitizeText, sanitizeHtml } from './utils/sanitizer';

const safe = sanitizeText(userInput);
```

### 2. **Password Policy** - Shows in UI

```typescript
import { validatePassword } from './utils/passwordPolicy';

const result = validatePassword(password);
// result.isValid, result.feedback, result.score
```

### 3. **Audit Trail** - Automatic Logging

```typescript
import { auditData } from './services/auditTrailService';

await auditData.create('product', 'products', id, data);
```

### 4. **Email Service** - Ready to Use

```typescript
import { emailService } from './services/emailService';

await emailService.sendReceipt({ to, customerName, items, total });
```

### 5. **Session Management** - Automatic

Just initialize once:
```typescript
import { sessionManager } from './services/sessionManager';

await sessionManager.initialize();
// Handles idle timeout, token refresh automatically
```

### 6. **Sentry Monitoring** - Automatic

```typescript
import { initializeSentry } from './services/sentryService';

initializeSentry(); // Call once in main.tsx
// Errors are automatically tracked
```

---

## 📱 UI Components Available

### Password Strength Indicator

```tsx
<PasswordStrengthIndicator 
  password={password}
  onChange={(result) => console.log(result)}
  showRequirements={true}
/>
```

Shows:
- Visual strength bar (red to green)
- Real-time feedback messages
- Requirements checklist with checkmarks

---

## 🔍 Where to Find Things

### Security Utils
- `src/utils/sanitizer.ts` - XSS protection
- `src/utils/passwordPolicy.ts` - Password validation
- `src/utils/encryption.ts` - Data encryption

### Services
- `src/services/auditTrailService.ts` - Audit logging
- `src/services/emailService.ts` - Email sending
- `src/services/sessionManager.ts` - Session management
- `src/services/sentryService.ts` - Error tracking

### Components
- `src/components/PasswordStrengthIndicator.tsx`

### API Docs
- `server/src/docs/swagger.ts` - Swagger config
- `server/src/routes/auth-documented.example.ts` - Documentation examples

### Migrations
- `migrations/create_audit_logs_table.sql`
- `migrations/create_email_logs_table.sql`
- `migrations/create_user_sessions_table.sql`

---

## 💡 Common Use Cases

### 1. Sanitize Form Data

```typescript
import { sanitizeObject } from './utils/sanitizer';

const safeData = sanitizeObject(formData, {
  htmlFields: ['description'],
  emailFields: ['email'],
  phoneFields: ['phone']
});
```

### 2. Validate New User Password

```typescript
import { validatePassword } from './utils/passwordPolicy';

const result = validatePassword(newPassword, {
  minLength: 12,
  requireSpecialChar: true
});

if (!result.isValid) {
  showErrors(result.feedback);
}
```

### 3. Log User Actions

```typescript
import { auditData, auditAuth } from './services/auditTrailService';

// On login
await auditAuth.login(userId, userName);

// On data change
await auditData.update('customer', 'customers', customerId, oldData, newData);
```

### 4. Send Email Notifications

```typescript
import { emailService } from './services/emailService';

// Low stock alert
await emailService.sendLowStockAlert({
  to: ['manager@company.com'],
  products: lowStockItems
});

// Welcome email
await emailService.sendWelcome({
  to: newUser.email,
  name: newUser.name
});
```

### 5. Encrypt Sensitive Data

```typescript
import { encryptText, decryptText } from './utils/encryption';

// Before saving to DB
const encrypted = encryptText(sensitiveInfo);

// After retrieving from DB
const decrypted = decryptText(encrypted);
```

### 6. Track Errors

```typescript
import { captureException } from './services/sentryService';

try {
  await riskyOperation();
} catch (error) {
  captureException(error, {
    level: 'error',
    tags: { module: 'payment' }
  });
}
```

---

## 🎨 Styling

All components use Tailwind CSS and match your existing design system. They include:
- Glass morphism effects
- Responsive design
- Dark mode ready (if you add it)
- Accessibility features

---

## ⚡ Performance Tips

1. **Password Validation**: Use debounced input for real-time validation
2. **Sanitization**: Sanitize on submit, not on every keystroke
3. **Audit Logging**: Batched automatically, no performance impact
4. **Email Sending**: Queued and retried automatically
5. **Session Checks**: Run every 10 seconds, minimal overhead

---

## 🐛 Troubleshooting

### Encryption Key Error
**Problem:** "No encryption key found"  
**Solution:** Add `VITE_ENCRYPTION_KEY` to `.env`

### Email Not Sending
**Problem:** Emails fail silently  
**Solution:** Check `VITE_SENDGRID_API_KEY` is valid

### Sentry Not Tracking
**Problem:** No errors show in Sentry  
**Solution:** Verify `VITE_SENTRY_DSN` is correct

### Session Timeout Too Short
**Problem:** Users logged out too quickly  
**Solution:** Increase in `sessionManager.initialize({ idleTimeout: 30 * 60 * 1000 })`

### API Docs Not Showing
**Problem:** `/api-docs` returns 404  
**Solution:** Ensure `setupSwagger(app)` is called in server

---

## 📚 Learn More

Read these for detailed information:
- [System Audit Report](./SYSTEM_AUDIT_MISSING_FEATURES.md)
- [Complete Implementation Summary](./IMPLEMENTATION_COMPLETE_SUMMARY.md)

---

## ✅ Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Services initialized in main.tsx
- [ ] Password strength added to forms
- [ ] API documentation enabled
- [ ] Tested in dev environment
- [ ] Ready for production!

---

**You're all set! 🎉**

Your application now has enterprise-grade security and monitoring!

