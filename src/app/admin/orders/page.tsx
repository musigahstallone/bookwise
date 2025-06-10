
// src/app/admin/orders/page.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, ShoppingCart } from 'lucide-react';
import { getAllOrdersWithUserDetailsFromDb, type OrderWithUserDetails } from '@/lib/tracking-service-firebase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { getRegionByCode, defaultRegion } from '@/data/regionData';
import AdminOrderActions from '@/components/admin/orders/AdminOrderActions';
import AdminOrdersToolbar from '@/components/admin/orders/AdminOrdersToolbar'; // New import

const ORDERS_PER_PAGE = 10;

interface ManageOrdersPageProps {
  searchParams?: {
    page?: string;
  };
}

const formatAdminOrderPrice = (totalAmountUSD: number, orderRegionCode: string, orderCurrencyCode: string) => {
  const regionForOrder = getRegionByCode(orderRegionCode) || defaultRegion;
  const convertedPrice = totalAmountUSD * regionForOrder.conversionRateToUSD;
   let displayPrice;
  if (regionForOrder.currencyCode === 'KES') {
      if (Math.abs(convertedPrice - Math.round(convertedPrice)) < 0.005) {
           displayPrice = Math.round(convertedPrice).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      } else {
          displayPrice = convertedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
  } else {
       displayPrice = convertedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return `${orderCurrencyCode} ${displayPrice}`;
};


export default async function ManageOrdersPage({ searchParams }: ManageOrdersPageProps) {
  let orders: OrderWithUserDetails[] = [];
  const firebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  let fetchError: string | null = null;

  const currentPage = Number(searchParams?.page) || 1;

  if (firebaseConfigured) {
    try {
      orders = await getAllOrdersWithUserDetailsFromDb();
    } catch (error) {
      console.error("Error fetching orders for admin page:", error);
      fetchError = error instanceof Error ? error.message : "An unknown error occurred while fetching orders.";
    }
  }

  const totalPages = Math.ceil(orders.length / ORDERS_PER_PAGE);
  const paginatedOrders = orders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  );

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
        <Card>
          <CardHeader>
            <CardTitle>Order List</CardTitle>
            <CardDescription>Showing {paginatedOrders.length} of {orders.length} order(s) from Firestore.</CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length > 0 ? (
              <>
                <div className="rounded-md border shadow-sm overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px] sm:w-[150px]">Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="hidden md:table-cell">Date</TableHead>
                        <TableHead className="text-right">Items</TableHead>
                        <TableHead className="text-right">Total (Order Currency)</TableHead>
                        <TableHead className="hidden sm:table-cell">Region</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs truncate" title={order.id}>
                            <Link href={`/orders/${order.id}`} className="hover:underline text-primary" target="_blank">
                                {order.id.substring(0,8)}...
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{order.userName || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">{order.userEmail}</div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{format(order.orderDate, "PPp")}</TableCell>
                          <TableCell className="text-right">{order.itemCount}</TableCell>
                          <TableCell className="text-right">{formatAdminOrderPrice(order.totalAmountUSD, order.regionCode, order.currencyCode)}</TableCell>
                          <TableCell className="hidden sm:table-cell">{order.regionCode} ({order.currencyCode})</TableCell>
                          <TableCell>
                            <Badge 
                                variant={
                                    order.status === 'completed' ? 'default' : 
                                    order.status === 'pending' ? 'secondary' : 
                                    'destructive'
                                } 
                                className={
                                    order.status === 'completed' ? 'bg-green-500 hover:bg-green-600' :
                                    order.status === 'pending' ? 'bg-yellow-500 hover:bg-yellow-600' : ''
                                }
                            >
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <AdminOrderActions orderId={order.id} currentStatus={order.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                 {totalPages > 1 && (
                     <div className="flex justify-center mt-6 space-x-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" asChild>
                                <Link href={`/admin/orders?page=${page}`}>{page}</Link>
                            </Button>
                        ))}
                    </div>
                 )}

              </>
            ) : (
              <p>No orders found in Firestore.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
    
