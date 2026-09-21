import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowRight, Calculator, Check, Globe, Package, Scale, ArrowLeftRight } from 'lucide-react';

import { createUnitConversion, updateUnitConversion, convertQuantity } from '#/api/unit-conversions.api.ts';
import { getIngredientUnits, getIngredients } from '#/api/inventory.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IUnitConversion } from '#/feature/inventory/unit-conversions/unit-conversions.types.ts';
import type { IIngredientUnit, IIngredient } from '#/feature/inventory/inventory.types.ts';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';

// =============================================================================
// 1. Create Unit Conversion Dialog
// =============================================================================

const createConversionSchema = z
    .object({
        fromUnitId: z.string().min(1, 'Please select source unit'),
        toUnitId: z.string().min(1, 'Please select target unit'),
        factor: z.number({ error: 'Factor is required' }).positive('Factor must be greater than 0'),
        scope: z.enum(['GLOBAL', 'INGREDIENT']),
        ingredientId: z.string().optional().nullable()
    })
    .refine((data) => !data.fromUnitId || !data.toUnitId || data.fromUnitId !== data.toUnitId, {
        message: 'Source and target units must be different',
        path: ['toUnitId']
    })
    .refine(
        (data) => {
            if (data.scope === 'INGREDIENT') {
                return !!data.ingredientId;
            }
            return true;
        },
        {
            message: 'Please select an ingredient for ingredient-specific conversion',
            path: ['ingredientId']
        }
    );

type CreateConversionValues = z.infer<typeof createConversionSchema>;

interface UnitConversionCreateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UnitConversionCreateDialog({ open, onOpenChange }: UnitConversionCreateDialogProps) {
    const queryClient = useQueryClient();

