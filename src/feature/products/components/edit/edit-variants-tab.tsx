import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Layers, Plus, Save, ChefHat, Trash2, Sparkles, ChevronDown, ChevronUp, Edit2, SlidersHorizontal, Check, AlertTriangle } from 'lucide-react';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Checkbox } from '#/components/ui/checkbox.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '#/components/ui/collapsible.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { getAttributeValuesList } from '#/api/product-settings.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { IAttribute } from '#/feature/product-settings/product-settings-types.ts';

export interface IGridVariant {
    id?: string;
    sku: string;
    price: number;
    attributeValueIds: string[];
    attributeValueLabels: string[];
    recipeConfigured: boolean;
}

interface EditVariantsTabProps {
    gridVariants: IGridVariant[];
    setGridVariants: React.Dispatch<React.SetStateAction<IGridVariant[]>>;
    onSaveVariants: () => void;
    isSaving: boolean;
    onOpenRecipe: (variant: IGridVariant) => void;
    // Matrix generator props
    attributesData?: { data: IAttribute[] };
    activeAttributes: Record<string, boolean>;
    setActiveAttributes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    selectedValuesMap: Record<string, Array<{ id: string; value: string }>>;
    setSelectedValuesMap: React.Dispatch<React.SetStateAction<Record<string, Array<{ id: string; value: string }>>>>;
    defaultPrice: number;
    setDefaultPrice: (val: number) => void;
    skuPrefix: string;
    setSkuPrefix: (val: string) => void;
    onGenerateMatrix: () => void;
    // Bulk actions
    bulkPriceInput: string;
    setBulkPriceInput: (val: string) => void;
    onApplyBulkPrice: () => void;
    bulkSkuPrefixInput: string;
    setBulkSkuPrefixInput: (val: string) => void;
    onApplyBulkSku: () => void;
}

