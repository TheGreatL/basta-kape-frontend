import { createFileRoute } from '@tanstack/react-router';
import RoleCreatePage from '#/feature/rbac/role/role-create-page';
import { requirePermission } from '#/utils/rbac.ts';

export const Route = createFileRoute('/admin/(rbac)/roles/create')({
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Roles and Permissions', 'create');
    },
    component: RoleCreatePage
});
