import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

import { deleteProduct } from '#/api/products.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IProduct } from '../products.types';

import { Button } from '#/components/ui/button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

interface ProductDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: IProduct | null;
}

export default function ProductDeleteDialog({ open, onOpenChange, product }: ProductDeleteDialogProps) {
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: () => deleteProduct(product!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCTS_LIST] });
            toast.success('Product Archived', {
                description: 'The product has been successfully archived/soft-deleted.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to archive product', {
                description: getErrorMessage(error)
            });
        }
    });

    const handleConfirm = () => {
        if (!product) return;
        deleteMutation.mutate();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-background">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold text-destructive">
                        <Trash2 className="size-5" />
                        Archive Menu Product?
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Are you sure you want to archive/soft-delete **{product?.name || 'this product'}**? This action will also soft-delete all
                        child product variants and active option attributes linked to this product in the transaction.
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
                            'Archive Product'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
