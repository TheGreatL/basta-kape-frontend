import { z } from 'zod';

export const loginSchema = z.object({
    identifier: z.string().min(1, 'Identifier is required').max(255, 'Identifier must not exceed 255 characters'),
    password: z.string().min(1, 'Password is required').max(100, 'Password must not exceed 100 characters')
});

export type TLoginSchema = z.infer<typeof loginSchema>;

export const registerSchema = z
    .object({
        email: z.string().email('Please enter a valid email address').max(255, 'Email must not exceed 255 characters'),
        username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must not exceed 50 characters'),
        password: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .max(100, 'Password must not exceed 100 characters')
            .regex(/^(?=.*[A-Z])(?=.*\d).+$/, 'Password must contain at least one uppercase letter and one number'),
        confirmPassword: z.string().min(1, 'Please confirm your password').max(100, 'Password must not exceed 100 characters'),
        firstName: z.string().min(2, 'First name is required').max(100, 'First name must not exceed 100 characters'),
        middleName: z.string().max(100, 'Middle name must not exceed 100 characters').optional(),
        lastName: z.string().min(2, 'Last name is required').max(100, 'Last name must not exceed 100 characters'),
        phoneNumber: z.string().max(11, 'Phone number must not exceed 11 digits').optional(),
        otp: z.string().max(6, 'OTP must be 6 digits').optional()
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword']
    });

export type TRegisterSchema = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address').max(255, 'Email must not exceed 255 characters')
});

export type TForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
    .object({
        token: z.string().min(1, 'Reset token is required').max(100, 'Reset token must not exceed 100 characters'),
        newPassword: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .max(100, 'Password must not exceed 100 characters')
            .regex(/^(?=.*[A-Z])(?=.*\d).+$/, 'Password must contain at least one uppercase letter and one number'),
        confirmNewPassword: z.string().min(1, 'Please confirm your password').max(100, 'Password must not exceed 100 characters')
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
        message: "Passwords don't match",
        path: ['confirmNewPassword']
    });

export type TResetPasswordSchema = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
    .object({
        oldPassword: z.string().min(1, 'Old password is required').max(100, 'Password must not exceed 100 characters'),
        newPassword: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .max(100, 'Password must not exceed 100 characters')
            .regex(/^(?=.*[A-Z])(?=.*\d).+$/, 'Password must contain at least one uppercase letter and one number'),
        confirmNewPassword: z.string().min(1, 'Please confirm your password').max(100, 'Password must not exceed 100 characters')
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
        message: "Passwords don't match",
        path: ['confirmNewPassword']
    });

export type TChangePasswordSchema = z.infer<typeof changePasswordSchema>;
