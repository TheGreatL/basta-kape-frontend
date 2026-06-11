import ModifiersPage from '#/feature/modifier/modifier-page';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { requirePermission } from '#/utils/rbac.ts';
import { useAuthStore, waitForAuthHydration } from '#/store/auth-store.ts';
import { restoreSession } from '#/api/auth.api.ts';

const searchParamsSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(10),
    search: z.string().catch(''),
    productId: z.string().catch('')
});

export const Route = createFileRoute('/admin/products/modifiers')({
    beforeLoad: async () => {
        if (typeof window === 'undefined') {
            return;
        }

        await waitForAuthHydration();

        if (!useAuthStore.getState().user) {
            await restoreSession().catch(() => null);
        }

        requirePermission(null, 'Products Management', 'read');
    },
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: ModifiersPage
});

export type TModifiersSearchSchema = z.infer<typeof searchParamsSchema>;
