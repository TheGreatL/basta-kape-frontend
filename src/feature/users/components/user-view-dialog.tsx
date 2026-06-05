import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Shield, Calendar, Mail, Phone, Hash } from 'lucide-react';
import { format } from 'date-fns';

import { getUserById } from '#/api/users.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { IUserListItem } from '../users.types';
import UserAvatarUpload from './user-avatar-upload.tsx';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Label } from '#/components/ui/label.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

interface UserViewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: IUserListItem | null;
}

export default function UserViewDialog({ open, onOpenChange, user }: UserViewDialogProps) {
    const [isRendering, setIsRendering] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            const timer = setTimeout(() => setIsRendering(true), 50);
            return () => clearTimeout(timer);
        } else {
            setIsRendering(false);
        }
    }, [open]);

    const { data: userDetails, isLoading } = useQuery({
        queryKey: [QUERY_KEY.USERS.USER_DETAILS, user?.id],
        queryFn: () => getUserById(user!.id),
        enabled: open && !!user?.id
    });

    const isDataLoading = isLoading || !isRendering;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <User className="size-5 text-primary" />
                        View User Profile: {user?.username}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Overview of staff credentials, profile data, history records, and security roles.
                    </DialogDescription>
                </DialogHeader>

                {userDetails && (
                    <div className="py-2 border-b">
                        <UserAvatarUpload
                            userId={userDetails.id}
                            currentPhotoUrl={userDetails.profilePhoto}
                            firstName={userDetails.firstName}
                            lastName={userDetails.lastName}
                            readOnly={true}
                        />
                    </div>
                )}

                <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 min-h-0">
                    {isDataLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3">
                            <Spinner className="h-6 w-6 text-primary animate-spin" />
                            <span className="text-xs text-muted-foreground font-medium">Loading user details...</span>
                        </div>
                    ) : (
                        userDetails && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="font-semibold text-foreground/80 flex items-center gap-1.5">First Name</Label>
                                        <Input disabled value={userDetails.firstName} className="h-9 bg-background/50" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-semibold text-foreground/80 flex items-center gap-1.5">Last Name</Label>
                                        <Input disabled value={userDetails.lastName} className="h-9 bg-background/50" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-semibold text-foreground/80 flex items-center gap-1.5">Middle Name</Label>
                                        <Input disabled value={userDetails.middleName || 'N/A'} className="h-9 bg-background/50" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-semibold text-foreground/80 flex items-center gap-1.5">
                                            <Phone className="size-3.5 text-muted-foreground" />
                                            Phone Number
                                        </Label>
                                        <Input disabled value={userDetails.phoneNumber || 'N/A'} className="h-9 bg-background/50" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-semibold text-foreground/80 flex items-center gap-1.5">
                                            <Mail className="size-3.5 text-muted-foreground" />
                                            Email Address
                                        </Label>
                                        <Input disabled value={userDetails.email} className="h-9 bg-background/50" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-semibold text-foreground/80 flex items-center gap-1.5">
                                            <Hash className="size-3.5 text-muted-foreground" />
                                            Username
                                        </Label>
                                        <Input disabled value={userDetails.username} className="h-9 bg-background/50" />
                                    </div>
                                </div>

                                {/* Roles Assigned */}
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <h3 className="text-sm font-bold tracking-tight text-foreground/80 flex items-center gap-1.5">
                                            <Shield className="size-4 text-primary" />
                                            Active Roles & Authorization
                                        </h3>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {userDetails.userRoles.map((ur: any) => (
                                            <span
                                                key={ur.role.id}
                                                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20 capitalize"
                                            >
                                                {ur.role.name}
                                            </span>
                                        ))}
                                        {userDetails.userRoles.length === 0 && (
                                            <span className="text-xs text-muted-foreground">
                                                No functional roles assigned. (Standard system restrictions apply).
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Audit Card */}
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <h3 className="text-sm font-bold tracking-tight text-foreground/80 flex items-center gap-1.5">
                                            <Calendar className="size-4 text-primary" />
                                            Audit Logs & Timestamps
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border">
                                        <div>
                                            <span className="font-medium text-foreground/75 block">Created Date</span>
                                            {format(new Date(userDetails.createdAt), 'MMMM dd, yyyy - hh:mm a')}
                                        </div>
                                        <div>
                                            <span className="font-medium text-foreground/75 block">Last Updated</span>
                                            {format(new Date(userDetails.updatedAt), 'MMMM dd, yyyy - hh:mm a')}
                                        </div>
                                        {userDetails.deletedAt && (
                                            <div className="sm:col-span-2 text-destructive font-medium border-t pt-2 mt-1">
                                                <span>Archived / Soft Deleted At</span>:{' '}
                                                {format(new Date(userDetails.deletedAt), 'MMMM dd, yyyy - hh:mm a')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )
                    )}
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                    <Button type="button" onClick={() => onOpenChange(false)} className="h-9">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
