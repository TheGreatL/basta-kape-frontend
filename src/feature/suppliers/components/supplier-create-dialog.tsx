import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Truck, Package, Plus, Trash2 } from 'lucide-react';

import { createSupplier } from '#/api/suppliers.api.ts';
import { getIngredients } from '#/api/inventory.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { createSupplierSchema } from '../suppliers.schema.ts';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Label } from '#/components/ui/label.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import type { IIngredient } from '#/feature/inventory/inventory.types';
import type { ISupplierIngredient } from '../suppliers.types.ts';

interface SupplierCreateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface CreateSupplierFormValues {
    name: string;
    address?: string;
    contactPerson?: string;
    contactNumber?: string;
    notes?: string;
}

interface ISelectedSupplierIngredient {
    ingredientId: string;
    unitCost: number;
    ingredient?: ISupplierIngredient['ingredient'] | IIngredient | null;
}

export default function SupplierCreateDialog({ open, onOpenChange }: SupplierCreateDialogProps) {
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

    const form = useForm<CreateSupplierFormValues>({
        resolver: zodResolver(createSupplierSchema),
        defaultValues: {
            name: '',
            address: '',
            contactPerson: '',
            contactNumber: '',
            notes: ''
        }
    });

    const [selectedIngredients, setSelectedIngredients] = React.useState<ISelectedSupplierIngredient[]>([]);
    const [pickerIngredient, setPickerIngredient] = React.useState<IIngredient | null>(null);

    const handleAddIngredient = (ingredientToAdd?: IIngredient | null) => {
        const target = ingredientToAdd || pickerIngredient;
        if (!target) return;
        if (selectedIngredients.some((i) => i.ingredientId === target.id)) {
            toast.warning('This ingredient is already linked to the supplier');
            return;
        }
        setSelectedIngredients((prev) => [
            ...prev,
            {
                ingredientId: target.id,
                unitCost: 0,
                ingredient: target
            }
        ]);
        setPickerIngredient(null);
    };

    const handleRemoveIngredient = (ingredientId: string) => {
        setSelectedIngredients((prev) => prev.filter((i) => i.ingredientId !== ingredientId));
    };

    const handleUnitCostChange = (ingredientId: string, cost: number) => {
        setSelectedIngredients((prev) => prev.map((i) => (i.ingredientId === ingredientId ? { ...i, unitCost: cost } : i)));
    };

    React.useEffect(() => {
        if (!open) {
            form.reset({
                name: '',
                address: '',
                contactPerson: '',
                contactNumber: '',
                notes: ''
            });
            setSelectedIngredients([]);
            setPickerIngredient(null);
        }
    }, [open, form]);

    const createMutation = useMutation({
        mutationFn: createSupplier,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.SUPPLIERS.SUPPLIERS_LIST] });
            toast.success('Supplier Profile Created', {
                description: 'The new supplier profile has been successfully saved.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to create supplier', {
                description: getErrorMessage(error)
            });
        }
    });

    const onSubmit = (values: CreateSupplierFormValues) => {
        const validIngredients = selectedIngredients.filter((item) => !!item.ingredientId);
        createMutation.mutate({
            name: values.name,
            address: values.address || null,
            contactPerson: values.contactPerson || null,
            contactNumber: values.contactNumber || null,
            notes: values.notes || null,
            ingredients: validIngredients.map((item) => ({
                ingredientId: item.ingredientId,
                unitCost: Number(item.unitCost) || 0
            }))
        });
    };

    const isLoading = !isRendering;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Truck className="size-5 text-primary" />
                        Create Supplier Profile
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Register a new vendor, procurement contact details, and their supplied ingredients.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 min-h-0">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Spinner className="h-6 w-6 text-primary animate-spin" />
                                    <span className="text-xs text-muted-foreground font-medium">Initializing form...</span>
                                </div>
                            ) : (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Supplier Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Kape Beans Trading Co." {...field} className="h-9 bg-background/50" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="contactPerson"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold text-foreground/80">Contact Person</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="e.g. Juan Dela Cruz" {...field} className="h-9 bg-background/50" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="contactNumber"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold text-foreground/80">Contact Number</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="e.g. +639171234567" {...field} className="h-9 bg-background/50" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="address"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Address</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. 123 Coffee Lane, Manila" {...field} className="h-9 bg-background/50" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="notes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Notes / Remarks</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Primary supplier for Arabica and Robusta beans..."
                                                        className="min-h-[80px] bg-background/50 resize-y"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Supplied / Offered Ingredients */}
                                    <div className="space-y-3 pt-3 border-t border-border/40">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                    <Package className="size-3.5 text-primary" />
                                                    Supplied Ingredients
                                                </Label>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Link ingredients from this supplier to easily toggle them when creating POs.
                                                </p>
                                            </div>
                                            <Badge variant="secondary" className="text-[11px] font-semibold">
                                                {selectedIngredients.length} linked
                                            </Badge>
                                        </div>

                                        {/* Add ingredient row */}
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 min-w-0">
                                                <InfiniteSelect<IIngredient>
                                                    queryKey={[QUERY_KEY.INVENTORY.INGREDIENTS_LIST, 'supplier-create-picker']}
                                                    fetchFn={async ({ pageParam, query }) => {
                                                        return getIngredients({
                                                            page: pageParam || 1,
                                                            limit: 20,
                                                            search: query,
                                                            status: 'active'
                                                        });
                                                    }}
                                                    getItems={(pageItem) =>
                                                        pageItem?.data?.filter(
                                                            (ing: IIngredient) => !selectedIngredients.some((si) => si.ingredientId === ing.id)
                                                        ) || []
                                                    }
                                                    getNextPageParam={(lastPage) => {
                                                        return lastPage?.meta?.hasMore ? lastPage.meta.currentPage + 1 : undefined;
                                                    }}
                                                    value={pickerIngredient?.id}
                                                    onChange={(_val, item) => {
                                                        if (item) {
                                                            handleAddIngredient(item);
                                                        } else {
                                                            setPickerIngredient(null);
                                                        }
                                                    }}
                                                    getOptionValue={(i) => i.id}
                                                    getOptionLabel={(i) =>
                                                        `${i.name}${i.defaultUnit?.abbreviation ? ` (${i.defaultUnit.abbreviation})` : ''}`
                                                    }
                                                    selectedItem={pickerIngredient || undefined}
                                                    placeholder="Search & select an ingredient to link..."
                                                    searchPlaceholder="Search ingredients..."
                                                    className="h-8.5 text-xs bg-background/50"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAddIngredient()}
                                                disabled={!pickerIngredient}
                                                className="h-8.5 text-xs font-bold gap-1 shrink-0"
                                            >
                                                <Plus className="size-3.5" /> Link
                                            </Button>
                                        </div>

                                        {/* List of linked ingredients */}
                                        {selectedIngredients.length > 0 && (
                                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                                {selectedIngredients.map((item) => {
                                                    const ing = item.ingredient;
                                                    return (
                                                        <div
                                                            key={item.ingredientId}
                                                            className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/40 bg-muted/20 text-xs"
                                                        >
                                                            <div className="min-w-0 flex-1">
                                                                <span className="font-semibold text-foreground truncate block">
                                                                    {ing?.name || 'Unknown Ingredient'}
                                                                </span>
                                                                {ing?.defaultUnit?.name && (
                                                                    <span className="text-[10px] text-muted-foreground">
                                                                        Unit: {ing.defaultUnit.name} ({ing.defaultUnit.abbreviation || 'N/A'})
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[11px] text-muted-foreground">₱</span>
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        step="any"
                                                                        placeholder="0.00"
                                                                        value={item.unitCost}
                                                                        onChange={(e) => {
                                                                            const val = parseFloat(e.target.value);
                                                                            handleUnitCostChange(item.ingredientId, isNaN(val) ? 0 : val);
                                                                        }}
                                                                        className="h-7 w-24 text-xs font-semibold bg-background/50"
                                                                    />
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleRemoveIngredient(item.ingredientId)}
                                                                    className="size-7 text-muted-foreground hover:text-destructive"
                                                                >
                                                                    <Trash2 className="size-3.5" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
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
                                    'Create Supplier'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
