import { formatCurrency } from '#/utils/helper.ts';
import { CreditCard, AlertTriangle } from 'lucide-react';
import { Button } from '#/components/ui/button.tsx';

interface CartSummaryProps {
    totalAmount: number;
    onCheckout: () => void;
    disabled: boolean;
    hasStockIssues?: boolean;
}

export default function CartSummary({ totalAmount, onCheckout, disabled, hasStockIssues }: CartSummaryProps) {
    return (
        <div className="h-fit rounded-2xl border border-border/40 bg-card p-6 shadow-xs space-y-6">
            <h2 className="text-lg font-bold text-foreground">Order Summary</h2>

            <div className="space-y-3 pt-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-semibold text-foreground">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="border-t border-border/40 pt-3 flex justify-between">
                    <span className="text-base font-bold text-foreground">Total</span>
                    <span className="text-lg font-bold text-foreground">{formatCurrency(totalAmount)}</span>
                </div>
            </div>

            {hasStockIssues && (
                <div className="bg-destructive/10 text-destructive border border-destructive/20 text-xs p-3 rounded-xl font-medium flex items-center gap-2">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>Selected items exceed available inventory. Please adjust quantities.</span>
                </div>
            )}

            <Button
                size="lg"
                onClick={onCheckout}
                disabled={disabled || totalAmount === 0}
                className={`w-full h-12 rounded-xl gap-2 font-bold shadow-md transition-all disabled:opacity-50 disabled:pointer-events-none ${
                    hasStockIssues ? 'bg-destructive/90 hover:bg-destructive shadow-destructive/20' : 'shadow-primary/20 hover:shadow-lg'
                }`}
            >
                <CreditCard className="size-4.5" />
                {disabled
                    ? 'Checking Stock...'
                    : hasStockIssues
                      ? 'Adjust Items to Checkout'
                      : totalAmount === 0
                        ? 'Select Items to Checkout'
                        : 'Proceed to Checkout'}
            </Button>
        </div>
    );
}
