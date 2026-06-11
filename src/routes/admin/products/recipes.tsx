import RecipesPage from '#/feature/recipes/recipes-page';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { requirePermission } from '#/utils/rbac.ts';
import { useAuthStore, waitForAuthHydration } from '#/store/auth-store.ts';
import { restoreSession } from '#/api/auth.api.ts';

const searchParamsSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(10),
    search: z.string().catch(''),
    status: z.enum(['active', 'archive']).catch('active'),
    productCategoryId: z.string().catch(''),
    productTypeId: z.string().catch(''),
    recipeStatus: z.enum(['all', 'configured', 'not_configured']).catch('all')
});

export const Route = createFileRoute('/admin/products/recipes')({
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
    component: RecipesPage
});

export type TRecipesSearchSchema = z.infer<typeof searchParamsSchema>;
