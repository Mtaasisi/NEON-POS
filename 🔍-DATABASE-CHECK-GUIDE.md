# 🔍 Database Health Check Guide

## ✅ Check If Your Database Is Perfect

I've created **2 powerful scripts** to check your integrations database health!

---

## 🎯 Quick Start

### Option 1: Quick Check (30 seconds)
**Use this for a fast status check**

```sql
-- File: QUICK-DATABASE-CHECK.sql
-- Run in your Neon database console
```

**What it checks:**
- ✅ Does table exist?
- ✅ How many integrations?
- ✅ List all integrations
- ✅ Any issues?

**Output Example:**
```
Status: ✅ Table exists

Total | Enabled | Active
------|---------|-------
  3   |    2    |   2

Name              | Provider   | Enabled | Mode      | Requests
------------------|------------|---------|-----------|----------
SMS_GATEWAY       | MShastra   | ✅      | 🧪 Test   | 25
WHATSAPP_GATEWAY  | Green API  | ✅      | 🚀 Prod   | 10
EMAIL_SERVICE     | SendGrid   | ❌      | 🧪 Test   | 0

Health Status: ✅ Everything looks good!
```

---

### Option 2: Comprehensive Check (2 minutes)
**Use this for detailed analysis**

```sql
-- File: CHECK-INTEGRATIONS-DATABASE.sql
-- Run in your Neon database console
```

**What it checks (12 steps):**
1. ✅ Table existence
2. ✅ Table structure
3. ✅ Indexes
4. ✅ All integrations
5. ✅ Statistics
6. ✅ Credentials status
7. ✅ Usage statistics
8. ✅ Health assessment
9. ✅ Potential issues
10. ✅ Data integrity
11. ✅ Summary report
12. ✅ Final health status

---

## 🚀 How to Run

### Step 1: Open Neon Console
1. Go to: https://console.neon.tech
2. Select your project
3. Click "SQL Editor"

### Step 2: Choose Your Check
- **Quick:** Copy `QUICK-DATABASE-CHECK.sql`
- **Detailed:** Copy `CHECK-INTEGRATIONS-DATABASE.sql`

### Step 3: Run
1. Paste the SQL in the editor
2. Click "Run" or press Ctrl+Enter
3. View results!

---

## 📊 What Each Check Shows

### Quick Check Shows:
```
✅ Table Status
📊 Integration Counts
📋 Integration List
🏥 Health Status
```

### Comprehensive Check Shows:
```
📋 Table Status
🏗️  Table Structure (all columns)
📑 Indexes (performance)
📊 All Integrations (detailed)
📈 Statistics (counts by status)
🔐 Credentials Status (without exposing secrets)
📊 Usage Statistics (requests, success rate)
🏥 Health Assessment (status, performance)
🔍 Issues Detection (missing creds, failures, etc.)
🔬 Data Integrity (UUIDs, types, timestamps)
📋 Summary Report (overview)
🏁 Final Health Status (overall verdict)
```

---

## ✅ Perfect Condition Checklist

Your database is in **PERFECT CONDITION** if:

- [x] ✅ Table exists
- [x] ✅ All indexes present
- [x] ✅ All integrations have credentials
- [x] ✅ No enabled integrations without credentials
- [x] ✅ No high failure rates (>20%)
- [x] ✅ All UUIDs valid
- [x] ✅ All timestamps present
- [x] ✅ All integration types valid
- [x] ✅ Environment values valid

**If all checked:** 
```
✅ DATABASE IS IN PERFECT CONDITION! ✅
```

---

## ⚠️ Common Issues & Fixes

### Issue 1: Table Doesn't Exist
**Check shows:** `❌ Table NOT found`

**Fix:**
```sql
-- Run this file:
CREATE-INTEGRATIONS-SETTINGS.sql
```

### Issue 2: No Integrations
**Check shows:** `Total Integrations: 0`

**Fix:**
1. Go to Admin Settings → Integrations
2. Click any integration card
3. Fill in credentials
4. Enable and Save

### Issue 3: Enabled Without Credentials
**Check shows:** `⚠️ Some enabled integrations missing credentials`

