import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import ModulePage from '#/feature/rbac/module/module-page';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(10),
    search: z.string().catch('')
});

export const Route = createFileRoute('/admin/(rbac)/modules')({
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: ModulePage,
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Roles and Permissions', 'read');
    }
});
