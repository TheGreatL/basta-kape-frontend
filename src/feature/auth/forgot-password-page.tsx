import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Mail, ArrowLeft, Key, Info } from 'lucide-react';

import { forgotPassword } from '@/api/auth.api';
import { getErrorMessage } from '@/utils/error-handler';
import { forgotPasswordSchema } from './auth.schema';
import type { TForgotPasswordSchema } from './auth.schema';
import QUERY_KEY from '@/constants/query-keys';
import { BUSINESS_DETAIL } from '@/constants/business-details';
import logo from '@/assets/logo.png';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [resetToken, setResetToken] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const form = useForm<TForgotPasswordSchema>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: ''
        }
    });

    const forgotPasswordMutation = useMutation({
        mutationKey: [QUERY_KEY.AUTH.LOGIN, 'forgot-password'], // Using a related auth key
        mutationFn: (data: TForgotPasswordSchema) => forgotPassword(data.email),
        onSuccess: (data) => {
            setSuccessMessage(data.message || 'Password reset email requested successfully.');
            if (data.resetToken) {
                setResetToken(data.resetToken);
            }
            toast.success('Reset Request Sent', {
                description: 'If an account exists, a reset code was generated.'
            });
        },
        onError: (error) => {
            const msg = getErrorMessage(error, 'An error occurred. Please try again.');
            toast.error('Request Failed', {
                description: msg
            });
            console.error('Forgot password error:', error);
        }
    });

    const onSubmit = (data: TForgotPasswordSchema) => {
        forgotPasswordMutation.mutate(data);
    };

    return (
        <div className="flex min-h-screen w-full bg-muted/20">
            {/* Left side styling - branding area */}
            <div className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-primary/5 border-r p-12">
                <div className="max-w-md space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="mx-auto mb-8 flex justify-center">
                        <img src={logo} alt={BUSINESS_DETAIL.NAME} className="size-28 rounded-full object-cover border border-border/50 shadow-md" />
                    </div>
                    <h1 className="text-4xl font-bold">Account Recovery</h1>
                    <p className="text-lg text-muted-foreground">
                        Forgot your password? No worries. Provide your registered email address, and we will help you regain access to your{' '}
                        {BUSINESS_DETAIL.NAME} account.
                    </p>
                </div>
            </div>

            {/* Right side styling - form area */}
            <div className="flex flex-1 items-center justify-center p-4 lg:p-8 animate-in fade-in zoom-in-95 duration-500">
                <Card className="w-full max-w-[440px] shadow-lg border-primary/10">
                    <CardHeader className="space-y-2 text-center">
                        <div className="flex justify-center mb-4 lg:hidden">
                            <img
                                src={logo}
                                alt={BUSINESS_DETAIL.NAME}
                                className="size-16 rounded-full object-cover border border-border/50 shadow-sm"
                            />
                        </div>
                        <CardTitle className="text-3xl font-bold">Forgot Password</CardTitle>
                        <CardDescription>Enter your email address to request a reset link</CardDescription>
                        {forgotPasswordMutation.isError && (
                            <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive animate-in fade-in">
                                {getErrorMessage(forgotPasswordMutation.error, 'An error occurred.')}
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!successMessage ? (
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-foreground/80">Email Address</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input
                                                            className="h-11 bg-background pl-10"
                                                            placeholder="m@example.com"
                                                            type="email"
                                                            {...field}
                                                        />
                                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Button
                                        type="submit"
                                        className="w-full h-11 text-base font-semibold shadow-sm transition-all hover:scale-[1.02]"
                                        disabled={forgotPasswordMutation.isPending}
                                    >
                                        {forgotPasswordMutation.isPending ? 'Sending request...' : 'Send Reset Link'}
                                    </Button>
                                </form>
                            </Form>
                        ) : (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-600 dark:text-emerald-400 flex gap-3">
                                    <Info className="size-5 shrink-0" />
                                    <div>
                                        <p className="font-semibold">Request Sent!</p>
                                        <p className="mt-1 text-xs opacity-90">{successMessage}</p>
                                    </div>
                                </div>

                                {resetToken && (
                                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 text-sm text-amber-700 dark:text-amber-400 space-y-3">
                                        <div className="flex gap-3">
                                            <Key className="size-5 shrink-0" />
                                            <div>
                                                <p className="font-semibold">Development Mode Token</p>
                                                <p className="mt-1 text-xs opacity-90">Here is the reset token returned in development mode:</p>
                                                <code className="block mt-2 p-2 bg-background/50 border border-border/50 rounded font-mono text-xs select-all break-all">
                                                    {resetToken}
                                                </code>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => router.navigate({ to: '/reset-password', search: { token: resetToken } })}
                                            className="w-full mt-2 font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg h-9 text-xs transition-colors"
                                        >
                                            Reset Password with this Token
                                        </Button>
                                    </div>
                                )}

                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setSuccessMessage(null);
                                        setResetToken(null);
                                        form.reset();
                                    }}
                                    className="w-full h-10 text-sm font-semibold rounded-lg mt-2"
                                >
                                    Send another request
                                </Button>
                            </div>
                        )}
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
