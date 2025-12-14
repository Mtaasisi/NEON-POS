// Devices Feature Module
export * from './pages/NewDevicePage';
export * from './pages/DevicesPage';

export * from './components/DeviceCard';
export * from './components/DeviceDetailHeader';
export * from './components/DeviceBarcodeCard';
export * from './components/DeviceQRCodePrint';
export * from './components/BarcodeScanner';
export * from './components/ConditionAssessment';
export * from './components/forms/StatusUpdateForm';
export * from './components/QuickStatusUpdate';
export * from './components/forms/AssignTechnicianForm';

// Device Management Modals (converted to AddProductModal style)
export { default as ProblemTemplateManager } from './components/ProblemTemplateManager';
export { default as PartsManagementModal } from './components/PartsManagementModal';
export { default as ProblemSelectionModal } from './components/ProblemSelectionModal';
export { default as DevicePriceHistoryModal } from './components/DevicePriceHistoryModal';
export { default as DevicePriceHistoryButton } from './components/DevicePriceHistoryButton';
export { default as AddDeviceModal } from './components/AddDeviceModal';
