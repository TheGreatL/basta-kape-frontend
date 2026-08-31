import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { format, subDays } from 'date-fns';
import SalesPage from '#/feature/sales/sales-page';
import { requirePermission } from '#/utils/rbac.ts';

const getDefaultDateTo = () => format(new Date(), 'yyyy-MM-dd');
const getDefaultDateFrom = () => format(subDays(new Date(), 30), 'yyyy-MM-dd');

const searchParamsSchema = z.object({
    dateFrom: z
        .string()
        .optional()
        .default(() => getDefaultDateFrom())
        .catch(() => getDefaultDateFrom()),
    dateTo: z
        .string()
        .optional()
        .default(() => getDefaultDateTo())
        .catch(() => getDefaultDateTo())
});

export const Route = createFileRoute('/admin/sales')({
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: SalesPage,
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Sales Management', 'read');
    }
});

export type TSalesSearchSchema = z.infer<typeof searchParamsSchema>;
