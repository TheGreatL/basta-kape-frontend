import { createFileRoute, Outlet, Navigate } from '@tanstack/react-router';
import AppSidebar from '#/components/layout/Sidebar';
import { SidebarProvider, SidebarInset } from '#/components/ui/sidebar';
import AdminHeader from '#/components/layout/admin-header';
import { useAuthStore, waitForAuthHydration } from '#/store/auth-store';
import { restoreSession } from '#/api/auth.api';

export const Route = createFileRoute('/admin')({
    beforeLoad: async () => {
        if (typeof window === 'undefined') {
            return;
        }

        await waitForAuthHydration();

        if (!useAuthStore.getState().user) {
            await restoreSession().catch(() => null);
        }
    },
    component: AdminLayout
});

function AdminLayout() {
    const user = useAuthStore((state) => state.user);

    if (!user) {
        return <Navigate to="/login" />;
    }

    const isCustomer = user.roles.find((role) => role.name.toLowerCase() === 'customer');

    if (isCustomer) {
        return <Navigate to="/" />;
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
