// import PosPage from '#/feature/pos/pos-page';
import { createFileRoute } from '@tanstack/react-router';
import { requirePermission } from '#/utils/rbac.ts';
import { appModules } from '#/constants/rbac.ts';

export const Route = createFileRoute('/admin/pos')({
    // component: PosPage,
    component: () => {
        return <div>POS Page</div>;
    },
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, appModules.POINT_OF_SALE, 'read');
    }
});
