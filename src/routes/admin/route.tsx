import { createFileRoute, Outlet, Navigate } from '@tanstack/react-router';
import AppSidebar from '#/components/layout/Sidebar';
import { SidebarProvider, SidebarInset } from '#/components/ui/sidebar';
import AdminHeader from '#/components/layout/admin-header';
import { useAuthStore } from '#/store/auth-store';
import { useEffect, useState } from 'react';
import LoadingPage from '#/components/layout/loading-page';

export const Route = createFileRoute('/admin')({
    component: AdminLayout
});

function AdminLayout() {
    const user = useAuthStore((state) => state.user);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <LoadingPage />;
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="min-w-0 overflow-x-hidden">
                <main className="flex relative flex-col h-svh min-w-0 w-full overflow-y-auto overflow-x-hidden">
                    <AdminHeader />
                    <section className="grow flex flex-col px-3 py-4 md:px-4 md:py-6 container mx-auto min-w-0">
                        <Outlet />
                    </section>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
