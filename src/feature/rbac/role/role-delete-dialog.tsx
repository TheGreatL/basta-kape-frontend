import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, Info } from 'lucide-react';

import { deleteRole } from '#/api/rbac.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IRoleListItem } from '../rbac.types';

import { Button } from '#/components/ui/button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

interface RoleDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    role: IRoleListItem | null;
}

export default function RoleDeleteDialog({ open, onOpenChange, role }: RoleDeleteDialogProps) {
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: deleteRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.RBAC.ROLES_LIST] });
            toast.success('Role Deleted Successfully', {
                description: 'The custom role has been soft-deleted.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to delete role', {
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
                        <Trash2 className="size-5" />
                        Delete Role Confirmation
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Are you absolutely sure you want to soft-delete the custom role <strong className="text-foreground">"{role?.name}"</strong>?
                        This will instantly remove its associated nested operational permissions.
                    </DialogDescription>
                </DialogHeader>

                <div className="my-3 flex items-start gap-2.5 p-3 rounded-lg border border-warning/20 bg-warning/5 text-xs text-warning-foreground font-medium">
                    <Info className="size-4 shrink-0 text-warning mt-0.5" />
                    <span>
                        This operation is reversible in database support, but custom access settings will be revoked from staff members mapping this
                        role.
                    </span>
                </div>

                <DialogFooter className="mt-4 gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9" disabled={deleteMutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => {
                            if (role) deleteMutation.mutate(role.id);
                        }}
                        className="h-9"
                        disabled={deleteMutation.isPending}
                    >
                        {deleteMutation.isPending ? (
                            <div className="flex items-center gap-1">
                                <Spinner className="h-4 w-4" />
                                Deleting...
                            </div>
                        ) : (
                            'Confirm Delete'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
