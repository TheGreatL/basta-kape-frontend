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

export const forgotPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address')
});

export type TForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
    .object({
        token: z.string().min(1, 'Reset token is required'),
        newPassword: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/^(?=.*[A-Z])(?=.*\d).+$/, 'Password must contain at least one uppercase letter and one number'),
        confirmNewPassword: z.string().min(1, 'Please confirm your password')
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
        message: "Passwords don't match",
        path: ['confirmNewPassword']
    });

export type TResetPasswordSchema = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
    .object({
        oldPassword: z.string().min(1, 'Old password is required'),
        newPassword: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/^(?=.*[A-Z])(?=.*\d).+$/, 'Password must contain at least one uppercase letter and one number'),
        confirmNewPassword: z.string().min(1, 'Please confirm your password')
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
        message: "Passwords don't match",
        path: ['confirmNewPassword']
    });

export type TChangePasswordSchema = z.infer<typeof changePasswordSchema>;
