import { formatCurrency, getFileUrl, handleProductImageError } from '#/utils/helper.ts';
import { Trash2, Plus, Minus, Coffee, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '#/components/ui/button.tsx';
import { Checkbox } from '#/components/ui/checkbox.tsx';
import { getModifierGroups } from '#/api/modifiers.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { ICartItemResponse } from '../customer.types.ts';

interface CartItemRowProps {
    item: ICartItemResponse;
    isSelected: boolean;
    onToggleSelect: () => void;
    onQuantityChange: (item: ICartItemResponse, newQuantity: number) => Promise<void>;
    onRemoveClick: (item: ICartItemResponse) => void;
    selectedModifierIds: string[];
    onModifiersChange: (selectedIds: string[], groups: any[]) => void;
    stock?: number | 'Unlimited' | null;
    isStockExceeded?: boolean;
}

export default function CartItemRow({
    item,
    isSelected,
    onToggleSelect,
    onQuantityChange,
    onRemoveClick,
    selectedModifierIds,
    onModifiersChange,
    stock,
    isStockExceeded = false
}: CartItemRowProps) {
    const product = item.productVariant.product;

    // Fetch product modifier groups
    const { data: modifierGroupsResponse } = useQuery({
        queryKey: [QUERY_KEY.PRODUCTS.MODIFIERS_FOR_CART_ITEM, product.id],
        queryFn: () => getModifierGroups({ productId: product.id, limit: 50 }),
        enabled: !!product.id
    });

    const modifierGroups = modifierGroupsResponse?.data || [];

    // Calculate dynamic modifiers price addition
    const modifiersPrice = modifierGroups.reduce((sum: number, group: any) => {
        return (
            sum +
            group.options.reduce((optSum: number, opt: any) => {
                return optSum + (selectedModifierIds.includes(opt.id) ? opt.price : 0);
            }, 0)
        );
    }, 0);

    const variantLabel =
        item.productVariant.attributes.length === 0 ? 'Regular' : item.productVariant.attributes.map((attr) => attr.attributeValue.value).join(' / ');

    const isOutOfStock = stock === 0;

    return (
        <div
            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                isOutOfStock || isStockExceeded
                    ? 'border-destructive/60 bg-destructive/5 hover:bg-destructive/10'
                    : 'border-border/40 bg-card hover:shadow-xs'
            }`}
        >
            {/* Selection Checkbox */}
            <div className="flex items-center justify-center shrink-0">
                <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} aria-label={`Select ${product.name}`} />
            </div>

            {/* Photo */}
            <div className="size-16 sm:size-20 rounded-xl overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0 relative">
                {product.photo ? (
                    <img
                        src={getFileUrl(product.photo)}
                        alt={product.name}
                        onError={handleProductImageError}
                        className={`h-full w-full object-cover ${isOutOfStock ? 'grayscale opacity-60' : ''}`}
                    />
                ) : (
                    <Coffee className="size-8 text-muted-foreground/40" />
                )}
                {isOutOfStock && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                        <span className="text-[10px] font-black uppercase text-destructive tracking-tight px-1 text-center leading-none">
                            Out of Stock
                        </span>
                    </div>
                )}
            </div>

            {/* Product details */}
            <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-primary uppercase">{product.category?.name || 'Beverage'}</div>
                <h3 className="text-sm sm:text-base font-bold text-foreground truncate mt-0.5">{product.name || 'Unknown Item'}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{variantLabel}</p>

                {/* Live Stock Level Indicator */}
                {isOutOfStock ? (
                    <div className="text-xs font-bold text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="size-3.5 shrink-0" />
                        Out of stock
                    </div>
                ) : isStockExceeded ? (
                    <div className="text-xs font-bold text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="size-3.5 shrink-0" />
                        Selected quantity exceeds inventory (Only {stock} available)
                    </div>
                ) : typeof stock === 'number' && stock <= 10 ? (
                    <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1">Only {stock} left in stock</div>
                ) : typeof stock === 'number' ? (
                    <div className="text-xs text-muted-foreground mt-1">{stock} available</div>
                ) : null}

                <div className="text-xs font-semibold text-foreground mt-1 sm:hidden">{formatCurrency(item.unitPrice + modifiersPrice)}</div>
                {item.notes && (
                    <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md font-medium mt-1.5 inline-block italic">
                        Note: {item.notes}
                    </div>
                )}

                {/* Customize Section */}
                {modifierGroups.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-border/20 space-y-2">
                        {modifierGroups.map((group: any) => (
                            <div key={group.id} className="space-y-1">
                                <span className="text-xs font-bold text-muted-foreground uppercase block">{group.name}</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {group.options.map((opt: any) => {
                                        const isChecked = selectedModifierIds.includes(opt.id);
                                        const isModifierOos = opt.maxProduceable === 0;
                                        return (
                                            <Button
                                                key={opt.id}
                                                type="button"
                                                variant={isChecked ? 'default' : 'outline'}
                                                disabled={isModifierOos}
                                                onClick={() => {
                                                    if (isModifierOos) {
                                                        toast.warning(`${opt.name} is currently out of stock.`);
                                                        return;
                                                    }
                                                    const groupOptionIds = group.options.map((o: any) => o.id);
                                                    const maxSelect = group.maxSelect || 1;
                                                    const isRequired = group.isRequired || false;

                                                    let nextIds: string[];
                                                    if (maxSelect === 1) {
                                                        const filtered = selectedModifierIds.filter((id) => !groupOptionIds.includes(id));
                                                        if (isChecked) {
                                                            nextIds = isRequired ? selectedModifierIds : filtered;
                                                        } else {
                                                            nextIds = [...filtered, opt.id];
                                                        }
                                                    } else {
                                                        if (isChecked) {
                                                            nextIds = selectedModifierIds.filter((id) => id !== opt.id);
                                                        } else {
                                                            const currentSelectedFromGroup = selectedModifierIds.filter((id) =>
                                                                groupOptionIds.includes(id)
                                                            );
                                                            if (currentSelectedFromGroup.length >= maxSelect) {
                                                                toast.warning(`You can select at most ${maxSelect} option(s) for ${group.name}.`);
                                                                return;
                                                            }
                                                            nextIds = [...selectedModifierIds, opt.id];
                                                        }
                                                    }
                                                    onModifiersChange(nextIds, modifierGroups);
                                                }}
                                                className={`h-6 text-xs font-semibold py-0 px-2 rounded-md transition-all shadow-3xs ${
                                                    isModifierOos ? 'opacity-40 cursor-not-allowed line-through' : ''
                                                }`}
                                            >
                                                {opt.name} (+{formatCurrency(opt.price)}){isModifierOos && ' (OOS)'}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right action area / Prices */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 shrink-0 self-start sm:self-center">
                {/* Price per unit (desktop only) */}
                <div className="hidden sm:block text-sm font-medium text-muted-foreground">{formatCurrency(item.unitPrice + modifiersPrice)}</div>

                {/* Quantity controls */}
                <div className="flex items-center gap-1 border border-border/60 rounded-lg p-0.5 bg-card">
                    <Button variant="ghost" size="sm" onClick={() => onQuantityChange(item, item.quantity - 1)} className="h-7 w-7 rounded-md p-0">
                        <Minus className="size-3" />
                    </Button>
                    <span
                        className={`w-6 text-center text-xs font-bold ${isStockExceeded || isOutOfStock ? 'text-destructive font-black' : 'text-foreground'}`}
                    >
                        {item.quantity}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={isOutOfStock || (typeof stock === 'number' && item.quantity >= stock)}
                        onClick={() => {
                            if (typeof stock === 'number' && item.quantity >= stock) {
                                toast.warning(`Cannot exceed available stock (${stock} units)`);
                                return;
                            }
                            onQuantityChange(item, item.quantity + 1);
                        }}
                        className="h-7 w-7 rounded-md p-0 disabled:opacity-40"
                    >
                        <Plus className="size-3" />
                    </Button>
                </div>

                {/* Total item price */}
                <div className="text-sm sm:text-base font-bold text-foreground w-16 text-right">
                    {formatCurrency((item.unitPrice + modifiersPrice) * item.quantity)}
                </div>

                {/* Delete item button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveClick(item)}
                    className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                >
                    <Trash2 className="size-4" />
                </Button>
            </div>
        </div>
    );
}
