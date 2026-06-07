import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Phone, Calendar, Save, Loader2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useCurrentCustomer } from './use-current-customer.ts';
import { updateCustomer } from '#/api/customer.api.ts';
import { useAuthStore } from '#/store/auth-store.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { toast } from 'sonner';

export default function ProfilePage() {
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const { data: customer, isLoading } = useCurrentCustomer();

    // Form states
    const [firstName, setFirstName] = React.useState('');
    const [lastName, setLastName] = React.useState('');
    const [middleName, setMiddleName] = React.useState('');
    const [phoneNumber, setPhoneNumber] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [username, setUsername] = React.useState('');

    // Prepopulate form on load
    React.useEffect(() => {
        if (customer?.user) {
            setFirstName(customer.user.firstName || '');
            setLastName(customer.user.lastName || '');
            setMiddleName(customer.user.middleName || '');
            setPhoneNumber(customer.user.phoneNumber || '');
            setEmail(customer.user.email || '');
            setUsername(customer.user.username || '');
        }
    }, [customer]);

    // Profile update mutation
    const updateMutation = useMutation({
        mutationFn: (payload: {
            firstName: string;
            lastName: string;
            middleName?: string | null;
            phoneNumber?: string | null;
            email: string;
            username: string;
        }) => {
            if (!customer?.id) throw new Error('No customer profile loaded');
            return updateCustomer(customer.id, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEY.CUSTOMERS.CURRENT_CUSTOMER]
            });
            toast.success('Profile updated successfully');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to update profile');
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!firstName.trim() || !lastName.trim() || !email.trim() || !username.trim()) {
            toast.error('First name, last name, username, and email are required.');
            return;
        }

        await updateMutation.mutateAsync({
            firstName,
            lastName,
            middleName: middleName.trim() || null,
            phoneNumber: phoneNumber.trim() || null,
            email,
            username
        });
    };

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-16 text-center max-w-md min-h-screen flex flex-col justify-center items-center">
                <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Sign in to view profile</h2>
                <p className="text-sm text-muted-foreground mt-2">Please sign in to manage your customer settings and view details.</p>
                <Link to="/login" className="mt-6">
                    <Button className="rounded-xl px-6">Sign In</Button>
                </Link>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl animate-pulse space-y-6">
                <div className="h-8 w-48 bg-muted rounded" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="h-64 bg-muted rounded-2xl" />
                    <div className="md:col-span-2 h-96 bg-muted rounded-2xl" />
                </div>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="container mx-auto px-4 py-16 text-center max-w-md">
                <h2 className="text-xl font-bold text-foreground">No Profile Found</h2>
                <p className="text-sm text-muted-foreground mt-2">Please make sure you are logged in to access your customer profile.</p>
            </div>
        );
    }

    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl min-h-screen">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-8">My Profile</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Detail Card */}
                <div className="space-y-6">
                    <div className="rounded-2xl border border-border/40 bg-card p-6 text-center flex flex-col items-center">
                        <div className="size-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-black mb-4">
                            {initials}
                        </div>
                        <h2 className="text-lg font-bold text-foreground leading-tight">
                            {firstName} {lastName}
                        </h2>
                        <span className="text-xs text-muted-foreground mt-1">@{username}</span>

                        <div className="w-full border-t border-border/40 mt-6 pt-6 text-left space-y-4">
                            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                                <Mail className="size-4 text-primary shrink-0" />
                                <span className="truncate">{email}</span>
                            </div>
                            {phoneNumber && (
                                <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                                    <Phone className="size-4 text-primary shrink-0" />
                                    <span>{phoneNumber}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                                <Calendar className="size-4 text-primary shrink-0" />
                                <span>Member since {new Date(customer.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Edit Profile Form */}
                <div className="md:col-span-2">
                    <form onSubmit={handleSubmit} className="rounded-2xl border border-border/40 bg-card p-6 space-y-6">
                        <h3 className="text-base font-bold text-foreground">Edit Personal Information</h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground" htmlFor="firstName">
                                    First Name *
                                </label>
                                <Input
                                    id="firstName"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/20 text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground" htmlFor="lastName">
                                    Last Name *
                                </label>
                                <Input
                                    id="lastName"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/20 text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground" htmlFor="middleName">
                                    Middle Name (Optional)
                                </label>
                                <Input
                                    id="middleName"
                                    value={middleName}
                                    onChange={(e) => setMiddleName(e.target.value)}
                                    className="rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/20 text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground" htmlFor="phoneNumber">
                                    Phone Number (Optional)
                                </label>
                                <Input
                                    id="phoneNumber"
                                    value={phoneNumber}
                                    placeholder="+639..."
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/20 text-sm"
                                />
                            </div>
                        </div>

                        <h3 className="text-base font-bold text-foreground border-t border-border/30 pt-6 mt-6">Account Settings</h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground" htmlFor="username">
                                    Username *
                                </label>
                                <Input
                                    id="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/20 text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground" htmlFor="email">
                                    Email Address *
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/20 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={updateMutation.isPending} className="rounded-xl h-10 px-6 gap-2 font-semibold shadow-xs">
                                {updateMutation.isPending ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        Saving Profile...
                                    </>
                                ) : (
                                    <>
                                        <Save className="size-4" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
