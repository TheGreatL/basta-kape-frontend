import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LayoutGrid, Info } from 'lucide-react';

import { deleteProductType } from '#/api/product-settings.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IProductType } from '../product-settings-types';

import { Button } from '#/components/ui/button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

interface TypeDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    productType: IProductType | null;
}

export default function TypeDeleteDialog({ open, onOpenChange, productType }: TypeDeleteDialogProps) {
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: deleteProductType,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCT_SETTINGS.TYPES_LIST] });
            toast.success('Product Type Archived', {
                description: 'The product type has been successfully archived/soft-deleted.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to archive product type', {
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
                        <LayoutGrid className="size-5" />
                        Archive Product Type
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Are you absolutely sure you want to archive <strong className="text-foreground">"{productType?.name}"</strong>? This will
                        soft-delete the classification, moving it to the Archived product types list.
                    </DialogDescription>
                </DialogHeader>

                <div className="my-3 flex items-start gap-2.5 p-3 rounded-lg border border-warning/20 bg-warning/5 text-xs text-warning-foreground font-medium">
                    <Info className="size-4 shrink-0 text-warning mt-0.5" />
                    <span>Archived classifications are preserved in the DB for historical auditing but cannot be assigned to new products.</span>
                </div>

                <DialogFooter className="mt-4 gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9" disabled={deleteMutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => {
                            if (productType) deleteMutation.mutate(productType.id);
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
