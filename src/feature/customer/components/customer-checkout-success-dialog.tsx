import { CheckCircle2, Printer, FileText, Download, ArrowRight, Wallet, CreditCard, Coins, Landmark } from 'lucide-react';
import type { IOrder } from '#/feature/order/order.types.ts';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Button } from '#/components/ui/button.tsx';
import { printReceiptHtml, openReceiptPdf, downloadReceiptPdf } from '#/utils/receipt';
import { Badge } from '#/components/ui/badge.tsx';

interface CustomerCheckoutSuccessDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: IOrder | null;
    paymentMethod: string;
    onClose: () => void;
}

export default function CustomerCheckoutSuccessDialog({ open, onOpenChange, order, paymentMethod, onClose }: CustomerCheckoutSuccessDialogProps) {
    if (!order) return null;

    const getMethodIcon = (method: string) => {
        switch (method) {
            case 'CASH':
                return <Coins className="size-4 text-emerald-600 dark:text-emerald-400" />;
            case 'GCASH':
                return <Wallet className="size-4 text-blue-600 dark:text-blue-400" />;
            case 'PAYMAYA':
                return <Landmark className="size-4 text-teal-600 dark:text-teal-400" />;
            case 'CREDIT_CARD':
            case 'CARD':
                return <CreditCard className="size-4 text-purple-600 dark:text-purple-400" />;
            default:
                return <CheckCircle2 className="size-4 text-muted-foreground" />;
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(val) => {
                onOpenChange(val);
                if (!val) onClose();
            }}
        >
            <DialogContent className="max-w-md bg-background border-border/60 rounded-2xl p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="px-6 pt-6 pb-2 text-center flex flex-col items-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-3 animate-in zoom-in duration-300">
                        <CheckCircle2 className="h-8 w-8 animate-pulse" />
                    </div>
                    <DialogTitle className="text-xl font-bold text-foreground">Order Placed Successfully!</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Your order has been queued for barista preparation.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-4 space-y-4">
                    {/* Queue Number Showcase */}
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-center space-y-1">
                        <span className="text-xs uppercase font-bold text-muted-foreground block">Queue Ticket Number</span>
                        <span className="text-4xl font-bold text-primary font-mono block">{order.queueNumber}</span>
                        <div className="flex justify-center gap-1.5 pt-1.5">
                            <Badge
                                variant="secondary"
                                className="text-xs font-semibold px-2 py-0 uppercase bg-primary/10 text-primary border border-primary/20"
                            >
                                {order.orderType.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline" className="text-xs font-semibold px-2 py-0 capitalize bg-background/50 text-muted-foreground">
                                {order.customerName || 'Customer'}
                            </Badge>
                        </div>
                    </div>

                    {/* Computation details */}
                    <div className="border border-border/60 rounded-xl p-3.5 bg-card text-xs space-y-2.5">
                        <div className="flex justify-between font-medium text-muted-foreground">
                            <span>Subtotal:</span>
                            <span className="text-foreground/85 font-semibold">₱{order.subtotal.toFixed(2)}</span>
                        </div>
                        {order.discountAmount > 0 && (
                            <div className="flex justify-between font-medium text-rose-600 dark:text-rose-400">
                                <span>Discount Amount:</span>
                                <span className="font-semibold">-₱{order.discountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-foreground border-t border-dashed border-border/40 pt-2 text-sm">
                            <span>Total Amount Due:</span>
                            <span className="text-primary font-bold">₱{order.netTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Payment details */}
                    <div className="border border-border/60 rounded-xl p-3.5 bg-muted/5 text-xs space-y-2.5">
                        <div className="flex justify-between items-center font-medium text-muted-foreground">
                            <span>Payment Method:</span>
                            <span className="text-foreground font-semibold flex items-center gap-1.5">
                                {getMethodIcon(paymentMethod)}
                                {paymentMethod === 'CASH'
                                    ? order.orderType === 'DELIVERY'
                                        ? 'Cash on Delivery (COD)'
                                        : 'Cash at Counter'
                                    : paymentMethod}
                            </span>
                        </div>
                    </div>

                    {/* Print/View actions */}
                    <div className="space-y-2 pt-1">
                        <span className="text-xs uppercase font-bold text-muted-foreground  block mb-1">Receipt Actions</span>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => printReceiptHtml(order.id)}
                                className="h-9.5 text-xs font-bold gap-1.5 border-primary/20 hover:border-primary/40 hover:bg-primary/5 text-primary cursor-pointer"
                            >
                                <Printer className="size-4 shrink-0" />
                                Thermal Print (HTML)
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => openReceiptPdf(order.id)}
                                className="h-9.5 text-xs font-bold gap-1.5 border-border/60 cursor-pointer"
                            >
                                <FileText className="size-4 shrink-0" />
                                Open PDF
                            </Button>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => downloadReceiptPdf(order.id, order.queueNumber)}
                            className="w-full h-8 text-2xs text-muted-foreground hover:text-foreground font-semibold gap-1 cursor-pointer"
                        >
                            <Download className="size-3.5 shrink-0" />
                            Download PDF Receipt File
                        </Button>
                    </div>
                </div>

                <DialogFooter className="px-6 py-3 border-t bg-muted/30">
                    <Button
                        type="button"
                        onClick={onClose}
                        className="w-full h-9.5 gap-1.5 text-xs font-bold bg-primary text-primary-foreground shadow-sm hover:shadow-md cursor-pointer"
                    >
                        Track Order Details
                        <ArrowRight className="size-4 shrink-0" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
