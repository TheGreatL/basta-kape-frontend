import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ClipboardList } from 'lucide-react';

import { updatePhysicalCount } from '#/api/inventory.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IIngredientInventory } from '../inventory.types';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

const countFormSchema = z.object({
    currentQuantity: z.number().min(0, 'Physical count cannot be negative')
});

type CountFormValues = z.infer<typeof countFormSchema>;

interface PhysicalCountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    inventory: IIngredientInventory | null;
}

export default function PhysicalCountDialog({ open, onOpenChange, inventory }: PhysicalCountDialogProps) {
    const queryClient = useQueryClient();
    const [isRendering, setIsRendering] = React.useState(false);

    React.useEffect(() => {
        if (open && inventory) {
            const timer = setTimeout(() => setIsRendering(true), 50);
            return () => clearTimeout(timer);
        } else {
            setIsRendering(false);
        }
    }, [open, inventory]);

    const form = useForm<CountFormValues>({
        resolver: zodResolver(countFormSchema),
        defaultValues: {
            currentQuantity: 0
        }
    });

    React.useEffect(() => {
        if (open && inventory) {
            form.reset({
                currentQuantity: inventory.currentQuantity
            });
        }
    }, [open, inventory, form]);

    const countMutation = useMutation({
        mutationFn: ({ ingredientId, currentQuantity }: { ingredientId: string; currentQuantity: number }) =>
            updatePhysicalCount(ingredientId, currentQuantity),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.LEVELS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.FORECAST] });
            toast.success('Physical Count Saved', {
                description: 'The stock level has been successfully updated and alert tags re-calculated.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to save count', {
                description: getErrorMessage(error)
            });
        }
    });

    const onSubmit = (values: CountFormValues) => {
        if (!inventory) return;
        countMutation.mutate({
            ingredientId: inventory.ingredientId,
            currentQuantity: values.currentQuantity
        });
    };

    const isLoading = !isRendering || !inventory;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <ClipboardList className="size-5 text-primary" />
                        Log Physical Count Audit
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Enter the actual stock counted physically for {inventory?.ingredient.name || 'ingredient'}. This will overwrite the database
                        level.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 min-h-0">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <Spinner className="h-6 w-6 text-primary animate-spin" />
                                    <span className="text-xs text-muted-foreground font-medium">Loading details...</span>
                                </div>
                            ) : (
                                <FormField
                                    control={form.control}
                                    name="currentQuantity"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground/80">
                                                Actual Count Quantity ({inventory.ingredient.defaultUnit.abbreviation})
                                            </FormLabel>
                                            <FormControl>
                                                <Input type="number" step="any" {...field} className="h-9 bg-background/50" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        <DialogFooter className="px-6 py-4 border-t bg-muted/30 mt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={countMutation.isPending || isLoading} className="h-9">
                                {countMutation.isPending ? (
                                    <div className="flex items-center gap-1">
                                        <Spinner className="h-4 w-4" /> Saving...
                                    </div>
                                ) : (
                                    'Update Stock Level'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
