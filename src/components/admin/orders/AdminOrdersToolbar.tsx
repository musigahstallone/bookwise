
'use client';

import { Button } from '@/components/ui/button';
import { ShoppingCart, RefreshCw, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function AdminOrdersToolbar() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
      toast({
        title: 'Orders Refreshed',
        description: 'The order list has been updated.',
      });
    });
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
          <ShoppingCart className="mr-3 h-8 w-8" /> Manage Orders
        </h1>
        <p className="text-muted-foreground">View all customer orders and manage their status.</p>
      </div>
      <Button onClick={handleRefresh} variant="outline" disabled={isPending}>
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        Refresh Orders
      </Button>
    </div>
  );
}
