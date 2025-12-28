// Minimal stub to satisfy imports during build. Replace with real implementation later.
export interface IntegrationStatus {
  id: string;
  name: string;
  enabled: boolean;
  lastCheckedAt?: string;
  status?: 'ok' | 'warning' | 'error' | 'unknown';
}

export interface IntegrationConfig {
  id: string;
  name: string;
  enabled: boolean;
  settings?: Record<string, any>;
}

export async function getAllIntegrationStatuses(): Promise<IntegrationStatus[]> {
  return [
    { id: 'sms', name: 'SMS', enabled: false, status: 'unknown' },
    { id: 'email', name: 'Email', enabled: false, status: 'unknown' },
    { id: 'payments', name: 'Payments', enabled: false, status: 'unknown' },
  ];
}

export async function initializeDefaultIntegrations(): Promise<IntegrationConfig[]> {
  const defaults: IntegrationConfig[] = [
    { id: 'sms', name: 'SMS', enabled: false },
    { id: 'email', name: 'Email', enabled: false },
    { id: 'payments', name: 'Payments', enabled: false },
  ];
  try {
    localStorage.setItem('integrations-config', JSON.stringify(defaults));
  } catch (_) {}
  return defaults;
}

export async function saveIntegrationConfig(configs: IntegrationConfig[]): Promise<void> {
  try {
    localStorage.setItem('integrations-config', JSON.stringify(configs));
  } catch (_) {}
}

export async function loadIntegrationConfig(): Promise<IntegrationConfig[]> {
  try {
    const raw = localStorage.getItem('integrations-config');
    if (!raw) return await initializeDefaultIntegrations();
    return JSON.parse(raw);
  } catch (_) {
    return await initializeDefaultIntegrations();
  }
}


