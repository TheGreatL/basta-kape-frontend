import { z } from 'zod';

export const createSupplierSchema = z.object({
    name: z.string().min(2, 'Supplier name must be at least 2 characters').max(100, 'Supplier name must not exceed 100 characters'),
    address: z.string().max(500, 'Address must not exceed 500 characters').optional().default(''),
    contactPerson: z.string().max(100, 'Contact person name must not exceed 100 characters').optional().default(''),
    contactNumber: z.string().max(50, 'Contact number must not exceed 50 characters').optional().default(''),
    notes: z.string().max(1000, 'Notes must not exceed 1000 characters').optional().default('')
});

export type TCreateSupplierSchema = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = z.object({
    name: z.string().min(2, 'Supplier name must be at least 2 characters').max(100, 'Supplier name must not exceed 100 characters'),
    address: z.string().max(500, 'Address must not exceed 500 characters').optional().default(''),
    contactPerson: z.string().max(100, 'Contact person name must not exceed 100 characters').optional().default(''),
    contactNumber: z.string().max(50, 'Contact number must not exceed 50 characters').optional().default(''),
    notes: z.string().max(1000, 'Notes must not exceed 1000 characters').optional().default('')
});

export type TUpdateSupplierSchema = z.infer<typeof updateSupplierSchema>;
