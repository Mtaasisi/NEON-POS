// Basic data store for bootstrap
export const useDataStore = () => {
  return {
    customers: [],
    products: [],
    loading: false,
    error: null
  };
};
