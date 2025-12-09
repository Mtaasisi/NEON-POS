# Categories Found in All Backups

This document lists all unique categories found by scanning all backup files in the project.

## Summary

**Total Unique Categories Found: 25**

## Complete List of Categories

1. **Accessories**
2. **Accsesories** (Note: appears to be a typo of "Accessories")
3. **Android Tablets**
4. **Audio & Sound**
5. **Audio Accessories**
6. **Bluetooth Speakers**
7. **CPU**
8. **Chargers**
9. **Computer Accessories**
10. **Computers**
11. **General**
12. **Keyboards**
13. **Laptop**
14. **Laptop Accessories**
15. **MacBook**
16. **Monitors**
17. **Smartphones**
18. **Soundbars**
19. **Spare Parts**
20. **TVs**
21. **Tablets**
22. **Uncategorized**
23. **iPad**
24. **iPhones**
25. **kuchezea** (Note: appears in expense records, may not be a product category)

## Sources Scanned

### Production Backups (PROD BACKUP/)
- `lats_products_2025-12-07_01-43-50.json` - Product data with category field
- `lats_products_2025-12-07_01-43-50.sql` - SQL backup of products
- `lats_categories_2025-12-07_01-43-50.json` - Category table data
- `lats_categories_2025-12-07_01-43-50.sql` - SQL backup of categories table

### Supabase Backups
- `supabase backup 2025-12-07/lats_products_2025-12-07_01-27-01.sql` - Product backup

### Development Backups (DEV BACKUP/)
- `full_backup_2025-12-07.sql` - Full database backup
- `full_backup_pgdump_2025-12-07.sql` - pg_dump backup
- Other schema and data backups

### CSV Template Files
- `products-template-final.csv`
- `products-template-cleaned.csv`
- `products-template.csv`

## Notes

- The category "Accsesories" appears to be a typo and should likely be merged with "Accessories"
- Categories are stored in both:
  - The `lats_categories` table (formal category records)
  - The `category` field in `lats_products` table (string field on products)
- Some categories like "Smartphones" and "Tablets" appear in the formal categories table
- Most categories appear only in the product `category` field

## Category Distribution

### Formal Categories (in lats_categories table):
- Smartphones
- Tablets

### Product-Level Categories (in product.category field):
All 24 categories listed above appear in product records.
