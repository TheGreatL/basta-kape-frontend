import { z } from 'zod';

export const categorySchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters'),
    description: z.string().max(500, 'Description must not exceed 500 characters').optional().default('')
});

export type TCategorySchema = z.infer<typeof categorySchema>;

export const productTypeSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters'),
    description: z.string().max(500, 'Description must not exceed 500 characters').optional().default('')
});

export type TProductTypeSchema = z.infer<typeof productTypeSchema>;

export const attributeSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters'),
    description: z.string().max(500, 'Description must not exceed 500 characters').optional().default('')
});

export type TAttributeSchema = z.infer<typeof attributeSchema>;

export const attributeValueSchema = z.object({
    value: z.string().min(1, 'Value must be at least 1 character').max(100, 'Value must not exceed 100 characters')
});

export type TAttributeValueSchema = z.infer<typeof attributeValueSchema>;
