
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { regions, defaultRegion, getRegionByCode, type Region } from '@/data/regionData';

interface RegionContextType {
  selectedRegion: Region;
  availableRegions: Region[];
  setSelectedRegionByCode: (code: string) => void;
  formatPrice: (usdPrice: number) => string;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

export const RegionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedRegion, setSelectedRegion] = useState<Region>(defaultRegion);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const storedRegionCode = localStorage.getItem('bookwiseSelectedRegion');
    if (storedRegionCode) {
      const region = getRegionByCode(storedRegionCode);
      if (region) {
        setSelectedRegion(region);
      }
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
        localStorage.setItem('bookwiseSelectedRegion', selectedRegion.code);
    }
  }, [selectedRegion, isInitialized]);

  const setSelectedRegionByCode = useCallback((code: string) => {
    const region = getRegionByCode(code);
    if (region) {
      setSelectedRegion(region);
    }
  }, []);

  const formatPrice = useCallback((usdPrice: number): string => {
    if (!isInitialized) return `${defaultRegion.currencyCode} ${(usdPrice * defaultRegion.conversionRateToUSD).toFixed(2)}`;

    const convertedPrice = usdPrice * selectedRegion.conversionRateToUSD;
    
    let displayPrice;
    if (selectedRegion.currencyCode === 'KES') {
        if (Math.abs(convertedPrice - Math.round(convertedPrice)) < 0.005) {
             displayPrice = Math.round(convertedPrice).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        } else {
            displayPrice = convertedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    } else {
         displayPrice = convertedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    return `${selectedRegion.currencyCode} ${displayPrice}`;
  }, [selectedRegion, isInitialized]);


  if (!isInitialized) {
    // You could return a loading spinner or null here if needed
    // For now, it will render children with defaultRegion formatting until hydration
  }


  return (
    <RegionContext.Provider
      value={{
        selectedRegion,
        availableRegions: regions,
        setSelectedRegionByCode,
        formatPrice,
      }}
    >
      {children}
    </RegionContext.Provider>
  );
};

export const useRegion = () => {
  const context = useContext(RegionContext);
  if (context === undefined) {
    throw new Error('useRegion must be used within a RegionProvider');
  }
  return context;
};

