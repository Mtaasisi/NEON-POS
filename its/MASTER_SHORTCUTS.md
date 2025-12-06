# Master Product Generator - All Shortcuts

## 🚀 Samsung Galaxy S Series

### Generate Samsung Products
```bash
./generate_samsung_products.sh
# or
./samsung_shortcut.sh
```

**Output:** 39 products (S21-S25 series with all storage variants)

## 📱 iPhone 17 Series

### Generate iPhone Products
```bash
./generate_iphone_products.sh
# or
./iphone_shortcut.sh
```

**Output:** 14 products (iPhone 17 series with all storage variants)

## 🎯 Quick Commands

### Samsung Galaxy S Series
```bash
# Full generation
./generate_samsung_products.sh

# Quick shortcut
./samsung_shortcut.sh

# Check results
wc -l samsung_products.csv  # 40 lines (39 products + header)
```

### iPhone 17 Series
```bash
# Full generation
./generate_iphone_products.sh

# Quick shortcut
./iphone_shortcut.sh

# Check results
wc -l iphone_products.csv  # 15 lines (14 products + header)
```

## 📊 What You Get

### Samsung Products (samsung_products.csv)
- ✅ 15 Models: S21, S21+, S21 Ultra, S22, S22+, S22 Ultra, S23, S23+, S23 Ultra, S24, S24+, S24 Ultra, S25, S25+, S25 Ultra
- ✅ 39 Products with accurate storage variants
- ✅ GSMArena-level detailed specifications
- ✅ Special features (AI, S Pen, cameras, etc.)
- ✅ Import-ready format

### iPhone Products (iphone_products.csv)
- ✅ 4 Models: iPhone 17, 17 Plus, 17 Pro, 17 Pro Max
- ✅ 14 Products with Apple standard storage
- ✅ Expected iPhone 17 specifications
- ✅ Special features (Face ID, USB-C, ProMotion, etc.)
- ✅ Import-ready format

## 💡 Pro Tips

### Add to Shell Profile
Add these aliases to your `~/.bashrc` or `~/.zshrc`:
```bash
alias samsung-products="cd /Users/mtaasisi/Downloads/NEON-POS-main && ./generate_samsung_products.sh"
alias iphone-products="cd /Users/mtaasisi/Downloads/NEON-POS-main && ./generate_iphone_products.sh"
```

Then just run:
```bash
samsung-products
iphone-products
```

### Combined Generation
```bash
# Generate both catalogs
./generate_samsung_products.sh && ./generate_iphone_products.sh
```

## 📁 File Structure

```
/Users/mtaasisi/Downloads/NEON-POS-main/
├── generate_samsung_products.sh    # Samsung generator
├── generate_iphone_products.sh     # iPhone generator
├── samsung_shortcut.sh             # Samsung quick shortcut
├── iphone_shortcut.sh              # iPhone quick shortcut
├── samsung_products.csv           # Generated Samsung catalog
├── iphone_products.csv            # Generated iPhone catalog
├── README_Samsung_Products.md     # Samsung documentation
├── README_iPhone_Products.md      # iPhone documentation
└── MASTER_SHORTCUTS.md            # This file
```

## 🔄 Re-generation

**Both scripts are safe to re-run:**
- Overwrites previous files
- No cleanup needed
- Always generates fresh data

## 📈 Usage Examples

```bash
# Generate Samsung catalog
./samsung_shortcut.sh

# Generate iPhone catalog
./iphone_shortcut.sh

# Check both files
ls -la *_products.csv
wc -l *_products.csv

# Import both to your system
# Upload samsung_products.csv and iphone_products.csv
```

---

**Master shortcuts for maximum productivity! 🎉**
