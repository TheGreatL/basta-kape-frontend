import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import type { IDiscount } from '../../store-settings/discounts.types';

interface DiscountSelectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    discountsData: IDiscount[] | undefined;
    onApplyDiscount: (discount: IDiscount) => void;
}

export default function DiscountSelectDialog({ open, onOpenChange, discountsData, onApplyDiscount }: DiscountSelectDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-background border-border/60 rounded-2xl p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-2 border-b border-border/40">
                    <DialogTitle className="text-base font-bold text-foreground">Apply Store Discount</DialogTitle>
                    <DialogDescription className="text-xs">Select an active promotional, member, or special regulatory discount.</DialogDescription>
                </DialogHeader>

                <div className="px-6 py-4 max-h-[300px] overflow-y-auto text-left">
                    {!discountsData || discountsData.filter((d) => d.isActive).length === 0 ? (
                        <p className="text-xs text-muted-foreground italic text-center py-6">No active discounts configurations found.</p>
                    ) : (
                        <div className="space-y-2">
                            {discountsData
                                .filter((d) => d.isActive)
                                .map((discount) => (
                                    <button
                                        key={discount.id}
                                        type="button"
                                        onClick={() => onApplyDiscount(discount)}
                                        className="w-full p-3 rounded-xl border border-border/50 hover:border-primary/40 bg-card hover:bg-primary/5 text-left flex items-center justify-between transition-all cursor-pointer group"
                                    >
                                        <div>
                                            <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
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
                                ))}
                        </div>
                    )}
                </div>

                <DialogFooter className="px-6 py-3 border-t bg-muted/20 shrink-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-8.5 text-xs font-semibold">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
