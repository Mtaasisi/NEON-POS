# Reminders Database Schema & Relations

## 📊 Database Table: `reminders`

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `title` | TEXT | NOT NULL | Reminder title |
| `description` | TEXT | | Optional description |
| `date` | DATE | NOT NULL | Reminder date |
| `time` | TIME | NOT NULL | Reminder time |
| `priority` | TEXT | NOT NULL, CHECK | 'low', 'medium', 'high' |
| `category` | TEXT | NOT NULL, CHECK | 'general', 'device', 'customer', 'appointment', 'payment', 'other' |
| `status` | TEXT | DEFAULT 'pending', CHECK | 'pending', 'completed', 'cancelled' |
| `notify_before` | INTEGER | DEFAULT 15 | Minutes before to notify |
| `related_to` | JSONB | | JSON: {type, id, name} |
| `assigned_to` | UUID | FOREIGN KEY | References users(id) |
| `created_by` | UUID | NOT NULL, FOREIGN KEY | References users(id) |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Last update timestamp |
| `completed_at` | TIMESTAMP WITH TIME ZONE | | Completion timestamp |
| `branch_id` | UUID | FOREIGN KEY | References store_locations(id) |
| `recurring` | JSONB | | JSON: {enabled, type, interval, endDate} |

---

## 🔗 Relations

### Foreign Keys

1. **`created_by` → `users(id)`**
   - Action: CASCADE on delete
   - Every reminder must have a creator

2. **`assigned_to` → `users(id)`**
   - Action: SET NULL on delete
   - Optional user assignment

3. **`branch_id` → `store_locations(id)`**
   - Action: SET NULL on delete
   - Links reminder to specific branch

### JSONB Relations (Soft References)

4. **`related_to`** - Links to other entities:
   ```json
   {
     "type": "device" | "customer" | "appointment",
     "id": "uuid",
     "name": "Display Name"
   }
   ```

5. **`recurring`** - Recurring reminder settings:
   ```json
   {
     "enabled": true,
     "type": "daily" | "weekly" | "monthly",
     "interval": 1,
     "endDate": "2025-12-31"
   }
   ```

---

## 📑 Indexes

- `idx_reminders_status` - Status lookups
- `idx_reminders_date` - Date filtering
- `idx_reminders_created_by` - User's reminders
- `idx_reminders_assigned_to` - Assigned reminders
- `idx_reminders_branch_id` - Branch filtering
- `idx_reminders_date_time` - Composite date+time queries
- `idx_reminders_recurring` - Recurring reminders lookup

---

## 🔒 Row Level Security (RLS)

### Policies

1. **SELECT Policy** - Users can see:
   - Reminders they created
   - Reminders assigned to them
   - Reminders in their branch

2. **INSERT Policy** - Users can:
   - Create reminders as themselves

3. **UPDATE Policy** - Users can:
   - Update their own reminders
   - Update reminders assigned to them

4. **DELETE Policy** - Users can:
   - Delete only their own reminders

---

## ⚡ Triggers

### `trigger_reminders_updated_at`
- Automatically updates `updated_at` timestamp on any UPDATE
- Function: `update_reminders_updated_at()`

---

## ✅ Recent Fixes Applied

1. ✅ Added `recurring` column support
2. ✅ Updated API to handle recurring field
3. ✅ Proper column name mapping (camelCase ↔ snake_case)

---

## 🎯 API Methods

- `getReminders()` - Get all reminders
- `getPendingReminders()` - Get pending only
- `getTodayReminders()` - Get today's reminders
- `createReminder()` - Create new reminder
- `updateReminder()` - Update existing reminder
- `completeReminder()` - Mark as completed
- `deleteReminder()` - Delete reminder
- `getOverdueReminders()` - Get overdue reminders

---

## 📝 Migration Files

1. `create_reminders_table.sql` - Initial table creation
2. `create_reminders_table_NEON.sql` - Neon-optimized version
3. `add_recurring_to_reminders.sql` - Adds recurring support ⭐ NEW

---

*Last Updated: October 18, 2025*

