# ✅ Day Session Testing Checklist

## Prerequisites
- [ ] Database migration `setup-day-sessions.sql` has been run successfully
- [ ] POS app is running (`npm run dev` or `yarn dev`)
- [ ] You have access to the POS page

## Test Scenario 1: Fresh Start (First Time)

### Steps:
1. [ ] Open POS page for the first time today
2. [ ] **Expected**: No modal appears, session starts automatically
3. [ ] Check browser console - should see: `"🆕 No active session, creating one..."`
4. [ ] Make 2-3 test sales
5. [ ] **Expected**: Counter at top shows cumulative total (e.g., TZS 50,000)

**✅ Pass if**: 
- Session created automatically
- Sales counter updates correctly

---

## Test Scenario 2: Close and Reopen Day

### Steps:
1. [ ] Make 3 sales (note the total, e.g., TZS 100,000)
2. [ ] Click **"Close Day"** button in top bar
3. [ ] **Expected**: Daily Closing Modal appears
4. [ ] Enter passcode: `1234`
5. [ ] Click "Close Day"
6. [ ] **Expected**: Day closes successfully
7. [ ] **Expected**: Day Opening Modal appears automatically
8. [ ] Enter passcode: `1234` to open new day
9. [ ] **Expected**: Success message "🎉 New day started! Counter reset."
10. [ ] **Expected**: Counter shows **TZS 0** (IMPORTANT!)
11. [ ] Make 2 new sales (e.g., TZS 30,000 + TZS 20,000)
12. [ ] **Expected**: Counter shows **TZS 50,000** (NOT 150,000!)

**✅ Pass if**: 
- Counter resets to TZS 0 after opening
- Only new sales are counted
- Previous sales don't appear in count

---

## Test Scenario 3: Refresh Page After Opening

### Steps:
1. [ ] After opening a new day (from Scenario 2)
2. [ ] Make 1 sale (e.g., TZS 10,000)
3. [ ] Note the counter total
4. [ ] Refresh the page (F5 or Cmd+R)
5. [ ] **Expected**: Counter shows same total, session persists
6. [ ] Make another sale
7. [ ] **Expected**: Counter updates correctly

**✅ Pass if**: 
- Session persists after page refresh
- Counter doesn't reset unexpectedly

---

## Test Scenario 4: View Payment Tracking

### Steps:
1. [ ] Open new day and make 2 sales
2. [ ] Click "Payments" button in top bar
3. [ ] **Expected**: Payment Tracking Modal opens
4. [ ] **Expected**: You see all transactions (including previous sessions)
5. [ ] Use date filters to filter transactions

**✅ Pass if**: 
- Payment tracking shows all transactions (session-independent)
- Filters work correctly

---

## Test Scenario 5: Database Verification

### Check Sessions Table:
```sql
SELECT 
  date,
  opened_at,
  opened_by,
  is_active
FROM daily_opening_sessions 
WHERE date = CURRENT_DATE
ORDER BY opened_at DESC;
```

**✅ Pass if**: 
- [ ] You see session records for today
- [ ] Most recent session has `is_active = true`
- [ ] Previous sessions (if reopened) have `is_active = false`

### Check Sales Query:
```sql
-- Get current active session
SELECT opened_at 
FROM daily_opening_sessions 
WHERE is_active = true 
AND date = CURRENT_DATE;

-- Then use that time to check sales
-- (Replace '2025-10-11 13:00:00' with your session start time)
SELECT 
  sale_number,
  total_amount,
  created_at
FROM lats_sales 
WHERE created_at >= '2025-10-11 13:00:00'
ORDER BY created_at DESC;
```

**✅ Pass if**: 
- Sales after session start are returned
- Count matches what's shown in POS

---

## Test Scenario 6: Console Logs Verification

### Open Browser Console (F12) and check for:

When opening POS:
```
✅ Active session found, started at: 2025-10-11T13:00:00.000Z
```
OR
```
🆕 No active session, creating one...
✅ New session created: { id: "...", opened_at: "..." }
```

When day is closed:
```
🔒 Day is closed, showing opening modal
```

When opening new day:
```
🔓 Opening new day session...
✅ New session created: { ... }
```

When making sales:
```
📊 Session sales (since 1:00:00 PM): 3 transactions, Total: 50000
```

**✅ Pass if**: 
- Console logs show session management working
- No errors in console

---

## Common Issues & Solutions

### ❌ Issue: Counter still shows old transactions after opening new day

**Solution**:
1. Check browser console for errors
2. Verify session was created: 
   ```sql
   SELECT * FROM daily_opening_sessions WHERE is_active = true;
   ```
3. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

### ❌ Issue: "Table doesn't exist" error

**Solution**: Run the database migration:
```sql
-- Copy contents of setup-day-sessions.sql and run in Neon SQL Editor
```

### ❌ Issue: Can't close/open day

**Solution**: 
1. Default passcode is `1234`
2. Check if buttons are visible (user permissions)
3. Check console for errors

### ❌ Issue: Session not persisting after refresh

**Solution**:
1. Check database connection
2. Verify session exists in database:
   ```sql
   SELECT * FROM daily_opening_sessions WHERE date = CURRENT_DATE;
   ```

---

## Success Criteria Summary

Your implementation is successful if:

✅ **Counter resets to TZS 0** when opening a new day  
✅ **Only new transactions** are counted after opening  
✅ **Previous transactions** are hidden from current session count  
✅ **All transactions** are preserved in database  
✅ **Session persists** after page refresh  
✅ **Console logs** show clear session management  
✅ **No errors** in browser console  

---

## Performance Verification

### Check Query Performance:
```sql
EXPLAIN ANALYZE
SELECT * FROM lats_sales 
WHERE created_at >= (
  SELECT opened_at 
  FROM daily_opening_sessions 
  WHERE is_active = true 
  AND date = CURRENT_DATE
);
```

**✅ Pass if**: 
- Query executes in < 100ms
- Indexes are being used

---

## Next Steps After Testing

Once all tests pass:

1. [ ] Train staff on new day opening/closing process
2. [ ] Document the passcode (currently: `1234`)
3. [ ] Consider customizing the passcode
4. [ ] Set up end-of-day reports to compare sessions
5. [ ] Monitor for a few days to ensure stability

---

## Need Help?

If any test fails:
1. Check the console logs (F12)
2. Verify the database migration ran successfully
3. Check the `DAY-SESSION-SETUP-README.md` for troubleshooting
4. Look at `SESSION-FLOW-DIAGRAM.md` to understand the flow

**Pro Tip**: Keep the browser console open (F12) while testing to see real-time logs! 🎯

