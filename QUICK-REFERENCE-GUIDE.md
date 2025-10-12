# 🚀 Retail Floor Management - Quick Reference Guide

## 📊 Dashboard Overview

### Statistics Cards (Top Row)
```
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ Total Rooms │Active Rooms │Total Shelves│Secure Rooms │Capacity Used│
│     🏢      │     📦      │     📐      │     🛡️      │     📊      │
│     24      │     20      │    156      │      8      │     67%     │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

---

## 🔍 Search & Filters

### Search Bar
```
┌─────────────────────────────────────┐
│ 🔍 Search code or name...           │
└─────────────────────────────────────┘
```

### Quick Filters
```
[ All Rows ]  [ Empty ]  [ Full ]  [ Needs Attention ]
   (blue)      (green)   (orange)      (red)
```

### Advanced Filters
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ All Types ▼  │  │ All Rows ▼   │  │ Expand All   │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 👁️ View Modes

### 1. Table View (List) 📋
```
┌───────────────────────────────────────────────────────┐
│ ☑ Code ↑ │ Name ↑ │ Row ↑ │ Column │ Type ↑ │ Actions │
├───────────────────────────────────────────────────────┤
│ Row A (2 shelves)                              ▼      │
│   □ BD1   Display 1   D   1   standard   🔧 🗑️       │
│   □ BD2   Display 2   D   1   standard   🔧 🗑️       │
└───────────────────────────────────────────────────────┘
```

**Features:**
- ✅ Sortable columns (click header)
- ✅ Checkbox selection
- ✅ Collapsible rows
- ✅ Individual actions

### 2. Grid View 🔲
```
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ BD1  │ │ BD2  │ │ BD3  │ │ BD4  │ │ BD5  │ │ BD6  │
│☑     │ │☑     │ │☑     │ │☑     │ │☑     │ │☑     │
│Display│ │Display│ │Display│ │Display│ │Display│ │Display│
│●●    │ │●     │ │●●●   │ │●     │ │●●    │ │●     │
└──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
```

**Features:**
- ✅ Card-based layout
- ✅ Visual status indicators
- ✅ Click to select
- ✅ Responsive grid

### 3. Visual Layout 🗺️
```
Floor Plan View
┌─────────────────────────────────────┐
│ Row D                               │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐     │
│ │BD1│ │BD2│ │BD3│ │BD4│ │BD5│     │
│ └───┘ └───┘ └───┘ └───┘ └───┘     │
│                                     │
│ Row C                               │
│ ┌───┐ ┌───┐ ┌───┐                 │
│ │BC1│ │BC2│ │BC3│                 │
│ └───┘ └───┘ └───┘                 │
└─────────────────────────────────────┘
```

**Features:**
- ✅ Floor plan visualization
- ✅ Color-coded status
- ✅ Interactive selection
- ✅ Spatial awareness

---

## 🎯 Status Indicators

### Visual Legend
```
Status:
● Green  = Active
● Gray   = Inactive

Features:
● Blue   = Refrigerated
● Orange = Requires Ladder
● Red    = Not Accessible

Types:
[ Standard ] [ Refrigerated ] [ Display ]
  (gray)        (blue)         (purple)
```

### Shelf Card Example
```
┌────────────────┐
│ BD1         ☑  │  ← Code & Checkbox
│ Display 1      │  ← Name
│ ●●●           │  ← Status dots
└────────────────┘
  │││
  ││└── Not Accessible (red)
  │└─── Requires Ladder (orange)
  └──── Active (green)
