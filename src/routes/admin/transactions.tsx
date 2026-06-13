import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import TransactionsPage from '#/feature/transactions/transactions-page';
import { requirePermission } from '#/utils/rbac.ts';
import { waitForAuthHydration } from '#/store/auth-store.ts';

const searchParamsSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(10),
    search: z.string().catch(''),
    paymentMethod: z.enum(['CASH', 'GCASH', 'PAYMAYA', 'CREDIT_CARD', '']).catch(''),
    paymentStatus: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED', '']).catch(''),
    dateFrom: z.string().catch(''),
    dateTo: z.string().catch('')
});

export const Route = createFileRoute('/admin/transactions')({
    beforeLoad: async () => {
        await waitForAuthHydration();
        requirePermission(null, 'Transaction History', 'read');
    },
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: TransactionsPage
});

export type TTransactionsSearchSchema = z.infer<typeof searchParamsSchema>;
