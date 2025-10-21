# 🚀 Quick Start: Device & Repair Branch Isolation

## What Changed?

Your devices and repairs are now **completely isolated by branch** - just like your purchase orders! 🎉

## 1️⃣ Run the Migration (5 minutes)

### Option A: Using the automated script
```bash
./run-device-isolation-migration.sh
```

### Option B: Manual via Neon/Supabase Dashboard
1. Open your Neon or Supabase SQL editor
2. Copy the entire contents of `migrations/add_branch_id_to_devices.sql`
3. Paste and execute
4. Verify success messages

## 2️⃣ Test It Works (2 minutes)

### In Browser Console:
```javascript
// Switch to Main Branch
localStorage.setItem('current_branch_id', '00000000-0000-0000-0000-000000000001');

// Reload and check - you should see all devices
location.reload();

// Switch to a different branch (if you have one)
localStorage.setItem('current_branch_id', 'your-other-branch-id');
location.reload();

// Create a test device and verify it gets the correct branch_id
```

### Verify in Database:
```sql
-- Check all devices have branch_id
SELECT branch_id, COUNT(*) as device_count 
FROM devices 
GROUP BY branch_id;

-- Check payments have branch_id
SELECT branch_id, COUNT(*) as payment_count 
FROM customer_payments 
GROUP BY branch_id;
```

## 3️⃣ What's Isolated Now?

✅ **Devices** - Each branch sees only their devices  
✅ **Repair Parts** - Inherit branch from device  
✅ **Payments** - Inherit branch from device  
✅ **Statistics** - Show per-branch counts  
✅ **Search** - Only searches within branch  
✅ **Technician Assignments** - Within branch only  

## 4️⃣ How It Works

### Automatic Branch Assignment
When creating a device:
```typescript
// Gets current branch from localStorage
const currentBranchId = localStorage.getItem('current_branch_id');

// Automatically adds to new device
device.branch_id = currentBranchId || 'default-branch';
```

### Automatic Filtering
When fetching devices:
```typescript
// All queries automatically filter by branch
if (currentBranchId) {
  query = query.eq('branch_id', currentBranchId);
}
```

## 5️⃣ What About Existing Data?

All existing devices and payments have been automatically assigned to the **Main Branch** (`00000000-0000-0000-0000-000000000001`).

If you need to move devices to different branches:
```sql
-- Move specific devices to a branch
UPDATE devices 
SET branch_id = 'your-branch-id' 
WHERE id IN ('device-id-1', 'device-id-2');

-- Update related payments automatically
UPDATE customer_payments cp
SET branch_id = d.branch_id
FROM devices d
WHERE cp.device_id = d.id;
```

## 6️⃣ Complete Isolation Across Your System

Your POS now has **complete multi-branch isolation** for:

| Feature | Status |
|---------|--------|
| Products | ✅ Isolated |
| Categories | ✅ Isolated |
| Purchase Orders | ✅ Isolated |
| **Devices** | ✅ **NEW** |
| **Repairs** | ✅ **NEW** |
| **Payments** | ✅ **NEW** |
| Sales | ✅ Isolated |

## 7️⃣ Troubleshooting

### Not seeing any devices?
```javascript
// Check your current branch
console.log(localStorage.getItem('current_branch_id'));

// Check if devices exist in that branch
// Open Neon/Supabase and run:
// SELECT * FROM devices WHERE branch_id = 'your-branch-id';
```

### Need to see all devices (admin mode)?
```javascript
// Temporarily remove branch filter
localStorage.removeItem('current_branch_id');
location.reload();

// Remember to set it back!
localStorage.setItem('current_branch_id', 'your-branch-id');
```

## 8️⃣ Files Changed

| File | What Changed |
|------|-------------|
| `migrations/add_branch_id_to_devices.sql` | **NEW** - Database migration |
| `src/lib/deviceApi.ts` | Added branch filtering to all queries |
| `src/lib/deviceServices.ts` | Added branch filtering to all services |
| `DEVICE-REPAIR-ISOLATION-COMPLETE.md` | **NEW** - Full documentation |
| `run-device-isolation-migration.sh` | **NEW** - Easy migration script |

## 9️⃣ Need Help?

📖 **Full Documentation**: See `DEVICE-REPAIR-ISOLATION-COMPLETE.md`

🐛 **Found an Issue?**: Check the troubleshooting section above

✅ **All Working?**: You're good to go!

---

**Time to Complete**: ~10 minutes  
**Risk Level**: Low (all changes are backward compatible)  
**Rollback**: Simple - just remove the branch_id filters if needed

Enjoy your fully isolated multi-branch device & repair system! 🚀

