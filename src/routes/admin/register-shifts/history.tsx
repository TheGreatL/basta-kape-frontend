import RegisterShiftsHistoryPage from '#/feature/register-shifts/register-shifts-history-page';
import { createFileRoute } from '@tanstack/react-router';
import { requirePermission } from '#/utils/rbac.ts';
import { useAuthStore, waitForAuthHydration } from '#/store/auth-store.ts';
import { restoreSession } from '#/api/auth.api.ts';
import { appModules } from '#/constants/rbac.ts';

export const Route = createFileRoute('/admin/register-shifts/history')({
    beforeLoad: async () => {
        if (typeof window === 'undefined') {
            return;
        }

        await waitForAuthHydration();

        if (!useAuthStore.getState().user) {
            await restoreSession().catch(() => null);
        }

        requirePermission(null, appModules.POINT_OF_SALE, 'read');
    },
    component: RegisterShiftsHistoryPage
});
