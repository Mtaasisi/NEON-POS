import React, { createContext, useContext, useState, ReactNode } from 'react';
import { DateRange } from '../components/DateRangeSelector';

interface DateRangeContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  getDateRangeForQuery: () => { startDate: string; endDate: string };
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

// Default to last 7 days
const getDefaultDateRange = (): DateRange => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 7);
  
  return {
    startDate,
    endDate,
    preset: '7days'
  };
};

export const DateRangeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());

  const getDateRangeForQuery = () => ({
    startDate: dateRange.startDate.toISOString(),
    endDate: dateRange.endDate.toISOString()
  });

  return (
    <DateRangeContext.Provider value={{ dateRange, setDateRange, getDateRangeForQuery }}>
      {children}
    </DateRangeContext.Provider>
  );
};

export const useDateRange = (): DateRangeContextType => {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error('useDateRange must be used within a DateRangeProvider');
  }
  return context;
};

