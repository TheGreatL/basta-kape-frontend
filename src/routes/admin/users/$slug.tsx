import { createFileRoute } from '@tanstack/react-router';
import UserDetailPage from '#/feature/users/user-detail-page';
import { requirePermission } from '#/utils/rbac.ts';

export const Route = createFileRoute('/admin/users/$slug')({
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Users Management', 'read');
    },
    component: RouteComponent
});

function RouteComponent() {
    const { slug } = Route.useParams();
    return <UserDetailPage slug={slug} />;
}
