import { z } from 'zod';

export const createCustomerSchema = z.object({
    email: z.string().email('Invalid email address'),
    username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and dashes'),
    password: z
        .string()
        .optional()
        .or(z.literal(''))
        .refine((val) => !val || (val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val)), {
            message: 'Password must be at least 8 characters, contain at least one uppercase letter, and one number'
        }),
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    middleName: z.string().optional().default(''),
    phoneNumber: z.string().optional().default('')
});

export type TCreateCustomerSchema = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = z.object({
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and dashes')
        .optional()
        .or(z.literal('')),
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    middleName: z.string().optional().default(''),
    phoneNumber: z.string().optional().default('')
});

export type TUpdateCustomerSchema = z.infer<typeof updateCustomerSchema>;
