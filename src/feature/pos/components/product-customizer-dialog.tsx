import * as React from 'react';
import { Coffee, Plus, Minus } from 'lucide-react';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { getFileUrl } from '#/utils/helper.ts';
import { toast } from 'sonner';
import type { IMenuProduct, IMenuProductVariant } from '../../menu/menu.types';
import type { IModifierGroup, IModifierOption } from '../../modifier/modifier.types';
import type { IPaginatedResult } from '#/types/base.types';

interface ProductCustomizerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    configProduct: IMenuProduct | null;
    selectedVariant: IMenuProductVariant | null;
    setSelectedVariant: (variant: IMenuProductVariant) => void;
    chosenModifiers: Record<string, string[] | undefined>;
    setChosenModifiers: React.Dispatch<React.SetStateAction<Record<string, string[] | undefined>>>;
    configQuantity: number;
    setConfigQuantity: React.Dispatch<React.SetStateAction<number>>;
    configNotes: string;
    setConfigNotes: (notes: string) => void;
    onAddToCart: () => void;
    isModifiersLoading: boolean;
    modifierGroupsData: IPaginatedResult<IModifierGroup> | undefined;
    isEditing?: boolean;
}

export default function ProductCustomizerDialog({
    open,
    onOpenChange,
    configProduct,
    selectedVariant,
    setSelectedVariant,
    chosenModifiers,
    setChosenModifiers,
    configQuantity,
    setConfigQuantity,
    configNotes,
    setConfigNotes,
    onAddToCart,
    isModifiersLoading,
    modifierGroupsData,
    isEditing = false
}: ProductCustomizerDialogProps) {
    const [selectedAttributes, setSelectedAttributes] = React.useState<{ [name: string]: string }>({});

    // Synchronize local attributes state with selectedVariant
    React.useEffect(() => {
        if (selectedVariant) {
            const initialSelected: { [name: string]: string } = {};
            selectedVariant.attributes.forEach((attr: any) => {
                initialSelected[attr.attributeValue.attribute.name] = attr.attributeValue.value;
            });
            setSelectedAttributes(initialSelected);
        } else {
            setSelectedAttributes({});
        }
    }, [selectedVariant]);

    // Find all unique attributes (like "Milk Type", "Size") on the variants
    const attributeNames = React.useMemo(() => {
        if (!configProduct) return [];
        return Array.from(
            new Set<string>(
                configProduct.variants.flatMap((v: IMenuProductVariant) => v.attributes.map((attr: any) => attr.attributeValue.attribute.name))
            )
        );
    }, [configProduct]);

    // Group all unique attribute values by attribute name
    const attributeValuesByName = React.useMemo(() => {
        const result: { [name: string]: string[] } = {};
        if (!configProduct) return result;
        attributeNames.forEach((name: string) => {
            const values = new Set<string>();
            configProduct.variants.forEach((v: IMenuProductVariant) => {
                const attr = v.attributes.find((a: any) => a.attributeValue.attribute.name === name);
                if (attr) {
                    values.add(attr.attributeValue.value);
                }
            });
            result[name] = Array.from(values);
        });
        return result;
    }, [configProduct, attributeNames]);

    // Get available values for a given attribute name based on preceding selections
    const getAvailableValues = (name: string, index: number) => {
        if (!configProduct) return [];
        // If it's the first attribute, all values are available
        if (index === 0) return attributeValuesByName[name];

        // Otherwise, filter variants to those that match the selected values of all preceding attributes
        const precedingNames = attributeNames.slice(0, index);
        const validVariants = configProduct.variants.filter((v: IMenuProductVariant) =>
            precedingNames.every((pName: string) => {
                const attr = v.attributes.find((a: any) => a.attributeValue.attribute.name === pName);
                return attr && attr.attributeValue.value === selectedAttributes[pName];
            })
        );

        // Get unique values of the current attribute from these valid variants
        const validValues = new Set<string>();
        validVariants.forEach((v: IMenuProductVariant) => {
            const attr = v.attributes.find((a: any) => a.attributeValue.attribute.name === name);
            if (attr) {
                validValues.add(attr.attributeValue.value);
            }
        });
        return Array.from(validValues);
    };

    const handleAttributeSelect = (attributeName: string, value: string) => {
        if (!configProduct) return;
        setSelectedAttributes((prev) => {
            const updated = { ...prev, [attributeName]: value };

            let matchingVariant = configProduct.variants.find((v: IMenuProductVariant) =>
                v.attributes.every((attr: any) => updated[attr.attributeValue.attribute.name] === attr.attributeValue.value)
            );

            if (!matchingVariant) {
                matchingVariant = configProduct.variants.find((v: IMenuProductVariant) =>
                    v.attributes.some((attr: any) => attr.attributeValue.attribute.name === attributeName && attr.attributeValue.value === value)
                );
            }

            if (matchingVariant) {
                setSelectedVariant(matchingVariant);
                const newSelected: { [name: string]: string } = {};
                matchingVariant.attributes.forEach((attr: any) => {
                    newSelected[attr.attributeValue.attribute.name] = attr.attributeValue.value;
                });
                return newSelected;
            }

            return updated;
        });
    };

    const overallTotal = React.useMemo(() => {
        if (!selectedVariant) return 0;
        let sum = selectedVariant.price;

        if (modifierGroupsData?.data) {
            modifierGroupsData.data.forEach((group: IModifierGroup) => {
                const selections = chosenModifiers[group.id] || [];
                group.options.forEach((opt: IModifierOption) => {
                    if (selections.includes(opt.id)) {
                        sum += opt.price;
                    }
                });
            });
        }

        return sum * configQuantity;
    }, [selectedVariant, chosenModifiers, modifierGroupsData, configQuantity]);

    if (!configProduct) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] p-0 flex flex-col overflow-hidden bg-background border-border/60 rounded-2xl">
                <DialogHeader className="px-6 pt-6 pb-2 shrink-0 border-b border-border/40">
                    <DialogTitle className="text-base font-bold text-foreground">Configure Beverage Options</DialogTitle>
                    <DialogDescription className="text-xs">
                        Select cup sizes and choose customized add-ons for preparation formulas.
                    </DialogDescription>
                </DialogHeader>

                <div className="grow overflow-y-auto px-6 py-4 space-y-6">
                    {/* Product Info Summary */}
                    <div className="flex gap-4 items-center bg-muted/15 p-3 rounded-xl border border-border/45">
                        <div className="size-16 rounded-lg bg-background border flex items-center justify-center shrink-0 overflow-hidden">
                            {configProduct.photo ? (
                                <img
                                    src={configProduct.photo.startsWith('http') ? configProduct.photo : getFileUrl(configProduct.photo)}
                                    alt={configProduct.name}
                                    className="size-full object-cover"
                                />
                            ) : (
                                <Coffee className="size-6 text-muted-foreground/60" />
                            )}
                        </div>
                        <div className="min-w-0 text-left flex-1">
                            <h4 className="text-sm font-bold text-foreground">{configProduct.name}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-snug truncate">
                                {configProduct.description || 'No descriptive flavor profile provided.'}
                            </p>
                        </div>
                        {selectedVariant && (
                            <div className="text-right shrink-0">
                                <span className="text-2xs text-muted-foreground font-bold block uppercase">Base Price</span>
                                <span className="text-sm font-bold text-primary font-mono">₱{selectedVariant.price.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    {/* Attribute Selectors */}
                    {attributeNames.length > 0 && (
                        <div className="space-y-5">
                            {attributeNames.map((attrName: string, idx: number) => {
                                const availableValues = getAvailableValues(attrName, idx);
                                const currentValue = selectedAttributes[attrName];
                                return (
                                    <div key={attrName} className="space-y-2 text-left">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-foreground/80 uppercase block">
                                                {idx + 1}. Choose {attrName}
                                            </span>
                                            {currentValue && (
                                                <span className="text-xs font-semibold text-primary/80 bg-primary/5 px-2 py-0.5 rounded-md">
                                                    {currentValue}
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                            {attributeValuesByName[attrName].map((val: string) => {
                                                const isSelected = currentValue === val;
                                                const isAvailable = availableValues.includes(val);
                                                return (
                                                    <button
                                                        key={val}
                                                        type="button"
                                                        disabled={!isAvailable}
                                                        onClick={() => handleAttributeSelect(attrName, val)}
                                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                                                            isSelected
                                                                ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary font-bold shadow-xs'
                                                                : isAvailable
                                                                  ? 'border-border/60 bg-card hover:border-border-hover hover:bg-muted/10 text-foreground font-medium'
                                                                  : 'border-border/20 bg-muted/5 text-muted-foreground/30 cursor-not-allowed opacity-30'
                                                        }`}
                                                    >
                                                        <span className="text-xs">{val}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Modifiers List */}
                    <div className="space-y-4 pt-4 border-t border-border/20 text-left">
                        <span className="text-xs font-bold text-foreground/80 uppercase block">
                            {attributeNames.length > 0 ? attributeNames.length + 1 : 1}. Custom Add-Ons & Customizations
                        </span>

                        {isModifiersLoading ? (
                            <div className="py-10 flex flex-col items-center justify-center gap-2">
                                <Spinner className="size-5 text-primary animate-spin" />
                                <span className="text-xs text-muted-foreground">Checking modifier specs...</span>
                            </div>
                        ) : !modifierGroupsData?.data || modifierGroupsData.data.length === 0 ? (
                            <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground">
                                No custom modifiers registered for this drink.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {modifierGroupsData.data.map((group: IModifierGroup) => {
                                    const selections = chosenModifiers[group.id] || [];

                                    const handleSelectOption = (optionId: string) => {
                                        setChosenModifiers((prev) => {
                                            const current = prev[group.id] || [];
                                            if (current.includes(optionId)) {
                                                return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
                                            }

                                            if (group.maxSelect === 1) {
                                                return { ...prev, [group.id]: [optionId] };
                                            } else {
                                                if (current.length >= group.maxSelect) {
                                                    toast.warning(`Maximum of ${group.maxSelect} selections allowed for ${group.name}.`);
                                                    return prev;
                                                }
                                                return { ...prev, [group.id]: [...current, optionId] };
                                            }
                                        });
                                    };

                                    return (
                                        <div key={group.id} className="space-y-2 border border-border/40 p-3 rounded-xl bg-muted/5">
                                            <div className="flex justify-between items-baseline">
                                                <h5 className="text-xs font-bold text-foreground">
                                                    {group.name}
                                                    {group.isRequired && <span className="text-destructive ml-1">*</span>}
                                                </h5>
                                                <span className="text-xs text-muted-foreground font-semibold">
                                                    {group.isRequired ? 'Required' : 'Optional'} (Min {group.minSelect} / Max {group.maxSelect})
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                {group.options.map((option: IModifierOption) => {
                                                    const isChecked = selections.includes(option.id);
                                                    return (
                                                        <button
                                                            key={option.id}
                                                            type="button"
                                                            onClick={() => handleSelectOption(option.id)}
                                                            className={`p-2.5 rounded-lg border text-left flex justify-between items-center text-xs transition-all cursor-pointer ${
                                                                isChecked
                                                                    ? 'bg-primary/5 border-primary text-primary font-bold shadow-3xs'
                                                                    : 'bg-background hover:bg-muted/10 border-border/80 text-muted-foreground hover:text-foreground'
                                                            }`}
                                                        >
                                                            <span>{option.name}</span>
                                                            <span className="font-mono text-2xs opacity-85">
                                                                {option.price > 0 ? `+₱${option.price.toFixed(2)}` : 'Free'}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Prep Notes & Count */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border/20 text-left">
                        <div className="md:col-span-2 space-y-1">
                            <span className="text-xs font-bold text-foreground/80 uppercase block">Preparation Request Instructions</span>
                            <Input
                                placeholder="e.g. Less ice, extra espresso shot, divide in two..."
                                value={configNotes}
                                onChange={(e) => setConfigNotes(e.target.value)}
                                className="h-8.5 bg-background/50 text-xs"
                            />
                        </div>

                        <div className="space-y-1 text-center">
                            <span className="text-xs font-bold text-foreground/80 uppercase block">Quantity</span>
                            <div className="flex items-center justify-center gap-3 border rounded-lg h-8.5 bg-background/50">
                                <button
                                    type="button"
                                    onClick={() => setConfigQuantity((q) => Math.max(1, q - 1))}
                                    className="p-1 rounded-md hover:bg-muted text-muted-foreground active:scale-95 cursor-pointer"
                                >
                                    <Minus className="size-3" />
                                </button>
                                <span className="text-xs font-bold w-6 text-center font-mono">{configQuantity}</span>
                                <button
                                    type="button"
                                    onClick={() => setConfigQuantity((q) => q + 1)}
                                    className="p-1 rounded-md hover:bg-muted text-muted-foreground active:scale-95 cursor-pointer"
                                >
                                    <Plus className="size-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-3 border-t bg-muted/20 shrink-0 flex items-center justify-between">
                    <div className="text-left">
                        <span className="text-2xs text-muted-foreground font-bold block uppercase leading-none">Total Price</span>
                        <span className="text-sm font-bold text-primary font-mono mt-0.5 block">₱{overallTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-8.5 text-xs font-semibold">
                            Cancel
                        </Button>
                        <Button onClick={onAddToCart} className="h-8.5 text-xs font-bold px-5 bg-primary text-primary-foreground shadow-xs">
                            {isEditing ? 'Update cart item' : 'Add configuration to cart'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
