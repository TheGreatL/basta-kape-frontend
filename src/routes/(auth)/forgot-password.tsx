import { createFileRoute } from '@tanstack/react-router';
import ForgotPasswordPage from '@/feature/auth/forgot-password-page';

export const Route = createFileRoute('/(auth)/forgot-password')({
    component: ForgotPasswordPage
});
