import RegisterShiftsHistoryPage from '#/feature/register-shifts/register-shifts-history-page';
import { createFileRoute } from '@tanstack/react-router';
import { requirePermission } from '#/utils/rbac.ts';
import { appModules } from '#/constants/rbac.ts';

export const Route = createFileRoute('/admin/register-shifts/history')({
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, appModules.POINT_OF_SALE, 'read');
    },
    component: RegisterShiftsHistoryPage
});
