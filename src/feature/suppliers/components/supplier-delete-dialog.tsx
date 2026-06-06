import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Truck, Info } from 'lucide-react';

import { deleteSupplier } from '#/api/suppliers.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { ISupplierListItem } from '../suppliers.types';

import { Button } from '#/components/ui/button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

interface SupplierDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    supplier: ISupplierListItem | null;
}

export default function SupplierDeleteDialog({ open, onOpenChange, supplier }: SupplierDeleteDialogProps) {
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: deleteSupplier,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.SUPPLIERS.SUPPLIERS_LIST] });
            toast.success('Supplier Profile Archived', {
                description: 'The supplier profile has been successfully archived/soft-deleted.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to archive supplier', {
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
                        <Truck className="size-5" />
                        Archive Supplier Profile
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Are you absolutely sure you want to archive <strong className="text-foreground">"{supplier?.name}"</strong>? This will
                        soft-delete their profile, moving them to the Archived suppliers tab.
                    </DialogDescription>
                </DialogHeader>

                <div className="my-3 flex items-start gap-2.5 p-3 rounded-lg border border-warning/20 bg-warning/5 text-xs text-warning-foreground font-medium">
                    <Info className="size-4 shrink-0 text-warning mt-0.5" />
                    <span>
                        Archived supplier profiles remain in the logs for historical audit records (such as purchase orders) but will not appear in
                        the active directory.
                    </span>
                </div>

                <DialogFooter className="mt-4 gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9" disabled={deleteMutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => {
                            if (supplier) deleteMutation.mutate(supplier.id);
                        }}
                        className="h-9"
                        disabled={deleteMutation.isPending}
                    >
                        {deleteMutation.isPending ? (
                            <div className="flex items-center gap-1">
                                <Spinner className="h-4 w-4" />
                                Archiving...
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
