import { createFileRoute } from '@tanstack/react-router';
import RegisterPage from '@/feature/auth/register-page';

export const Route = createFileRoute('/(auth)/register')({
    component: RegisterPage
});
