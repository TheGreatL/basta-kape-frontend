import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '#/context/AuthContext';
import { updateMyProfile } from '#/api/users.api';
import QUERY_KEYS from '#/constants/query-keys';
import { toast } from 'sonner';
import ChangePasswordForm from '#/feature/auth/components/change-password-form';
import AdminEditProfileForm from '#/feature/admin/components/edit-profile-form';
import { Badge } from '#/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { Mail, User as UserIcon, Shield, Briefcase, Phone } from 'lucide-react';
import UserAvatarUpload from '#/feature/users/components/user-avatar-upload';

export const Route = createFileRoute('/admin/profile')({
    component: AdminProfilePage
});

function AdminProfilePage() {
    const { user, accessToken } = useAuth();
    const queryClient = useQueryClient();

    // Form states
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');

    // Prepopulate form from auth context
    useEffect(() => {
        if (user) {
            setFirstName(user.firstName || '');
            setLastName(user.lastName || '');
            setMiddleName(user.middleName || '');
            setPhoneNumber(user.phoneNumber || '');
            setEmail(user.email || '');
            setUsername(user.username || '');
        }
    }, [user]);

    // Profile update mutation
    const updateMutation = useMutation({
        mutationFn: (payload: {
            firstName: string;
            lastName: string;
            middleName?: string | null;
            phoneNumber?: string | null;
            email: string;
            username: string;
        }) => updateMyProfile(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.AUTH.ME, accessToken]
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
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <p className="text-muted-foreground text-sm">Please log in to view this page.</p>
            </div>
        );
    }

    const handlePhotoUploadSuccess = () => {
        queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.AUTH.ME, accessToken]
        });
    };

    return (
        <div className="space-y-6 w-full max-w-5xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage your administrator account details and password security.</p>
            </div>

            {/* Content Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* User Info Details Card */}
                <div className="space-y-6">
                    <Card className="border-border/40 shadow-sm">
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto mb-4">
                                <UserAvatarUpload
                                    userId={user.id}
                                    currentPhotoUrl={user.profilePhoto ?? null}
                                    firstName={firstName || user.firstName}
                                    lastName={lastName || user.lastName}
                                    onUploadSuccess={handlePhotoUploadSuccess}
                                />
                            </div>
                            <CardTitle className="text-lg font-bold">
                                {firstName || user.firstName} {lastName || user.lastName}
                            </CardTitle>
                            <CardDescription className="text-xs">@{username || user.username}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-4 border-t border-border/40">
                            {/* Email */}
                            <div className="flex items-center gap-3 text-sm">
                                <Mail className="size-4 text-primary shrink-0" />
                                <div className="space-y-0.5">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Email Address</p>
                                    <p className="text-foreground font-medium truncate">{email || user.email}</p>
                                </div>
                            </div>

                            {/* Username */}
                            <div className="flex items-center gap-3 text-sm">
                                <UserIcon className="size-4 text-primary shrink-0" />
                                <div className="space-y-0.5">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Username</p>
                                    <p className="text-foreground font-medium">{username || user.username}</p>
                                </div>
                            </div>

                            {/* Phone Number */}
                            {(phoneNumber || user.phoneNumber) && (
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone className="size-4 text-primary shrink-0" />
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">Phone Number</p>
                                        <p className="text-foreground font-medium">{phoneNumber || user.phoneNumber}</p>
                                    </div>
                                </div>
                            )}

                            {/* Roles Badge List */}
                            <div className="flex items-start gap-3 text-sm">
                                <Shield className="size-4 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-1.5 w-full">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Assigned Roles</p>
                                    <div className="flex flex-wrap gap-1">
                                        {user.roles.length > 0 ? (
                                            user.roles.map((role, idx) => (
                                                <Badge key={idx} variant="secondary" className="capitalize text-xs font-semibold px-2.5 py-0.5">
                                                    {role.name}
                                                </Badge>
                                            ))
                                        ) : (
                                            <Badge variant="outline" className="text-xs">
                                                No Role
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Permissions list */}
                    <Card className="border-border/40 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Briefcase className="size-4 text-primary" />
                                Access Permissions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-muted-foreground space-y-2.5 border-t border-border/40 pt-4">
                            {user.roles.some((r) => r.name.toLowerCase() === 'owner' || r.name.toLowerCase() === 'admin') ? (
                                <p className="leading-relaxed">
                                    You have full administrator access. You can manage inventory, menu, products, customer profiles, and users
                                    settings.
                                </p>
                            ) : (
                                <p className="leading-relaxed">
                                    Your account has permissions based on your assigned staff roles. Contact your system owner to modify permission
                                    privileges.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Edit Profile + Change Password Panel */}
                <div className="md:col-span-2 space-y-6">
                    {/* Edit Profile Form */}
                    <Card className="border-border/40 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base font-bold text-foreground">Edit Profile</CardTitle>
                            <CardDescription>Update your personal information and account settings.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <AdminEditProfileForm
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
                        </CardContent>
                    </Card>

                    {/* Change Password */}
                    <Card className="border-border/40 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base font-bold text-foreground">Change Account Password</CardTitle>
                            <CardDescription>
                                Changing your password will immediately revoke all active refresh tokens and log you out of all other active sessions
                                for security purposes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <ChangePasswordForm />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
