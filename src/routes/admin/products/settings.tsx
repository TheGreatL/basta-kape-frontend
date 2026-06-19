import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import ProductSettingsPage from '#/feature/product-settings/product-settings-page';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    tab: z.enum(['categories', 'types', 'attributes']).catch('categories'),

    // Categories parameters
    cPage: z.number().catch(1),
    cPageSize: z.number().catch(10),
    cSearch: z.string().catch(''),
    cStatus: z.enum(['active', 'archive']).catch('active'),

    // Product Types parameters
    tPage: z.number().catch(1),
    tPageSize: z.number().catch(10),
    tSearch: z.string().catch(''),
    tStatus: z.enum(['active', 'archive']).catch('active'),

    // Attributes parameters
    aPage: z.number().catch(1),
    aPageSize: z.number().catch(10),
    aSearch: z.string().catch(''),
    aStatus: z.enum(['active', 'archive']).catch('active')
});

export const Route = createFileRoute('/admin/products/settings')({
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: ProductSettingsPage,
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Product Settings Management', 'read');
    }
});

export type TProductSettingsSearchSchema = z.infer<typeof searchParamsSchema>;
