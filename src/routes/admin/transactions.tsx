import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import TransactionsPage from '#/feature/transactions/transactions-page';
import { requirePermission } from '#/utils/rbac.ts';

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
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: TransactionsPage,
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Transaction History', 'read');
    }
});

export type TTransactionsSearchSchema = z.infer<typeof searchParamsSchema>;
