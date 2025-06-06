
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Toaster } from "@/components/ui/toaster"; // Ensure Toaster is available for admin actions

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* You can include specific head elements for admin if needed */}
        <title>BookWise Admin</title>
      </head>
      <body className="font-body antialiased">
        <div className="flex min-h-screen bg-background">
          <AdminSidebar />
          <main className="flex-1 p-6 md:p-8 overflow-auto">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
