import type { IUserListItem } from '../users.types';

import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction
} from '#/components/ui/alert-dialog';
import { Button } from '#/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { RequirePermission } from '#/components/rbac/require-permission';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from 'sonner';
import { getErrorMessage } from '#/utils/error-handler';
import QUERY_KEY from '#/constants/query-keys';
import { restoreUser } from '#/api/users.api';

interface UserRestoreDialogProps {
    user: IUserListItem;
}

export default function UserRestoreDialog({ user }: UserRestoreDialogProps) {
    const queryClient = useQueryClient();
    const restoreMutation = useMutation({
        mutationFn: restoreUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.USERS.USERS_LIST] });
            toast.success('User profile successfully restored');
        },
        onError: (err) => {
            toast.error('Failed to restore user profile', {
                description: getErrorMessage(err)
            });
        }
    });
    return (
        <RequirePermission module="Users Management" action="delete">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-emerald-600 transition-colors"
                        title="Restore User"
                        disabled={restoreMutation.isPending}
                    >
                        <RotateCcw className="size-4" />
                        <span className="sr-only">Restore User</span>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 font-bold text-foreground">
                            <RotateCcw className="size-5 text-emerald-600" />
                            Restore Staff Account
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to restore the staff account for{' '}
                            <strong>
                                "{user.firstName} {user.lastName}" (@{user.username})
                            </strong>
                            ? This will restore their system permissions and allow them to log in again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => restoreMutation.mutate(user.id)}
                            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        >
                            Confirm Restore
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </RequirePermission>
    );
}
