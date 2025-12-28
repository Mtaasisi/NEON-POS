// Basic app config for bootstrap
export const APP_CONFIG = {
  database: {
    maxConnections: 10,
    timeout: 30000
  },
  api: {
    timeout: 30000,
    retries: 3
  }
};

export const getConfig = () => APP_CONFIG;
