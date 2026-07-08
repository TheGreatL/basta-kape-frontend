import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/utils/error-handler';
import { loginSchema } from './auth.schema';
import type { TLoginSchema } from './auth.schema';
import QUERY_KEY from '@/constants/query-keys';
import { useStoreSettings } from '@/hooks/use-store-settings';
import logo from '@/assets/logo.png';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const { storeName } = useStoreSettings();

    const form = useForm<TLoginSchema>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            identifier: '',
            password: ''
        }
    });

    const loginMutation = useMutation({
        mutationKey: [QUERY_KEY.AUTH.LOGIN],
        mutationFn: (credentials: TLoginSchema) => login(credentials),
        onSuccess: (user) => {
            toast.success('Successfully logged in!', {
                description: `Welcome back, ${user.firstName || 'User'}!`
            });
            const isCustomer = user.roles.some((role: any) => role.name?.toLowerCase() === 'customer');

            if (isCustomer) {
                router.navigate({ to: '/' });
            } else {
                router.navigate({ to: '/admin' });
            }
        },
        onError: (error) => {
            const msg = getErrorMessage(error, 'Invalid credentials or an error occurred.');
            toast.error('Login Failed', {
                description: msg
            });
            console.error('Login error:', error);
        }
    });

    const onSubmit = (data: TLoginSchema) => {
        loginMutation.mutate(data);
    };

    return (
        <div className="flex min-h-screen w-full bg-muted/20">
            {/* Left side styling - branding area */}
            <div className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-primary/5 border-r p-12">
                <div className="max-w-md space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="mx-auto mb-8 flex justify-center">
                        <img src={logo} alt={storeName} className="size-28 rounded-full object-cover border border-border/50 shadow-md" />
                    </div>
                    <h1 className="text-4xl font-bold">Welcome to {storeName}</h1>
                    <p className="text-lg text-muted-foreground">
                        Your premium coffee management experience starts here. Sign in to access your dashboard, manage orders, and grow your
                        business.
                    </p>
                </div>
            </div>

            {/* Right side styling - form area */}
            <div className="flex flex-1 items-center justify-center p-4 lg:p-8 animate-in fade-in zoom-in-95 duration-500">
                <Card className="w-full max-w-[400px] shadow-lg border-primary/10">
                    <CardHeader className="space-y-2 text-center">
                        <div className="flex justify-center mb-4 lg:hidden">
                            <img src={logo} alt={storeName} className="size-16 rounded-full object-cover border border-border/50 shadow-sm" />
                        </div>
                        <CardTitle className="text-3xl font-bold">Sign In</CardTitle>
                        <CardDescription>Enter your credentials to access your account</CardDescription>
                        {loginMutation.isError && (
                            <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive animate-in fade-in">
                                {getErrorMessage(loginMutation.error, 'Invalid credentials or an error occurred.')}
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                                <FormField
                                    control={form.control}
                                    name="identifier"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-foreground/80">Email or Username</FormLabel>
                                            <FormControl>
                                                <Input className="h-11 bg-background" placeholder="m@example.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center justify-between">
                                                <FormLabel className="text-foreground/80">Password</FormLabel>
                                                <Link
                                                    to="/forgot-password"
                                                    className="text-xs font-semibold text-primary hover:underline transition-colors"
                                                >
                                                    Forgot password?
                                                </Link>
                                            </div>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        className="h-11 bg-background pr-10"
                                                        type={showPassword ? 'text' : 'password'}
                                                        {...field}
                                                    />
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

                                <Button
                                    type="submit"
                                    className="w-full h-11 text-base font-semibold shadow-sm transition-all hover:scale-[1.02]"
                                    disabled={loginMutation.isPending}
                                >
                                    {loginMutation.isPending ? 'Logging in...' : 'Sign in'}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                    <CardFooter className="flex justify-center border-t p-6">
                        <p className="text-sm text-muted-foreground">
                            Don't have an account?{' '}
                            <Link to="/register" className="font-semibold text-primary hover:underline transition-colors">
                                Sign up
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
