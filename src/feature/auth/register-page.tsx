import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

import { register } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth-store';
import { getErrorMessage } from '@/utils/error-handler';
import { registerSchema } from './auth.schema';
import type { TRegisterSchema } from './auth.schema';
import QUERY_KEY from '@/constants/query-keys';
import { BUSINESS_DETAIL } from '@/constants/business-details';
import logo from '@/assets/logo.png';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

export default function RegisterPage() {
    const router = useRouter();
    const setAuth = useAuthStore((state) => state.setAuth);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const form = useForm<TRegisterSchema>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            email: '',
            username: '',
            password: '',
            confirmPassword: '',
            firstName: '',
            middleName: '',
            lastName: '',
            phoneNumber: ''
        }
    });

    const registerMutation = useMutation({
        mutationKey: [QUERY_KEY.AUTH.REGISTER],
        mutationFn: register,
        onSuccess: (data) => {
            setAuth(data.user, data.accessToken);
            toast.success('Account created!', {
                description: 'You have successfully registered.'
            });
            router.navigate({ to: '/' });
        },
        onError: (error) => {
            const msg = getErrorMessage(error, 'An error occurred during registration.');
            toast.error('Registration Failed', {
                description: msg
            });
            console.error('Registration error:', error);
        }
    });

    const onSubmit = (data: TRegisterSchema) => {
        registerMutation.mutate(data);
    };

    return (
        <div className="flex min-h-screen w-full bg-muted/20">
            {/* Left side styling - branding area */}
            <div className="hidden lg:flex flex-col justify-center items-center w-[45%] bg-primary/5 border-r p-12">
                <div className="max-w-md space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="mx-auto mb-8 flex justify-center">
                        <img src={logo} alt={BUSINESS_DETAIL.NAME} className="size-28 rounded-full object-cover border border-border/50 shadow-md" />
                    </div>
                    <h1 className="text-4xl font-bold">Join {BUSINESS_DETAIL.NAME}</h1>
                    <p className="text-lg text-muted-foreground">
                        Create an account to manage your store, track inventory, and serve the best coffee experiences to your customers.
                    </p>
                </div>
            </div>

            {/* Right side styling - form area */}
            <div className="flex flex-1 items-center justify-center p-4 lg:p-8 animate-in fade-in zoom-in-95 duration-500 py-12 overflow-y-auto">
                <Card className="w-full max-w-xl shadow-lg border-primary/10">
                    <CardHeader className="space-y-2 text-center">
                        <div className="flex justify-center mb-4 lg:hidden">
                            <img
                                src={logo}
                                alt={BUSINESS_DETAIL.NAME}
                                className="size-16 rounded-full object-cover border border-border/50 shadow-sm"
                            />
                        </div>
                        <CardTitle className="text-3xl font-bold">Create an Account</CardTitle>
                        <CardDescription>Fill out the form below to register a new account</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="firstName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-foreground/80">First Name</FormLabel>
                                                <FormControl>
                                                    <Input className="h-11 bg-background" placeholder="John" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="lastName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-foreground/80">Last Name</FormLabel>
                                                <FormControl>
                                                    <Input className="h-11 bg-background" placeholder="Doe" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="middleName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-foreground/80">
                                                Middle Name <span className="text-muted-foreground font-normal">(Optional)</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input className="h-11 bg-background" placeholder="" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-foreground/80">Email Address</FormLabel>
                                                <FormControl>
                                                    <Input className="h-11 bg-background" type="email" placeholder="john@example.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="username"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-foreground/80">Username</FormLabel>
                                                <FormControl>
                                                    <Input className="h-11 bg-background" placeholder="johndoe" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="phoneNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-foreground/80">
                                                Phone Number <span className="text-muted-foreground font-normal">(Optional)</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input className="h-11 bg-background" placeholder="+1234567890" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-foreground/80">Password</FormLabel>
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
                                    <FormField
                                        control={form.control}
                                        name="confirmPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-foreground/80">Confirm Password</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input
                                                            className="h-11 bg-background pr-10"
                                                            type={showConfirmPassword ? 'text' : 'password'}
                                                            {...field}
                                                        />
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
                                </div>

                                {registerMutation.isError && (
                                    <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive animate-in fade-in">
                                        {getErrorMessage(registerMutation.error, 'An error occurred during registration.')}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full h-11 text-base font-semibold shadow-sm transition-all hover:scale-[1.02] mt-2"
                                    disabled={registerMutation.isPending}
                                >
                                    {registerMutation.isPending ? 'Creating Account...' : 'Create Account'}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                    <CardFooter className="flex justify-center border-t p-6">
                        <p className="text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link to="/login" className="font-semibold text-primary hover:underline transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
