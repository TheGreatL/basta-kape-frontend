import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import RoleListPage from '#/feature/rbac/role/role-list-page';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(10),
    search: z.string().catch(''),
    status: z.enum(['active', 'archive']).catch('active')
});

export const Route = createFileRoute('/admin/(rbac)/roles/')({
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Roles and Permissions', 'read');
    },
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: RoleListPage
});
