import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import ResetPasswordPage from '@/feature/auth/reset-password-page';
import { waitForAuthHydration, useAuthStore } from '@/store/auth-store';

const searchSchema = z.object({
    token: z.string().optional().catch('')
});

export const Route = createFileRoute('/(auth)/reset-password')({
    beforeLoad: async () => {
        await waitForAuthHydration();
        const user = useAuthStore.getState().user;
        if (user) {
            const isCustomer = user.roles.every((role) => role.name.toLowerCase() === 'customer');
            throw redirect({ to: isCustomer ? '/' : '/admin' });
        }
    },
    validateSearch: (search) => searchSchema.parse(search),
    component: ResetPasswordPage
});
