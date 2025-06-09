// src/lib/formatters.ts
import { getRegionByCode, regions, type Region } from '@/data/regionData';

/**
 * Formats a given amount into a currency string.
 * @param amount The numerical amount to format. Should be in the target currency.
 * @param currencyCode The ISO currency code (e.g., "USD", "KES", "EUR").
 * @param regionCodeForContext Optional. The region code (e.g., "US", "KE") to help determine the correct currency symbol
 *                             if the currencyCode alone is ambiguous or for specific regional formatting nuances.
 *                             If not provided, it will try to find a region matching the currencyCode.
 * @returns A formatted currency string (e.g., "$10.00", "KES 1,200") or "N/A" if formatting fails.
 */
export function formatCurrency(
  amount?: number | null,
  currencyCode?: string,
  regionCodeForContext?: string
): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return `${currencyCode || ''} N/A`.trim();
  }
  if (!currencyCode) {
    return 'N/A'; // Cannot format without currency code
  }

  let displaySymbol = currencyCode; // Default to currency code if symbol not found
  let regionForFormatting: Region | undefined;

  if (regionCodeForContext) {
    regionForFormatting = getRegionByCode(regionCodeForContext);
  }
  // If no regionCodeForContext or region not found by it, try to find by currencyCode
  if (!regionForFormatting) {
    regionForFormatting = regions.find(r => r.currencyCode === currencyCode.toUpperCase());
  }

  if (regionForFormatting) {
    displaySymbol = regionForFormatting.currencySymbol;
  }


  let displayPrice: string;

  // Specific formatting for KES: round to 0 decimal places if it's effectively a whole number
  if (currencyCode.toUpperCase() === 'KES') {
    if (Math.abs(amount - Math.round(amount)) < 0.005) { // Check if it's close enough to a whole number
      displayPrice = Math.round(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    } else {
      displayPrice = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  } else {
    // Standard formatting for other currencies (typically 2 decimal places)
    displayPrice = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return `${displaySymbol} ${displayPrice}`;
}
