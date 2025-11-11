# 📞 Call Analytics Import Tool

## What This Does

Analyzes your call log CSV and **updates only customer records** with aggregated statistics. **Does NOT store individual call records** in the database.

## Key Findings from Your Data

### 📊 Overview
- **46,597** total call records over **1.9 years** (Oct 2023 - Sep 2025)
- **11,160** unique phone numbers
- **583 hours** of total call time

### 🎯 Customer Tiers (Updated Logic)
- **24 VIP** customers (100+ calls) - 0.2% 👑
- **39 Premium** customers (50-99 calls) - 0.3% ⭐
- **193 Regular** customers (20-49 calls) - 1.7% 🔥
- **521 Active** customers (10-19 calls) - 4.7% ✓
- **1,246 Engaged** customers (5-9 calls) - 11.2% 💬
- **9,137 Interested** customers (1-4 calls) - 81.9% 👤
- **0 Basic** customers (0 calls) - For newly created only •

**Key Point:** Anyone who called even once gets "Interested" status or higher. "Basic" is reserved ONLY for newly created customers with no call history.

### 👑 Your Top Customers
1. **Zana boda boda** - 1,468 calls (10.1 hours)
2. **VERO DADA WA USAFI** - 895 calls (6.2 hours)
3. **Mtaasisi** - 505 calls (6.0 hours)
4. **Joseph** - 499 calls (4.4 hours)
5. **Lyne_venom** - 379 calls (2.3 hours)

### 📞 Call Breakdown
- **42.2%** Incoming (19,662)
- **35.7%** Outgoing (16,651)
- **21.5%** Missed (10,033) ⚠️

### 💡 Action Items
- **24 VIP customers** need special treatment/loyalty program
- **316 customers** with 5+ missed calls need follow-up
- **8,594 "Unknown" contacts** need names added
- **21.5% missed call rate** - consider staffing improvements

## What Gets Updated in Database

### For Each Customer, These Fields Are Updated:

| Field | What Gets Set |
|-------|--------------|
| `name` | Best name from call logs (if not "Unknown") |
| `phone` | Phone number from calls |
| `total_calls` | Total number of all calls |
| `incoming_calls` | Count of incoming calls |
| `outgoing_calls` | Count of outgoing calls |
| `missed_calls` | Count of missed calls |
| `total_call_duration_minutes` | Sum of all call durations |
| `avg_call_duration_minutes` | Average call length |
| `first_call_date` | Date of first ever call |
| `last_call_date` | Date of most recent call |
| `last_activity_date` | Most recent call date |
| `call_loyalty_level` | VIP/Premium/Regular/Active/Basic |
| `color_tag` | vip/premium/regular/active/new |
| `loyalty_level` | platinum/gold/silver/bronze |
| `created_at` | Set to first call date (if earlier) |
| `joined_date` | First call date |

### Customer Tier Logic

**👑 VIP** (100+ calls):
- `call_loyalty_level`: "VIP"
- `color_tag`: "vip"
- `loyalty_level`: "platinum"
- **Action**: Offer exclusive deals, priority support

**⭐ Premium** (50-99 calls):
- `call_loyalty_level`: "Premium"
- `color_tag`: "premium"
- `loyalty_level`: "platinum"
- **Action**: Special discounts, loyalty rewards

**🔥 Regular** (20-49 calls):
- `call_loyalty_level`: "Regular"
- `color_tag`: "regular"
- `loyalty_level`: "gold"
- **Action**: Regular customer benefits

**✓ Active** (10-19 calls):
- `call_loyalty_level`: "Active"
- `color_tag`: "active"
- `loyalty_level`: "silver"
- **Action**: Encourage more engagement

**💬 Engaged** (5-9 calls):
- `call_loyalty_level`: "Engaged"
- `color_tag`: "engaged"
- `loyalty_level`: "silver"
- **Action**: Build relationship

**👤 Interested** (1-4 calls):
- `call_loyalty_level`: "Interested"
- `color_tag`: "interested"
- `loyalty_level`: "bronze"
- **Action**: Convert to regular customer

**• Basic** (0 calls - newly created only):
- `call_loyalty_level`: "Basic"
- `color_tag`: "new"
- `loyalty_level`: "bronze"
- **Action**: First contact needed

## How to Use

### 1. Preview (Safe - No Changes)
```bash
cd "/Users/mtaasisi/Downloads/POS-main NEON DATABASE/scripts"
python3 preview_call_analytics.py
```

### 2. Install Dependencies
```bash
pip3 install -r requirements.txt
```

### 3. Run Import (Updates Database)
```bash
python3 import_call_analytics.py
```

## What Happens During Import

1. **Reads CSV** - Parses all 46,597 call records
2. **Aggregates Data** - Groups by phone number
3. **Calculates Statistics** - Totals, averages, tiers
4. **Matches Customers** - Finds existing customers by phone
5. **Updates Records** - Updates customer statistics
6. **Creates New Customers** - For phone numbers not in database
7. **Prints Report** - Shows what was updated

## Safety Features

✅ **Updates existing customers** - Preserves their purchase history, points, etc.  
✅ **Creates missing customers** - Adds new customers from call logs  
✅ **Keeps best name** - If customer has a name, keeps it. Otherwise uses name from calls  
✅ **Earliest creation date** - Uses earliest date between existing `created_at` and first call  
✅ **Commits in batches** - Updates 100 records at a time  
✅ **Error handling** - Skips problematic records, continues processing  

## Benefits for Your Business

### 🎯 Customer Segmentation
- Identify your VIP customers automatically
- Focus marketing on high-engagement customers
- Spot at-risk customers (high missed calls)

### 💰 Revenue Opportunity
- 24 VIP customers deserve loyalty rewards
- 316 customers with missed calls need follow-up
- 8,594 unknown contacts could be new sales leads

### 📊 Business Intelligence
- See which customers engage most
- Understand call patterns over time
- Measure customer relationship strength

### ⚡ Operational Insights
- 21.5% missed call rate indicates staffing need
- Peak call times for scheduling
- Average call duration for time planning

## Next Steps

After running the import:

1. **Check VIP customers** in your POS
   ```sql
   SELECT name, phone, total_calls, call_loyalty_level 
   FROM customers 
   WHERE call_loyalty_level = 'VIP' 
   ORDER BY total_calls DESC;
   ```

2. **Review missed calls**
   ```sql
   SELECT name, phone, missed_calls, total_calls 
   FROM customers 
   WHERE missed_calls >= 5 
   ORDER BY missed_calls DESC;
   ```

3. **Find unknown contacts**
   ```sql
   SELECT phone, total_calls 
   FROM customers 
   WHERE name = 'Unknown' 
   ORDER BY total_calls DESC 
   LIMIT 20;
   ```

4. **Build loyalty program** for VIP customers
5. **Create follow-up tasks** for missed calls
6. **Update names** for unknown contacts

## Questions?

This tool is designed to enrich your customer data WITHOUT cluttering your database with individual call records. You get the insights without the overhead!

