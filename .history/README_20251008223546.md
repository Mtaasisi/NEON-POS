# 🛒 Last Chance POS

A modern, full-featured Point of Sale (POS) system built with React, TypeScript, and Neon Database (serverless PostgreSQL). This system handles everything from inventory management to sales transactions, customer management, purchase orders, and financial reporting.

## ✨ Features

- **Sales & Transactions**: Complete POS interface with barcode scanning, product search, and payment processing
- **Inventory Management**: Track products, variants, stock levels, and storage locations
- **Customer Management**: Customer profiles, search, and transaction history
- **Purchase Orders**: Create and manage purchase orders with supplier integration
- **Financial Management**: Daily sales closures, payment tracking, and account management
- **User Management**: Role-based access control and user authentication
- **Reporting**: Comprehensive sales reports and analytics
- **Mobile Support**: Built with Capacitor for cross-platform deployment

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **Database**: Neon Database (Serverless PostgreSQL)
- **Charts**: Recharts
- **UI Components**: Lucide React icons, React Hot Toast
- **Mobile**: Capacitor (Android support)

## 📋 Prerequisites

Before you start, make sure you have:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Neon Database** account ([neon.tech](https://neon.tech))
- A code editor (VS Code recommended)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your-neon-database-url
VITE_SUPABASE_ANON_KEY=your-neon-api-key
```

### 3. Set Up Database

Run the database setup scripts to create all necessary tables and functions:

```bash
# Check database status
node verify-and-fix.mjs

# Fix any database issues
npm run fix-database
```

Or manually run the SQL scripts in your Neon Database console:
- `complete-database-schema.sql` - Complete database setup
- `CREATE-OR-RESET-ADMIN-USER.sql` - Create admin user

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 5. Default Login

After setting up the database, use these credentials:
- **Email**: `admin@example.com`
- **Password**: `admin123`

## 🧪 Testing

### Run All Tests

```bash
# Test all features
node comprehensive-test.mjs

# Test specific features
node test-remaining-features.mjs

# Test purchase order workflow
node test-workflow.mjs

# Test database queries
node test-all-queries.mjs
```

### Manual Testing

Follow the comprehensive testing guides:
- `📋 MANUAL-TESTING-GUIDE.md` - Step-by-step manual testing
- `🧪 COMPLETE-TEST-GUIDE.md` - Complete feature testing guide
- `PRODUCT-PAGES-TESTING-GUIDE.md` - Product management testing
- `PURCHASE-ORDER-WORKFLOW-TEST-GUIDE.md` - Purchase order testing

## 🏗️ Build for Production

```bash
# Build the app
npm run build

# Preview production build
npm run preview
```

## 🔧 Database Maintenance

### Fix Common Issues

If you encounter 400 errors or database issues:

```bash
# Quick fix for common issues
node apply-fix-simple.mjs

# Comprehensive database fix
node auto-fix-database.mjs

# Fix specific issues
node auto-fix-now.mjs
```

### Common SQL Fixes

The project includes many pre-built SQL fixes for common issues:
- `QUICK-FIX-400.sql` - Fix 400 errors
- `FIX-400-ERRORS-COMPLETE.sql` - Comprehensive 400 error fixes
- `FIX-PAYMENT-SYSTEM.sql` - Payment system fixes
- `FIX-SUPPLIERS-NOW.sql` - Supplier management fixes

## 📚 Documentation

### Getting Started
- `🚀 QUICK-START-GUIDE.md` - Quick start guide
- `🎯 START-HERE.md` - Where to begin
- `HOW-TO-RUN-FIX.md` - How to run fixes

### Feature Guides
- `🎯 COMPLETE-FEATURE-CATALOG.md` - All features explained
- `PAYMENT-SYSTEM-ANALYSIS.md` - Payment system overview
- `PURCHASE-ORDER-WORKFLOW-SUMMARY.md` - Purchase order guide

### Troubleshooting
- `🔧 NEON-DATABASE-FIX.md` - Neon database issues
- `FIX-400-ERRORS-GUIDE.md` - Fix 400 errors
- `📖 ERROR-CODES-EXPLAINED.md` - Error code reference
- `NETWORK-DEBUG-INSTRUCTIONS.md` - Network debugging

### Testing & Status
- `📍 TESTING-STATUS.md` - Current testing status
- `🏆 FINAL-COMPREHENSIVE-TEST-REPORT.md` - Test results
- `DATABASE-STATUS-REPORT.md` - Database status

## 🗂️ Project Structure

```
├── src/
│   ├── components/        # React components
│   ├── lib/              # API clients and utilities
│   ├── pages/            # Page components
│   ├── hooks/            # Custom React hooks
│   └── types/            # TypeScript type definitions
├── public/               # Static assets
├── android/              # Android app (Capacitor)
├── *.sql                 # Database migration scripts
├── *.mjs                 # Test and utility scripts
└── *.md                  # Documentation files
```

## 🔐 Security Notes

- Change default admin password immediately after first login
- Keep your `.env` file secure and never commit it
- Use Row Level Security (RLS) policies in production
- Regularly backup your database

## 🐛 Common Issues & Solutions

### 400 Errors on Forms

Run the quick fix:
```bash
node apply-fix-simple.mjs
```

Or check `🎯 FIX-400-ERRORS-GUIDE.md` for detailed solutions.

### Database Connection Issues

1. Verify your `.env` file has correct credentials
2. Check Neon database is running
3. Run `node verify-and-fix.mjs` to diagnose

### Missing Tables/Functions

Run the complete database setup:
```bash
node auto-fix-database.mjs
```

## 💡 Tips

- Use the Chrome DevTools Network tab to debug API calls
- Check browser console for detailed error messages
- Most fixes are automated - check the `*.mjs` scripts
- SQL fixes are idempotent - safe to run multiple times

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly using the test scripts
4. Update relevant documentation
5. Submit for review

## 📄 License

[Your License Here]

## 🙋 Support

For issues and questions:
1. Check the relevant `*.md` documentation files
2. Review error logs in browser console
3. Run diagnostic scripts in the root directory

---

**Built with ❤️ for efficient retail management**

