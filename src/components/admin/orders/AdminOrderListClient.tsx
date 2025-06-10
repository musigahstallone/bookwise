
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp, doc, getDoc } from 'firebase/firestore';
import { type OrderWithUserDetails } from '@/lib/tracking-service-firebase';
import { getUserDocumentFromDb } from '@/lib/user-service-firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { ChevronRight, Package, CalendarDays, User, Tag, DollarSign, Smartphone, CreditCard, LayersIcon, Info } from 'lucide-react';
import { format } from 'date-fns';
import PaginationControls from '@/components/books/PaginationControls';
import AdminOrderActions from '@/components/admin/orders/AdminOrderActions';
import { getRegionByCode, defaultRegion } from '@/data/regionData';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

const ORDERS_PER_PAGE = 10;
const KES_CONVERSION_RATE = getRegionByCode('KE')?.conversionRateToUSD || 130.50; // Fallback if KE region not found

interface AdminOrderListClientProps {
  initialOrders: OrderWithUserDetails[]; // For initial hydration, real-time takes over
}

export default function AdminOrderListClient({ initialOrders }: AdminOrderListClientProps) {
  const [orders, setOrders] = useState<OrderWithUserDetails[]>(initialOrders);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithUserDetails | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const processFirestoreOrderDoc = async (orderDoc: any): Promise<OrderWithUserDetails> => {
    const orderData = orderDoc.data();
    let user = null;
    // Attempt to fetch user details, but don't block if it fails for some reason
    try {
      user = await getUserDocumentFromDb(orderData.userId);
    } catch (userError) {
      console.warn(`Could not fetch user ${orderData.userId} for order ${orderDoc.id}:`, userError);
    }
    
    return {
      id: orderDoc.id,
      userId: orderData.userId,
      userName: user?.name || 'Unknown User',
      userEmail: user?.email || orderData.userEmail || 'N/A', // Fallback to email from order if available
      items: orderData.items || [],
      totalAmountUSD: orderData.totalAmountUSD || 0,
      actualAmountPaid: orderData.actualAmountPaid, // Keep as is, formatting done at display
      orderDate: (orderData.orderDate as Timestamp)?.toDate() || new Date(0),
      lastUpdatedAt: (orderData.lastUpdatedAt as Timestamp)?.toDate() || (orderData.orderDate as Timestamp)?.toDate() || new Date(0),
      regionCode: orderData.regionCode || defaultRegion.code,
      currencyCode: orderData.currencyCode || defaultRegion.currencyCode,
      itemCount: orderData.itemCount || 0,
      status: orderData.status || 'pending',
      paymentGatewayId: orderData.paymentGatewayId,
      paymentMethod: orderData.paymentMethod,
    };
  };
  
  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, 'orders'), orderBy('orderDate', 'desc'));
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      try {
        const fetchedOrders: OrderWithUserDetails[] = await Promise.all(
          querySnapshot.docs.map(doc => processFirestoreOrderDoc(doc))
        );
        setOrders(fetchedOrders);
        setError(null);
      } catch (err: any) {
        console.error("Error processing orders snapshot:", err);
        setError("Failed to process real-time order updates. " + err.message);
      } finally {
        setIsLoading(false);
      }
    }, (err: Error) => {
      console.error("Error fetching orders in real-time:", err);
      setError("Failed to fetch orders in real-time. " + err.message);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOrderClick = (order: OrderWithUserDetails) => {
    setSelectedOrder(order);
    setIsDetailViewOpen(true);
  };

  const totalPages = Math.ceil(orders.length / ORDERS_PER_PAGE);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
    const endIndex = startIndex + ORDERS_PER_PAGE;
    return orders.slice(startIndex, endIndex);
  }, [orders, currentPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  if (isLoading && orders.length === 0) { // Show skeleton only on initial load
    return (
      <div className="space-y-4 mt-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 border rounded-lg shadow-sm bg-card">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-1" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="mt-6 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">{error}</div>;
  }

  if (orders.length === 0 && !isLoading) {
    return <p className="mt-6 text-center text-muted-foreground">No orders found.</p>;
  }

  const DetailViewContent = ({ order }: { order: OrderWithUserDetails }) => (
    <>
      <ScrollArea className="max-h-[70vh] sm:max-h-[80vh]">
        <div className="p-4 sm:p-6 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div><strong>Order ID:</strong> <span className="font-mono text-xs break-all">{order.id}</span></div>
            <div><strong>Date:</strong> {format(order.orderDate, "PPPpp")}</div>
            <div><strong>Customer:</strong> {order.userName} ({order.userEmail})</div>
            <div><strong>Status:</strong> <Badge variant={
              order.status === 'completed' ? 'default' : 
              order.status === 'pending' ? 'secondary' : 
              'destructive'} 
              className={order.status === 'completed' ? 'bg-green-500 hover:bg-green-600' : ''}
              >{order.status}</Badge>
            </div>
          </div>
          
          <div className="border-t pt-3 mt-3">
            <h4 className="font-semibold mb-2 flex items-center">
              {order.paymentMethod === 'stripe' ? <CreditCard className="mr-2 h-5 w-5 text-blue-500" /> : 
               order.paymentMethod === 'mpesa' ? <Smartphone className="mr-2 h-5 w-5 text-green-500" /> :
               order.paymentMethod === 'mock' ? <LayersIcon className="mr-2 h-5 w-5 text-gray-500" /> : 
               <DollarSign className="mr-2 h-5 w-5" />}
              Payment Details
            </h4>
            <p><strong>Method:</strong> {order.paymentMethod || 'N/A'}</p>
            <p><strong>Total (USD):</strong> {formatCurrency(order.totalAmountUSD, 'USD', 'US')}</p>
            {order.paymentMethod === 'mpesa' && (
              <p><strong>Amount (KES Estimate):</strong> {formatCurrency(order.totalAmountUSD * KES_CONVERSION_RATE, 'KES', 'KE')}</p>
            )}
             {order.actualAmountPaid && (
              <p><strong>Actual Paid ({order.currencyCode}):</strong> {formatCurrency(order.actualAmountPaid, order.currencyCode, order.regionCode)}</p>
            )}
          </div>

          <div className="border-t pt-3 mt-3">
            <h4 className="font-semibold mb-2 flex items-center"><Package className="mr-2 h-5 w-5"/> Items ({order.itemCount})</h4>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {order.items.map((item, index) => (
                <li key={index} className="p-2 border rounded-md bg-muted/30">
                  <div className="flex justify-between items-start">
                    <span className="font-medium flex-1 pr-2">{item.title}</span>
                    <span className="text-muted-foreground">{formatCurrency(item.price, 'USD', 'US')}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ScrollArea>
      <div className="p-4 sm:p-6 border-t">
        <AdminOrderActions orderId={order.id} currentStatus={order.status} onStatusChange={() => setIsDetailViewOpen(false)} />
      </div>
    </>
  );

  return (
    <>
      <div className="mt-6 space-y-3">
        {paginatedOrders.map((order) => (
          <div 
            key={order.id} 
            className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-card"
            onClick={() => handleOrderClick(order)}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
              <div className="flex-grow">
                <h3 className="font-semibold text-primary text-base sm:text-lg">{order.userName}</h3>
                <p className="text-xs text-muted-foreground">{order.userEmail}</p>
              </div>
              <Badge variant={
                order.status === 'completed' ? 'default' : 
                order.status === 'pending' ? 'secondary' : 
                'destructive'} 
                className={`text-xs sm:text-sm mt-1 sm:mt-0 ${order.status === 'completed' ? 'bg-green-500 hover:bg-green-600' : ''}`}
              >
                {order.status}
              </Badge>
            </div>
            <div className="mt-2 pt-2 border-t border-dashed text-xs sm:text-sm text-muted-foreground grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
              <p className="flex items-center"><CalendarDays className="mr-1.5 h-3.5 w-3.5"/> {format(order.orderDate, "dd/MM/yyyy h:mm a")}</p>
              <p className="flex items-center"><Package className="mr-1.5 h-3.5 w-3.5"/> {order.itemCount} item(s)</p>
              <p className="flex items-center font-medium text-foreground col-span-2 sm:col-span-1 sm:justify-end">
                <DollarSign className="mr-1 h-3.5 w-3.5"/> {formatCurrency(order.totalAmountUSD, 'USD', 'US')}
              </p>
            </div>
             <div className="text-right mt-2">
                <Button variant="ghost" size="sm" className="h-auto p-1 text-xs text-primary hover:text-primary/80">
                    View Details <ChevronRight className="ml-1 h-3 w-3"/>
                </Button>
             </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {selectedOrder && (
        isMobileView ? (
          <Drawer open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}>
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader className="text-left">
                <DrawerTitle>Order Details</DrawerTitle>
                <DrawerDescription>Review and manage order: {selectedOrder.id.substring(0,8)}...</DrawerDescription>
              </DrawerHeader>
              <DetailViewContent order={selectedOrder} />
              <DrawerFooter className="pt-2">
                <DrawerClose asChild>
                  <Button variant="outline">Close</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        ) : (
          <Sheet open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}>
            <SheetContent className="sm:max-w-lg w-full flex flex-col">
              <SheetHeader>
                <SheetTitle>Order Details</SheetTitle>
                <SheetDescription>Review and manage order: {selectedOrder.id.substring(0,8)}...</SheetDescription>
              </SheetHeader>
              <div className="flex-grow overflow-hidden">
                 <DetailViewContent order={selectedOrder} />
              </div>
               <SheetFooter className="pt-2 mt-auto"> {/* Ensure footer is at bottom */}
                 <SheetClose asChild>
                   <Button variant="outline">Close</Button>
                 </SheetClose>
               </SheetFooter>
            </SheetContent>
          </Sheet>
        )
      )}
    </>
  );
}
    