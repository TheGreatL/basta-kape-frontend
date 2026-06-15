import { Navigate, createFileRoute } from '@tanstack/react-router';
import LoginPage from '@/feature/auth/login-page';
import { useAuthStore } from '@/store/auth-store';

export const Route = createFileRoute('/(auth)/login')({
    component: () => <LoginPage />
});
