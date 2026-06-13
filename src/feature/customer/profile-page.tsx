import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useCurrentCustomer } from './use-current-customer.ts';
import { updateCustomer } from '#/api/customer.api.ts';
import { useAuthStore } from '#/store/auth-store.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Button } from '#/components/ui/button.tsx';
import { toast } from 'sonner';
import ChangePasswordForm from '#/feature/auth/components/change-password-form.tsx';
import ProfileCard from './components/profile-card.tsx';
import EditProfileForm from './components/edit-profile-form.tsx';

export default function ProfilePage() {
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const { data: customer, isLoading } = useCurrentCustomer();

    // Form states
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');

    // Prepopulate form on load
    useEffect(() => {
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
        onError: (err: Error) => {
            toast.error(err.message || 'Failed to update profile');
        }
    });

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!firstName.trim() || !lastName.trim() || !email.trim() || !username.trim()) {
            toast.error('First name, last name, username, and email are required.');
            return;
        }

        try {
            await updateMutation.mutateAsync({
                firstName,
                lastName,
                middleName: middleName.trim() || null,
                phoneNumber: phoneNumber.trim() || null,
                email,
                username
            });
        } catch {
            // Error already handled by mutation onError callback with toast
        }
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

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl min-h-screen">
            <h1 className="text-3xl font-bold text-foreground mb-8">My Profile</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Detail Card */}
                <div className="space-y-6">
                    <ProfileCard
                        firstName={firstName}
                        lastName={lastName}
                        username={username}
                        email={email}
                        phoneNumber={phoneNumber}
                        createdAt={customer.createdAt}
                    />
                </div>

                {/* Edit Profile Form */}
                <div className="md:col-span-2">
                    <EditProfileForm
                        firstName={firstName}
                        setFirstName={setFirstName}
                        lastName={lastName}
                        setLastName={setLastName}
                        middleName={middleName}
                        setMiddleName={setMiddleName}
                        phoneNumber={phoneNumber}
                        setPhoneNumber={setPhoneNumber}
                        username={username}
                        setUsername={setUsername}
                        email={email}
                        setEmail={setEmail}
                        onSubmit={handleSubmit}
                        isPending={updateMutation.isPending}
                    />

                    <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-6 mt-6">
                        <h3 className="text-base font-bold text-foreground">Change Password</h3>
                        <ChangePasswordForm />
                    </div>
                </div>
            </div>
        </div>
    );
}