```

---

## ⚡ Bulk Operations

### When Shelves Selected:
```
┌──────────────────────────────────────────────────────┐
│ [ 5 selected ]  [Activate]  [Deactivate]  [🔖Print]  [🗑️Delete] │
└──────────────────────────────────────────────────────┘
```

### Actions:
- **Activate** - Enable selected shelves
- **Deactivate** - Disable selected shelves
- **Print Labels** - Generate QR labels
- **Delete** - Remove selected (with confirmation)

---

## 📋 Header Actions

```
┌────────────────────────────────────────────────┐
│ Retail Floor • Main Branch                     │
│ 🏢 04 • Floor 1 • 📐 12 shelves                │
│                                                 │
│ [Export CSV] [Generate Layout]                 │
│ [📋 Table] [🔲 Grid] [🗺️ Visual]              │
│ [+ Add Shelf]                                  │
└────────────────────────────────────────────────┘
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + A` | Select all shelves |
| `Esc` | Close modal |
| Click header | Sort by column |
| Click shelf | Select/deselect |

---

## 📊 Summary Bar

```
┌──────────────────────────────────────────────────────┐
│ Total Positions: 12  Active: 10  Rows: 3  Types: 2  │
│                                         [Legend ▼]    │
└──────────────────────────────────────────────────────┘
```

---

## 🔄 Common Workflows

### 1. Add New Shelf
```
1. Click [+ Add Shelf]
2. Fill in shelf details
3. Click [Save]
```

### 2. Bulk Activate Shelves
```
1. Select shelves (☑)
2. Click [Activate]
3. Confirm
```

### 3. Export Layout
```
1. Click [Export CSV]
2. Save file
3. Open in Excel/Sheets
```

### 4. Print QR Labels
```
1. Select shelves
2. Click [🔖 Print Labels]
3. Print dialog opens
```

### 5. Filter Shelves
```
1. Type in search box
   OR
2. Select filter dropdown
   OR
3. Click quick filter button
```

### 6. Sort Table
```
1. Click column header
2. Click again to reverse
3. Arrow shows direction
```

### 7. View Floor Plan
```
1. Click [🗺️ Visual]
2. See spatial layout
3. Click shelves to select
```

---

## 💡 Pro Tips

### Efficiency Tips:
1. **Use Quick Filters** for common searches
   - "Empty" → Find available shelves
   - "Full" → Find capacity issues
   - "Needs Attention" → Find maintenance items

2. **Expand All** to see complete inventory at once

3. **Grid View** is best for visual scanning

4. **Table View** is best for detailed management

5. **Visual Layout** is best for spatial planning

### Selection Tips:
- Click checkbox for individual selection
- Click header checkbox to select all
- Use `Ctrl/Cmd + A` for keyboard selection
- Selected count shows in blue badge

### Export Tips:
- Export includes all columns
- File named by room code
- Opens in any spreadsheet app
- Good for reporting and analysis

---

## 🎨 Color Guide

### Status Colors:
- 🟢 **Green** - Active, Available, Success
- 🔴 **Red** - Inactive, Error, Attention
- 🟡 **Yellow/Orange** - Warning, Requires Action
- 🔵 **Blue** - Information, Special Feature
- 🟣 **Purple** - Premium, Display Type
- ⚫ **Gray** - Disabled, Standard

### Background Colors:
- Blue/Indigo Gradient - Primary actions
- Gray - Secondary elements
- White - Content areas
- Colored backgrounds - Status indicators

---

## 📱 Mobile View

### Responsive Breakpoints:
```
Mobile (< 640px):
├─ Stack layout
├─ Larger buttons
└─ Simplified filters

Tablet (640px - 1024px):
├─ 2-3 column grid
├─ Partial features
└─ Touch-friendly

Desktop (> 1024px):
├─ Full feature set
├─ 6 column grid
└─ All shortcuts
```

---

## 🔧 Troubleshooting

### Common Issues:

**Q: Shelves not appearing?**
- Check filters are not too restrictive
- Click "All Rows" quick filter
- Clear search box

**Q: Can't select shelves?**
- Ensure you're in correct view mode
- Check if checkboxes are visible
- Try refreshing page

**Q: Sort not working?**
- Must be in Table view
- Click column header
- Check sort arrow indicator

**Q: Export not downloading?**
- Check browser popup blocker
- Ensure shelves exist in room
- Try different browser

---

## 📞 Need Help?

### Resources:
- 📄 Full Documentation: `RETAIL-FLOOR-IMPROVEMENTS.md`
- 💬 Support: Contact system admin
- 🐛 Report Issues: Use issue tracker
- 📚 Training: Video tutorials available

---

## ✅ Checklist for Perfect Setup

- [ ] Add all storage rooms
- [ ] Create shelf positions
- [ ] Set shelf types correctly
- [ ] Mark special features (refrigerated, ladder, etc.)
- [ ] Activate relevant shelves
- [ ] Test all view modes
- [ ] Export layout for backup
- [ ] Print QR labels
- [ ] Train staff on features
- [ ] Regular maintenance checks

---

**Version:** 2.0  
**Last Updated:** 2025-10-10  
**Status:** ✅ Production Ready

