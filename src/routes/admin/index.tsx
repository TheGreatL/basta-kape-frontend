import DashboardPage from '#/feature/dashboard/dashboard-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/')({
    component: DashboardPage
});
