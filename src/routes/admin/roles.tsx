import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import RolePage from '#/feature/rbac/role-page';
import { requirePermission } from '#/utils/rbac.ts';
import { waitForAuthHydration } from '#/store/auth-store.ts';

const searchParamsSchema = z.object({
    tab: z.enum(['roles', 'permissions', 'modules']).catch('roles'),

    // Roles Tab parameters
    rPage: z.number().catch(1),
    rPageSize: z.number().catch(10),
    rSearch: z.string().catch(''),
    rStatus: z.enum(['active', 'archive']).catch('active'),

    // Permissions Tab parameters
    pPage: z.number().catch(1),
    pPageSize: z.number().catch(10),
    pSearch: z.string().catch(''),

    // Modules Tab parameters
    mPage: z.number().catch(1),
    mPageSize: z.number().catch(10),
    mSearch: z.string().catch('')
});

export const Route = createFileRoute('/admin/roles')({
    beforeLoad: async () => {
        await waitForAuthHydration();
        requirePermission(null, 'Roles and Permissions', 'read');
    },
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: RolePage
});
export type TRoleSearchSchema = z.infer<typeof searchParamsSchema>;
