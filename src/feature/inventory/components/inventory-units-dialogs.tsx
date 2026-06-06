import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Scale } from 'lucide-react';

import { createIngredientUnit, updateIngredientUnit } from '#/api/inventory.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IIngredientUnit } from '../inventory.types';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

const unitFormSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters'),
    abbreviation: z.string().max(20, 'Abbreviation must not exceed 20 characters').optional()
});

type UnitFormValues = z.infer<typeof unitFormSchema>;

interface UnitCreateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UnitCreateDialog({ open, onOpenChange }: UnitCreateDialogProps) {
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

    const form = useForm<UnitFormValues>({
        resolver: zodResolver(unitFormSchema),
        defaultValues: {
            name: '',
            abbreviation: ''
        }
    });

    React.useEffect(() => {
        if (!open) {
            form.reset({ name: '', abbreviation: '' });
        }
    }, [open, form]);

    const createMutation = useMutation({
        mutationFn: createIngredientUnit,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.UNITS_LIST] });
            toast.success('Measurement Unit Created', {
                description: 'The new measurement unit has been successfully registered.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to create unit', {
                description: getErrorMessage(error)
            });
        }
    });

    const onSubmit = (values: UnitFormValues) => {
        createMutation.mutate({
            name: values.name,
            abbreviation: values.abbreviation || undefined
        });
    };

    const isLoading = !isRendering;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Scale className="size-5 text-primary" />
                        Create Measurement Unit
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Register standard inventory measurement metrics (e.g. Grams, Milliliters).
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 min-h-0">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <Spinner className="h-6 w-6 text-primary animate-spin" />
                                    <span className="text-xs text-muted-foreground font-medium">Loading form...</span>
                                </div>
                            ) : (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Unit Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Grams" {...field} className="h-9 bg-background/50" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="abbreviation"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Abbreviation</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. g" {...field} className="h-9 bg-background/50" />
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
                            <Button type="submit" disabled={createMutation.isPending || isLoading} className="h-9">
                                {createMutation.isPending ? (
                                    <div className="flex items-center gap-1">
                                        <Spinner className="h-4 w-4" /> Saving...
                                    </div>
                                ) : (
                                    'Create Unit'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

interface UnitEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    unit: IIngredientUnit | null;
}

export function UnitEditDialog({ open, onOpenChange, unit }: UnitEditDialogProps) {
    const queryClient = useQueryClient();
    const [isRendering, setIsRendering] = React.useState(false);

    React.useEffect(() => {
        if (open && unit) {
            const timer = setTimeout(() => setIsRendering(true), 50);
            return () => clearTimeout(timer);
        } else {
            setIsRendering(false);
        }
    }, [open, unit]);

    const form = useForm<UnitFormValues>({
        resolver: zodResolver(unitFormSchema),
        defaultValues: {
            name: '',
            abbreviation: ''
        }
    });

    React.useEffect(() => {
        if (open && unit) {
            form.reset({
                name: unit.name,
                abbreviation: unit.abbreviation || ''
            });
        }
    }, [open, unit, form]);

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UnitFormValues }) => updateIngredientUnit(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.UNITS_LIST] });
            toast.success('Measurement Unit Updated', {
                description: 'The unit details have been successfully saved.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to update unit', {
                description: getErrorMessage(error)
            });
        }
    });

    const onSubmit = (values: UnitFormValues) => {
        if (!unit) return;
        updateMutation.mutate({
            id: unit.id,
            payload: {
                name: values.name,
                abbreviation: values.abbreviation || undefined
            }
        });
    };

    const isLoading = !isRendering || !unit;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Scale className="size-5 text-primary" />
                        Modify Measurement Unit
                    </DialogTitle>
                    <DialogDescription className="text-xs">Update specifications for this measurement unit.</DialogDescription>
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
                                <>
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Unit Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Grams" {...field} className="h-9 bg-background/50" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="abbreviation"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Abbreviation</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. g" {...field} className="h-9 bg-background/50" />
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
                            <Button type="submit" disabled={updateMutation.isPending || isLoading} className="h-9">
                                {updateMutation.isPending ? (
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
