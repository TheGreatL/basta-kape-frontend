import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import PermissionPage from '#/feature/rbac/permission/permission-page';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(10),
    search: z.string().catch('')
});

export const Route = createFileRoute('/admin/(rbac)/permissions')({
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: PermissionPage,
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Roles and Permissions', 'read');
    }
});
