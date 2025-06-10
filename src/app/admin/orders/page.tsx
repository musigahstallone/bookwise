
// src/app/admin/orders/page.tsx
import { getAllOrdersWithUserDetailsFromDb, type OrderWithUserDetails } from '@/lib/tracking-service-firebase';
import AdminOrdersToolbar from '@/components/admin/orders/AdminOrdersToolbar';
import AdminOrderListClient from '@/components/admin/orders/AdminOrderListClient'; // New import
import { AlertTriangle } from 'lucide-react';

export default async function ManageOrdersPage() {
  let initialOrders: OrderWithUserDetails[] = [];
  const firebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  let fetchError: string | null = null;

  if (firebaseConfigured) {
    try {
      initialOrders = await getAllOrdersWithUserDetailsFromDb();
    } catch (error) {
      console.error("Error fetching initial orders for admin page:", error);
      fetchError = error instanceof Error ? error.message : "An unknown error occurred while fetching orders.";
    }
  }

  return (
    <div className="space-y-6">
      <AdminOrdersToolbar />

      {!firebaseConfigured && (
        <div className="mt-6 p-4 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground rounded-md">
          <p className="font-bold flex items-center"><AlertTriangle className="mr-2 h-5 w-5" /> Firebase Not Configured</p>
          <p>Order management requires Firebase to be configured. Please check your <code>.env.local</code> settings.</p>
        </div>
      )}

      {firebaseConfigured && fetchError && (
        <div className="mt-6 p-4 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground rounded-md">
          <p className="font-bold flex items-center"><AlertTriangle className="mr-2 h-5 w-5" /> Error Fetching Orders</p>
          <p>{fetchError}</p>
        </div>
      )}
      
      {firebaseConfigured && !fetchError && (
        <AdminOrderListClient initialOrders={initialOrders} />
      )}
    </div>
  );
}
    