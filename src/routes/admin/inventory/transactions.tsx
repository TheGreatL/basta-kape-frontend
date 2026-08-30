import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import InventoryTransactionPage from '#/feature/inventory/transaction/inventory-transaction-page.tsx';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    page: z.number().optional().default(1),
    pageSize: z.number().optional().default(10),
    search: z.string().optional().default(''),
    supplierId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional()
});

export const Route = createFileRoute('/admin/inventory/transactions')({
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: InventoryTransactionPage,
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Inventory Management', 'read');
    }
});

export type TTransactionsSearchSchema = z.infer<typeof searchParamsSchema>;
