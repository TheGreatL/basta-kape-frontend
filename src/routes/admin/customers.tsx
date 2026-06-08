import { createFileRoute } from '@tanstack/react-router';
import CustomerManagementPage from '#/feature/customer-management/customer-management-page';
import { z } from 'zod';
import { requirePermission } from '#/utils/rbac.ts';
import { useAuthStore, waitForAuthHydration } from '#/store/auth-store.ts';
import { restoreSession } from '#/api/auth.api.ts';

const searchParamsSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(10),
    search: z.string().catch(''),
    status: z.enum(['active', 'archive']).catch('active')
});

export const Route = createFileRoute('/admin/customers')({
    beforeLoad: async () => {
        if (typeof window === 'undefined') {
            return;
        }

        await waitForAuthHydration();

        if (!useAuthStore.getState().user) {
            await restoreSession().catch(() => null);
        }

        requirePermission(null, 'Customers Management', 'read');
    },
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: CustomerManagementPage
});

export type TCustomerSearchSchema = z.infer<typeof searchParamsSchema>;
