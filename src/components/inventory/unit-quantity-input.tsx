import * as React from 'react';
import { useUnitConverter } from '#/hooks/use-unit-converter.ts';
import { Input } from '#/components/ui/input.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { cn } from '#/lib/utils.ts';
import type { IIngredientUnit } from '#/feature/inventory/inventory.types.ts';

export interface UnitQuantityInputProps {
    ingredientId?: string | null;
    baseUnit?: {
        id?: string;
        name: string;
        abbreviation?: string | null;
    } | null;
    value: number | '';
    selectedUnitId?: string;
    onUnitChange?: (unitId: string) => void;
    onQuantityChange: (inputQuantity: number, baseQuantity: number, selectedUnitId: string) => void;
    label?: string;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
    min?: number;
    step?: string;
    compact?: boolean;
    className?: string;
    showBasePreview?: boolean;
}

export function UnitQuantityInput({
    ingredientId,
    baseUnit,
    value,
    selectedUnitId: externalUnitId,
    onUnitChange,
    onQuantityChange,
    label,
    required = false,
    disabled = false,
    placeholder = '0',
    min = 0,
    step = 'any',
    compact = false,
    className,
    showBasePreview = true
}: UnitQuantityInputProps) {
    const { getCompatibleUnits, convertQuantity, unitMap } = useUnitConverter();

    // Internal state for selected unit if not controlled externally
    const [internalUnitId, setInternalUnitId] = React.useState<string>(externalUnitId || baseUnit?.id || '');

    React.useEffect(() => {
        if (externalUnitId) {
            setInternalUnitId(externalUnitId);
        } else if (baseUnit?.id) {
            setInternalUnitId(baseUnit.id);
        }
    }, [externalUnitId, baseUnit?.id]);

    const activeUnitId = externalUnitId || internalUnitId || baseUnit?.id || '';

    // Get list of compatible units for this ingredient
    const compatibleUnits: IIngredientUnit[] = React.useMemo(() => {
        const units = getCompatibleUnits(baseUnit?.id, ingredientId);
        if (baseUnit?.id && !units.some((u) => u.id === baseUnit.id)) {
            const fallbackUnit: IIngredientUnit = {
                id: baseUnit.id,
                name: baseUnit.name,
                abbreviation: baseUnit.abbreviation || '',
                category: 'INGREDIENT',
                status: 'active',
                createdAt: '',
                updatedAt: ''
            };
            return [fallbackUnit, ...units];
        }
        return units;
    }, [getCompatibleUnits, baseUnit, ingredientId]);

    // Handle unit change
    const handleUnitSelect = (newUnitId: string) => {
        setInternalUnitId(newUnitId);
        onUnitChange?.(newUnitId);

        const numVal = typeof value === 'number' ? value : 0;
        if (baseUnit?.id) {
            const baseQty = convertQuantity(newUnitId, baseUnit.id, numVal, ingredientId);
            onQuantityChange(numVal, baseQty, newUnitId);
        } else {
            onQuantityChange(numVal, numVal, newUnitId);
        }
    };

    // Handle numeric input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const numVal = raw === '' ? 0 : Number(raw);

        if (baseUnit?.id && activeUnitId) {
            const baseQty = convertQuantity(activeUnitId, baseUnit.id, numVal, ingredientId);
            onQuantityChange(numVal, baseQty, activeUnitId);
        } else {
            onQuantityChange(numVal, numVal, activeUnitId);
        }
    };

    // Calculate converted base unit quantity for live preview
    const convertedBaseQuantity = React.useMemo(() => {
        if (!baseUnit?.id || !activeUnitId) return typeof value === 'number' ? value : 0;
        const numVal = typeof value === 'number' ? value : 0;
        return convertQuantity(activeUnitId, baseUnit.id, numVal, ingredientId);
    }, [convertQuantity, activeUnitId, baseUnit?.id, value, ingredientId]);

    const isDifferentUnit = Boolean(baseUnit?.id && activeUnitId && baseUnit.id !== activeUnitId);
    const baseUnitLabel = baseUnit?.abbreviation || baseUnit?.name || '';
    const selectedUnitObj =
        unitMap.get(activeUnitId) || compatibleUnits.find((u) => u.id === activeUnitId) || (baseUnit?.id === activeUnitId ? baseUnit : null);
    const selectedUnitAbbr = selectedUnitObj?.abbreviation || selectedUnitObj?.name || '';

    // Format number nicely
    const formatNumber = (num: number) => {
        return Number(num.toFixed(4)).toLocaleString(undefined, { maximumFractionDigits: 4 });
    };

    if (compact) {
        return (
            <div className={cn('flex flex-col gap-1', className)}>
                <div className="flex items-center gap-1.5">
                    <Input
                        type="number"
                        min={min}
                        step={step}
                        disabled={disabled}
                        placeholder={placeholder}
                        value={value === '' ? '' : value}
                        onChange={handleInputChange}
                        className="h-8 text-xs font-bold bg-background/80 flex-1 min-w-[70px]"
                    />
                    <Select value={activeUnitId || undefined} onValueChange={handleUnitSelect} disabled={disabled}>
                        <SelectTrigger className="h-8 w-[88px] text-xs font-semibold px-2 shrink-0 bg-background/80">
                            <SelectValue placeholder="Unit">{selectedUnitAbbr || undefined}</SelectValue>
                        </SelectTrigger>
                        <SelectContent align="end">
                            {compatibleUnits.map((u) => (
                                <SelectItem key={u.id} value={u.id} className="text-xs">
                                    {u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {showBasePreview && isDifferentUnit && typeof value === 'number' && value > 0 && (
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        ↳ = {formatNumber(convertedBaseQuantity)} {baseUnitLabel}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className={cn('space-y-1.5', className)}>
            {label && (
                <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground/80">
                        {label} {required && <span className="text-rose-500">*</span>}
                    </label>
                    {baseUnitLabel && (
                        <span className="text-[11px] text-muted-foreground">
                            Base: <strong className="text-foreground">{baseUnitLabel}</strong>
                        </span>
                    )}
                </div>
            )}

            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Input
                        type="number"
                        min={min}
                        step={step}
                        disabled={disabled}
                        placeholder={placeholder}
                        value={value === '' ? '' : value}
                        onChange={handleInputChange}
                        className="h-9 text-xs font-bold bg-background/50 pr-8"
                    />
                    {selectedUnitAbbr && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">
                            {selectedUnitAbbr}
                        </span>
                    )}
                </div>

                <div className="w-[140px] shrink-0">
                    <Select value={activeUnitId || undefined} onValueChange={handleUnitSelect} disabled={disabled}>
                        <SelectTrigger className="h-9 text-xs font-semibold bg-background/50">
                            <SelectValue placeholder="Select unit...">
                                {selectedUnitObj
                                    ? selectedUnitObj.abbreviation
                                        ? `${selectedUnitObj.name} (${selectedUnitObj.abbreviation})`
                                        : selectedUnitObj.name
                                    : undefined}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent align="end">
                            {compatibleUnits.map((u) => {
                                const isBase = u.id === baseUnit?.id;
                                return (
                                    <SelectItem key={u.id} value={u.id} className="text-xs">
                                        <div className="flex items-center justify-between w-full gap-2">
                                            <span>
                                                {u.name} {u.abbreviation ? `(${u.abbreviation})` : ''}
                                            </span>
                                            {isBase && (
                                                <span className="text-[10px] text-primary font-bold uppercase tracking-wider ml-auto">Base</span>
                                            )}
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {showBasePreview && isDifferentUnit && typeof value === 'number' && value > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs">
                    <span className="font-semibold">Converted to base unit:</span>
                    <strong className="font-mono">
                        {formatNumber(convertedBaseQuantity)} {baseUnitLabel}
                    </strong>
                </div>
            )}
        </div>
    );
}
