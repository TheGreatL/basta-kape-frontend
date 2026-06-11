import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Save, X, PlusCircle } from 'lucide-react';

import { createModifierOption, updateModifierOption } from '#/api/modifiers.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IModifierOption } from '../modifier.types';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';

const optionFormSchema = z.object({
    name: z.string().min(1, 'Name must be at least 1 character').max(100, 'Name must not exceed 100 characters'),
    price: z.number().min(0, 'Price must be 0 or more')
});

type OptionFormValues = z.infer<typeof optionFormSchema>;

interface OptionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    groupId: string;
    option: IModifierOption | null;
}

export default function OptionDialog({ open, onOpenChange, groupId, option }: OptionDialogProps) {
    const queryClient = useQueryClient();

    const form = useForm<OptionFormValues>({
        resolver: zodResolver(optionFormSchema),
        defaultValues: {
            name: '',
            price: 0
        }
    });

    // Reset/Populate form values when dialog opens or changes
    React.useEffect(() => {
        if (open) {
            if (option) {
                form.reset({
                    name: option.name,
                    price: option.price
                });
            } else {
                form.reset({
                    name: '',
                    price: 0
                });
            }
        }
    }, [open, option, form]);

    // Mutation: Create
    const createMutation = useMutation({
        mutationFn: (payload: OptionFormValues) => createModifierOption(groupId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.MODIFIER_GROUPS] });
            toast.success('Option added successfully');
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error('Failed to add option', { description: getErrorMessage(err) });
        }
    });

    // Mutation: Update
    const updateMutation = useMutation({
        mutationFn: (payload: OptionFormValues) => updateModifierOption(option!.id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.MODIFIER_GROUPS] });
            toast.success('Option updated successfully');
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error('Failed to update option', { description: getErrorMessage(err) });
        }
    });

    const onSubmit = (values: OptionFormValues) => {
        if (option) {
            updateMutation.mutate(values);
        } else {
            createMutation.mutate(values);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-background">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                        <PlusCircle className="size-5 text-primary" />
                        {option ? 'Edit Modifier Option' : 'Add Modifier Option'}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Configure the customization item name and the additional price added to the base product cost.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold text-foreground/80">Option Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Oat Milk, Extra Shot, Almond Milk" {...field} className="h-9" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold text-foreground/80">Additional Price (₱)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={field.value}
                                            onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                                            placeholder="0.00"
                                            className="h-9"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-2 border-t mt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9">
                                <X className="size-4 mr-1.5" /> Cancel
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="h-9 shadow-sm">
                                <Save className="size-4 mr-1.5" /> Save Option
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
