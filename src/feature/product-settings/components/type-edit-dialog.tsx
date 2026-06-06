import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { LayoutGrid } from 'lucide-react';

import { updateProductType } from '#/api/product-settings.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { productTypeSchema } from '../product-settings.schema.ts';
import type { IProductType, IUpdateProductTypePayload } from '../product-settings-types';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

interface TypeEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    productType: IProductType | null;
}

interface EditTypeFormValues {
    name: string;
    description?: string;
}

export default function TypeEditDialog({ open, onOpenChange, productType }: TypeEditDialogProps) {
    const queryClient = useQueryClient();
    const [isRendering, setIsRendering] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            const timer = setTimeout(() => setIsRendering(true), 50);
            return () => clearTimeout(timer);
        } else {
            setIsRendering(false);
        }
    }, [open]);

    const form = useForm<EditTypeFormValues>({
        resolver: zodResolver(productTypeSchema),
        defaultValues: {
            name: '',
            description: ''
        }
    });

    React.useEffect(() => {
        if (open && productType) {
            form.reset({
                name: productType.name,
                description: productType.description || ''
            });
        }
    }, [open, productType, form]);

    const editMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: IUpdateProductTypePayload }) => updateProductType(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCT_SETTINGS.TYPES_LIST] });
            if (productType) {
                queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCT_SETTINGS.TYPE_DETAILS, productType.id] });
            }
            toast.success('Product Type Updated', {
                description: 'The changes to the product type have been successfully saved.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to update product type', {
                description: getErrorMessage(error)
            });
        }
    });

    const onSubmit = (values: EditTypeFormValues) => {
        if (!productType) return;
        editMutation.mutate({
            id: productType.id,
            payload: {
                name: values.name,
                description: values.description || null
            }
        });
    };

    const isLoading = !isRendering || !productType;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <LayoutGrid className="size-5 text-primary" />
                        Modify Product Type
                    </DialogTitle>
                    <DialogDescription className="text-xs">Update the product type classification name and description details.</DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 min-h-0">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Spinner className="h-6 w-6 text-primary animate-spin" />
                                    <span className="text-xs text-muted-foreground font-medium">Fetching details...</span>
                                </div>
                            ) : (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Type Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Iced Beverage" {...field} className="h-9 bg-background/50" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Description</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Brief details about the product type classification..."
                                                        className="min-h-[100px] bg-background/50 resize-y"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}
                        </div>

                        <DialogFooter className="px-6 py-4 border-t bg-muted/30 mt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editMutation.isPending || isLoading} className="h-9">
                                {editMutation.isPending ? (
                                    <div className="flex items-center gap-1">
                                        <Spinner className="h-4 w-4" /> Saving...
                                    </div>
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
