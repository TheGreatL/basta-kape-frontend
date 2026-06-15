import PosPage from '#/feature/pos/pos-page';
import { createFileRoute } from '@tanstack/react-router';
import { requirePermission } from '#/utils/rbac.ts';
import { appModules } from '#/constants/rbac.ts';

export const Route = createFileRoute('/admin/pos')({
    beforeLoad: () => {
        requirePermission(null, appModules.POINT_OF_SALE, 'read');
    },
    component: PosPage
});
