import { createFileRoute } from '@tanstack/react-router';
import CustomerManagementPage from '#/feature/customer-management/customer-management-page';
import { z } from 'zod';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(10),
    search: z.string().catch(''),
    status: z.enum(['active', 'archive']).catch('active')
});

export const Route = createFileRoute('/admin/customers')({
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Customers Management', 'read');
    },
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: CustomerManagementPage
});

export type TCustomerSearchSchema = z.infer<typeof searchParamsSchema>;
