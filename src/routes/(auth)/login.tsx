import { Navigate, createFileRoute, redirect } from '@tanstack/react-router';
import LoginPage from '@/feature/auth/login-page';
import { waitForAuthHydration, useAuthStore } from '@/store/auth-store';

export const Route = createFileRoute('/(auth)/login')({
    beforeLoad: async () => {
        await waitForAuthHydration();
        const user = useAuthStore.getState().user;
        if (user) {
            console.log(user);
            const isCustomer = user.roles.find((role) => role.name.toLowerCase() === 'customer');
            throw redirect({ to: isCustomer ? '/' : '/admin' });
        }
    },
    component: () => {
        const user = useAuthStore.getState().user;
        if (!user) return <LoginPage />;

        const isCustomer = user.roles.find((role) => role.name.toLowerCase() === 'customer');
        if (isCustomer) return <Navigate to="/" />;

        const isAdmin = user.roles.find((role) => role.name.toLowerCase() === 'admin');
        if (isAdmin) return <Navigate to="/admin" />;

        return <LoginPage />;
    }
});
