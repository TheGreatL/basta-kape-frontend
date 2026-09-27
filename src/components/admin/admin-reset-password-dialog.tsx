import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { KeyRound, Eye, EyeOff, ShieldCheck, User } from 'lucide-react';

import { getErrorMessage } from '#/utils/error-handler.ts';
import { Button } from '#/components/ui/button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

const resetPasswordFormSchema = z
    .object({
        newPassword: z
            .string()
            .min(8, 'Password must be at least 8 characters long')
            .regex(/^(?=.*[A-Z])(?=.*\d).+$/, 'Password must contain at least one uppercase letter and one number'),
        confirmPassword: z.string().min(1, 'Please confirm the new password')
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword']
    });

type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

export interface AdminResetPasswordTarget {
    id: string;
    name: string;
    username: string;
    email?: string;
    type?: 'user' | 'customer';
}

interface AdminResetPasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    target: AdminResetPasswordTarget | null;
    onResetPassword: (id: string, newPassword: string) => Promise<{ message: string }>;
    onSuccessCallback?: () => void;
}

export function AdminResetPasswordDialog({ open, onOpenChange, target, onResetPassword, onSuccessCallback }: AdminResetPasswordDialogProps) {
    const [showNewPassword, setShowNewPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

    const form = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(resetPasswordFormSchema),
        defaultValues: {
            newPassword: '',
            confirmPassword: ''
        }
    });

    React.useEffect(() => {
        if (open) {
            form.reset({
                newPassword: '',
                confirmPassword: ''
            });
            setShowNewPassword(false);
            setShowConfirmPassword(false);
        }
    }, [open, form]);

    const mutation = useMutation({
        mutationFn: ({ id, password }: { id: string; password: string }) => onResetPassword(id, password),
        onSuccess: (data) => {
            toast.success('Password Reset Successfully', {
                description: data.message || `Password for ${target?.name || 'account'} has been reset.`
            });
            onOpenChange(false);
            form.reset();
            if (onSuccessCallback) {
                onSuccessCallback();
            }
        },
        onError: (err) => {
            toast.error('Failed to reset password', {
                description: getErrorMessage(err)
            });
        }
    });

    const onSubmit = (values: ResetPasswordFormValues) => {
        if (!target) return;
        mutation.mutate({
            id: target.id,
            password: values.newPassword
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-background p-6">
                <DialogHeader className="space-y-2">
                    <DialogTitle className="flex items-center gap-2 text-foreground font-bold">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                            <KeyRound className="size-4 text-primary" />
                        </div>
                        Reset Account Password
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Set a new password for <strong className="text-foreground">{target?.name}</strong> (@{target?.username}). The user will need
                        to use this new password on their next sign-in.
                    </DialogDescription>
                </DialogHeader>

                {target && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20 text-xs">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                            <User className="size-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-foreground truncate">{target.name}</span>
                            <span className="text-muted-foreground truncate">
                                @{target.username} {target.email ? `• ${target.email}` : ''}
                            </span>
                        </div>
                    </div>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="newPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-semibold text-foreground/80">New Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                {...field}
                                                type={showNewPassword ? 'text' : 'password'}
                                                placeholder="Enter new password"
                                                className="h-9 pr-9 bg-background/50"
                                                autoComplete="new-password"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                                                onClick={() => setShowNewPassword((prev) => !prev)}
                                                tabIndex={-1}
                                            >
                                                {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                                <span className="sr-only">Toggle password visibility</span>
                                            </Button>
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
                                    <FormLabel className="text-xs font-semibold text-foreground/80">Confirm New Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                {...field}
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                placeholder="Re-enter new password"
                                                className="h-9 pr-9 bg-background/50"
                                                autoComplete="new-password"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                                                onClick={() => setShowConfirmPassword((prev) => !prev)}
                                                tabIndex={-1}
                                            >
                                                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                                <span className="sr-only">Toggle password visibility</span>
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="rounded-lg border border-border/40 bg-muted/10 p-3 text-2xs text-muted-foreground space-y-1">
                            <span className="font-semibold text-foreground/80 flex items-center gap-1">
                                <ShieldCheck className="size-3.5 text-primary" />
                                Password Requirements:
                            </span>
                            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground pl-1">
                                <li>At least 8 characters</li>
                                <li>At least 1 uppercase letter (A-Z)</li>
                                <li>At least 1 numeric digit (0-9)</li>
                            </ul>
                        </div>

                        <DialogFooter className="mt-4 gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9" disabled={mutation.isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" className="h-9 gap-1.5" disabled={mutation.isPending}>
                                {mutation.isPending ? (
                                    <>
                                        <Spinner className="h-4 w-4" />
                                        Updating Password...
                                    </>
                                ) : (
                                    <>
                                        <KeyRound className="size-4" />
                                        Set New Password
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
