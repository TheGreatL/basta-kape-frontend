import { z } from 'zod';

export const loginSchema = z.object({
    identifier: z.string().min(1, 'Identifier is required'),
    password: z.string().min(1, 'Password is required')
});

export type TLoginSchema = z.infer<typeof loginSchema>;

export const registerSchema = z
    .object({
        email: z.string().email('Please enter a valid email address'),
        username: z.string().min(3, 'Username must be at least 3 characters'),
        password: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/^(?=.*[A-Z])(?=.*\d).+$/, 'Password must contain at least one uppercase letter and one number'),
        confirmPassword: z.string().min(1, 'Please confirm your password'),
        firstName: z.string().min(2, 'First name is required'),
        middleName: z.string().optional(),
        lastName: z.string().min(2, 'Last name is required'),
        phoneNumber: z.string().optional()
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword']
    });

export type TRegisterSchema = z.infer<typeof registerSchema>;
