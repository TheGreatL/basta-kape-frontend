import { CreditCard } from 'lucide-react';
import { Button } from '#/components/ui/button.tsx';

interface CartSummaryProps {
    totalAmount: number;
    onCheckout: () => void;
    disabled: boolean;
}

export default function CartSummary({ totalAmount, onCheckout, disabled }: CartSummaryProps) {
    return (
        <div className="h-fit rounded-2xl border border-border/40 bg-card p-6 shadow-xs space-y-6">
            <h2 className="text-lg font-bold text-foreground">Order Summary</h2>

            <div className="space-y-3 pt-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-semibold text-foreground">₱{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Shipping / Delivery</span>
                    <span className="font-semibold text-foreground">Free</span>
                </div>
                <div className="border-t border-border/40 pt-3 flex justify-between">
                    <span className="text-base font-bold text-foreground">Total</span>
                    <span className="text-lg font-bold text-foreground">₱{totalAmount.toFixed(2)}</span>
                </div>
            </div>

            <Button
                size="lg"
                onClick={onCheckout}
                disabled={disabled || totalAmount === 0}
                className="w-full h-12 rounded-xl gap-2 font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
                <CreditCard className="size-4.5" />
                {disabled ? 'Updating Cart...' : totalAmount === 0 ? 'Select Items to Checkout' : 'Proceed to Checkout'}
            </Button>
        </div>
    );
}
