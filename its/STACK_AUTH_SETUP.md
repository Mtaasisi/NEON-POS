# 🔐 Stack Auth Integration Guide

## Overview

Your POS application now supports **multiple authentication providers**:
- ✅ **Supabase** (currently active, default)
- ✅ **Stack Auth** (configured and ready)

You can easily switch between providers by changing a single environment variable.

---

## 🎯 Quick Start

### Current Configuration

- **Auth Provider**: Supabase (default)
- **Stack Auth Project ID**: `d4218eb6-d224-4d96-bf25-6b53f8635de3`
- **JWKS Endpoint**: [View Keys](https://api.stack-auth.com/api/v1/projects/d4218eb6-d224-4d96-bf25-6b53f8635de3/.well-known/jwks.json)

### Switch to Stack Auth

To use Stack Auth instead of Supabase:

1. Open `.env` file
2. Change this line:
   ```env
   VITE_AUTH_PROVIDER=supabase
   ```
   To:
   ```env
   VITE_AUTH_PROVIDER=stack-auth
   ```
3. Restart your dev server:
   ```bash
   npm run dev
   ```

---

## 🔧 Configuration

### Environment Variables

```env
# Choose your auth provider
VITE_AUTH_PROVIDER=supabase           # or 'stack-auth'

# Stack Auth Configuration
VITE_STACK_AUTH_PROJECT_ID=d4218eb6-d224-4d96-bf25-6b53f8635de3
VITE_STACK_AUTH_API_URL=https://api.stack-auth.com/api/v1
VITE_STACK_AUTH_JWKS_URL=https://api.stack-auth.com/api/v1/projects/d4218eb6-d224-4d96-bf25-6b53f8635de3/.well-known/jwks.json
```

### Get Your Stack Auth Publishable Key

1. Go to [Stack Auth Dashboard](https://stack-auth.com/dashboard)
2. Select your project: `d4218eb6-d224-4d96-bf25-6b53f8635de3`
3. Navigate to **Settings** → **API Keys**
4. Copy your **Publishable Key**
5. Add to `.env`:
   ```env
   VITE_STACK_AUTH_PUBLISHABLE_KEY=your-key-here
   ```

---

## 📋 Stack Auth Features

### Supported Operations

✅ **Sign In** - Email & Password authentication  
✅ **Sign Up** - User registration  
✅ **Sign Out** - Logout functionality  
✅ **Session Management** - Auto-refresh tokens  
✅ **JWT Verification** - Using JWKS  
✅ **User Profile** - Access user data  

### JWT Token Structure

Stack Auth uses **ES256** (Elliptic Curve) signing algorithm with P-256 curve.

Your JWKS contains 2 public keys for token verification:
- Key ID: `NYFEY9TkoEd_`
- Key ID: `vHh8Bvho_uWF`

---

## 🔐 Authentication Flow

### 1. User Sign In

```typescript
import { authClient } from './lib/authProviders';

const { data, error } = await authClient.signInWithPassword(
  'user@example.com',
  'password123'
);

if (data?.user) {
  console.log('Logged in:', data.user);
}
```

### 2. Check Authentication

```typescript
const isAuth = authClient.isAuthenticated();
console.log('User authenticated:', isAuth);
```

### 3. Get Current User

```typescript
const { data } = await authClient.getUser();
console.log('Current user:', data?.user);
```

### 4. Sign Out

```typescript
await authClient.signOut();
```

---

## 🔄 Migration Guide

### From Supabase to Stack Auth

Your application is already set up for seamless migration:

1. **No code changes needed** - The `authClient` handles both providers
2. **Just change the environment variable**:
   ```env
   VITE_AUTH_PROVIDER=stack-auth
   ```
3. **Restart server** and you're done!

### User Data Mapping

When using Stack Auth, user data is automatically mapped to your app's format:

```typescript
// Stack Auth User
{
  id: "user-123",
  email: "user@example.com",
  displayName: "John Doe",
  profileImageUrl: "https://...",
  signedUpAt: "2024-01-01T00:00:00Z",
  hasPassword: true,
  oauthProviders: []
}
```

You may need to sync this with your `users` table in Neon database.

---

## 🎨 OAuth Providers

Stack Auth supports OAuth providers. To enable:

1. Go to [Stack Auth Dashboard](https://stack-auth.com/dashboard)
2. Navigate to **Authentication** → **OAuth Providers**
3. Enable providers:
   - 🔵 Google
   - 🔵 GitHub
   - 🔵 Facebook
   - 🔵 Twitter
   - etc.

---

## 🧪 Testing Stack Auth

### Test Authentication

1. Change auth provider to Stack Auth in `.env`
2. Restart server
3. Try logging in with Stack Auth credentials
4. Check browser console for authentication logs

### Debug Mode

Enable debug logging:

```env
VITE_ENABLE_DEBUG=true
```

This will show detailed auth flow in console.

---

## 🔍 Troubleshooting

### Common Issues

#### 1. "Network Error" on Sign In

**Problem**: Cannot connect to Stack Auth API  
**Solution**:
- Check internet connection
- Verify `VITE_STACK_AUTH_API_URL` is correct
- Check Stack Auth project status

#### 2. "Invalid Token"

**Problem**: JWT verification fails  
**Solution**:
- Verify JWKS URL is accessible
- Check token expiration
- Ensure project ID matches

#### 3. "User Not Found in Database"

**Problem**: Stack Auth user exists but not in your database  
**Solution**:
- You need to sync Stack Auth users with your `users` table
- Create a sync function after successful Stack Auth login

### Enable Detailed Logs

```typescript
// In stackAuthClient.ts, add:
console.log('Stack Auth Request:', { method, url, body });
console.log('Stack Auth Response:', response);
```

---

## 📊 Database Synchronization

After Stack Auth login, sync user to your database:

```typescript
// After successful Stack Auth login
const { data } = await authClient.signInWithPassword(email, password);

if (data?.user) {
  // Sync to Neon database
  await supabase.from('users').upsert({
    id: data.user.id,
    email: data.user.email,
    full_name: data.user.displayName,
    role: 'customer-care', // default role
    is_active: true,
    created_at: new Date(data.user.signedUpAt),
    updated_at: new Date()
  });
}
```

---

## 🚀 Production Deployment

### Environment Variables for Production

```env
NODE_ENV=production
VITE_APP_ENV=production
VITE_AUTH_PROVIDER=stack-auth
VITE_STACK_AUTH_PROJECT_ID=d4218eb6-d224-4d96-bf25-6b53f8635de3
VITE_STACK_AUTH_API_URL=https://api.stack-auth.com/api/v1
VITE_STACK_AUTH_JWKS_URL=https://api.stack-auth.com/api/v1/projects/d4218eb6-d224-4d96-bf25-6b53f8635de3/.well-known/jwks.json
VITE_STACK_AUTH_PUBLISHABLE_KEY=your-production-key
```

### Security Checklist

- ✅ Use environment variables for all secrets
- ✅ Never commit `.env` file to git
- ✅ Enable HTTPS in production
- ✅ Set up CORS properly in Stack Auth dashboard
- ✅ Use publishable keys (not secret keys) in frontend
- ✅ Implement rate limiting for auth endpoints
- ✅ Enable 2FA for admin accounts

---

## 📖 Additional Resources

- **Stack Auth Documentation**: https://docs.stack-auth.com
- **Stack Auth Dashboard**: https://stack-auth.com/dashboard
- **Your Project**: https://stack-auth.com/dashboard/projects/d4218eb6-d224-4d96-bf25-6b53f8635de3
- **JWKS Endpoint**: https://api.stack-auth.com/api/v1/projects/d4218eb6-d224-4d96-bf25-6b53f8635de3/.well-known/jwks.json

---

## 💡 Tips

1. **Test Both Providers**: Keep both Supabase and Stack Auth configured so you can switch easily
2. **Session Management**: Stack Auth handles token refresh automatically
3. **Error Handling**: Both providers return consistent error format
4. **User Experience**: No changes to login UI needed - it works with both providers
5. **Database Sync**: Always sync Stack Auth users to your database after login

---

## ✅ Quick Checklist

Before going live with Stack Auth:

- [ ] Stack Auth project ID configured
- [ ] Publishable key added to `.env`
- [ ] Auth provider set to `stack-auth`
- [ ] Dev server restarted
- [ ] Login tested successfully
- [ ] User data syncing to database
- [ ] OAuth providers configured (if needed)
- [ ] Production environment variables set
- [ ] CORS configured in Stack Auth dashboard
- [ ] Error handling tested

---

## 🎉 You're All Set!

Your application now has a flexible authentication system that supports multiple providers. You can switch between Supabase and Stack Auth anytime by changing one environment variable!

**Current Status**: ✅ Stack Auth configured and ready to use!

To start using Stack Auth, just change `VITE_AUTH_PROVIDER=stack-auth` in your `.env` file and restart the server.

