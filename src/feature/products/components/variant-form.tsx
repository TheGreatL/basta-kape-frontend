import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAttributesList, getAttributeValuesList } from '#/api/product-settings.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Label } from '#/components/ui/label.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import type { IAttribute, IAttributeValue } from '#/feature/product-settings/product-settings-types.ts';

interface VariantFormProps {
    initialSku?: string | null;
    initialPrice?: number;
    initialValueIds?: string[];
    onSubmit: (data: { sku: string | null; price: number; attributeValueIds: string[] }) => void;
    onCancel: () => void;
    isPending?: boolean;
    submitLabel?: string;
}

export function VariantForm({
    initialSku = '',
    initialPrice = 0,
    initialValueIds = [],
    onSubmit,
    onCancel,
    isPending = false,
    submitLabel = 'Add Variant'
}: VariantFormProps) {
    const [sku, setSku] = React.useState(initialSku || '');
    const [price, setPrice] = React.useState(initialPrice);
    // Maps attributeId -> attributeValueId
    const [selectedValues, setSelectedValues] = React.useState<Record<string, string>>({});

    // Fetch active attributes
    const { data: attributesData, isLoading: isAttributesLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTES_LIST, { limit: 50, status: 'active' }],
        queryFn: () => getAttributesList({ page: 1, limit: 50, status: 'active' })
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Collect all non-empty selected value IDs
        const attributeValueIds = Object.values(selectedValues).filter(Boolean);
        onSubmit({
            sku: sku.trim() || null,
            price: Number(price) || 0,
            attributeValueIds
        });
    };

    return (
        <form onSubmit={handleSubmit} className="border border-primary/20 bg-primary/5 p-4 rounded-xl space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary/80">Configure Variant</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground/80">SKU (Optional)</Label>
                    <Input
                        placeholder="e.g. LAT-LRG-OAT"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        className="h-8 text-xs bg-background"
                        disabled={isPending}
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground/80">Price (Required)</Label>
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value) || 0)}
                        className="h-8 text-xs bg-background"
                        required
                        disabled={isPending}
                    />
                </div>
            </div>

            {/* Dynamic Attributes select list */}
            {isAttributesLoading ? (
                <div className="flex items-center gap-2 py-2">
                    <Spinner className="size-3 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Loading option modifiers...</span>
                </div>
            ) : (
                attributesData &&
                attributesData.data.length > 0 && (
                    <div className="space-y-3 pt-1 border-t border-border/40">
                        <span className="text-xs font-semibold text-muted-foreground block uppercase">Option Mappings</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {attributesData.data.map((attr: IAttribute) => (
                                <AttributeSelector
                                    key={attr.id}
                                    attributeId={attr.id}
                                    attributeName={attr.name}
                                    initialValueIds={initialValueIds}
                                    selectedValue={selectedValues[attr.id] || ''}
                                    onChange={(valId) => {
                                        setSelectedValues((prev) => ({
                                            ...prev,
                                            [attr.id]: valId
                                        }));
                                    }}
                                    disabled={isPending}
                                />
                            ))}
                        </div>
                    </div>
                )
            )}

            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs" disabled={isPending}>
                    Cancel
                </Button>
                <Button type="submit" size="sm" className="h-8 text-xs" disabled={isPending}>
                    {isPending ? <Spinner className="size-3 mr-1" /> : null}
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}

// Subcomponent to fetch values list for specific attribute and render Select options
interface AttributeSelectorProps {
    attributeId: string;
    attributeName: string;
    initialValueIds: string[];
    selectedValue: string;
    onChange: (valId: string) => void;
    disabled?: boolean;
}

function AttributeSelector({ attributeId, attributeName, initialValueIds, selectedValue, onChange, disabled = false }: AttributeSelectorProps) {
    const { data: valuesData, isLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTE_VALUES_LIST, attributeId],
        queryFn: () => getAttributeValuesList(attributeId)
    });

    const hasPopulatedInitial = React.useRef(false);

    // Populate initial value matching this attribute's values if present
    React.useEffect(() => {
        if (valuesData && initialValueIds.length > 0 && !hasPopulatedInitial.current) {
            const match = valuesData.data.find((v: IAttributeValue) => initialValueIds.includes(v.id));
            if (match) {
                onChange(match.id);
            }
            hasPopulatedInitial.current = true;
        }
    }, [valuesData, initialValueIds, onChange]);

    if (isLoading) {
        return (
            <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{attributeName}</Label>
                <div className="h-8 bg-background border rounded-md flex items-center justify-center">
                    <Spinner className="size-3 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground/80">{attributeName}</Label>
            <Select value={selectedValue || 'none'} onValueChange={(val) => onChange(val === 'none' ? '' : val)} disabled={disabled}>
                <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder={`Select ${attributeName}`} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">No modifier selected</SelectItem>
                    {valuesData?.data.map((val: IAttributeValue) => (
                        <SelectItem key={val.id} value={val.id}>
                            {val.value}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

export default VariantForm;
