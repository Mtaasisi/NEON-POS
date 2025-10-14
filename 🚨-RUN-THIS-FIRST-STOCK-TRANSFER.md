# 🚨 RUN THIS FIRST - Stock Transfer Setup

## ⚠️ Database Error Detected

Your Stock Transfer UI is working, but the database table doesn't exist yet!

**Error:** `Failed to fetch transfers` - This means the `branch_transfers` table needs to be created.

---

## ✅ SOLUTION: Run the SQL Setup Script

### Step 1: Open Neon SQL Editor

1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Click **"SQL Editor"** in the sidebar

### Step 2: Copy and Paste the Setup Script

**Option A: Use the file**
- Open: `SETUP-STOCK-TRANSFER-TABLE.sql`
- Copy ALL contents
- Paste into SQL Editor

**Option B: Quick Copy-Paste** (see below)

### Step 3: Run the Script

1. Click **"Run"** button
2. Wait for completion (should take 2-3 seconds)
3. Look for success message: `✅ STOCK TRANSFER SETUP COMPLETE!`

### Step 4: Refresh Your Browser

1. Go back to your POS app
2. Press **Ctrl+R** (Windows) or **Cmd+R** (Mac)
3. Click **"Stock Transfers"** in sidebar
4. Page should now load without errors! ✅

---

## 📋 Quick Copy-Paste SQL Script

Copy this entire block and paste into Neon SQL Editor:

```sql
-- STOCK TRANSFER TABLE SETUP
CREATE TABLE IF NOT EXISTS branch_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_branch_id UUID NOT NULL REFERENCES store_locations(id) ON DELETE CASCADE,
  to_branch_id UUID NOT NULL REFERENCES store_locations(id) ON DELETE CASCADE,
  transfer_type TEXT NOT NULL DEFAULT 'stock' CHECK (transfer_type IN ('stock', 'customer', 'product')),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  quantity INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_transit', 'completed', 'rejected', 'cancelled')),
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_branch_transfers_from_branch ON branch_transfers(from_branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_to_branch ON branch_transfers(to_branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_status ON branch_transfers(status);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_type ON branch_transfers(transfer_type);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_entity ON branch_transfers(entity_id);

-- Create Functions
CREATE OR REPLACE FUNCTION reduce_variant_stock(p_variant_id UUID, p_quantity INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM lats_product_variants WHERE id = p_variant_id AND quantity >= p_quantity) THEN
    RAISE EXCEPTION 'Insufficient stock or variant not found';
  END IF;
  UPDATE lats_product_variants SET quantity = quantity - p_quantity, updated_at = NOW() WHERE id = p_variant_id;
END; $$;

CREATE OR REPLACE FUNCTION increase_variant_stock(p_variant_id UUID, p_quantity INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE lats_product_variants SET quantity = quantity + p_quantity, updated_at = NOW() WHERE id = p_variant_id;
END; $$;

-- Grant Permissions
GRANT SELECT, INSERT, UPDATE ON branch_transfers TO authenticated;
GRANT EXECUTE ON FUNCTION reduce_variant_stock TO authenticated;
GRANT EXECUTE ON FUNCTION increase_variant_stock TO authenticated;

-- Enable RLS
ALTER TABLE branch_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view transfers" ON branch_transfers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create transfers" ON branch_transfers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update transfers" ON branch_transfers FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Success Message
SELECT '✅ Stock Transfer Setup Complete!' as status;
```

---

## 🎯 What This Script Does

1. ✅ Creates `branch_transfers` table
2. ✅ Adds 5 indexes for fast queries
3. ✅ Creates 2 functions for stock management
4. ✅ Sets up Row Level Security (RLS)
5. ✅ Grants proper permissions

---

## 🔍 Verify It Worked

After running the script, check:

```sql
-- Check if table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'branch_transfers';

-- Should return: branch_transfers ✅
```

```sql
-- Check if functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_name LIKE '%stock%';

-- Should return:
-- reduce_variant_stock ✅
-- increase_variant_stock ✅
```

---

## 🚨 Troubleshooting

### Error: "relation store_locations does not exist"
**Solution:** Make sure your `store_locations` table exists first.

### Error: "permission denied"
**Solution:** Make sure you're connected as the database owner.

### Error: "auth.users does not exist"
**Solution:** You're using Supabase/Neon. The script handles this - it's optional.

### Still getting errors in UI?
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Check browser console for specific error
4. Verify you're logged in as admin

---

## ✅ Success Checklist

- [ ] Ran SQL script in Neon console
- [ ] Saw success message
- [ ] Refreshed browser
- [ ] Stock Transfers page loads without errors
- [ ] Can see empty state (no transfers yet)
- [ ] "New Transfer" button appears

---

## 🎉 Next Steps After Setup

1. **Create your first transfer:**
   - Click "New Transfer"
   - Select destination branch
   - Choose a product
   - Enter quantity
   - Submit!

2. **Test the workflow:**
   - Create a transfer
   - Approve it (switch branches if needed)
   - Mark in transit
   - Complete transfer
   - Check inventory updated

3. **Add to your workflow:**
   - Train your team
   - Document your process
   - Set up regular transfers if needed

---

## 📞 Need Help?

If you're still seeing errors after running the script:

1. Check the browser console for the exact error
2. Verify the table was created:
   ```sql
   SELECT * FROM branch_transfers LIMIT 1;
   ```
3. Make sure you have branches set up in `store_locations`
4. Ensure you're logged in as admin

---

**🚀 Ready? Run the SQL script now and refresh your browser!**

