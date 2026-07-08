import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import RoleListPage from '#/feature/rbac/role/role-list-page';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    page: z.number().default(1).optional(),
    pageSize: z.number().default(10).optional(),
    search: z.string().default('').optional(),
    status: z.enum(['active', 'archive']).default('active').optional()
});

export const Route = createFileRoute('/admin/(rbac)/roles/')({
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: RoleListPage,
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Roles and Permissions', 'read');
    }
});
