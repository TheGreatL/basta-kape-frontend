import { createFileRoute, Outlet, Navigate } from '@tanstack/react-router';
import AppSidebar from '#/components/layout/Sidebar';
import { SidebarProvider, SidebarInset } from '#/components/ui/sidebar';
import AdminHeader from '#/components/layout/admin-header';
import { useAuthStore, waitForAuthHydration } from '#/store/auth-store';
import { useEffect, useState } from 'react';
import LoadingPage from '#/components/layout/loading-page';
import { restoreSession } from '#/api/auth.api';

export const Route = createFileRoute('/admin')({
    component: AdminLayout
});

function AdminLayout() {
    const user = useAuthStore((state) => state.user);
    const _hasHydrated = useAuthStore((state) => state._hasHydrated);
    const [isMounted, setIsMounted] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    useEffect(() => {
        let isActive = true;

        const initializeSession = async () => {
            setIsMounted(true);
            await waitForAuthHydration();

            if (!useAuthStore.getState().user) {
                try {
                    await restoreSession();
                } catch (error) {
                    console.error('Failed to restore session on admin route:', error);
                }
            }

            const currentUser = useAuthStore.getState().user;
            if (currentUser) {
                try {
                    const { useRegisterShiftStore } = await import('#/store/register-shift-store.ts');
                    await useRegisterShiftStore.getState().fetchActiveShift();
                } catch (err) {
                    console.error('Failed to fetch active shift drawer on startup:', err);
                }
            }

            if (isActive) {
                setIsCheckingSession(false);
            }
        };

        initializeSession();

        return () => {
            isActive = false;
        };
    }, []);

    if (!isMounted || !_hasHydrated || isCheckingSession) {
        return <LoadingPage />;
    }

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
