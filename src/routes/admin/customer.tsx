import { createFileRoute } from '@tanstack/react-router';
import CustomerManagementPage from '#/feature/customer-management/customer-management-page';

export const Route = createFileRoute('/admin/customer')({
    component: CustomerManagementPage
});