export default function EditVariantsTab({
    gridVariants,
    setGridVariants,
    onSaveVariants,
    isSaving,
    onOpenRecipe,
    attributesData,
    activeAttributes,
    setActiveAttributes,
    selectedValuesMap,
    setSelectedValuesMap,
    defaultPrice,
    setDefaultPrice,
    skuPrefix,
    setSkuPrefix,
    onGenerateMatrix,
    bulkPriceInput,
    setBulkPriceInput,
    onApplyBulkPrice,
    bulkSkuPrefixInput,
    setBulkSkuPrefixInput,
    onApplyBulkSku
}: EditVariantsTabProps) {
    const [isMatrixOpen, setIsMatrixOpen] = React.useState(false);
    const [editingRowIdx, setEditingRowIdx] = React.useState<number | null>(null);

    // Track duplicate combination row indices
    const duplicateRowIndices = React.useMemo(() => {
        const counts = new Map<string, number[]>();
        gridVariants.forEach((row, i) => {
            const key = [...row.attributeValueIds].sort().join(':');
            const list = counts.get(key) || [];
            list.push(i);
            counts.set(key, list);
        });

        const duplicates = new Set<number>();
        counts.forEach((indices) => {
            if (indices.length > 1) {
                indices.forEach((idx) => duplicates.add(idx));
            }
        });
        return duplicates;
    }, [gridVariants]);

    // Track unconfigured row indices (missing selected attributes)
    const invalidRowIndices = React.useMemo(() => {
        const invalid = new Set<number>();
        gridVariants.forEach((row, i) => {
            if (row.attributeValueIds.length === 0) {
                invalid.add(i);
            }
        });
        return invalid;
    }, [gridVariants]);

    return (
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-6">
            {/* Header & Quick Action */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-3 gap-2">
                <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 uppercase">
                        <Layers className="size-4 text-primary" />
                        Drink Variants & Recipe Mapping
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Set fulfillment prices, SKUs, and map ingredient recipes for inventory deduction per drink size.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        onClick={onSaveVariants}
                        disabled={isSaving || duplicateRowIndices.size > 0 || invalidRowIndices.size > 0}
                        className="h-9 px-4 text-xs font-bold gap-1.5 shadow-sm"
                    >
                        {isSaving ? (
                            <>
                                <Spinner className="size-4 animate-spin" /> Saving...
                            </>
                        ) : (
                            <>
                                <Save className="size-4" /> Save Variants Matrix
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Warning Callouts */}
            {invalidRowIndices.size > 0 && (
                <div className="bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50 p-3 rounded-xl flex items-center gap-2.5 text-xs text-amber-700 dark:text-amber-400 font-semibold shadow-2xs">
                    <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                        Variant row(s) missing attribute selection detected (highlighted in yellow). Every drink variant must have at least one
                        attribute selected before saving.
                    </span>
                </div>
            )}

            {duplicateRowIndices.size > 0 && (
                <div className="bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50 p-3 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-400 font-semibold shadow-2xs">
                    <AlertTriangle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>
                        Duplicate variant combinations detected (highlighted in red). Each drink variant combination must be unique. Please change
                        attributes or remove duplicate rows before saving.
                    </span>
                </div>
            )}

            {/* Active Variants Table */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-foreground/80 uppercase">Configured Variants ({gridVariants.length})</h4>

                    {/* Bulk price / SKU tools */}
                    {gridVariants.length > 1 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1">
                                <Input
                                    type="number"
                                    placeholder="Bulk Price"
                                    value={bulkPriceInput}
                                    onChange={(e) => setBulkPriceInput(e.target.value)}
                                    className="h-7 text-xs w-[90px] bg-background/50"
                                />
                                <Button type="button" variant="outline" size="xs" onClick={onApplyBulkPrice} className="h-7 text-xs">
                                    Apply All
                                </Button>
                            </div>
                            <div className="flex items-center gap-1">
                                <Input
                                    placeholder="SKU Prefix"
                                    value={bulkSkuPrefixInput}
                                    onChange={(e) => setBulkSkuPrefixInput(e.target.value)}
                                    className="h-7 text-xs w-[100px] bg-background/50"
                                />
                                <Button type="button" variant="outline" size="xs" onClick={onApplyBulkSku} className="h-7 text-xs">
                                    Prefix All
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border border-border/40 rounded-xl overflow-hidden shadow-3xs bg-background/50">
                    <Table className="text-xs">
                        <TableHeader className="bg-muted/20">
                            <TableRow>
                                <TableHead className="font-bold text-foreground/80">Variant Combination</TableHead>
                                <TableHead className="font-bold text-foreground/80 w-[150px]">SKU Code</TableHead>
                                <TableHead className="font-bold text-foreground/80 w-[140px]">Price (₱)</TableHead>
                                <TableHead className="font-bold text-foreground/80 text-center w-[160px]">Recipe</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {gridVariants.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                                        No variants configured. Add a row below or open the Advanced Matrix Generator.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                gridVariants.map((row, idx) => {
                                    const isDuplicate = duplicateRowIndices.has(idx);
                                    const isInvalid = row.attributeValueIds.length === 0;

                                    return (
                                        <TableRow
                                            key={idx}
                                            className={
                                                isDuplicate
                                                    ? 'bg-rose-500/10 dark:bg-rose-950/20 hover:bg-rose-500/15 border-l-4 border-l-rose-500'
                                                    : isInvalid
                                                      ? 'bg-amber-500/10 dark:bg-amber-950/20 hover:bg-amber-500/15 border-l-4 border-l-amber-500'
                                                      : 'hover:bg-muted/10'
                                            }
                                        >
                                            <TableCell className="font-semibold text-foreground/90">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {row.attributeValueLabels.length > 0 ? (
                                                            row.attributeValueLabels.map((lbl, i) => (
                                                                <Badge
                                                                    key={i}
                                                                    variant={isDuplicate ? 'destructive' : 'secondary'}
                                                                    className="text-xs px-2 py-0.5 font-bold"
                                                                >
                                                                    {lbl}
                                                                </Badge>
                                                            ))
                                                        ) : (
                                                            <Badge
                                                                variant="outline"
                                                                className="text-xs px-2 py-0.5 font-bold bg-amber-500/10 text-amber-700 border-amber-500/40 dark:text-amber-400"
                                                            >
                                                                <AlertTriangle className="size-3 mr-1 text-amber-600 dark:text-amber-400" />
                                                                Select Attribute Required
                                                            </Badge>
                                                        )}

                                                        {isDuplicate && (
                                                            <Badge variant="destructive" className="text-xs px-1.5 py-0 uppercase">
                                                                Duplicate
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant={isInvalid ? 'default' : 'ghost'}
                                                        size="sm"
                                                        onClick={() => setEditingRowIdx(idx)}
                                                        className={
                                                            isInvalid
                                                                ? 'h-7 px-2.5 text-xs font-bold gap-1 bg-amber-600 hover:bg-amber-700 text-white shadow-2xs animate-pulse'
                                                                : 'h-6 px-1.5 text-xs text-muted-foreground hover:text-primary gap-1'
                                                        }
                                                        title="Configure Row Attributes"
                                                    >
                                                        <Edit2 className="size-3" /> Select Attributes
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={row.sku}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setGridVariants((prev) => prev.map((r, i) => (i === idx ? { ...r, sku: val } : r)));
                                                    }}
                                                    placeholder="SKU"
                                                    className="h-8 text-xs font-mono bg-background/50"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="relative">
                                                    <span className="absolute left-2.5 top-2 text-xs text-muted-foreground">₱</span>
                                                    <Input
                                                        type="number"
                                                        value={row.price || ''}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setGridVariants((prev) => prev.map((r, i) => (i === idx ? { ...r, price: val } : r)));
                                                        }}
                                                        placeholder="0.00"
                                                        className="h-8 text-xs font-bold pl-6 bg-background/50"
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-xs font-semibold px-2 py-0.5 ${
                                                            row.recipeConfigured
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                                        }`}
                                                    >
                                                        <ChefHat className="size-2.5 mr-1" />
                                                        {row.recipeConfigured ? 'Configured' : 'No Recipe'}
                                                    </Badge>

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="xs"
                                                        onClick={() => onOpenRecipe(row)}
                                                        className="h-6 text-xs px-2 font-semibold border-border/70 hover:bg-muted"
                                                    >
                                                        {row.recipeConfigured ? 'Edit' : 'Setup'}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setGridVariants((prev) => prev.filter((_, i) => i !== idx))}
                                                    className="size-7 text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex items-center justify-between pt-1">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const newIdx = gridVariants.length;
                            setGridVariants((prev) => [
                                ...prev,
                                {
                                    sku: '',
                                    price: 0,
                                    attributeValueIds: [],
                                    attributeValueLabels: [],
                                    recipeConfigured: false
                                }
                            ]);
                            setEditingRowIdx(newIdx);
                        }}
                        className="h-8 text-xs gap-1 border-dashed text-muted-foreground hover:text-foreground font-semibold"
                    >
                        <Plus className="size-3.5" /> Add Manual Variant Row
                    </Button>
                </div>
            </div>

            {/* Collapsible Advanced Matrix Generator */}
            <Collapsible
                open={isMatrixOpen}
                onOpenChange={setIsMatrixOpen}
                className="border border-border/50 rounded-xl overflow-hidden bg-muted/10"
            >
                <CollapsibleTrigger asChild>
                    <button type="button" className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-2">
                            <Sparkles className="size-4 text-primary" />
                            <div>
                                <span className="text-xs font-bold text-foreground">Advanced Variant Matrix Generator</span>
                                <span className="text-xs text-muted-foreground block">
                                    Generate multiple combinations at once (e.g. Size × Temperature).
                                </span>
                            </div>
                        </div>
                        {isMatrixOpen ? (
                            <ChevronUp className="size-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="size-4 text-muted-foreground" />
                        )}
                    </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="p-4 pt-0 space-y-4 border-t border-border/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-3">
                        {attributesData?.data.map((attr) => {
                            const isChecked = !!activeAttributes[attr.id];
                            return (
                                <div key={attr.id} className="border border-border/40 p-3 rounded-xl bg-background/60 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id={`attr-${attr.id}`}
                                            checked={isChecked}
                                            onCheckedChange={(checked) => setActiveAttributes((prev) => ({ ...prev, [attr.id]: !!checked }))}
                                        />
                                        <label htmlFor={`attr-${attr.id}`} className="text-xs font-bold text-foreground/90 cursor-pointer">
                                            {attr.name}
                                        </label>
                                    </div>

                                    {isChecked && (
                                        <AttributeValuesChecklist
                                            attributeId={attr.id}
                                            selectedValues={selectedValuesMap[attr.id] ?? []}
                                            onChange={(vals: Array<{ id: string; value: string }>) =>
                                                setSelectedValuesMap((prev) => ({ ...prev, [attr.id]: vals }))
                                            }
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/20">
                        <div className="flex items-center gap-3">
                            <div className="space-y-0.5">
                                <span className="text-xs font-bold text-muted-foreground uppercase block">Default Price</span>
                                <Input
                                    type="number"
                                    value={defaultPrice || ''}
                                    onChange={(e) => setDefaultPrice(parseFloat(e.target.value) || 0)}
                                    className="h-8 text-xs w-[110px] bg-background/50"
                                    placeholder="₱0.00"
                                />
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-xs font-bold text-muted-foreground uppercase block">SKU Prefix</span>
                                <Input
                                    value={skuPrefix}
                                    onChange={(e) => setSkuPrefix(e.target.value)}
                                    className="h-8 text-xs w-[120px] bg-background/50"
                                    placeholder="e.g. ESP"
                                />
                            </div>
                        </div>

                        <Button type="button" onClick={onGenerateMatrix} className="h-8 px-3 text-xs font-semibold gap-1.5 shadow-2xs">
                            <Sparkles className="size-3.5" /> Generate Combinations
                        </Button>
                    </div>
                </CollapsibleContent>
            </Collapsible>

            {/* Manual Variant Attribute Selector Modal */}
            {(() => {
                const editingRow = editingRowIdx !== null ? gridVariants[editingRowIdx] : undefined;
                return (
                    <ManualVariantAttributeModal
                        open={editingRowIdx !== null}
                        onOpenChange={(open) => !open && setEditingRowIdx(null)}
                        attributes={attributesData?.data ?? []}
                        initialValueIds={editingRow ? editingRow.attributeValueIds : []}
                        initialValueLabels={editingRow ? editingRow.attributeValueLabels : []}
                        gridVariants={gridVariants}
                        editingRowIdx={editingRowIdx}
                        onSave={(selected) => {
                            if (editingRowIdx !== null) {
                                const newIds = selected.map((s) => s.id);
                                const newLabels = selected.map((s) => s.value);
                                const newKey = [...newIds].sort().join(':');

                                // Check if combination already exists in another row
                                const duplicateIdx = gridVariants.findIndex((r, i) => {
                                    if (i === editingRowIdx) return false;
                                    const rKey = [...r.attributeValueIds].sort().join(':');
                                    return rKey === newKey;
                                });

                                if (duplicateIdx !== -1) {
                                    const dupName = gridVariants[duplicateIdx].attributeValueLabels.join(' • ') || 'Standard Drink';
                                    toast.error('Duplicate Combination Not Allowed', {
                                        description: `Combination "${dupName}" is already configured on Row ${duplicateIdx + 1}. Each drink variant combination must be unique.`
                                    });
                                    return;
                                }

                                setGridVariants((prev) =>
                                    prev.map((r, i) => {
                                        if (i !== editingRowIdx) return r;
                                        const defaultGeneratedSku = newLabels.length > 0 ? newLabels.join('-').toUpperCase().replace(/\s+/g, '') : '';
                                        return {
                                            ...r,
                                            attributeValueIds: newIds,
                                            attributeValueLabels: newLabels,
                                            sku: r.sku ? r.sku : defaultGeneratedSku
                                        };
                                    })
                                );
                            }
                        }}
                    />
                );
            })()}
        </div>
    );
}

interface ManualVariantAttributeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    attributes: IAttribute[];
    initialValueIds: string[];
    initialValueLabels: string[];
    gridVariants: IGridVariant[];
    editingRowIdx: number | null;
    onSave: (selected: Array<{ id: string; value: string }>) => void;
}

function ManualVariantAttributeModal({
    open,
    onOpenChange,
    attributes,
    initialValueIds,
    initialValueLabels,
    gridVariants,
    editingRowIdx,
    onSave
}: ManualVariantAttributeModalProps) {
    const [selectedAttributeMap, setSelectedAttributeMap] = React.useState<Record<string, { id: string; value: string }>>({});

    React.useEffect(() => {
        if (open) {
            setSelectedAttributeMap({});
        }
    }, [open]);

    const handleSelectValue = React.useCallback((attributeId: string, val: { id: string; value: string } | null) => {
        setSelectedAttributeMap((prev) => {
            const next = { ...prev };
            if (val === null) {
                delete next[attributeId];
            } else {
                next[attributeId] = val;
            }
            return next;
        });
    }, []);

    const handleConfirm = () => {
        const selected = Object.values(selectedAttributeMap);
        if (selected.length === 0) {
            toast.error('Attribute Required', {
                description: 'You must select at least one attribute for this variant.'
            });
            return;
        }
        onSave(selected);
        onOpenChange(false);
    };

    const selectedList = Object.values(selectedAttributeMap);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-6">
                <DialogHeader>
                    <DialogTitle className="text-sm font-bold flex items-center gap-1.5 uppercase">
                        <SlidersHorizontal className="size-4 text-primary" />
                        Select Drink Attributes
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Select 1 attribute per category (e.g. 1 Size, 1 Temperature). Taken combinations are disabled.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2 max-h-[350px] overflow-y-auto pr-1">
                    {attributes.length === 0 ? (
                        <div className="text-center py-6 text-xs text-muted-foreground italic">
                            No attributes configured. Please configure product attributes in Product Settings.
                        </div>
                    ) : (
                        attributes.map((attr) => (
                            <div key={attr.id} className="space-y-2 border border-border/40 p-3 rounded-xl bg-muted/10">
                                <span className="text-xs font-bold text-foreground block uppercase">{attr.name}</span>
                                <AttributeValuePills
                                    attributeId={attr.id}
                                    initialValueIds={initialValueIds}
                                    initialValueLabels={initialValueLabels}
                                    selectedAttributeMap={selectedAttributeMap}
                                    onSelectValue={handleSelectValue}
                                    gridVariants={gridVariants}
                                    editingRowIdx={editingRowIdx}
                                />
                            </div>
                        ))
                    )}
                </div>

                {/* Selected Preview */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Selected Combination:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                        {selectedList.length === 0 ? (
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                <AlertTriangle className="size-3" />
                                Please select at least 1 attribute value below
                            </span>
                        ) : (
                            selectedList.map((item) => (
                                <Badge key={item.id} variant="default" className="text-xs font-bold px-2 py-0.5">
                                    {item.value}
                                </Badge>
                            ))
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs font-semibold">
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleConfirm}
                        disabled={selectedList.length === 0}
                        className="h-8 text-xs font-bold gap-1 px-4"
                    >
                        <Check className="size-3.5" /> Apply Attributes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AttributeValuePills({
    attributeId,
    initialValueIds,
    initialValueLabels,
    selectedAttributeMap,
    onSelectValue,
    gridVariants,
    editingRowIdx
}: {
    attributeId: string;
    initialValueIds: string[];
    initialValueLabels: string[];
    selectedAttributeMap: Record<string, { id: string; value: string }>;
    onSelectValue: (attributeId: string, val: { id: string; value: string } | null) => void;
    gridVariants: IGridVariant[];
    editingRowIdx: number | null;
}) {
    const { data: valuesData, isLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTE_VALUES_LIST, attributeId],
        queryFn: () => getAttributeValuesList(attributeId)
    });

    // Sync initial selection when valuesData loads
    React.useEffect(() => {
        const valData = valuesData?.data;
        if (valData && initialValueIds.length > 0) {
            const match = valData.find((v) => initialValueIds.includes(v.id));
            const hasSelection = Boolean(selectedAttributeMap[attributeId]);
            if (match && !hasSelection) {
                const idx = initialValueIds.indexOf(match.id);
                onSelectValue(attributeId, { id: match.id, value: initialValueLabels[idx] ?? match.value });
            }
        }
    }, [valuesData, initialValueIds, initialValueLabels, attributeId, selectedAttributeMap, onSelectValue]);

    if (isLoading) {
        return (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Spinner className="size-3 animate-spin text-primary" /> Loading values...
            </div>
        );
    }

    if (!valuesData?.data || valuesData.data.length === 0) {
        return <span className="text-xs text-muted-foreground italic">No values defined for this attribute.</span>;
    }

    const currentSelection = selectedAttributeMap[attributeId] as { id: string; value: string } | undefined;

    return (
        <div className="flex flex-wrap gap-1.5">
            {valuesData.data.map((val) => {
                const isSelected = Boolean(currentSelection && currentSelection.id === val.id);

                // Check hypothetical combination key
                const hypotheticalMap = {
                    ...selectedAttributeMap,
                    [attributeId]: { id: val.id, value: val.value }
                };
                const hypotheticalIds = Object.values(hypotheticalMap).map((v) => v.id);
                const hypotheticalKey = [...hypotheticalIds].sort().join(':');

                const isTaken =
                    !isSelected &&
                    gridVariants.some((r, i) => {
                        if (i === editingRowIdx) return false;
                        const rKey = [...r.attributeValueIds].sort().join(':');
                        return rKey === hypotheticalKey;
                    });

                return (
                    <Button
                        key={val.id}
                        type="button"
                        size="xs"
                        variant={isSelected ? 'default' : 'outline'}
                        disabled={isTaken}
                        onClick={() => {
                            if (isSelected) {
                                onSelectValue(attributeId, null);
                            } else {
                                onSelectValue(attributeId, { id: val.id, value: val.value });
                            }
                        }}
                        className={`h-7 text-xs font-semibold rounded-lg transition-all ${
                            isSelected
                                ? 'shadow-2xs font-bold'
                                : isTaken
                                  ? 'opacity-40 cursor-not-allowed bg-muted/40 border-dashed text-muted-foreground'
                                  : 'hover:border-primary/50'
                        }`}
                        title={isTaken ? 'This combination is already configured for another variant' : undefined}
                    >
                        {isSelected && <Check className="size-3 mr-1" />}
                        {val.value}
                        {isTaken && <span className="ml-1 text-[10px] text-muted-foreground font-normal">(Taken)</span>}
                    </Button>
                );
            })}
        </div>
    );
}

function AttributeValuesChecklist({
    attributeId,
    selectedValues,
    onChange
}: {
    attributeId: string;
    selectedValues: Array<{ id: string; value: string }>;
    onChange: (vals: Array<{ id: string; value: string }>) => void;
}) {
    const { data: valuesData, isLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTE_VALUES_LIST, attributeId],
        queryFn: () => getAttributeValuesList(attributeId)
    });

    if (isLoading) {
        return (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 pl-6">
                <Spinner className="size-3 animate-spin text-primary" /> Loading values...
            </div>
        );
    }

    if (!valuesData?.data || valuesData.data.length === 0) {
        return <span className="text-xs text-muted-foreground italic pl-6 block pt-1">No values defined.</span>;
    }

    return (
        <div className="pl-6 pt-1.5 space-y-1.5">
            {valuesData.data.map((val) => {
                const isSelected = selectedValues.some((v) => v.id === val.id);
                return (
                    <div key={val.id} className="flex items-center gap-2">
                        <Checkbox
                            id={`val-${val.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                                if (checked) {
                                    onChange([...selectedValues, { id: val.id, value: val.value }]);
                                } else {
                                    onChange(selectedValues.filter((v) => v.id !== val.id));
                                }
                            }}
                        />
                        <label htmlFor={`val-${val.id}`} className="text-xs font-medium text-foreground/80 cursor-pointer">
                            {val.value}
                        </label>
                    </div>
                );
            })}
        </div>
    );
}
