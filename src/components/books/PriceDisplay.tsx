
'use client';

import { useRegion } from '@/contexts/RegionContext';
import { cn } from '@/lib/utils';

interface PriceDisplayProps {
  usdPrice: number;
  className?: string;
}

export default function PriceDisplay({ usdPrice, className }: PriceDisplayProps) {
  const { formatPrice } = useRegion();

  return (
    <p className={cn(className)}>
      {formatPrice(usdPrice)}
    </p>
  );
}
