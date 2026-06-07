import { Trash2, Plus, Minus, Coffee } from 'lucide-react';
import { Button } from '#/components/ui/button.tsx';
import { Checkbox } from '#/components/ui/checkbox.tsx';
import { getFileUrl } from '#/utils/helper';
import type { ICartItemResponse } from '../customer.types.ts';

interface CartItemRowProps {
    item: ICartItemResponse;
    isSelected: boolean;
    onToggleSelect: () => void;
    onQuantityChange: (item: ICartItemResponse, newQuantity: number) => Promise<void>;
    onRemoveClick: (item: ICartItemResponse) => void;
}

export default function CartItemRow({ item, isSelected, onToggleSelect, onQuantityChange, onRemoveClick }: CartItemRowProps) {
    const product = item.productVariant.product;

    const variantLabel =
        item.productVariant.attributes.length === 0 ? 'Regular' : item.productVariant.attributes.map((attr) => attr.attributeValue.value).join(' / ');

    return (
        <div className="flex items-center gap-4 p-4 rounded-2xl border border-border/40 bg-card hover:shadow-xs transition-shadow">
            {/* Selection Checkbox */}
            <div className="flex items-center justify-center shrink-0">
                <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} aria-label={`Select ${product.name}`} />
            </div>

            {/* Photo */}
            <div className="size-16 sm:size-20 rounded-xl overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0">
                {product.photo ? (
                    <img
                        src={product.photo.startsWith('http') ? product.photo : getFileUrl(product.photo)}
                        alt={product.name}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <Coffee className="size-8 text-muted-foreground/40" />
                )}
            </div>

            {/* Product details */}
            <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-primary uppercase">{product.category?.name || 'Beverage'}</div>
                <h3 className="text-sm sm:text-base font-bold text-foreground truncate mt-0.5">{product.name || 'Unknown Item'}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{variantLabel}</p>
                <div className="text-xs font-semibold text-foreground mt-1 sm:hidden">₱{item.unitPrice.toFixed(2)}</div>
            </div>

            {/* Right action area / Prices */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 shrink-0">
                {/* Price per unit (desktop only) */}
                <div className="hidden sm:block text-sm font-medium text-muted-foreground">₱{item.unitPrice.toFixed(2)}</div>

                {/* Quantity controls */}
                <div className="flex items-center gap-1 border border-border/60 rounded-lg p-0.5 bg-card">
                    <Button variant="ghost" size="sm" onClick={() => onQuantityChange(item, item.quantity - 1)} className="h-7 w-7 rounded-md p-0">
                        <Minus className="size-3" />
                    </Button>
                    <span className="w-6 text-center text-xs font-bold text-foreground">{item.quantity}</span>
                    <Button variant="ghost" size="sm" onClick={() => onQuantityChange(item, item.quantity + 1)} className="h-7 w-7 rounded-md p-0">
                        <Plus className="size-3" />
                    </Button>
                </div>

                {/* Total item price */}
                <div className="text-sm sm:text-base font-extrabold text-foreground w-16 text-right">
                    ₱{(item.unitPrice * item.quantity).toFixed(2)}
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
