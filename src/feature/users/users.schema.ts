import { z } from 'zod';

export const createUserSchema = z.object({
    email: z.string().email('Invalid email address').max(255, 'Email must not exceed 255 characters'),
    username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must not exceed 50 characters'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password must not exceed 100 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    firstName: z.string().min(2, 'First name must be at least 2 characters').max(100, 'First name must not exceed 100 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters').max(100, 'Last name must not exceed 100 characters'),
    middleName: z.string().max(100, 'Middle name must not exceed 100 characters').default(''),
    phoneNumber: z.string().max(11, 'Phone number must not exceed 11 characters').default(''),
    roleId: z.string().uuid('Please select a role')
});

export type TCreateUserSchema = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters').max(100, 'First name must not exceed 100 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters').max(100, 'Last name must not exceed 100 characters'),
    middleName: z.string().max(100, 'Middle name must not exceed 100 characters').default(''),
    phoneNumber: z.string().max(11, 'Phone number must not exceed 11 characters').default(''),
    roleId: z.string().uuid().optional()
});

export type TUpdateUserSchema = z.infer<typeof updateUserSchema>;
