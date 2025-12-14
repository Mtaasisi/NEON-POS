#!/bin/bash

# List of all pages that need useLoadingJob import
PAGES=(
  "src/features/customers/pages/CustomerDataUpdatePage.tsx"
  "src/features/settings/pages/IntegrationSettingsPage.tsx"
  "src/features/settings/pages/StoreLocationManagementPage.tsx"
  "src/features/payments/pages/ExpensesPage.tsx"
  "src/features/sms/pages/SMSLogsPage.tsx"
  "src/features/sms/pages/SMSSettingsPage.tsx"
  "src/features/sms/pages/SMSControlCenterPage.tsx"
  "src/features/sms/pages/BulkSMSPage.tsx"
  "src/features/lats/pages/TradeInPricingPage.tsx"
  "src/features/lats/pages/ShippedItemsPage.tsx"
  "src/features/lats/pages/TradeInTestPage.tsx"
  "src/features/lats/pages/ProductExportPage.tsx"
  "src/features/lats/pages/InventoryManagementPage.tsx"
  "src/features/lats/pages/PurchaseOrderDetailPage.tsx"
  "src/features/lats/pages/InventorySparePartsPage.tsx"
  "src/features/lats/pages/ExcelTemplateDownloadPage.tsx"
  "src/features/lats/pages/StorageRoomDetailPage.tsx"
  "src/features/lats/pages/BulkImportPage.tsx"
  "src/features/lats/pages/StorageRoomManagementPage.tsx"
  "src/features/lats/pages/TradeInManagementPage.tsx"
  "src/features/lats/pages/WhatsAppChatPage.tsx"
  "src/features/lats/pages/TradeInHistoryPage.tsx"
  "src/features/business/pages/BusinessManagementPage.tsx"
  "src/features/admin/pages/DatabaseSetupPage.tsx"
  "src/features/admin/pages/IntegrationsTestPage.tsx"
  "src/features/admin/pages/AdminManagementPage.tsx"
  "src/features/admin/pages/AdminSettingsPage.tsx"
  "src/features/backup/pages/BackupManagementPage.tsx"
  "src/features/devices/pages/NewDevicePage.tsx"
  "src/features/employees/pages/AttendanceManagementPage.tsx"
  "src/features/employees/pages/EmployeeAttendancePage.tsx"
  "src/features/employees/pages/MyAttendancePage.tsx"
  "src/features/reports/pages/ExcelImportPage.tsx"
  "src/features/shared/pages/GlobalSearchPage.tsx"
  "src/features/shared/pages/ProductAdGeneratorPage.tsx"
  "src/features/shared/pages/UserSettingsPage.tsx"
)

echo "📊 Total pages to integrate: ${#PAGES[@]}"
echo ""

for page in "${PAGES[@]}"; do
  if [ -f "$page" ]; then
    if ! grep -q "useLoadingJob" "$page"; then
      echo "✅ Processing: $(basename $page)"
    fi
  fi
done

echo ""
echo "✅ Import list generated!"
