
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  // DropdownMenuSeparator, // Not used currently
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, CheckCircle, XCircle, AlertCircle, Loader2, Settings } from 'lucide-react'; // Added Settings icon
import { useToast } from '@/hooks/use-toast';
import { handleAdminUpdateOrderStatus, type OrderStatus } from '@/lib/actions/trackingActions';

interface AdminOrderActionsProps {
  orderId: string;
  currentStatus: OrderStatus;
  onStatusChange?: () => void; // Optional: To close parent modal/drawer
}

type ActionType = 'completed' | 'failed' | 'cancelled';

export default function AdminOrderActions({ orderId, currentStatus, onStatusChange }: AdminOrderActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState<ActionType | null>(null);
  const { toast } = useToast();

  const handleAction = async () => {
    if (!actionToConfirm) return;

    setIsLoading(true);
    toast({ title: `Updating order to ${actionToConfirm}...` });

    const result = await handleAdminUpdateOrderStatus(orderId, actionToConfirm);

    if (result.success) {
      toast({ title: 'Order Updated', description: result.message });
      if (onStatusChange) onStatusChange(); // Call callback if provided
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
    setIsLoading(false);
    setShowDialog(false);
    setActionToConfirm(null);
  };

  const openConfirmationDialog = (action: ActionType) => {
    setActionToConfirm(action);
    setShowDialog(true);
  };

  const getDialogDescription = () => {
    if (!actionToConfirm) return "";
    switch (actionToConfirm) {
      case 'completed':
        return `This will mark order ${orderId.substring(0,8)}... as "Completed". The customer will be able to download their books.`;
      case 'failed':
        return `This will mark order ${orderId.substring(0,8)}... as "Failed". The customer may need to retry payment.`;
      case 'cancelled':
        return `This will mark order ${orderId.substring(0,8)}... as "Cancelled". This action is usually irreversible.`;
      default:
        return "Are you sure?";
    }
  };
  
  const getDialogActionColor = () => {
    if (!actionToConfirm) return "bg-primary";
    switch(actionToConfirm) {
        case 'completed': return "bg-green-500 hover:bg-green-600";
        case 'failed': return "bg-orange-500 hover:bg-orange-600";
        case 'cancelled': return "bg-red-500 hover:bg-red-600";
        default: return "bg-primary";
    }
  }

  // Determine if any actions are available based on current status
  const canMarkCompleted = currentStatus === 'pending' || currentStatus === 'failed';
  const canMarkFailed = currentStatus === 'pending' || currentStatus === 'completed';
  const canMarkCancelled = currentStatus === 'pending' || currentStatus === 'completed' || currentStatus === 'failed'; // Allow cancelling from failed too
  const noActionsAvailable = !canMarkCompleted && !canMarkFailed && !canMarkCancelled;


  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full sm:w-auto" disabled={isLoading || noActionsAvailable}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
            Manage Status
            {!isLoading && <MoreHorizontal className="ml-auto h-4 w-4 sm:ml-2" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {canMarkCompleted && (
            <DropdownMenuItem onClick={() => openConfirmationDialog('completed')} disabled={isLoading}>
              <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Mark as Completed
            </DropdownMenuItem>
          )}
          {canMarkFailed && (
            <DropdownMenuItem onClick={() => openConfirmationDialog('failed')} disabled={isLoading}>
              <AlertCircle className="mr-2 h-4 w-4 text-orange-500" /> Mark as Failed
            </DropdownMenuItem>
          )}
          {canMarkCancelled && (
            <DropdownMenuItem onClick={() => openConfirmationDialog('cancelled')} disabled={isLoading} className="text-destructive focus:text-destructive">
              <XCircle className="mr-2 h-4 w-4" /> Mark as Cancelled
            </DropdownMenuItem>
          )}
           {noActionsAvailable && (
             <DropdownMenuItem disabled>No status actions available</DropdownMenuItem>
           )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm: Mark as {actionToConfirm}</AlertDialogTitle>
            <AlertDialogDescription>
              {getDialogDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading} onClick={() => setActionToConfirm(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} disabled={isLoading} className={getDialogActionColor()}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
    