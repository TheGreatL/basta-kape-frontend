import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Tag, CreditCard, User } from 'lucide-react';
import type { IDiscount } from '../../store-settings/discounts.types';

interface DiscountSelectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    discountsData: IDiscount[] | undefined;
    onApplyDiscount: (discount: IDiscount, referenceId?: string, referenceName?: string) => void;
    initialRefId?: string;
    initialRefName?: string;
}

export default function DiscountSelectDialog({
    open,
    onOpenChange,
    discountsData,
    onApplyDiscount,
    initialRefId = '',
    initialRefName = ''
}: DiscountSelectDialogProps) {
    const [selectedDiscount, setSelectedDiscount] = React.useState<IDiscount | null>(null);
    const [referenceId, setReferenceId] = React.useState(initialRefId);
    const [referenceName, setReferenceName] = React.useState(initialRefName);

    React.useEffect(() => {
        if (open) {
            setReferenceId(initialRefId);
            setReferenceName(initialRefName);
        } else {
            setSelectedDiscount(null);
        }
    }, [open, initialRefId, initialRefName]);

    const handleConfirmApply = () => {
        if (!selectedDiscount) return;
        onApplyDiscount(selectedDiscount, referenceId.trim() || undefined, referenceName.trim() || undefined);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-background border-border/60 rounded-2xl p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/40">
                    <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                        <Tag className="size-4 text-primary" />
                        Apply Store Discount
                    </DialogTitle>
                    <DialogDescription className="text-xs">Select an active discount and enter the reference number or card ID.</DialogDescription>
                </DialogHeader>

                <div className="px-6 py-4 max-h-[380px] overflow-y-auto space-y-4 text-left">
                    {!discountsData || discountsData.filter((d) => d.isActive).length === 0 ? (
                        <p className="text-xs text-muted-foreground italic text-center py-6">No active discounts configurations found.</p>
                    ) : (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-foreground/80 uppercase block">1. Select Discount Option</label>
                            {discountsData
                                .filter((d) => d.isActive)
                                .map((discount) => {
                                    const isSelected = selectedDiscount?.id === discount.id;
                                    return (
                                        <button
                                            key={discount.id}
                                            type="button"
                                            onClick={() => setSelectedDiscount(discount)}
                                            className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer group ${
                                                isSelected
                                                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                                                    : 'border-border/50 hover:border-primary/40 bg-card hover:bg-primary/5'
                                            }`}
                                        >
                                            <div>
                                                <span
                                                    className={`text-xs font-bold transition-colors ${
                                                        isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary'
                                                    }`}
                                                >
                                                    {discount.name}
                                                </span>
                                                <span className="text-xs text-muted-foreground block mt-0.5">Code: {discount.code || 'None'}</span>
                                            </div>
                                            <Badge
                                                variant="secondary"
                                                className="font-mono text-xs font-bold bg-primary/10 text-primary border border-primary/20"
                                            >
                                                {discount.type === 'PERCENTAGE' ? `${discount.value}%` : `₱${discount.value}`}
                                            </Badge>
                                        </button>
                                    );
                                })}
                        </div>
                    )}

                    {selectedDiscount && (
                        <div className="pt-3 border-t border-border/40 space-y-3 animate-in slide-in-from-top-2 duration-150">
                            <span className="text-xs font-bold text-foreground/80 uppercase block">2. Discount Reference Details</span>

                            <div className="space-y-1">
                                <label className="text-2xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                    <CreditCard className="size-3 text-muted-foreground" /> Reference Number / Card ID
                                </label>
                                <Input
                                    placeholder="e.g. SC-12345 or Ref/Voucher No."
                                    value={referenceId}
                                    onChange={(e) => setReferenceId(e.target.value)}
                                    className="h-8.5 text-xs bg-background/50 font-mono rounded-xl border-border/60"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-2xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                    <User className="size-3 text-muted-foreground" /> Cardholder / Reference Name (Optional)
                                </label>
                                <Input
                                    placeholder="e.g. Juan Cruz"
                                    value={referenceName}
                                    onChange={(e) => setReferenceName(e.target.value)}
                                    className="h-8.5 text-xs bg-background/50 rounded-xl border-border/60"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="px-6 py-3 border-t bg-muted/20 shrink-0 flex items-center justify-end gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-8.5 text-xs font-semibold">
                        Cancel
                    </Button>
                    <Button
                        disabled={!selectedDiscount}
                        onClick={handleConfirmApply}
                        className="h-8.5 text-xs font-bold px-4 bg-primary text-primary-foreground shadow-xs"
                    >
                        Apply Discount
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
