import { z } from 'zod';

export const createBatchSchema = z.object({
    productVariantId: z.string().min(1, 'Please select a product variant to prepare'),
    quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity prepared must be at least 1 unit'),
    shelfLifeMinutes: z.number().int('Shelf life minutes must be an integer').min(1, 'Shelf life duration must be at least 1 minute'),
    notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional().nullable()
});

export type TCreateBatchSchema = z.infer<typeof createBatchSchema>;

export const disposeBatchSchema = z.object({
    quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity to dispose must be at least 1 unit'),
    reason: z.enum(['EXPIRED', 'SPOILED', 'WASTE', 'SAMPLING', 'DISPOSED', 'CORRECTION']),
    notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional().nullable()
});

export type TDisposeBatchSchema = z.infer<typeof disposeBatchSchema>;
