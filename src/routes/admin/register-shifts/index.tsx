import RegisterShiftsPage from '#/feature/register-shifts/register-shifts-page';
import { createFileRoute } from '@tanstack/react-router';
import { requirePermission } from '#/utils/rbac.ts';
import { appModules } from '#/constants/rbac.ts';

export const Route = createFileRoute('/admin/register-shifts/')({
    beforeLoad: () => {
        requirePermission(null, appModules.POINT_OF_SALE, 'read');
    },
    component: RegisterShiftsPage
});
