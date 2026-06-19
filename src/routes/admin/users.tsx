import UsersPage from '#/feature/users/users-page';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(10),
    search: z.string().catch(''),
    status: z.enum(['active', 'archive']).catch('active'),
    role: z.string().catch('')
});

export const Route = createFileRoute('/admin/users')({
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Users Management', 'read');
    },
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: UsersPage
});

export type TUserSearchSchema = z.infer<typeof searchParamsSchema>;
