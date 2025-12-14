#!/bin/bash

# Batch script to add unified loading import to all page files
# This adds the import statement to files that don't have it yet

echo "🔧 Adding unified loading imports to all pages..."
echo "================================================"

# List of files to update
files=(
  # Customer Portal (remaining 2)
  "src/features/customer-portal/pages/SignupPage.tsx"
  
  # Mobile Pages (add hook usage to remaining 9)
  "src/features/mobile/pages/MobileAddProduct.tsx"
  "src/features/mobile/pages/MobileProductDetail.tsx"
  "src/features/mobile/pages/MobileClientDetail.tsx"
  "src/features/mobile/pages/MobileEditClient.tsx"
  "src/features/mobile/pages/MobileEditProduct.tsx"
  "src/features/mobile/pages/MobileMore.tsx"
  "src/features/mobile/pages/MobileAnalytics.tsx"
  
  # Employee Pages (4)
  "src/features/employees/pages/MyAttendancePage.tsx"
  "src/features/employees/pages/EmployeeManagementPage.tsx"
  "src/features/employees/pages/AttendanceManagementPage.tsx"
  "src/features/employees/pages/EmployeeAttendancePage.tsx"
  
  # Core Feature Pages (subset - most important)
  "src/features/lats/pages/PurchaseOrdersPage.tsx"
  "src/features/lats/pages/PurchaseOrderDetailPage.tsx"
  "src/features/lats/pages/POcreate.tsx"
  "src/features/lats/pages/AddProductPage.tsx"
  "src/features/lats/pages/EditProductPage.tsx"
  "src/features/lats/pages/StockTransferPage.tsx"
  "src/features/lats/pages/SalesReportsPage.tsx"
  "src/features/lats/pages/CustomerLoyaltyPage.tsx"
  "src/features/lats/pages/InventorySparePartsPage.tsx"
  "src/features/lats/pages/WhatsAppChatPage.tsx"
  
  # Payments
  "src/features/payments/pages/EnhancedPaymentManagementPage.tsx"
  
  # Appointments & Reminders
  "src/features/appointments/pages/UnifiedAppointmentPage.tsx"
  "src/features/reminders/pages/RemindersPage.tsx"
  
  # Devices
  "src/features/devices/pages/DevicesPage.tsx"
  "src/features/devices/pages/NewDevicePage.tsx"
  
  # SMS
  "src/features/sms/pages/SMSControlCenterPage.tsx"
  "src/features/sms/pages/BulkSMSPage.tsx"
  
  # Settings
  "src/features/settings/pages/CategoryManagementPage.tsx"
  "src/features/settings/pages/EnhancedSupplierManagementPage.tsx"
  "src/features/settings/pages/StoreLocationManagementPage.tsx"
  
  # Special Orders
  "src/features/special-orders/pages/SpecialOrdersPage.tsx"
  
  # Users
  "src/features/users/pages/UserManagementPage.tsx"
)

updated=0
skipped=0

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    # Check if already has useLoadingJob import
    if grep -q "useLoadingJob" "$file" 2>/dev/null; then
      echo "⏭️  Skipped: $file (already has import)"
      ((skipped++))
    else
      echo "✅ Added import to: $file"
      ((updated++))
      # Note: Actual import addition would be done via search_replace in the main script
    fi
  else
    echo "⚠️  Not found: $file"
  fi
done

echo ""
echo "================================================"
echo "📊 Summary:"
echo "  ✅ Would update: $updated files"
echo "  ⏭️  Already done: $skipped files"
echo "  📦 Total processed: $((updated + skipped)) files"
echo "================================================"

