
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp, doc, getDoc } from 'firebase/firestore';
import { type OrderWithUserDetails, type OrderStatus } from '@/lib/tracking-service-firebase';
import { getUserDocumentFromDb } from '@/lib/user-service-firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, Package, CalendarDays, User, DollarSign, Smartphone, CreditCard, LayersIcon, Info, Search, ListFilter, FilterX, Palette } from 'lucide-react';
import { format } from 'date-fns';
import PaginationControls from '@/components/books/PaginationControls';
import AdminOrderActions from '@/components/admin/orders/AdminOrderActions';
import { getRegionByCode, defaultRegion } from '@/data/regionData';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

const ORDERS_PER_PAGE = 10;
const KES_CONVERSION_RATE = getRegionByCode('KE')?.conversionRateToUSD || 130.50; 

const orderStatuses: OrderStatus[] = ["pending", "completed", "failed", "cancelled"];

interface AdminOrderListClientProps {
  initialOrders: OrderWithUserDetails[]; 
}

export default function AdminOrderListClient({ initialOrders }: AdminOrderListClientProps) {
  const [orders, setOrders] = useState<OrderWithUserDetails[]>(initialOrders);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithUserDetails | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');

  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const processFirestoreOrderDoc = async (orderDoc: any): Promise<OrderWithUserDetails> => {
    const orderData = orderDoc.data();
    let user = null;
    try {
      user = await getUserDocumentFromDb(orderData.userId);
    } catch (userError) {
      console.warn(`Could not fetch user ${orderData.userId} for order ${orderDoc.id}:`, userError);
    }
    
    return {
      id: orderDoc.id,
      userId: orderData.userId,
      userName: user?.name || 'Unknown User',
      userEmail: user?.email || orderData.userEmail || 'N/A',
      items: orderData.items || [],
      totalAmountUSD: orderData.totalAmountUSD || 0,
      actualAmountPaid: orderData.actualAmountPaid, 
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

  const filteredOrders = useMemo(() => {
    let currentOrders = orders;
    if (selectedStatus !== 'all') {
      currentOrders = currentOrders.filter(order => order.status === selectedStatus);
    }
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      currentOrders = currentOrders.filter(order =>
        order.id.toLowerCase().includes(lowerSearchTerm) ||
        (order.userName && order.userName.toLowerCase().includes(lowerSearchTerm)) ||
        (order.userEmail && order.userEmail.toLowerCase().includes(lowerSearchTerm)) ||
        (order.paymentGatewayId && order.paymentGatewayId.toLowerCase().includes(lowerSearchTerm))
      );
    }
    return currentOrders;
  }, [orders, searchTerm, selectedStatus]);


  const handleOrderClick = (order: OrderWithUserDetails) => {
    setSelectedOrder(order);
    setIsDetailViewOpen(true);
  };

  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
    const endIndex = startIndex + ORDERS_PER_PAGE;
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, currentPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const getStatusBadgeColorClasses = (status?: string): string => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'failed': case 'cancelled': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };


  if (isLoading && orders.length === 0) { 
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


  const DetailViewContent = ({ order }: { order: OrderWithUserDetails }) => (
    <>
      <ScrollArea className="max-h-[calc(100vh-14rem)] sm:max-h-[calc(100vh-10rem)]"> {/* Adjusted max height */}
        <div className="p-4 sm:p-6 space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            <div><strong>Order ID:</strong> <span className="font-mono text-xs break-all">{order.id}</span></div>
            <div><strong>Date:</strong> {format(order.orderDate, "PPPpp")}</div>
            <div><strong>Customer:</strong> {order.userName} ({order.userEmail})</div>
            <div><strong>Status:</strong> <Badge className={`capitalize text-xs ${getStatusBadgeColorClasses(order.status)}`}>{order.status}</Badge>
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
            <p><strong>Actual Paid ({order.currencyCode || 'N/A'}):</strong> {formatCurrency(order.actualAmountPaid, order.currencyCode, order.regionCode)}</p>
            <p><strong>Gateway ID:</strong> <span className="font-mono text-xs break-all">{order.paymentGatewayId || 'N/A'}</span></p>
          </div>

          <div className="border-t pt-3 mt-3">
            <h4 className="font-semibold mb-2 flex items-center"><Package className="mr-2 h-5 w-5"/> Items ({order.itemCount})</h4>
            <ScrollArea className="max-h-48 pr-2"> {/* Scrollable item list if many items */}
              <ul className="space-y-2">
                {order.items.map((item, index) => (
                  <li key={index} className="p-2 border rounded-md bg-muted/30 text-xs">
                    <div className="flex justify-between items-start">
                      <span className="font-medium flex-1 pr-2">{item.title}</span>
                      <span className="text-muted-foreground">{formatCurrency(item.price, 'USD', 'US')}</span>
                    </div>
                    <p className="text-muted-foreground/70">Book ID: {item.bookId}</p>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        </div>
      </ScrollArea>
      <div className="p-4 sm:p-6 border-t mt-auto">
        <AdminOrderActions orderId={order.id} currentStatus={order.status} onStatusChange={() => setIsDetailViewOpen(false)} />
      </div>
    </>
  );

  return (
    <>
      <div className="mb-6 p-4 bg-card border rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search Order ID, Name, Email, Gateway ID..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-10 pr-4 py-2 text-sm rounded-md"
            />
          </div>
          <div className="relative">
            <Select value={selectedStatus} onValueChange={(value) => { setSelectedStatus(value as OrderStatus | 'all'); setCurrentPage(1); }}>
              <SelectTrigger className="w-full text-sm py-2 rounded-md">
                <ListFilter className="h-4 w-4 text-muted-foreground mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="capitalize text-sm">All Statuses</SelectItem>
                {orderStatuses.map(status => (
                  <SelectItem key={status} value={status} className="capitalize text-sm">
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {paginatedOrders.length === 0 && !isLoading && (
         <p className="mt-6 text-center text-muted-foreground">No orders match your current search/filter.</p>
      )}

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
                <p className="text-xs text-muted-foreground font-mono">ID: {order.id.substring(0,12)}...</p>
              </div>
              <Badge className={`capitalize text-xs sm:text-sm mt-1 sm:mt-0 ${getStatusBadgeColorClasses(order.status)}`}>
                {order.status}
              </Badge>
            </div>
            <div className="mt-2 pt-2 border-t border-dashed text-xs sm:text-sm text-muted-foreground grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
              <p className="flex items-center"><CalendarDays className="mr-1.5 h-3.5 w-3.5"/> {format(order.orderDate, "dd/MM/yyyy h:mm a")}</p>
              <p className="flex items-center"><Package className="mr-1.5 h-3.5 w-3.5"/> {order.itemCount} item(s)</p>
              <p className="flex items-center font-medium text-foreground col-span-2 sm:col-span-1 sm:justify-end">
                {formatCurrency(order.totalAmountUSD, 'USD', 'US')}
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
            <DrawerContent className="max-h-[85vh] flex flex-col">
              <DrawerHeader className="text-left flex-shrink-0">
                <DrawerTitle>Order Details</DrawerTitle>
                <DrawerDescription>Review and manage order: {selectedOrder.id.substring(0,8)}...</DrawerDescription>
              </DrawerHeader>
              <div className="flex-grow overflow-hidden">
                 <DetailViewContent order={selectedOrder} />
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Sheet open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}>
            <SheetContent className="sm:max-w-lg w-full flex flex-col p-0">
              <SheetHeader className="p-4 sm:p-6 border-b flex-shrink-0">
                <SheetTitle>Order Details</SheetTitle>
                <SheetDescription>Review and manage order: {selectedOrder.id.substring(0,8)}...</SheetDescription>
              </SheetHeader>
              <div className="flex-grow overflow-hidden">
                 <DetailViewContent order={selectedOrder} />
              </div>
            </SheetContent>
          </Sheet>
        )
      )}
    </>
  );
}
    
