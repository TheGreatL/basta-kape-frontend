import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, Loader2, Save } from 'lucide-react';

import { changePassword } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth-store';
import { getErrorMessage } from '@/utils/error-handler';
import { changePasswordSchema } from '../auth.schema';
import type { TChangePasswordSchema } from '../auth.schema';
import QUERY_KEY from '@/constants/query-keys';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

export default function ChangePasswordForm() {
    const router = useRouter();
    const logout = useAuthStore((state) => state.logout);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const form = useForm<TChangePasswordSchema>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            oldPassword: '',
            newPassword: '',
            confirmNewPassword: ''
        }
    });

    const changePasswordMutation = useMutation({
        mutationKey: [QUERY_KEY.AUTH.LOGIN, 'change-password'],
        mutationFn: changePassword,
        onSuccess: (data) => {
            toast.success('Password Changed Successfully', {
                description: data.message || 'Please log in again with your new password.'
            });
            // Revoking refresh tokens logs out all other devices/sessions.
            // Log out locally and redirect to login page.
            logout();
            router.navigate({ to: '/login' });
        },
        onError: (error) => {
            const msg = getErrorMessage(error, 'Failed to change password. Make sure old password is correct.');
            toast.error('Change Password Failed', {
                description: msg
            });
            console.error('Change password error:', error);
        }
    });

    const onSubmit = (data: TChangePasswordSchema) => {
        changePasswordMutation.mutate(data);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="oldPassword"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <FormLabel className="text-xs font-semibold text-muted-foreground">Current Password</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            className="rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/20 text-sm pl-10 pr-10"
                                            type={showOldPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            {...field}
                                        />
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                        <button
                                            type="button"
                                            onClick={() => setShowOldPassword(!showOldPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                                        >
                                            {showOldPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                        </button>
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
                            <FormItem className="space-y-1.5">
                                <FormLabel className="text-xs font-semibold text-muted-foreground">New Password</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            className="rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/20 text-sm pl-10 pr-10"
                                            type={showNewPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            {...field}
                                        />
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                                        >
                                            {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
                            <FormItem className="space-y-1.5">
                                <FormLabel className="text-xs font-semibold text-muted-foreground">Confirm New Password</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            className="rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/20 text-sm pl-10 pr-10"
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
                </div>

                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={changePasswordMutation.isPending} className="rounded-xl h-10 px-6 gap-2 font-semibold shadow-xs">
                        {changePasswordMutation.isPending ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                Changing Password...
                            </>
                        ) : (
                            <>
                                <Save className="size-4" />
                                Change Password
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
