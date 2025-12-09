# Product CSV Export Template

## Overview

The `export-products-to-csv.mjs` script exports all products from your database to a CSV file that can be used as a template for future product imports.

## Usage

### Export Products to CSV

```bash
# Export to default filename (products-export-YYYY-MM-DD.csv)
node export-products-to-csv.mjs

# Export to custom filename
node export-products-to-csv.mjs my-products-template.csv
```

## CSV Structure

The exported CSV includes the following columns:

### Product Information
- **Product Name** - Name of the product
- **Product SKU** - Product SKU code
- **Product Barcode** - Product barcode
- **Description** - Full product description
- **Short Description** - Brief product description
- **Category Name** - Product category name
- **Category ID** - Category UUID (for reference)
- **Supplier Name** - Supplier name
- **Supplier ID** - Supplier UUID (for reference)
- **Condition** - Product condition (new, used, refurbished)
- **Is Active** - Whether product is active (Yes/No)
- **Images (semicolon separated)** - Product image URLs separated by semicolons
- **Metadata (JSON)** - Additional product metadata in JSON format

### Variant Information
- **Variant SKU** - Variant-specific SKU
- **Variant Name** - Variant name
- **Variant Barcode** - Variant barcode
- **Variant Type** - Type of variant (standard, parent, imei_child)
- **Is Parent Variant** - Whether this is a parent variant (Yes/No)
- **Parent Variant SKU** - SKU of parent variant (if applicable)
- **Cost Price** - Cost price of the variant
- **Selling Price** - Selling price of the variant
- **Quantity** - Stock quantity
- **Min Quantity** - Minimum stock level
- **Weight** - Variant weight
- **Dimensions (JSON)** - Variant dimensions in JSON format
- **Variant Attributes (JSON)** - Additional variant attributes in JSON
- **IMEI** - IMEI number (for tracked items)
- **Serial Number** - Serial number (for tracked items)
- **Variant Is Active** - Whether variant is active (Yes/No)
- **Branch ID** - Branch UUID where variant is located
- **Created At** - Creation timestamp
- **Updated At** - Last update timestamp

## Using as Template

1. **Open the CSV file** in Excel, Google Sheets, or any spreadsheet application
2. **Edit the data** as needed:
   - Modify existing products
   - Add new products by copying rows
   - Update prices, quantities, etc.
3. **Save the file** maintaining CSV format
4. **Import back** using your product import functionality

## Notes

- **One row per variant**: Products with variants will have multiple rows (one per variant)
- **Products without variants**: Will have a single row with empty variant fields
- **JSON fields**: Metadata, Dimensions, and Variant Attributes are stored as JSON strings
- **Semicolon-separated lists**: Images are separated by semicolons (`;`)
- **Empty fields**: Can be left empty for optional data

## Example

```csv
Product Name,Product SKU,Product Barcode,Description,Short Description,Category Name,Category ID,Supplier Name,Supplier ID,Condition,Is Active,Images (semicolon separated),Metadata (JSON),Variant SKU,Variant Name,Variant Barcode,Variant Type,Is Parent Variant,Parent Variant SKU,Cost Price,Selling Price,Quantity,Min Quantity,Weight,Dimensions (JSON),Variant Attributes (JSON),IMEI,Serial Number,Variant Is Active,Branch ID,Created At,Updated At
iPhone 15 Pro,SKU-12345,1234567890,Latest iPhone model,New iPhone,Smartphones,abc-123,Apple Supplier,def-456,new,Yes,https://example.com/img1.jpg,{"color":"blue"},SKU-12345-128GB,128GB,1234567891,standard,No,,800,1200,10,5,200,{"length":10,"width":5,"height":1},{},"","",Yes,branch-123,2025-01-01,2025-01-01
```

## Database Connection

The script automatically detects your database configuration:
- **Supabase**: Uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env.production`
- **Direct PostgreSQL**: Uses `DATABASE_URL` or `VITE_DATABASE_URL` from `.env.production`

Make sure your `.env.production` file contains the necessary credentials.
