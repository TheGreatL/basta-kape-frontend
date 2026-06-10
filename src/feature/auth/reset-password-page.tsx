import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter, useSearch } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, Key, ArrowLeft } from 'lucide-react';

import { resetPassword } from '@/api/auth.api';
import { getErrorMessage } from '@/utils/error-handler';
import { resetPasswordSchema } from './auth.schema';
import type { TResetPasswordSchema } from './auth.schema';
import QUERY_KEY from '@/constants/query-keys';
import { useStoreSettings } from '@/hooks/use-store-settings';
import logo from '@/assets/logo.png';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

export default function ResetPasswordPage() {
    const router = useRouter();
    const search = useSearch({ from: '/(auth)/reset-password' });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { storeName } = useStoreSettings();

    const form = useForm<TResetPasswordSchema>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            token: search.token || '',
            newPassword: '',
            confirmNewPassword: ''
        }
    });

    const resetPasswordMutation = useMutation({
        mutationKey: [QUERY_KEY.AUTH.LOGIN, 'reset-password'],
        mutationFn: resetPassword,
        onSuccess: (data) => {
            toast.success('Password Reset Successful', {
                description: data.message || 'Your password has been changed.'
            });
            router.navigate({ to: '/login' });
        },
        onError: (error) => {
            const msg = getErrorMessage(error, 'Token is invalid or has expired.');
            toast.error('Reset Failed', {
                description: msg
            });
            console.error('Reset password error:', error);
        }
    });

    const onSubmit = (data: TResetPasswordSchema) => {
        resetPasswordMutation.mutate(data);
    };

    return (
        <div className="flex min-h-screen w-full bg-muted/20">
            {/* Left side styling - branding area */}
            <div className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-primary/5 border-r p-12">
                <div className="max-w-md space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="mx-auto mb-8 flex justify-center">
                        <img src={logo} alt={storeName} className="size-28 rounded-full object-cover border border-border/50 shadow-md" />
                    </div>
                    <h1 className="text-4xl font-bold">Secure Reset</h1>
                    <p className="text-lg text-muted-foreground">
                        Set a new password for your account. Ensure it is strong and unique to protect your information.
                    </p>
                </div>
            </div>

            {/* Right side styling - form area */}
            <div className="flex flex-1 items-center justify-center p-4 lg:p-8 animate-in fade-in zoom-in-95 duration-500">
                <Card className="w-full max-w-[440px] shadow-lg border-primary/10">
                    <CardHeader className="space-y-2 text-center">
                        <div className="flex justify-center mb-4 lg:hidden">
                            <img src={logo} alt={storeName} className="size-16 rounded-full object-cover border border-border/50 shadow-sm" />
                        </div>
                        <CardTitle className="text-3xl font-bold">Reset Password</CardTitle>
                        <CardDescription>Provide your reset token and your new account password</CardDescription>
                        {resetPasswordMutation.isError && (
                            <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive animate-in fade-in">
                                {getErrorMessage(resetPasswordMutation.error, 'Token is invalid or has expired.')}
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                                <FormField
                                    control={form.control}
                                    name="token"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-foreground/80">Reset Token</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        className="h-11 bg-background pl-10 font-mono text-sm"
                                                        placeholder="Enter reset token uuid"
                                                        {...field}
                                                    />
                                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="newPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-foreground/80">New Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        className="h-11 bg-background pl-10 pr-10"
                                                        type={showPassword ? 'text' : 'password'}
                                                        placeholder="••••••••"
                                                        {...field}
                                                    />
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                                                    >
                                                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="confirmNewPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-foreground/80">Confirm New Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        className="h-11 bg-background pl-10 pr-10"
                                                        type={showConfirmPassword ? 'text' : 'password'}
                                                        placeholder="••••••••"
                                                        {...field}
                                                    />
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                                                    >
                                                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    className="w-full h-11 text-base font-semibold shadow-sm transition-all hover:scale-[1.02]"
                                    disabled={resetPasswordMutation.isPending}
                                >
                                    {resetPasswordMutation.isPending ? 'Resetting password...' : 'Reset Password'}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                    <CardFooter className="flex justify-center border-t p-6">
                        <Link
                            to="/login"
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
                        >
                            <ArrowLeft className="size-4" />
                            Back to Sign In
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
