# Invoice Layout Specifications - Complete Breakdown

## ✅ Measurement Validation

### Core Dimensions
- **Full Document**: 1128px × 1536px
- **Left Sidebar**: 370px (32.8% of width)
- **Right Content**: 758px (67.2% of width)
- **Validation**: 370px + 758px = 1128px ✓ **PASSED**

### Column Width Verification
- **Table Columns**: Description (420px) + Qty (80px) + Cost (150px) = 650px ✓ **PASSED**

---

## Complete Layout Breakdown

### 1. Main Container
```css
width: 1128px
min-height: 1536px
background: white
display: flex
```

### 2. Left Sidebar (Black Background)
```css
width: 370px (fixed)
min-height: 1536px
background-color: #000000 (black)
padding-top: 80px
padding-left: 45px
padding-right: 35px
padding-bottom: 0 (flexible)
```
**Content Area**: 290px wide (370 - 45 - 35)

**Contains**:
- Business logo and name
- Invoice To section
- Customer details (address, phone, email)
- Business contact info
- Payment method section (at bottom)

### 3. Right Content Area (White Background)
```css
width: 758px (fixed)
min-height: 1536px
background-color: #FFFFFF (white)
padding: 60px (all sides)
```
**Content Area**: 638px wide (758 - 60 - 60)

**Contains**:
- Header section (180px height)
- Table section (40px margin-top, 650px width)
- Totals summary
- Terms & Conditions
- Footer (250px height)

### 4. Header Section
```css
height: 180px (fixed)
margin-bottom: 0
```
**Contains**:
- "invoice." title (64px font, bold)
- Account No. text

### 5. Table Section
```css
margin-top: 40px
table-width: 650px (fixed)
table-layout: fixed
```

**Table Header**:
```css
height: 55px
background: #4B5563 (gray-600)
```

**Table Columns**:
- **Description**: 420px width, left-aligned
- **Qty**: 80px width, center-aligned
- **Cost**: 150px width, right-aligned

**Table Rows**:
```css
height: 115px (fixed per row)
border-bottom: 1px solid #E5E7EB
padding: 20px (all cells)
```

### 6. Footer Section
```css
height: 250px (fixed)
margin-top: auto (pushes to bottom)
border-top: 1px solid #E5E7EB
padding-top: 40px
display: flex
align-items: center
justify-content: center
```

---

## Responsive CSS Implementation

### Base Layout (Desktop - 1128px+)
```css
.invoice-container {
  width: 1128px;
  min-height: 1536px;
  display: flex;
  background: white;
  font-family: Arial, sans-serif;
}

.sidebar {
  width: 370px;
  min-height: 1536px;
  background: black;
  padding: 80px 35px 0 45px;
  color: white;
}

.content {
  width: 758px;
  min-height: 1536px;
  background: white;
  padding: 60px;
}
```

### Print Media (A4 Paper)
```css
@media print {
  @page {
    size: A4;
    margin: 0;
  }
  
  .invoice-container {
    transform: scale(0.704); /* 1128px → 794px (210mm at 96dpi) */
    transform-origin: top left;
    width: 1128px;
    height: 1536px;
  }
}
```

**A4 Conversion**:
- A4: 210mm × 297mm
- At 96 DPI: 794px × 1123px
- Scale factor: 0.704 (794/1128)

### Screen Media (Responsive Scaling)
```css
/* Large tablets */
@media (max-width: 1200px) {
  .invoice-container {
    transform: scale(0.9);
    transform-origin: top left;
  }
}

/* Small tablets */
@media (max-width: 1024px) {
  .invoice-container {
    transform: scale(0.8);
    transform-origin: top left;
  }
}
```

---

## Implementation Checklist

### ✅ Completed
- [x] Container set to 1128px × 1536px
- [x] Left sidebar: 370px width with exact padding (80px top, 45px left, 35px right)
- [x] Right content: 758px width with 60px padding
- [x] Header height: 180px
- [x] Table spacing: 40px margin-top
- [x] Table width: 650px with fixed layout
- [x] Table columns: 420px + 80px + 150px = 650px
- [x] Table header height: 55px
- [x] Table row height: 115px
- [x] Footer height: 250px
- [x] Print media scaling for A4
- [x] Responsive scaling for smaller screens

### Code Structure
```tsx
<div className="invoice-container">
  <div className="sidebar"> {/* 370px */}
    {/* Left content */}
  </div>
  <div className="content"> {/* 758px */}
    <div className="header"> {/* 180px height */}
    <div className="table-section"> {/* 40px margin-top, 650px width */}
    <div className="footer"> {/* 250px height */}
  </div>
</div>
```

---

## Typography & Spacing Guidelines

### Font Sizes (Maintain relative to design)
- Invoice title: 64px
- Customer name: 28px
- Section labels: 10-11px (uppercase)
- Body text: 13px
- Account number: 13px

### Spacing Rules
- Use exact pixel values (no percentages for critical dimensions)
- Maintain 40px spacing before table
- Footer always 250px height
- Header always 180px height

---

## Notes for Developers

1. **Fixed Layout**: This is a fixed-width design, not fluid
2. **Table Layout**: Use `table-layout: fixed` for exact column widths
3. **Vertical Alignment**: Use flexbox for vertical distribution
4. **Print Optimization**: Scale transforms applied for A4 printing
5. **Content Overflow**: Table rows are fixed height (115px) - handle overflow with ellipsis or wrapping
6. **Responsive**: Scale down proportionally on smaller screens, don't restructure

