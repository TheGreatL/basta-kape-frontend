import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, ArrowLeft, Key } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/utils/error-handler';
import { sendOtp } from '@/api/auth.api';
import { registerSchema } from './auth.schema';
import type { TRegisterSchema } from './auth.schema';
import QUERY_KEY from '@/constants/query-keys';
import { useStoreSettings } from '@/hooks/use-store-settings';
import logo from '@/assets/logo.png';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';

export default function RegisterPage() {
    const router = useRouter();
    const { register } = useAuth();
    const [step, setStep] = useState<'form' | 'otp'>('form');
    const [otp, setOtp] = useState('');
    const [devOtp, setDevOtp] = useState<string | null>(null);
    const [resendTimer, setResendTimer] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { storeName } = useStoreSettings();

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

    // Countdown timer for resend OTP button
    useEffect(() => {
        if (resendTimer <= 0) return;
        const interval = setInterval(() => {
            setResendTimer((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [resendTimer]);

    // Send OTP Mutation
    const sendOtpMutation = useMutation({
        mutationFn: (data: { email: string; firstName?: string; username?: string; type: 'register' }) => sendOtp(data),
        onSuccess: (res) => {
            setStep('otp');
            setResendTimer(60);
            if (res.otpCode) {
                setDevOtp(res.otpCode);
            }
            toast.success('Verification Code Sent', {
                description: `A 6-digit code was sent to ${form.getValues('email')}.`
            });
        },
        onError: (error) => {
            const msg = getErrorMessage(error, 'Failed to send verification code.');
            toast.error('Unable to send code', {
                description: msg
            });
            console.error('Send OTP error:', error);
        }
    });

    // Final Registration Mutation
    const registerMutation = useMutation({
        mutationKey: [QUERY_KEY.AUTH.REGISTER],
        mutationFn: (credentials: TRegisterSchema) => register(credentials),
        onSuccess: () => {
            toast.success('Account Created!', {
                description: 'Your email has been verified and you are now signed in.'
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

    // Step 1: Validate form and request OTP code
    const onSubmit = (data: TRegisterSchema) => {
        sendOtpMutation.mutate({
            email: data.email,
            firstName: data.firstName,
            username: data.username,
            type: 'register'
        });
    };

    // Step 2: Submit with OTP code
    const handleVerifyOtp = () => {
        if (otp.length !== 6) {
            toast.error('Invalid Code', {
                description: 'Please enter all 6 digits of your verification code.'
            });
            return;
        }

        const formData = form.getValues();
        registerMutation.mutate({
            ...formData,
            otp
        });
    };

    const handleResendOtp = () => {
        const formData = form.getValues();
        sendOtpMutation.mutate({
            email: formData.email,
            firstName: formData.firstName,
            username: formData.username,
            type: 'register'
        });
    };

    return (
        <div className="flex min-h-screen w-full bg-muted/20">
            {/* Left side styling - branding area */}
            <div className="hidden lg:flex flex-col justify-center items-center w-[45%] bg-primary/5 border-r p-12">
                <div className="max-w-md space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="mx-auto mb-8 flex justify-center">
                        <Link to="/" title="Go to home">
                            <img
                                src={logo}
                                alt={storeName}
                                className="size-28 rounded-full object-cover border border-border/50 shadow-md hover:scale-105 transition-transform"
                            />
                        </Link>
                    </div>
                    <h1 className="text-4xl font-bold">Join {storeName}</h1>
                    <p className="text-lg text-muted-foreground">
                        Create an account to manage your store, track inventory, and serve the best coffee experiences to your customers.
                    </p>
                </div>
            </div>

            {/* Right side styling - form area */}
            <div className="flex flex-1 items-center justify-center p-4 lg:p-8 animate-in fade-in zoom-in-95 duration-500 py-12 overflow-y-auto">
                <Card className="w-full max-w-xl shadow-lg border-primary/10">
                    {step === 'form' ? (
                        <>
                            <CardHeader className="space-y-2 text-center">
                                <div className="flex justify-center mb-4 lg:hidden">
                                    <Link to="/" title="Go to home">
                                        <img
                                            src={logo}
                                            alt={storeName}
                                            className="size-16 rounded-full object-cover border border-border/50 shadow-sm hover:scale-105 transition-transform"
                                        />
                                    </Link>
                                </div>
                                <CardTitle className="text-3xl font-bold">Create an Account</CardTitle>
                                <CardDescription>Fill out the form below to register a new account</CardDescription>
                                {sendOtpMutation.isError && (
                                    <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive animate-in fade-in">
                                        {getErrorMessage(sendOtpMutation.error, 'An error occurred.')}
                                    </div>
                                )}
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

                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="middleName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-foreground/80">Middle Name (Optional)</FormLabel>
                                                        <FormControl>
                                                            <Input className="h-11 bg-background" placeholder="Middle" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="phoneNumber"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-foreground/80">Phone Number (Optional)</FormLabel>
                                                        <FormControl>
                                                            <Input className="h-11 bg-background" placeholder="09123456789" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-foreground/80">Email Address</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            className="h-11 bg-background"
                                                            type="email"
                                                            placeholder="john.doe@example.com"
                                                            {...field}
                                                        />
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
                                                                    placeholder="••••••••"
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
                                                                    placeholder="••••••••"
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

                                        <Button
                                            type="submit"
                                            className="w-full h-11 text-base font-semibold shadow-sm transition-all hover:scale-[1.02] mt-2"
                                            disabled={sendOtpMutation.isPending}
                                        >
                                            {sendOtpMutation.isPending ? 'Verifying & Sending Code...' : 'Continue to Verification'}
                                        </Button>
                                    </form>
                                </Form>
                            </CardContent>
                        </>
                    ) : (
                        <>
                            {/* Step 2: OTP Verification Card */}
                            <CardHeader className="space-y-2 text-center animate-in fade-in duration-300">
                                <div className="mx-auto size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                                    <Mail className="size-6" />
                                </div>
                                <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
                                <CardDescription className="max-w-sm mx-auto">
                                    We sent a 6-digit verification code to{' '}
                                    <span className="font-semibold text-foreground">{form.getValues('email')}</span>.
                                </CardDescription>
                                {registerMutation.isError && (
                                    <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive animate-in fade-in">
                                        {getErrorMessage(registerMutation.error, 'Invalid or expired code.')}
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-6 animate-in fade-in duration-300">
                                <div className="flex flex-col items-center justify-center space-y-4">
                                    <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
                                        <InputOTPGroup>
                                            <InputOTPSlot index={0} className="size-12 text-lg font-bold" />
                                            <InputOTPSlot index={1} className="size-12 text-lg font-bold" />
                                            <InputOTPSlot index={2} className="size-12 text-lg font-bold" />
                                        </InputOTPGroup>
                                        <InputOTPSeparator />
                                        <InputOTPGroup>
                                            <InputOTPSlot index={3} className="size-12 text-lg font-bold" />
                                            <InputOTPSlot index={4} className="size-12 text-lg font-bold" />
                                            <InputOTPSlot index={5} className="size-12 text-lg font-bold" />
                                        </InputOTPGroup>
                                    </InputOTP>

                                    <div className="flex items-center justify-between w-full max-w-xs text-xs text-muted-foreground pt-1">
                                        <span>Didn't get the code?</span>
                                        <Button
                                            type="button"
                                            variant="link"
                                            size="sm"
                                            className="p-0 h-auto text-xs font-semibold text-primary"
                                            disabled={resendTimer > 0 || sendOtpMutation.isPending}
                                            onClick={handleResendOtp}
                                        >
                                            {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                                        </Button>
                                    </div>
                                </div>

                                {devOtp && (
                                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-400 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Key className="size-4 shrink-0" />
                                            <span className="font-semibold">Development Code: {devOtp}</span>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="w-full h-7 text-xs bg-background"
                                            onClick={() => setOtp(devOtp)}
                                        >
                                            Auto-Fill Code
                                        </Button>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Button
                                        type="button"
                                        onClick={handleVerifyOtp}
                                        className="w-full h-11 text-base font-semibold shadow-sm transition-all hover:scale-[1.02]"
                                        disabled={otp.length !== 6 || registerMutation.isPending}
                                    >
                                        {registerMutation.isPending ? 'Verifying & Creating Account...' : 'Verify & Complete Registration'}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => {
                                            setStep('form');
                                            setOtp('');
                                        }}
                                        className="w-full text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        <ArrowLeft className="size-3 mr-1" /> Change Email or Info
                                    </Button>
                                </div>
                            </CardContent>
                        </>
                    )}

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
