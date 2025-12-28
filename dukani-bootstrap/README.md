# Dukani Pro Bootstrap

This is a clean bootstrap version of Dukani Pro POS System with core functionality.

## Included Features

### Core Features ✅
- shared
- admin
- lats
- customers
- devices
- settings

### Optional Features (Add as needed)
- appointments
- backup
- business
- calculator
- customer-portal
- employees
- forms
- installments
- mobile
- notifications
- payments
- reminders
- repair
- reports
- returns
- sms
- special-orders
- tablet
- users
- whatsapp

## Setup

1. `npm install`
2. Configure your database connection
3. `npm run dev` for development
4. `npm run build` for production

## Adding Features

To add optional features, copy them from the original codebase:
```bash
cp -r ../original/src/features/[feature-name] src/features/
```

## Database Setup

Run the essential migrations from `sql/` and `migrations/` directories.

---
Created: 2025-12-22T21:28:54.732Z
Original Version: 1.0.3
