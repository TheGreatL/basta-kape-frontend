import { useEffect } from 'react';
import { createFileRoute, Outlet, redirect, useNavigate, Navigate, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '#/context/AuthContext';
import LoadingPage from '#/components/layout/loading-page';

export const Route = createFileRoute('/(auth)')({
    component: RouteComponent,
    beforeLoad: ({ context }) => {
        if (context.auth.isLoading) {
            return;
        }
        const user = context.auth.user;
        if (user) {
            const isCustomer = user.roles.find((role: any) => role.name.toLowerCase() === 'customer');
            throw redirect({ to: isCustomer ? '/' : '/admin' });
        }
    }
});

function RouteComponent() {
    const { isLoading, isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && isAuthenticated && user) {
            const isCustomer = user.roles.find((role: any) => role.name.toLowerCase() === 'customer');
            navigate({ to: isCustomer ? '/' : ('/admin' as any) });
        }
    }, [isLoading, isAuthenticated, user, navigate]);

    if (isLoading) {
        return <LoadingPage />;
    }

    if (isAuthenticated && user) {
        const isCustomer = user.roles.find((role: any) => role.name.toLowerCase() === 'customer');
        return <Navigate to={isCustomer ? '/' : '/admin'} />;
    }

    return (
        <div className="relative min-h-screen">
            <div className="absolute top-4 left-4 z-50 sm:top-6 sm:left-6">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/90 px-4 py-2 text-sm font-medium text-foreground shadow-sm backdrop-blur transition-all hover:bg-accent hover:text-accent-foreground hover:shadow-md"
                >
                    <ArrowLeft className="size-4" />
                    <span>Back to Home</span>
                </Link>
            </div>
            <Outlet />
        </div>
    );
}
