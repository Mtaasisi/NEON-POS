# 📱 SMS/Receipt Message Customization Guide

## Overview
You can now customize the SMS receipt messages sent to your customers directly from POS Settings! No more hardcoded messages! 🎉

## What Changed?

### Before ❌
SMS messages were hardcoded:
```
Thank you for your purchase!
Sale #SALE-77626929-6EFV
Items: Min Mac A1347 x1
Total: TZS 32,434
Payment: TIGO PESA
Thank you for choosing us!
```

### After ✅
You can now customize the **header** and **footer** messages from POS Settings!

## How to Use

### Step 1: Run the Database Migration
First, add the new fields to your database:

```bash
# Run this SQL file in your Neon database
psql -h your-neon-host -U your-user -d your-database -f ADD-SMS-MESSAGE-FIELDS.sql
```

Or manually execute the SQL in your Neon SQL Editor:
- Open Neon Console → SQL Editor
- Copy and paste the content from `ADD-SMS-MESSAGE-FIELDS.sql`
- Run the queries

### Step 2: Access POS Settings
1. Open your POS system
2. Go to **Settings** → **POS Settings**
3. Click on **Receipt Settings** tab

### Step 3: Customize Messages
Scroll down to the **SMS/Receipt Message** section where you'll see:

- **SMS Header Message**: The greeting that appears at the top
  - Default: "Thank you for your purchase!"
  - Examples:
    - "🎉 Thanks for shopping with us!"
    - "Asante sana kwa ununuzi wako!" (Swahili)
    - "We appreciate your business!"

- **SMS Footer Message**: The closing that appears at the bottom
  - Default: "Thank you for choosing us!"
  - Examples:
    - "Come back soon! 😊"
    - "Karibu tena!" (Swahili)
    - "Visit us again for more great deals!"

### Step 4: Save Settings
Click the **Save** button at the bottom of the settings page.

### Step 5: Test It!
Make a test sale and the SMS sent to your customer will now use your custom messages!

## Example Customizations

### Professional Style
```
Header: "Thank you for your purchase!"
Footer: "For support, call +255 XXX XXX XXX"
```

### Friendly Style
```
Header: "Yay! Thanks for shopping! 🛍️"
Footer: "See you again soon! ❤️"
```

### Bilingual (English/Swahili)
```
Header: "Thank you! Asante sana!"
Footer: "Come back soon! Karibu tena!"
```

### Promotional
```
Header: "Thanks for shopping with us! 🎁"
Footer: "Next purchase gets 10% OFF! 💝"
```

## Message Format

The complete SMS will look like this:
```
[SMS Header Message]
Sale #[Sale Number]
Items: [Product List]
Total: [Total Amount]
Payment: [Payment Method]
[SMS Footer Message]
```

## Tips & Best Practices

1. **Keep it Short**: SMS has character limits, keep messages concise
2. **Be Clear**: Use simple, friendly language
3. **Add Value**: Consider including useful info like support contact
4. **Test First**: Make a test sale to see how it looks
5. **Use Emojis Sparingly**: They work in SMS but don't overdo it
6. **Localize**: Use your customers' language for better engagement

## Troubleshooting

### Messages not updating?
1. Make sure you clicked **Save** in POS Settings
2. Clear your browser cache and refresh
3. Check that the database migration ran successfully

### Still seeing old messages?
The system will use default messages if settings can't be loaded. Check:
1. Database migration was successful
2. No errors in browser console
3. POS Settings are loading correctly

## Technical Details

### Files Modified
- `src/lib/posSettingsApi.ts` - Added SMS message fields to ReceiptSettings
- `src/lib/saleProcessingService.ts` - Updated to load messages from settings
- `src/features/lats/components/pos/ReceiptSettings.tsx` - Added UI controls

### Database Schema
```sql
ALTER TABLE lats_pos_receipt_settings
ADD COLUMN sms_header_message TEXT DEFAULT 'Thank you for your purchase!',
ADD COLUMN sms_footer_message TEXT DEFAULT 'Thank you for choosing us!';
```

## Support

If you need help:
1. Check the console for errors (F12 in browser)
2. Verify database migration ran successfully
3. Make sure you're saving settings correctly

---

**Enjoy your customizable SMS receipts! 🚀**

