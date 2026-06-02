import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';

import { login } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth-store';
import { getErrorMessage } from '@/utils/error-handler';
import { loginSchema } from './auth.schema';
import type { TLoginSchema } from './auth.schema';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

export default function LoginPage() {
    const router = useRouter();
    const setAuth = useAuthStore((state) => state.setAuth);

    const form = useForm<TLoginSchema>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            identifier: '',
            password: ''
        }
    });

    const loginMutation = useMutation({
        mutationFn: login,
        onSuccess: (data) => {
            setAuth(data.user, data.accessToken, data.refreshToken);
            router.navigate({ to: '/' });
        },
        onError: (error) => {
            // Handle error, potentially show a toast
            console.error('Login error:', error);
        }
    });

    const onSubmit = (data: TLoginSchema) => {
        loginMutation.mutate(data);
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-muted/40">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">Login</CardTitle>
                    <CardDescription>Enter your credentials to login to your account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="identifier"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email or Username</FormLabel>
                                        <FormControl>
                                            <Input placeholder="m@example.com" {...field} />
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
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {loginMutation.isError && (
                                <p className="text-sm font-medium text-destructive">
                                    {getErrorMessage(loginMutation.error, 'Invalid credentials or an error occurred.')}
                                </p>
                            )}
                            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                                {loginMutation.isPending ? 'Logging in...' : 'Login'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
