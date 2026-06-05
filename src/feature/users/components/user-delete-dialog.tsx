import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserX, Info } from 'lucide-react';

import { deleteUser } from '#/api/users.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IUserListItem } from '../users.types';

import { Button } from '#/components/ui/button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

interface UserDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: IUserListItem | null;
}

export default function UserDeleteDialog({ open, onOpenChange, user }: UserDeleteDialogProps) {
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.USERS.USERS_LIST] });
            toast.success('User Deactivated', {
                description: 'The staff account has been soft-deleted and deactivated.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to delete user', {
                description: getErrorMessage(error)
            });
            onOpenChange(false);
        }
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-background p-6">
                <DialogHeader className="space-y-2">
                    <DialogTitle className="flex items-center gap-2 text-destructive font-bold">
                        <UserX className="size-5" />
                        Deactivate Staff Account
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Are you absolutely sure you want to deactivate{' '}
                        <strong className="text-foreground">
                            "{user?.firstName} {user?.lastName}" ({user?.username})
                        </strong>
                        ? This will soft-delete their profile, blocking them from accessing POS and Admin dashboard controls immediately.
                    </DialogDescription>
                </DialogHeader>

                <div className="my-3 flex items-start gap-2.5 p-3 rounded-lg border border-warning/20 bg-warning/5 text-xs text-warning-foreground font-medium">
                    <Info className="size-4 shrink-0 text-warning mt-0.5" />
                    <span>Deactivated profiles are preserved in the archived records database but cannot perform system transactions.</span>
                </div>

                <DialogFooter className="mt-4 gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9" disabled={deleteMutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => {
                            if (user) deleteMutation.mutate(user.id);
                        }}
                        className="h-9"
                        disabled={deleteMutation.isPending}
                    >
                        {deleteMutation.isPending ? (
                            <div className="flex items-center gap-1">
                                <Spinner className="h-4 w-4" />
                                Deactivating...
                            </div>
                        ) : (
                            'Confirm Deactivate'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
