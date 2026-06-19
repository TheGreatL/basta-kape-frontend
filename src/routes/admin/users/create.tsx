import { createFileRoute } from '@tanstack/react-router';
import UserCreatePage from '#/feature/users/user-create-page';
import { requirePermission } from '#/utils/rbac.ts';

export const Route = createFileRoute('/admin/users/create')({
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Users Management', 'create');
    },
    component: UserCreatePage
});
