import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Sparkles, Info } from 'lucide-react';

import { deleteAttribute } from '#/api/product-settings.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IAttribute } from '../product-settings-types';

import { Button } from '#/components/ui/button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

interface AttributeDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    attribute: IAttribute | null;
}

export default function AttributeDeleteDialog({ open, onOpenChange, attribute }: AttributeDeleteDialogProps) {
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: deleteAttribute,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTES_LIST] });
            toast.success('Attribute Archived', {
                description: 'The custom attribute has been successfully archived/soft-deleted.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to archive attribute', {
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
                        <Sparkles className="size-5" />
                        Archive Custom Attribute
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Are you absolutely sure you want to archive <strong className="text-foreground">"{attribute?.name}"</strong>? This will
                        soft-delete the attribute (and cascade to archive all its active child values).
                    </DialogDescription>
                </DialogHeader>

                <div className="my-3 flex items-start gap-2.5 p-3 rounded-lg border border-warning/20 bg-warning/5 text-xs text-warning-foreground font-medium">
                    <Info className="size-4 shrink-0 text-warning mt-0.5" />
                    <span>
                        Archived attributes (and their nested values) will be disabled from order customizing forms, but remain archived in the DB
                        logs.
                    </span>
                </div>

                <DialogFooter className="mt-4 gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9" disabled={deleteMutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => {
                            if (attribute) deleteMutation.mutate(attribute.id);
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
