
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import type { User } from '@/data/users';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, Users, CalendarDays, Mail, ShieldCheck, Edit, Search, ListFilter } from 'lucide-react';
import { format } from 'date-fns';
import PaginationControls from '@/components/books/PaginationControls';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

const USERS_PER_PAGE = 10;

interface AdminUserListClientProps {
  initialUsers: User[];
}

export default function AdminUserListClient({ initialUsers }: AdminUserListClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedUsers: User[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          email: data.email,
          role: data.role,
          createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(0),
        } as User;
      });
      setUsers(fetchedUsers);
      setError(null);
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching users in real-time:", err);
      setError("Failed to fetch users in real-time.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const userRoles = useMemo(() => {
    const roles = new Set(users.map(user => user.role));
    return ['all', ...Array.from(roles).sort()];
  }, [users]);

  const filteredUsers = useMemo(() => {
    let currentUsers = users;
    if (selectedRole !== 'all') {
      currentUsers = currentUsers.filter(user => user.role === selectedRole);
    }
    if (searchTerm) {
      currentUsers = currentUsers.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return currentUsers;
  }, [users, searchTerm, selectedRole]);

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setIsDetailViewOpen(true);
  };

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * USERS_PER_PAGE;
    const endIndex = startIndex + USERS_PER_PAGE;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (isLoading && users.length === 0) {
    return (
      <div className="space-y-3 mt-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 border rounded-lg shadow-sm bg-card">
            <Skeleton className="h-5 w-2/3 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-1" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    );
  }
  
  if (error) {
    return <div className="mt-6 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">{error}</div>;
  }

  const DetailViewContent = ({ user }: { user: User }) => (
    <>
      <ScrollArea className="max-h-[calc(100vh-12rem)]"> {/* Adjust max height */}
        <div className="p-4 sm:p-6 space-y-3 text-sm">
          <div className="space-y-1">
            <h4 className="font-semibold text-lg text-primary">{user.name}</h4>
            <p className="text-muted-foreground flex items-center"><Mail className="mr-2 h-4 w-4"/>{user.email}</p>
          </div>
          <div className="border-t pt-3 mt-3">
            <p className="flex items-center"><ShieldCheck className="mr-2 h-4 w-4 text-primary"/><strong>Role:</strong> <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'} className="ml-2 capitalize">{user.role}</Badge></p>
            <p className="flex items-center mt-1"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/><strong>Joined:</strong> {format(user.createdAt || new Date(0), "dd/MM/yyyy 'at' h:mm a")}</p>
          </div>
        </div>
      </ScrollArea>
      <div className="p-4 sm:p-6 border-t mt-auto"> {/* mt-auto to push footer down */}
        <Button asChild className="w-full">
          <Link href={`/admin/users/edit/${user.id}`}>
            <Edit className="mr-2 h-4 w-4"/> Edit User
          </Link>
        </Button>
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
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-10 pr-4 py-2 text-sm rounded-md"
            />
          </div>
          <div className="relative">
            <Select value={selectedRole} onValueChange={(value) => { setSelectedRole(value); setCurrentPage(1); }}>
              <SelectTrigger className="w-full text-sm py-2 rounded-md">
                <ListFilter className="h-4 w-4 text-muted-foreground mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                {userRoles.map(role => (
                  <SelectItem key={role} value={role} className="capitalize text-sm">
                    {role === 'all' ? 'All Roles' : role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {paginatedUsers.length === 0 && !isLoading && (
        <p className="mt-6 text-center text-muted-foreground">No users match your current search/filter.</p>
      )}

      <div className="mt-6 space-y-3">
        {paginatedUsers.map((user) => (
          <div 
            key={user.id} 
            className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-card"
            onClick={() => handleUserClick(user)}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
              <div className="flex-grow">
                <h3 className="font-semibold text-primary text-base sm:text-lg">{user.name}</h3>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'} className="text-xs sm:text-sm mt-1 sm:mt-0 capitalize">{user.role}</Badge>
            </div>
            <div className="mt-2 pt-2 border-t border-dashed text-xs sm:text-sm text-muted-foreground flex justify-between items-center">
              <p className="flex items-center"><CalendarDays className="mr-1.5 h-3.5 w-3.5"/> Joined: {format(user.createdAt || new Date(0), "dd/MM/yyyy")}</p>
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

      {selectedUser && (
        isMobileView ? (
          <Drawer open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}>
            <DrawerContent className="max-h-[85vh] flex flex-col">
              <DrawerHeader className="text-left flex-shrink-0">
                <DrawerTitle>User Details</DrawerTitle>
                <DrawerDescription>{selectedUser.name}</DrawerDescription>
              </DrawerHeader>
              <div className="flex-grow overflow-hidden">
                <DetailViewContent user={selectedUser} />
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Sheet open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}>
            <SheetContent className="sm:max-w-md w-full flex flex-col p-0">
              <SheetHeader className="p-4 sm:p-6 border-b flex-shrink-0">
                <SheetTitle>User Details</SheetTitle>
                <SheetDescription>{selectedUser.name}</SheetDescription>
              </SheetHeader>
              <div className="flex-grow overflow-hidden">
                 <DetailViewContent user={selectedUser} />
              </div>
            </SheetContent>
          </Sheet>
        )
      )}
    </>
  );
}

