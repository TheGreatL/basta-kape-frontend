import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import ResetPasswordPage from '@/feature/auth/reset-password-page';

const searchSchema = z.object({
    token: z.string().optional().catch('')
});

export const Route = createFileRoute('/(auth)/reset-password')({
    validateSearch: (search) => searchSchema.parse(search),
    component: ResetPasswordPage
});
