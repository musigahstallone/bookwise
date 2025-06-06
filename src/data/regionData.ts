
export interface Region {
  name: string;
  code: string; // e.g., 'US', 'FR', 'KE'
  currencyCode: string; // e.g., 'USD', 'EUR', 'KES'
  currencySymbol: string; // e.g., '$', '€', 'Ksh'
  conversionRateToUSD: number; // How many units of this currency make 1 USD
}

export const regions: Region[] = [
  {
    name: 'United States (USD)',
    code: 'US',
    currencyCode: 'USD',
    currencySymbol: '$',
    conversionRateToUSD: 1,
  },
  {
    name: 'France (EUR)',
    code: 'FR',
    currencyCode: 'EUR',
    currencySymbol: '€',
    conversionRateToUSD: 0.92, // Mock rate: 1 USD = 0.92 EUR
  },
  {
    name: 'Kenya (KES)',
    code: 'KE',
    currencyCode: 'KES',
    currencySymbol: 'Ksh',
    conversionRateToUSD: 130.50, // Mock rate: 1 USD = 130.50 KES
  },
  // Add more regions here as needed
];

export const defaultRegion = regions[0]; // Default to USD

export const getRegionByCode = (code: string): Region | undefined => {
  return regions.find(region => region.code === code);
};
