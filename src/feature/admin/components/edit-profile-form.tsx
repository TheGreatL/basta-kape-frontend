import * as React from 'react';
import { Loader2, Save } from 'lucide-react';
import { Input } from '#/components/ui/input.tsx';
import { Button } from '#/components/ui/button.tsx';

interface AdminEditProfileFormProps {
    firstName: string;
    setFirstName: (val: string) => void;
    lastName: string;
    setLastName: (val: string) => void;
    middleName: string;
    setMiddleName: (val: string) => void;
    phoneNumber: string;
    setPhoneNumber: (val: string) => void;
    username: string;
    setUsername: (val: string) => void;
    email: string;
    setEmail: (val: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    isPending: boolean;
}

export default function AdminEditProfileForm({
    firstName,
    setFirstName,
    lastName,
    setLastName,
    middleName,
    setMiddleName,
    phoneNumber,
    setPhoneNumber,
    username,
    setUsername,
    email,
    setEmail,
    onSubmit,
    isPending
}: AdminEditProfileFormProps) {
    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <h3 className="text-base font-bold text-foreground">Edit Personal Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="admin-firstName">
                        First Name *
                    </label>
                    <Input
                        id="admin-firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/20 text-sm"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="admin-lastName">
                        Last Name *
                    </label>
                    <Input
                        id="admin-lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/20 text-sm"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="admin-middleName">
                        Middle Name (Optional)
                    </label>
                    <Input
                        id="admin-middleName"
                        value={middleName}
                        onChange={(e) => setMiddleName(e.target.value)}
                        className="rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/20 text-sm"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="admin-phoneNumber">
                        Phone Number (Optional)
                    </label>
                    <Input
                        id="admin-phoneNumber"
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
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="admin-username">
                        Username *
                    </label>
                    <Input
                        id="admin-username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/20 text-sm"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="admin-email">
                        Email Address *
                    </label>
                    <Input
                        id="admin-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/20 text-sm"
                    />
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isPending} className="rounded-xl h-10 px-6 gap-2 font-semibold shadow-xs">
                    {isPending ? (
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
    );
}
