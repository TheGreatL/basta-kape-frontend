import { z } from 'zod';

export const createCustomerSchema = z.object({
    email: z.string().email('Invalid email address').max(255, 'Email must not exceed 255 characters'),
    username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(50, 'Username must not exceed 50 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and dashes'),
    password: z
        .string()
        .max(100, 'Password must not exceed 100 characters')
        .optional()
        .or(z.literal(''))
        .refine((val) => !val || (val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val)), {
            message: 'Password must be at least 8 characters, contain at least one uppercase letter, and one number'
        }),
    firstName: z.string().min(2, 'First name must be at least 2 characters').max(100, 'First name must not exceed 100 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters').max(100, 'Last name must not exceed 100 characters'),
    middleName: z.string().max(100, 'Middle name must not exceed 100 characters').default(''),
    phoneNumber: z.string().max(11, 'Phone number must not exceed 11 characters').default('')
});

export type TCreateCustomerSchema = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = z.object({
    email: z.string().email('Invalid email address').max(255, 'Email must not exceed 255 characters').or(z.literal('')),
    username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(50, 'Username must not exceed 50 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and dashes')
        .or(z.literal('')),
    firstName: z.string().min(2, 'First name must be at least 2 characters').max(100, 'First name must not exceed 100 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters').max(100, 'Last name must not exceed 100 characters'),
    middleName: z.string().max(100, 'Middle name must not exceed 100 characters'),
    phoneNumber: z.string().max(11, 'Phone number must not exceed 11 characters')
});

export type TUpdateCustomerSchema = z.infer<typeof updateCustomerSchema>;
