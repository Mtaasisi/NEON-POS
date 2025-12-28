# Reminders Feature

A clean and simple reminder system with flat UI design similar to the CBM Calculator.

## Features

✅ **Create & Manage Reminders**
- Add reminders with title, description, date, and time
- Set priority levels (Low, Medium, High)
- Categorize reminders (General, Device, Customer, Appointment, Payment, Other)
- Set notification time before reminder

✅ **Status Management**
- Pending reminders
- Completed reminders
- Overdue detection and highlighting

✅ **Filtering & Organization**
- Filter by status (All, Pending, Overdue, Completed)
- View statistics dashboard
- Clean flat UI design

✅ **Actions**
- Mark as completed
- Edit existing reminders
- Delete reminders

## Installation

### 1. Run Database Migration

**Option A: Using Neon SQL Editor (Recommended)**
1. Open your Neon Database console at https://console.neon.tech
2. Go to SQL Editor
3. Copy and paste the contents of `migrations/verify_reminders_setup.sql`
4. Click "Run" to execute
5. Check the output for success messages

**Option B: Using psql command line**
```bash
# If you have psql installed locally
psql "YOUR_NEON_DATABASE_URL" -f migrations/verify_reminders_setup.sql
```

**Option C: First-time setup (use full migration)**
```bash
# For fresh installation, use the complete migration:
psql "YOUR_NEON_DATABASE_URL" -f migrations/create_reminders_table.sql
```

### 2. Verify Connection

The app will automatically connect to your Neon database using the `VITE_DATABASE_URL` from your `.env` file:

```env
VITE_DATABASE_URL=postgresql://username:password@your-neon-host/database
```

### 3. Route is Already Added

The route `/reminders` is already added to the app and sidebar navigation.

### 4. Access the Feature

Navigate to `/reminders` or click on "Reminders" in the sidebar. The page will:
- Automatically fetch all reminders for your current branch
- Display statistics (Total, Pending, Overdue, Completed)
- Allow you to create, edit, delete, and complete reminders

## Usage

### Creating a Reminder

1. Click "Add Reminder" button
2. Fill in the required fields:
   - Title (required)
   - Description (optional)
   - Date (required)
   - Time (required)
   - Priority (Low/Medium/High)
   - Category (General/Device/Customer/etc.)
   - Notify Before (minutes)
3. Click "Create Reminder"

### Managing Reminders

- **Complete**: Click the checkmark button to mark as completed
- **Edit**: Click the edit button to modify reminder details
- **Delete**: Click the trash button to permanently delete

### Filtering

Use the filter buttons to view:
- All reminders
- Pending reminders only
- Overdue reminders only
- Completed reminders only

## UI Design

The Reminders feature uses the same flat UI design as the CBM Calculator:

- Clean white cards with subtle borders
- Flat color backgrounds for statistics
- Simple rounded buttons
- Smooth transitions and hover effects
- Color-coded priority and category badges

## Permissions

Access levels:
- **Admin**: Full access
- **Customer Care**: Full access
- **Technician**: Full access

## Database Schema

```sql
reminders (
  id: UUID (primary key)
  title: TEXT (not null)
  description: TEXT
  date: DATE (not null)
  time: TIME (not null)
  priority: TEXT (low|medium|high)
  category: TEXT (general|device|customer|appointment|payment|other)
  status: TEXT (pending|completed|cancelled)
  notify_before: INTEGER (minutes)
  related_to: JSONB (optional link to device/customer/appointment)
  assigned_to: UUID (foreign key to users)
  created_by: UUID (foreign key to users)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
  completed_at: TIMESTAMP
  branch_id: UUID (foreign key to branches)
)
```

## Future Enhancements

- Push notifications
- Email reminders
- SMS reminders
- Recurring reminders
- Link reminders to devices, customers, or appointments
- Assign reminders to specific users
- Calendar view
- Bulk actions

## Troubleshooting

### "Failed to load reminders" error

**Check the browser console for detailed logs:**
- The app logs detailed information about database operations
- Look for errors about table not existing or RLS blocking access

**Common solutions:**
1. **Table doesn't exist**: Run `migrations/verify_reminders_setup.sql`
2. **Database URL not configured**: Check your `.env` file has `VITE_DATABASE_URL`
3. **Connection refused**: Verify your Neon database is active (not paused)
4. **No branch selected**: The app requires a branch to be selected to load reminders

### Console Logs

The RemindersPage includes extensive logging for debugging:
- `🔄 [Reminders]` - Lifecycle events
- `📝 [Reminders]` - Loading data
- `✅ [Reminders]` - Success messages
- `❌ [Reminders]` - Error messages
- `🔍 [Reminders]` - Filtering operations

### Database Connection

Test your Neon connection:
```sql
-- Run this in Neon SQL Editor to verify
SELECT COUNT(*) as reminder_count FROM reminders;
```

## Related Files

- `src/features/reminders/pages/RemindersPage.tsx` - Main page component (fully connected)
- `src/lib/reminderApi.ts` - API functions (all CRUD operations)
- `src/types/reminder.ts` - TypeScript types
- `migrations/create_reminders_table.sql` - Full database migration
- `migrations/verify_reminders_setup.sql` - Quick setup verification script

