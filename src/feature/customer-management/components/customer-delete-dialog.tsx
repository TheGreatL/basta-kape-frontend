import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

import { deleteCustomer } from '#/api/customer.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { ICustomerResponse } from '#/feature/customer/customer.types.ts';

import { Button } from '#/components/ui/button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

interface CustomerDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: ICustomerResponse | null;
}

export default function CustomerDeleteDialog({ open, onOpenChange, customer }: CustomerDeleteDialogProps) {
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: () => deleteCustomer(customer!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.CUSTOMERS_LIST] });
            toast.success('Customer Account Archived', {
                description: 'The account has been archived successfully.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to archive customer account', {
                description: getErrorMessage(error)
            });
        }
    });

    const handleConfirm = () => {
        if (!customer) return;
        deleteMutation.mutate();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-background animate-in fade-in zoom-in-95 duration-150">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold text-destructive">
                        <Trash2 className="size-5" />
                        Archive Customer Account
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Are you sure you want to archive{' '}
                        <strong>{customer ? `${customer.user.firstName} ${customer.user.lastName}` : 'this customer'}</strong>? This will block them
                        from placing orders and accessing their account.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="mt-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9">
                        Cancel
                    </Button>
                    <Button type="button" variant="destructive" onClick={handleConfirm} disabled={deleteMutation.isPending} className="h-9">
                        {deleteMutation.isPending ? (
                            <div className="flex items-center gap-1">
                                <Spinner className="h-4 w-4" /> Archiving...
                            </div>
                        ) : (
                            'Confirm Archive'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
