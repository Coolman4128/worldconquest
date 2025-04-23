import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Province } from '../types/game';

interface ProvinceSelectionContextType {
  selectedProvince: Province | null;
  selectProvince: (province: Province) => void;
}

const ProvinceSelectionContext = createContext<ProvinceSelectionContextType | undefined>(undefined);

export const ProvinceSelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);

  const selectProvince = useCallback((province: Province) => {
    setSelectedProvince(province);
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value = React.useMemo(
    () => ({ selectedProvince, selectProvince }),
    [selectedProvince]
  );

  return (
    <ProvinceSelectionContext.Provider value={value}>
      {children}
    </ProvinceSelectionContext.Provider>
  );
};

export const useProvinceSelection = (): ProvinceSelectionContextType => {
  const context = useContext(ProvinceSelectionContext);
  if (!context) {
    throw new Error('useProvinceSelection must be used within a ProvinceSelectionProvider');
  }
  return context;
};