    // Fetch active units
    const { data: unitsData } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.UNITS_LIST, { status: 'active', limit: 100 }],
        queryFn: () => getIngredientUnits({ page: 1, limit: 100, status: 'active' }),
        enabled: open
    });
    const units = unitsData?.data || [];

    const form = useForm<CreateConversionValues>({
        resolver: zodResolver(createConversionSchema),
        defaultValues: {
            fromUnitId: '',
            toUnitId: '',
            factor: 1,
            scope: 'GLOBAL',
            ingredientId: null
        }
    });

    React.useEffect(() => {
        if (open) {
            form.reset({
                fromUnitId: '',
                toUnitId: '',
                factor: 1,
                scope: 'GLOBAL',
                ingredientId: null
            });
        }
    }, [open, form]);

    const watchedFromUnitId = form.watch('fromUnitId');
    const watchedToUnitId = form.watch('toUnitId');
    const watchedFactor = form.watch('factor');
    const watchedScope = form.watch('scope');

    const handleSwapUnits = () => {
        const from = form.getValues('fromUnitId');
        const to = form.getValues('toUnitId');
        form.setValue('fromUnitId', to, { shouldValidate: true });
        form.setValue('toUnitId', from, { shouldValidate: true });
    };

    const fromUnit = units.find((u) => u.id === watchedFromUnitId);
    const toUnit = units.find((u) => u.id === watchedToUnitId);

    const createMutation = useMutation({
        mutationFn: createUnitConversion,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.UNIT_CONVERSIONS.LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.LEVELS_LIST] });
            toast.success('Unit conversion rule created successfully');
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error('Failed to create conversion', { description: getErrorMessage(err) });
        }
    });

    const onSubmit = (values: CreateConversionValues) => {
        createMutation.mutate({
            fromUnitId: values.fromUnitId,
            toUnitId: values.toUnitId,
            factor: Number(values.factor),
            ingredientId: values.scope === 'INGREDIENT' ? values.ingredientId : null
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg w-full rounded-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="font-bold text-foreground flex items-center gap-2">
                        <Scale className="size-5 text-primary" />
                        Create Unit Conversion
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Define conversion factors between kitchen measurement units (e.g. 1 tablespoon = 4 ml).
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 my-2">
                        {/* Scope Toggle */}
                        <FormField
                            control={form.control}
                            name="scope"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className="text-xs font-bold text-foreground">Conversion Scope</FormLabel>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                field.onChange('GLOBAL');
                                                form.setValue('ingredientId', null);
                                            }}
                                            className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                                                field.value === 'GLOBAL'
                                                    ? 'border-primary bg-primary/10 text-foreground'
                                                    : 'border-border/60 bg-background/50 text-muted-foreground hover:bg-muted/20'
                                            }`}
                                        >
                                            <Globe className="size-4 text-primary shrink-0" />
                                            <div>
                                                <span className="text-xs font-bold block">Global Conversion</span>
                                                <span className="text-xs text-muted-foreground block">Applies to all ingredients</span>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => field.onChange('INGREDIENT')}
                                            className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                                                field.value === 'INGREDIENT'
                                                    ? 'border-primary bg-primary/10 text-foreground'
                                                    : 'border-border/60 bg-background/50 text-muted-foreground hover:bg-muted/20'
                                            }`}
                                        >
                                            <Package className="size-4 text-primary shrink-0" />
                                            <div>
                                                <span className="text-xs font-bold block">Ingredient Specific</span>
                                                <span className="text-xs text-muted-foreground block">Applies to one item</span>
                                            </div>
                                        </button>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Specific Ingredient Select */}
                        {watchedScope === 'INGREDIENT' && (
                            <FormField
                                control={form.control}
                                name="ingredientId"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-xs font-bold text-foreground">Target Raw Ingredient</FormLabel>
                                        <FormControl>
                                            <InfiniteSelect<IIngredient>
                                                queryKey={[QUERY_KEY.INVENTORY.INGREDIENTS_LIST]}
                                                fetchFn={async ({ pageParam, query }) => {
                                                    return getIngredients({
                                                        page: pageParam || 1,
                                                        limit: 20,
                                                        search: query,
                                                        status: 'active'
                                                    });
                                                }}
                                                getItems={(page) => page.data}
                                                getNextPageParam={(lastPage) => {
                                                    return lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined;
                                                }}
                                                value={field.value || ''}
                                                onChange={(val) => field.onChange(val || null)}
                                                getOptionValue={(item) => item.id}
                                                getOptionLabel={(item) => item.name}
                                                placeholder="Choose raw ingredient (e.g. Matcha Powder)..."
                                                searchPlaceholder="Search ingredients..."
                                                className="h-9 text-xs bg-background/50"
                                            />
                                        </FormControl>
                                        <FormDescription className="text-xs text-muted-foreground">
                                            This conversion rule will only take effect for this specific raw ingredient.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* Units Row */}
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                            {/* From Unit */}
                            <div className="flex-1 w-full">
                                <FormField
                                    control={form.control}
                                    name="fromUnitId"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="text-xs font-bold text-foreground">From Unit (1 unit)</FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger className="h-9 text-xs bg-background/50">
                                                        <SelectValue placeholder="Select unit..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {units.map((unit) => (
                                                        <SelectItem key={unit.id} value={unit.id} className="text-xs">
                                                            {unit.name} {unit.abbreviation ? `(${unit.abbreviation})` : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Swap Button */}
                            <div className="pt-0 sm:pt-6 shrink-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={handleSwapUnits}
                                    className="size-8 rounded-full border-border/60 hover:bg-primary/10 hover:text-primary transition-colors"
                                    title="Swap source and target units"
                                >
                                    <ArrowLeftRight className="size-3.5" />
                                </Button>
                            </div>

                            {/* To Unit */}
                            <div className="flex-1 w-full">
                                <FormField
                                    control={form.control}
                                    name="toUnitId"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="text-xs font-bold text-foreground">To Base Unit</FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger className="h-9 text-xs bg-background/50">
                                                        <SelectValue placeholder="Select unit..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {units.map((unit) => (
                                                        <SelectItem key={unit.id} value={unit.id} className="text-xs">
                                                            {unit.name} {unit.abbreviation ? `(${unit.abbreviation})` : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Factor Input */}
                        <FormField
                            control={form.control}
                            name="factor"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className="text-xs font-bold text-foreground">Multiplier Factor</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="any"
                                            min="0.0001"
                                            placeholder="e.g. 4 or 1000"
                                            value={field.value}
                                            onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                                            className="h-9 text-xs font-mono font-bold bg-background/50"
                                        />
                                    </FormControl>
                                    <FormDescription className="text-xs text-muted-foreground">
                                        How many target units equal 1 source unit.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Live Formula Preview Card */}
                        <div className="p-3.5 bg-muted/30 border border-border/40 rounded-xl space-y-1">
                            <span className="text-xs font-bold text-muted-foreground uppercase block">Conversion Formula Preview</span>
                            <div className="flex items-center gap-2 text-sm font-bold text-foreground font-mono">
                                <span>1 {fromUnit ? fromUnit.abbreviation || fromUnit.name : '[From Unit]'}</span>
                                <span className="text-primary">=</span>
                                <span>{parseFloat(String(watchedFactor)) || 0}</span>
                                <span>{toUnit ? toUnit.abbreviation || toUnit.name : '[To Unit]'}</span>
                            </div>
                        </div>

                        <DialogFooter className="shrink-0 pt-4 border-t border-border/40 gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => onOpenChange(false)}
                                className="h-9 w-24 rounded-lg text-xs font-bold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createMutation.isPending}
                                className="h-9 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95"
                            >
                                {createMutation.isPending ? 'Creating...' : 'Create Conversion'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// =============================================================================
// 2. Edit Unit Conversion Dialog
// =============================================================================

interface UnitConversionEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    conversion: IUnitConversion | null;
}

