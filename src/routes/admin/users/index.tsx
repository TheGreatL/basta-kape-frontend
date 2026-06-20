import UsersPage from '#/feature/users/users-page';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    page: z.number().default(1).optional(),
    pageSize: z.number().default(10).optional(),
    search: z.string().default('').optional(),
    status: z.enum(['active', 'archive']).default('active').optional(),
    role: z.string().default('').optional()
});

export const Route = createFileRoute('/admin/users/')({
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: UsersPage,
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Users Management', 'read');
    }
});

export type TUserSearchSchema = z.infer<typeof searchParamsSchema>;
