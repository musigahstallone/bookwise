
// src/app/admin/orders/page.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, ShoppingCart, ExternalLink } from 'lucide-react';
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
import PaginationControls from '@/components/books/PaginationControls'; // Assuming this is generic enough
import { format } from 'date-fns';

const ORDERS_PER_PAGE = 10;

interface ManageOrdersPageProps {
  searchParams?: {
    page?: string;
  };
}

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
            <ShoppingCart className="mr-3 h-8 w-8" /> Manage Orders
          </h1>
          <p className="text-muted-foreground">View all customer orders.</p>
        </div>
      </div>

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
                        <TableHead className="w-[150px]">Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="hidden md:table-cell">Date</TableHead>
                        <TableHead className="text-right">Items</TableHead>
                        <TableHead className="text-right">Total ({defaultCurrencySymbol})</TableHead>
                        <TableHead className="hidden sm:table-cell">Region</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs truncate" title={order.id}>{order.id.substring(0,8)}...</TableCell>
                          <TableCell>
                            <div className="font-medium">{order.userName || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">{order.userEmail}</div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{format(order.orderDate, "PPp")}</TableCell>
                          <TableCell className="text-right">{order.itemCount}</TableCell>
                          <TableCell className="text-right">{order.totalAmountUSD.toFixed(2)}</TableCell>
                          <TableCell className="hidden sm:table-cell">{order.regionCode} ({order.currencyCode})</TableCell>
                          <TableCell>
                            <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                              {order.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                   <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => {
                        // Pagination on server components requires navigation
                        const params = new URLSearchParams(searchParams);
                        params.set('page', page.toString());
                        // router.push(`/admin/orders?${params.toString()}`);
                        // For server components, we'd link or re-fetch.
                        // This simple pagination will re-render the page with new searchParams.
                        // For a client component, onPageChange would directly update state.
                        // Here, we rely on Link components or full page reloads for pagination.
                        // A client component wrapper for pagination is common.
                        // For now, this will work by navigating to the new URL.
                        // We'd use <Link href={`/admin/orders?page=${page}`}>
                        // Inside a client PaginationControls component.
                        // For now, we'll just show a simple message or rely on manual URL change.
                         return (
                            <div className="flex justify-center mt-4 space-x-2">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <Button key={page} variant={currentPage === page ? "default" : "outline"} asChild>
                                        <Link href={`/admin/orders?page=${page}`}>{page}</Link>
                                    </Button>
                                ))}
                            </div>
                        )
                    }}
                />
                )}
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

// Helper to get default currency symbol for display purposes
// This might need to be more dynamic if you support multiple display currencies in admin
const defaultCurrencySymbol = '$';
