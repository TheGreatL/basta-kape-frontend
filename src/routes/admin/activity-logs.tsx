import ActivityLogPage from '#/feature/activity-log/activity-log-page';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(10),
    search: z.string().catch(''),
    dateFrom: z.string().catch(''),
    dateTo: z.string().catch('')
});

export const Route = createFileRoute('/admin/activity-logs')({
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Activity Logs', 'read');
    },
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: ActivityLogPage
});

export type TActivityLogSearchSchema = z.infer<typeof searchParamsSchema>;
