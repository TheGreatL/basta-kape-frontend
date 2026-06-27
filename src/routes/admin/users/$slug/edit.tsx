import { createFileRoute } from '@tanstack/react-router';
import UserDetailPage from '#/feature/users/user-detail-page';
import { requirePermission } from '#/utils/rbac.ts';

export const Route = createFileRoute('/admin/users/$slug/edit')({
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Users Management', 'update');
    },
    component: UserDetailPage
});
