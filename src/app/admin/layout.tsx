
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Toaster } from "@/components/ui/toaster";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* The root layout (src/app/layout.tsx) will handle <html>, <head>, and <body> tags.
          This admin layout provides the specific structure for admin pages. */}
      <div className="flex min-h-screen bg-background">
        <AdminSidebar />
        <main className="flex-1 p-6 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
      <Toaster />
    </>
  );
}
