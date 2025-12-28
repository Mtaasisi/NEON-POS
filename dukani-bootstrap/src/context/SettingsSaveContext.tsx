import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type SaveHandler = () => Promise<void> | void;

interface SettingsSaveContextType {
  registerSaveHandler: (id: string, handler: SaveHandler) => void;
  unregisterSaveHandler: (id: string) => void;
  saveAll: () => Promise<void>;
  isSaving: boolean;
  hasChanges: boolean;
  setHasChanges: (hasChanges: boolean) => void;
}

const SettingsSaveContext = createContext<SettingsSaveContextType | undefined>(undefined);

export const useSettingsSave = () => {
  const context = useContext(SettingsSaveContext);
  if (!context) {
    throw new Error('useSettingsSave must be used within SettingsSaveProvider');
  }
  return context;
};

interface SettingsSaveProviderProps {
  children: ReactNode;
}

export const SettingsSaveProvider: React.FC<SettingsSaveProviderProps> = ({ children }) => {
  const [saveHandlers, setSaveHandlers] = useState<Map<string, SaveHandler>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const registerSaveHandler = useCallback((id: string, handler: SaveHandler) => {
    setSaveHandlers(prev => {
      const newMap = new Map(prev);
      newMap.set(id, handler);
      return newMap;
    });
  }, []);

  const unregisterSaveHandler = useCallback((id: string) => {
    setSaveHandlers(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  const saveAll = useCallback(async () => {
    setIsSaving(true);
    try {
      const handlers = Array.from(saveHandlers.values());
      await Promise.all(handlers.map(handler => Promise.resolve(handler())));
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [saveHandlers]);

  return (
    <SettingsSaveContext.Provider
      value={{
        registerSaveHandler,
        unregisterSaveHandler,
        saveAll,
        isSaving,
        hasChanges,
        setHasChanges,
      }}
    >
      {children}
    </SettingsSaveContext.Provider>
  );
};

