import { createFileRoute } from '@tanstack/react-router';
import RoleDetailPage from '#/feature/rbac/role/role-detail-page';
import { requirePermission } from '#/utils/rbac.ts';

export const Route = createFileRoute('/admin/(rbac)/roles/$slug')({
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Roles and Permissions', 'read');
    },
    component: RoleDetailPageContainer
});

function RoleDetailPageContainer() {
    const { slug } = Route.useParams();
    return <RoleDetailPage slug={decodeURIComponent(slug)} />;
}
