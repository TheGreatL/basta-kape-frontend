import { z } from 'zod';

export const productSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters'),
    photo: z.string().max(2048, 'Photo path must not exceed 2048 characters').or(z.literal('')).optional().nullable(),
    description: z.string().max(1000, 'Description must not exceed 1000 characters').optional().nullable(),
    productCategoryId: z.string().max(100, 'Category ID must not exceed 100 characters').or(z.literal('')).optional().nullable(),
    productTypeId: z.string().max(100, 'Product Type ID must not exceed 100 characters').or(z.literal('')).optional().nullable()
});

export const productVariantSchema = z.object({
    sku: z.string().min(2, 'SKU must be at least 2 characters').max(50, 'SKU must not exceed 50 characters').or(z.literal('')).optional().nullable(),
    price: z.coerce.number().min(0, 'Price must be a positive number or zero'),
    attributeValueIds: z.array(z.string().max(100, 'Attribute value ID must not exceed 100 characters')).optional().default([])
});
