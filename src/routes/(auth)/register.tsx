import { createFileRoute, redirect } from '@tanstack/react-router';
import RegisterPage from '@/feature/auth/register-page';
import { waitForAuthHydration, useAuthStore } from '@/store/auth-store';

export const Route = createFileRoute('/(auth)/register')({
    beforeLoad: async () => {
        await waitForAuthHydration();
        const user = useAuthStore.getState().user;
        if (user) {
            const isCustomer = user.roles.every((role) => role.name.toLowerCase() === 'customer');
            throw redirect({ to: isCustomer ? '/' : '/admin' });
        }
    },
    component: RegisterPage
});
