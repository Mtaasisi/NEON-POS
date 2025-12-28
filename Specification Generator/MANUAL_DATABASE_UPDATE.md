# Manual Database Update Guide

## Overview
The Apple Laptop Sales Copy Generator now includes a **Database Management** section that allows you to manually add, edit, and manage laptop specifications directly from your web browser.

## How to Use

### 1. Open the Database Management Section
1. Open `apple-laptop-copy-interface.html` in your web browser
2. Look for the **"📊 Database Management"** section at the top
3. Click the toggle button to expand it

### 2. View All Models
- Click **"👁️ View All Models"** to see all currently stored laptop models
- Each model is displayed as a card showing:
  - Model ID (e.g., A2681)
  - Family and generation
  - Year and price
  - Edit/Delete buttons

### 3. Add New Model
1. Click **"➕ Add New Model"**
2. Fill in the comprehensive form with specifications from Apple's website
3. Click **"💾 Save to Database"**

### 4. Edit Existing Model
1. From the model list, click **"✏️ Edit"** on any model card
2. Modify the specifications as needed
3. Click **"💾 Save to Database"**

### 5. Delete Model
1. From the model list, click **"🗑️ Delete"** on any model card
2. Confirm the deletion when prompted

### 6. Download Updated Database
- Click **"💾 Download Database"** to download the updated JSON file
- Replace your existing `apple-laptops-database.json` with the downloaded file

## Getting Specifications from Apple Support

### Step 1: Visit Apple Support
Go to: https://support.apple.com/en-us/122209 (or any Apple laptop specs page)

### Step 2: Extract Information
Copy the following information from the Apple Support page:

#### Basic Information:
- **Family**: MacBook Air, MacBook Pro, or MacBook
- **Generation**: e.g., "13-inch, M2, 2022"
- **Year**: e.g., "2022"
- **Model Number**: e.g., "A2681"

#### Display Specifications:
- **Size**: e.g., "13.6-inch"
- **Type**: e.g., "Liquid Retina display"
- **Resolution**: e.g., "2560 x 1664"

#### Hardware Specifications:
- **Processors**: e.g., "Apple M2 chip"
- **Memory Options**: e.g., "8GB, 16GB, 24GB"
- **Storage Options**: e.g., "256GB, 512GB, 1TB, 2TB"
- **Battery**: e.g., "Up to 18 hours"
- **Graphics**: e.g., "Apple M2 GPU (10-core)"

#### Ports & Connectivity:
- **Ports**: e.g., "Two Thunderbolt / USB 4 ports, 3.5mm headphone jack, MagSafe 3 charging port"
- **Connectivity**: e.g., "Wi-Fi 6E, Bluetooth 5.3"

#### Other Features:
- **Camera**: e.g., "1080p FaceTime HD"
- **Audio**: e.g., "Four-speaker system with Dolby Atmos"
- **Keyboard**: e.g., "Magic Keyboard with Touch ID"
- **Weight**: e.g., "2.7 pounds"
- **Colors**: e.g., "Space Gray, Silver, Gold, Midnight, Starlight"

## Automated Data Fetching

### Using the Fetch Script
We've also created an automated script to fetch data from Apple Support pages:

```bash
# Fetch specs from the default MacBook Air M4 page
node fetch-apple-specs.mjs

# Fetch specs from a specific Apple Support URL
node fetch-apple-specs.mjs https://support.apple.com/en-us/122209
```

### What the Script Does:
1. Fetches the HTML from the Apple Support page
2. Parses the specifications automatically
3. Outputs JSON that you can copy into your database
4. Handles most common specification formats

## Tips for Manual Entry

### 1. Be Precise
- Copy text exactly as it appears on Apple's website
- Use commas to separate multiple options (RAM, storage, colors)
- Include units (GB, TB, pounds, inches)

### 2. Common Patterns
- **Memory**: "8GB, 16GB, 24GB, 32GB"
- **Storage**: "256GB, 512GB, 1TB, 2TB, 4TB, 8TB"
- **Colors**: "Space Gray, Silver, Gold, Midnight, Starlight"
- **Ports**: "Two Thunderbolt 4 ports, 3.5mm headphone jack, MagSafe 3 charging port"

### 3. Optional Fields
Some fields are optional:
- Original Price (leave empty if not known)
- Detailed specifications (the system works with minimal info)

### 4. Validation
The system will:
- Prevent duplicate model IDs
- Clean up empty fields automatically
- Save to browser localStorage for immediate use
- Allow downloading the complete updated database

## Troubleshooting

### Database Not Loading
- Ensure `apple-laptops-database.json` is in the same folder as the HTML file
- Check browser console for error messages

### Changes Not Saved
- Use the "💾 Download Database" button to get the updated JSON file
- Replace your existing database file with the downloaded one

### Form Not Submitting
- Check that all required fields are filled
- Ensure Model ID is unique (when adding new models)

## Example: Adding MacBook Air M4 2025

Based on https://support.apple.com/en-us/122209:

```
Model ID: A2999
Family: MacBook Air
Generation: 13-inch, M4, 2025
Year: 2025
Model Number: A2999

Display:
- Size: 13.6-inch
- Type: Liquid Retina display
- Resolution: 2560 x 1664

Hardware:
- Processors: Apple M4 chip
- Memory: 16GB, 24GB, 32GB
- Storage: 256GB, 512GB, 1TB, 2TB
- Graphics: Apple M4 GPU (10-core)
- Battery: Up to 18 hours

Connectivity:
- Ports: Two Thunderbolt 4 (USB-C) ports, 3.5mm headphone jack, MagSafe 3 charging port
- Connectivity: Wi-Fi 6E, Bluetooth 5.3

Features:
- Camera: 1080p FaceTime HD
- Audio: Four-speaker system with Dolby Atmos
- Keyboard: Magic Keyboard with Touch ID
- Weight: 2.7 pounds
- Colors: Space Gray, Silver, Gold, Midnight, Starlight
```

## Next Steps

1. **Add the new model** using the manual entry form
2. **Test the sales copy generation** with the new model
3. **Download and backup** your updated database
4. **Repeat for other models** as needed

The database management system makes it easy to keep your Apple laptop specifications up-to-date with the latest models and accurate information! 🎯📱💻
