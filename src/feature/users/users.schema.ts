import { z } from 'zod';

export const createUserSchema = z.object({
    email: z.string().email('Invalid email address'),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    middleName: z.string().default(''),
    phoneNumber: z.string().default(''),
    roleIds: z.array(z.string().uuid()).default([])
});

export type TCreateUserSchema = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    middleName: z.string().default(''),
    phoneNumber: z.string().default(''),
    roleIds: z.array(z.string().uuid()).default([])
});

export type TUpdateUserSchema = z.infer<typeof updateUserSchema>;
