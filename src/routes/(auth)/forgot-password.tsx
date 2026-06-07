import { createFileRoute, redirect } from '@tanstack/react-router';
import ForgotPasswordPage from '@/feature/auth/forgot-password-page';
import { waitForAuthHydration, useAuthStore } from '@/store/auth-store';

export const Route = createFileRoute('/(auth)/forgot-password')({
    beforeLoad: async () => {
        await waitForAuthHydration();
        const user = useAuthStore.getState().user;
        if (user) {
            const isCustomer = user.roles.every((role) => role.name.toLowerCase() === 'customer');
            throw redirect({ to: isCustomer ? '/' : '/admin' });
        }
    },
    component: ForgotPasswordPage
});
