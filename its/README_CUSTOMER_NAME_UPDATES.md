# 🎯 Customer Name Update - Complete Solution

## 📊 Current Status

**Database Analysis Results:**
- ✅ Total customers with phone numbers: **11,160**
- ⚠️  Customers with "Unknown" names: **8,722** (78%)
- 📁 Exported to: `customer-names-to-update.csv`

---

## 🚀 Quick Start (3 Steps)

### **Option 1: Manual Update (RECOMMENDED - Most Accurate)**

This is the best approach for accurate customer data:

```bash
# Step 1: Already done! You have customer-names-to-update.csv
# Step 2: Open and fill in names
open customer-names-to-update.csv   # Mac
# or: start customer-names-to-update.csv  # Windows
# or: xdg-open customer-names-to-update.csv  # Linux

# Step 3: After filling in names, import them
node update-customers-from-csv.mjs customer-names-to-update.csv
```

**📝 CSV Format:**
```csv
phone,name,current_name,total_spent,total_purchases,last_purchase
+255712345678,John Mwangi,Unknown,150000,5,2025-10-20
+255622987654,Mary Kiondo,Unknown,95000,3,2025-10-15
```

💡 **Tips for filling in names:**
- Look up phone numbers in your SMS/WhatsApp
- Ask your staff to identify regular customers
- Start with high-spending customers (sorted at top)
- Leave blank if unknown (script will skip)
- You can do partial updates (don't need to fill all at once)

---

### **Option 2: Auto-Extract from SMS (Limited Success)**

Try to automatically extract names from your SMS data:

```bash
# Preview what names can be found
node preview-sms-name-updates.mjs "/Users/mtaasisi/Downloads/2025-1027-13-59-05.json"

# If results look good, apply updates
node update-customer-names-from-sms.mjs "/Users/mtaasisi/Downloads/2025-1027-13-59-05.json"
```

**Note:** Success rate depends on SMS content. Most effective when messages contain:
- "Jina langu ni [Name]"
- "Mimi ni [Name]"
- Personal introductions

---

### **Option 3: Direct CSV Import**

If you have an existing phone-to-name list:

```bash
# Create your own CSV
echo "phone,name
+255712345678,John Doe
0622123456,Mary Smith" > my-customers.csv

# Import it
node update-customers-from-csv.mjs my-customers.csv
```

---

## 📂 Generated Files

| File | Description | Size |
|------|-------------|------|
| `customer-names-to-update.csv` | Customers needing name updates | 8,722 rows |
| `example-customer-names.csv` | Example format | Sample |
| `SMS_NAME_UPDATE_GUIDE.md` | Detailed documentation | Full guide |

---

## 🛠️ Available Scripts

| Script | Purpose |
|--------|---------|
| `extract-customer-phones-from-transactions.mjs` | Extract customers with unknown names ✅ (Already ran) |
| `update-customers-from-csv.mjs` | Import names from CSV file |
| `preview-sms-name-updates.mjs` | Preview SMS name extraction |
| `update-customer-names-from-sms.mjs` | Auto-update from SMS |

---

## 💡 Recommended Workflow

### **Phase 1: High-Value Customers (Immediate Priority)**

The CSV is sorted by spending, so start with top customers:

```bash
# Edit just the first 50 high-spending customers
head -51 customer-names-to-update.csv > top-50-customers.csv
# Fill in these 50 names
# Then import
node update-customers-from-csv.mjs top-50-customers.csv
```

### **Phase 2: Regular Customers (Short Term)**

Continue with next batch:

```bash
# Next 100 customers
sed -n '1p;52,152p' customer-names-to-update.csv > batch-2.csv
# Fill in names
node update-customers-from-csv.mjs batch-2.csv
```

### **Phase 3: Remaining Customers (Ongoing)**

Process in batches as time permits, or use SMS auto-extraction for bulk.

---

## 🔍 Looking Up Names

### Using SMS Data

Search for phone numbers in your SMS:

```bash
# Search for a specific phone number in SMS
grep "+255712345678" /Users/mtaasisi/Downloads/2025-1027-13-59-05.json | head -5
```

### Using Terminal (Quick Search)

```bash
# Search in CSV
cat customer-names-to-update.csv | grep "255712345678"
```

---

## 📊 Example Results

After updating, you'll see:

```
📊 SUMMARY

Total mappings in CSV: 50
Successfully updated: 48
Not found in database: 2
Multiple matches: 0

✅ Customer names updated successfully!
```

---

## ✅ Success Metrics

**Before:**
- 8,722 customers with "Unknown" names
- Poor customer relationship management
- Difficulty identifying return customers

**After updating:**
- Properly identified customers
- Better customer tracking
- Improved business insights
- Enhanced customer service

---

## 🎓 Advanced Usage

### Update Only Specific Phone Numbers

Create a targeted CSV:

```csv
phone,name
+255712345678,John Mwangi
+255622987654,Mary Kiondo
```

### Batch Processing with Scripts

```bash
# Process CSV in chunks
split -l 100 customer-names-to-update.csv chunk_

# Process each chunk after filling
for file in chunk_*; do
  node update-customers-from-csv.mjs "$file"
done
```

### Verify Updates

Check database after updating:

```sql
-- Count remaining unknowns
SELECT COUNT(*) FROM customers 
WHERE LOWER(name) IN ('unknown', 'customer', 'guest', 'mteja');
```

---

## 🔒 Safety Notes

- ✅ All scripts update only `name` and `updated_at` fields
- ✅ Original data preserved (name changes are tracked)
- ✅ Can revert by keeping backup of current names
- ✅ Multiple runs are safe (idempotent)
- ✅ Dry-run available with preview scripts

---

## 📞 Support & Documentation

- 📄 Detailed guide: `SMS_NAME_UPDATE_GUIDE.md`
- 📁 Example CSV: `example-customer-names.csv`
- 🔧 All scripts are in the project root

---

## 🎉 Next Steps

1. **Immediate:** Update top 50-100 high-spending customers
2. **This week:** Process another 200-500 customers
3. **Ongoing:** Set up process for new customers entering with "Unknown" names

---

**Created:** October 27, 2025  
**POS System:** Neon Database  
**Script Version:** 1.0

🚀 **Ready to update your customer data!**

