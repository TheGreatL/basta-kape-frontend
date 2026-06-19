import CustomerManagementPage from '#/feature/customer-management/customer-management-page';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    page: z.number().catch(1).optional(),
    pageSize: z.number().catch(10).optional(),
    search: z.string().catch('').optional(),
    status: z.enum(['active', 'archive']).catch('active').optional()
});

export type TCustomerSearchSchema = z.infer<typeof searchParamsSchema>;

export const Route = createFileRoute('/admin/customers/')({
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: CustomerManagementPage,
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Customers Management', 'read');
    }
});
