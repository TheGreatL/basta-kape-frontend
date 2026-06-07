import ActivityLogPage from '#/feature/activity-log/activity-log-page';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { requirePermission } from '#/utils/rbac.ts';
import { useAuthStore, waitForAuthHydration } from '#/store/auth-store.ts';
import { restoreSession } from '#/api/auth.api.ts';

const searchParamsSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(10),
    search: z.string().catch(''),
    dateFrom: z.string().catch(''),
    dateTo: z.string().catch('')
});

export const Route = createFileRoute('/admin/activity-logs')({
    beforeLoad: async () => {
        if (typeof window === 'undefined') {
            return;
        }

        await waitForAuthHydration();

        if (!useAuthStore.getState().user) {
            await restoreSession().catch(() => null);
        }

        requirePermission(null, 'Activity Logs', 'read');
    },
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: ActivityLogPage
});

export type TActivityLogSearchSchema = z.infer<typeof searchParamsSchema>;
