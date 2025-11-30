#!/bin/bash

# Batch 1: Customer & Settings (2 pages)
BATCH_1=(
  "src/features/customers/pages/CustomerDataUpdatePage.tsx"
  "src/features/settings/pages/IntegrationSettingsPage.tsx"
)

# Batch 2: SMS Pages (4 pages)
BATCH_2=(
  "src/features/sms/pages/SMSLogsPage.tsx"
  "src/features/sms/pages/SMSSettingsPage.tsx"
  "src/features/sms/pages/BulkSMSPage.tsx"
)

# Batch 3: LATS Inventory Pages (6 pages)
BATCH_3=(
  "src/features/lats/pages/TradeInPricingPage.tsx"
  "src/features/lats/pages/ShippedItemsPage.tsx"
  "src/features/lats/pages/ProductExportPage.tsx"
  "src/features/lats/pages/PurchaseOrderDetailPage.tsx"
  "src/features/lats/pages/InventorySparePartsPage.tsx"
  "src/features/lats/pages/ExcelTemplateDownloadPage.tsx"
)

# Batch 4: Storage & Trade-In (6 pages)
BATCH_4=(
  "src/features/lats/pages/StorageRoomDetailPage.tsx"
  "src/features/lats/pages/BulkImportPage.tsx"
  "src/features/lats/pages/StorageRoomManagementPage.tsx"
  "src/features/lats/pages/TradeInManagementPage.tsx"
  "src/features/lats/pages/TradeInHistoryPage.tsx"
  "src/features/lats/pages/TradeInTestPage.tsx"
)

# Batch 5: Admin & Misc (7 pages)
BATCH_5=(
  "src/features/lats/pages/WhatsAppChatPage.tsx"
  "src/features/business/pages/BusinessManagementPage.tsx"
  "src/features/admin/pages/DatabaseSetupPage.tsx"
  "src/features/admin/pages/IntegrationsTestPage.tsx"
  "src/features/admin/pages/AdminManagementPage.tsx"
  "src/features/admin/pages/AdminSettingsPage.tsx"
  "src/features/backup/pages/BackupManagementPage.tsx"
)

# Batch 6: Employees & Reports (4 pages)
BATCH_6=(
  "src/features/employees/pages/EmployeeAttendancePage.tsx"
  "src/features/employees/pages/MyAttendancePage.tsx"
  "src/features/reports/pages/ExcelImportPage.tsx"
  "src/features/payments/pages/ExpensesPage.tsx"
)

# Batch 7: Shared Pages (3 pages)
BATCH_7=(
  "src/features/shared/pages/GlobalSearchPage.tsx"
  "src/features/shared/pages/ProductAdGeneratorPage.tsx"
  "src/features/shared/pages/UserSettingsPage.tsx"
)

echo "📊 Batches prepared!"
echo "Total files: $(( ${#BATCH_1[@]} + ${#BATCH_2[@]} + ${#BATCH_3[@]} + ${#BATCH_4[@]} + ${#BATCH_5[@]} + ${#BATCH_6[@]} + ${#BATCH_7[@]} ))"