**Fix:**
1. Admin Settings → Integrations
2. Find the integration
3. Click Edit
4. Add missing credentials
5. Save

### Issue 4: High Failure Rate
**Check shows:** `❌ High Failure Rate (>20%)`

**Fix:**
1. Check credentials are correct
2. Test integration
3. Update API keys if expired
4. Check API service status

### Issue 5: Not Used in 30+ Days
**Check shows:** `⚠️ Not Used in 30+ Days`

**Fix:**
- Either use it or disable it
- Remove if no longer needed

---

## 📋 Reading the Results

### Health Status Indicators:

**✅ Green:** Everything perfect
- Table exists
- Credentials configured
- No issues found

**⚠️ Yellow:** Minor issues
- Missing some config
- Never used
- Needs attention

**❌ Red:** Critical issues
- Table missing
- No credentials
- High failures

### Performance Ratings:

**✅ Excellent:** >95% success rate
**⚠️ Good:** 80-95% success rate
**❌ Needs Attention:** <80% success rate
**🆕 Never Used:** 0 requests

---

## 🎯 Regular Maintenance

### Daily:
- Quick check before important operations
- Verify critical integrations are active

### Weekly:
- Run comprehensive check
- Review usage statistics
- Check for failed requests

### Monthly:
- Review unused integrations
- Update credentials if needed
- Check for performance issues

---

## 💡 Pro Tips

### Tip 1: Save the Output
```sql
-- Add this at the top to save to file:
\o /path/to/output.txt

-- Your check SQL here

\o
```

### Tip 2: Schedule Checks
Set up a cron job or scheduled task:
```bash
# Check daily at 9 AM
0 9 * * * psql $DATABASE_URL -f QUICK-DATABASE-CHECK.sql
```

### Tip 3: Monitor Trends
- Track success rates over time
- Watch for declining performance
- Monitor request volume

### Tip 4: Alert on Issues
```sql
-- Example: Get alerts for failures
SELECT 
  integration_name,
  failed_requests
FROM lats_pos_integrations_settings
WHERE failed_requests > 10
  AND failed_requests::float / total_requests > 0.2;
```

---

## 🔥 Quick Commands

### Check table exists:
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'lats_pos_integrations_settings'
);
```

### Count integrations:
```sql
SELECT COUNT(*) FROM lats_pos_integrations_settings;
```

### List enabled:
```sql
SELECT integration_name, provider_name 
FROM lats_pos_integrations_settings 
WHERE is_enabled = true;
```

### Check last usage:
```sql
SELECT integration_name, last_used_at 
FROM lats_pos_integrations_settings 
ORDER BY last_used_at DESC;
```

### Success rate:
```sql
SELECT 
  integration_name,
  ROUND((successful_requests::float / total_requests * 100)::numeric, 2) || '%' as rate
FROM lats_pos_integrations_settings
WHERE total_requests > 0;
```

---

## 🎊 Expected Output

### When Everything is Perfect:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ DATABASE IS IN PERFECT CONDITION! ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Integrations: 5
Enabled: 4
Active: 4
Test Mode: 2
Production: 2

Total API Requests: 1,250
Successful: 1,235
Failed: 15
Average Success Rate: 98.80%

✅ No issues found - Everything looks great!
```

---

## 🆘 Need Help?

If check shows issues:
1. Read the error message
2. Check the "Common Issues" section above
3. Review your credentials in Admin Settings
4. Test integrations at `/integrations-test`
5. Re-run check after fixing

---

## 📚 Related Files

- `CREATE-INTEGRATIONS-SETTINGS.sql` - Create table
- `MANAGE-INTEGRATIONS.sql` - Management queries
- `EXAMPLE-INTEGRATIONS-INSERT.sql` - Sample data
- Admin Settings → Integrations - Add/edit integrations
- `/integrations-test` - Test integrations

---

## ✅ You're All Set!

Run these checks to ensure your database is in perfect condition!

**Quick Check:** 30 seconds
**Comprehensive Check:** 2 minutes

Both will give you complete confidence that everything is working perfectly! 🎉

---

**Happy checking! 🔍**