export function UnitConversionEditDialog({ open, onOpenChange, conversion }: UnitConversionEditDialogProps) {
    const queryClient = useQueryClient();
    const [factor, setFactor] = React.useState<string | number>(1);

    React.useEffect(() => {
        if (conversion) {
            setFactor(conversion.factor);
        }
    }, [conversion]);

    const updateMutation = useMutation({
        mutationFn: ({ id, factor }: { id: string; factor: number }) => updateUnitConversion(id, { factor }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.UNIT_CONVERSIONS.LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.LEVELS_LIST] });
            toast.success('Conversion factor updated successfully');
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error('Failed to update factor', { description: getErrorMessage(err) });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!conversion) return;
        const num = parseFloat(String(factor));
        if (isNaN(num) || num <= 0) {
            toast.error('Factor must be a positive number greater than 0');
            return;
        }
        updateMutation.mutate({ id: conversion.id, factor: num });
    };

    if (!conversion) return null;

    const fromAbbrev = conversion.fromUnit.abbreviation || conversion.fromUnit.name;
    const toAbbrev = conversion.toUnit.abbreviation || conversion.toUnit.name;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md w-full rounded-2xl p-6 overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="font-bold text-foreground flex items-center gap-2">
                        <Scale className="size-5 text-primary" />
                        Update Conversion Factor
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Adjust the multiplication ratio between {conversion.fromUnit.name} and {conversion.toUnit.name}.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 my-2">
                    {/* Information summary */}
                    <div className="p-3 bg-muted/20 border border-border/40 rounded-xl space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-medium">Scope:</span>
                            {conversion.ingredient ? (
                                <Badge variant="secondary" className="text-xs font-semibold">
                                    Ingredient: {conversion.ingredient.name}
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30">
                                    Global Conversion
                                </Badge>
                            )}
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-medium">Units:</span>
                            <span className="font-bold text-foreground">
                                {conversion.fromUnit.name} ({fromAbbrev}) → {conversion.toUnit.name} ({toAbbrev})
                            </span>
                        </div>
                    </div>

                    {/* Factor input */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground">New Factor</label>
                        <Input
                            type="number"
                            step="any"
                            min="0.0001"
                            value={factor}
                            onChange={(e) => setFactor(e.target.value)}
                            className="h-9 text-xs font-mono font-bold bg-background/50"
                        />
                    </div>

                    {/* Live Preview */}
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between text-xs font-bold font-mono text-primary">
                        <span>1 {fromAbbrev}</span>
                        <ArrowRight className="size-3.5" />
                        <span>
                            {parseFloat(String(factor)) || 0} {toAbbrev}
                        </span>
                    </div>

                    <DialogFooter className="pt-2 gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => onOpenChange(false)}
                            className="h-9 w-24 rounded-lg text-xs font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={updateMutation.isPending}
                            className="h-9 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95"
                        >
                            {updateMutation.isPending ? 'Updating...' : 'Save Factor'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// =============================================================================
// 3. Unit Conversion Calculator Dialog
// =============================================================================

interface UnitConversionCalculatorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UnitConversionCalculatorDialog({ open, onOpenChange }: UnitConversionCalculatorDialogProps) {
    const [fromUnitId, setFromUnitId] = React.useState<string>('');
    const [toUnitId, setToUnitId] = React.useState<string>('');
    const [quantity, setQuantity] = React.useState<string | number>(1);
    const [ingredientId, setIngredientId] = React.useState<string | null>(null);

    // Fetch active units
    const { data: unitsData } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.UNITS_LIST, { status: 'active', limit: 100 }],
        queryFn: () => getIngredientUnits({ page: 1, limit: 100, status: 'active' }),
        enabled: open
    });
    const units = unitsData?.data || [];

    const numQty = parseFloat(String(quantity)) || 0;
    const isSameUnit = !!fromUnitId && !!toUnitId && fromUnitId === toUnitId;

    const fromUnit = units.find((u) => u.id === fromUnitId);
    const toUnit = units.find((u) => u.id === toUnitId);

    const handleSwapUnits = () => {
        const from = fromUnitId;
        const to = toUnitId;
        setFromUnitId(to);
        setToUnitId(from);
    };

    // Query calculate conversion
    const {
        data: calcResult,
        isLoading: isCalculating,
        error: calcError
    } = useQuery({
        queryKey: [QUERY_KEY.UNIT_CONVERSIONS.CONVERT, { fromUnitId, toUnitId, quantity: numQty, ingredientId }],
        queryFn: () => convertQuantity({ fromUnitId, toUnitId, quantity: numQty, ingredientId: ingredientId || undefined }),
        enabled: open && !!fromUnitId && !!toUnitId && numQty > 0 && !isSameUnit,
        retry: false
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg w-full rounded-2xl p-6 overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="font-bold text-foreground flex items-center gap-2">
                        <Calculator className="size-5 text-primary" />
                        Unit Conversion Calculator
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Test and verify conversion calculations in real time using active global and ingredient rules.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 my-2">
                    {/* Quantity & Optional Ingredient */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Quantity */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground">Quantity to Convert</label>
                            <Input
                                type="number"
                                min="0.0001"
                                step="any"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="h-9 text-xs font-mono font-bold bg-background/50"
                            />
                        </div>

                        {/* Optional Ingredient */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground">Ingredient (Optional)</label>
                            <InfiniteSelect<IIngredient>
                                queryKey={[QUERY_KEY.INVENTORY.INGREDIENTS_LIST]}
                                fetchFn={async ({ pageParam, query }) => {
                                    return getIngredients({
                                        page: pageParam || 1,
                                        limit: 20,
                                        search: query,
                                        status: 'active'
                                    });
                                }}
                                getItems={(page) => page.data}
                                getNextPageParam={(lastPage) => {
                                    return lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined;
                                }}
                                value={ingredientId || ''}
                                onChange={(val) => setIngredientId(val || null)}
                                getOptionValue={(item) => item.id}
                                getOptionLabel={(item) => item.name}
                                placeholder="Any / Global rule..."
                                searchPlaceholder="Search ingredients..."
                                className="h-9 text-xs bg-background/50"
                            />
                        </div>
                    </div>

                    {/* From & To Units with Swap */}
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                        {/* From Unit */}
                        <div className="flex-1 w-full space-y-1.5">
                            <label className="text-xs font-bold text-foreground">Source Unit</label>
                            <Select value={fromUnitId} onValueChange={setFromUnitId}>
                                <SelectTrigger className="h-9 text-xs bg-background/50">
                                    <SelectValue placeholder="Select unit..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {units.map((unit) => (
                                        <SelectItem key={unit.id} value={unit.id} className="text-xs">
                                            {unit.name} {unit.abbreviation ? `(${unit.abbreviation})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Swap Button */}
                        <div className="pt-0 sm:pt-6 shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={handleSwapUnits}
                                className="size-8 rounded-full border-border/60 hover:bg-primary/10 hover:text-primary transition-colors"
                                title="Swap source and target units"
                            >
                                <ArrowLeftRight className="size-3.5" />
                            </Button>
                        </div>

                        {/* To Unit */}
                        <div className="flex-1 w-full space-y-1.5">
                            <label className="text-xs font-bold text-foreground">Target Unit</label>
                            <Select value={toUnitId} onValueChange={setToUnitId}>
                                <SelectTrigger className="h-9 text-xs bg-background/50">
                                    <SelectValue placeholder="Select unit..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {units.map((unit) => (
                                        <SelectItem key={unit.id} value={unit.id} className="text-xs">
                                            {unit.name} {unit.abbreviation ? `(${unit.abbreviation})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Result Display */}
                    <div className="p-4 rounded-2xl bg-muted/25 border border-border/40 min-h-[100px] flex flex-col items-center justify-center text-center gap-1">
                        {isSameUnit ? (
                            <>
                                <span className="text-xs font-semibold text-muted-foreground uppercase">Direct Identity</span>
                                <div className="text-xl font-bold font-mono text-foreground flex items-center gap-2">
                                    <span>
                                        {numQty} {fromUnit?.abbreviation || fromUnit?.name}
                                    </span>
                                    <span className="text-primary">=</span>
                                    <span className="text-primary font-extrabold">
                                        {numQty} {toUnit?.abbreviation || toUnit?.name}
                                    </span>
                                </div>
                                <span className="text-xs text-muted-foreground mt-1">1:1 direct ratio (no conversion calculation required)</span>
                            </>
                        ) : isCalculating ? (
                            <span className="text-xs text-muted-foreground font-semibold">Calculating conversion...</span>
                        ) : calcError ? (
                            <div className="text-destructive text-xs font-semibold">
                                {getErrorMessage(calcError) || 'No conversion path found between these units'}
                            </div>
                        ) : calcResult ? (
                            <>
                                <span className="text-xs font-semibold text-muted-foreground uppercase">Converted Result</span>
                                <div className="text-xl font-bold font-mono text-foreground flex items-center gap-2">
                                    <span>
                                        {calcResult.originalQuantity} {calcResult.fromUnitName}
                                    </span>
                                    <span className="text-primary">=</span>
                                    <span className="text-primary font-extrabold">
                                        {calcResult.convertedQuantity} {calcResult.toUnitName}
                                    </span>
                                </div>
                                <span className="text-xs text-muted-foreground mt-1">
                                    Formula factor: ×{calcResult.factor}{' '}
                                    {calcResult.ingredientName ? `(${calcResult.ingredientName})` : '(Global rule)'}
                                </span>
                            </>
                        ) : (
                            <span className="text-xs text-muted-foreground">
                                Select source and target units to preview the calculated conversion.
                            </span>
                        )}
                    </div>
                </div>

                <DialogFooter className="pt-2">
                    <Button variant="secondary" onClick={() => onOpenChange(false)} className="h-9 w-24 rounded-lg text-xs font-bold ml-auto">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
