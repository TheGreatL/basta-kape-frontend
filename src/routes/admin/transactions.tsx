import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { format } from 'date-fns';
import TransactionsPage from '#/feature/transactions/transactions-page';
import { requirePermission } from '#/utils/rbac.ts';

const getTodayStr = () => format(new Date(), 'yyyy-MM-dd');

const searchParamsSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(10),
    search: z.string().catch(''),
    paymentMethod: z.enum(['CASH', 'GCASH', '']).catch(''),
    paymentStatus: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED', '']).catch(''),
    dateFrom: z.string().default(getTodayStr).catch(getTodayStr),
    dateTo: z.string().default(getTodayStr).catch(getTodayStr)
});

export const Route = createFileRoute('/admin/transactions')({
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: TransactionsPage,
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Transaction History', 'read');
    }
});

export type TTransactionsSearchSchema = z.infer<typeof searchParamsSchema>;
