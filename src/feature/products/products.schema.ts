import { z } from 'zod';

export const productSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters'),
    photo: z.string().max(2048, 'Photo path must not exceed 2048 characters').or(z.literal('')).optional().nullable(),
    description: z.string().max(1000, 'Description must not exceed 1000 characters').optional().nullable(),
    productCategoryId: z.string().max(100, 'Category ID must not exceed 100 characters').or(z.literal('')).optional().nullable(),
    productTypeId: z.string().max(100, 'Product Type ID must not exceed 100 characters').or(z.literal('')).optional().nullable(),
    preparationType: z.enum(['MADE_TO_ORDER', 'PREPARED_DISPLAY']),
    defaultShelfLife: z.number().min(1, 'Shelf life must be at least 1 minute').optional().nullable()
});

export type TProductSchema = z.infer<typeof productSchema>;

export const productVariantSchema = z.object({
    sku: z.string().min(2, 'SKU must be at least 2 characters').max(50, 'SKU must not exceed 50 characters').or(z.literal('')).optional().nullable(),
    price: z.number().min(0, 'Price must be a positive number or zero'),
    attributeValueIds: z.array(z.string().max(100, 'Attribute value ID must not exceed 100 characters')).optional().default([])
});

export type TProductVariantSchema = z.infer<typeof productVariantSchema>;
