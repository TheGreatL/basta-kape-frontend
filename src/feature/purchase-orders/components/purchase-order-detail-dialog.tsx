import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { getPurchaseOrderById, updatePurchaseOrderStatus } from '#/api/purchase-orders.api.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Button } from '#/components/ui/button.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Checkbox } from '#/components/ui/checkbox.tsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '#/components/ui/dialog.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import type { IPurchaseOrderItem, IUpdatePurchaseOrderStatusPayload } from '#/api/purchase-orders.api.ts';

const getStatusBadgeClass = (poStatus: string) => {
    switch (poStatus) {
        case 'DRAFT':
            return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800';
        case 'SENT':
            return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40';
        case 'RECEIVED':
            return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40';
        case 'CANCELLED':
            return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40';
        default:
            return 'bg-slate-100 text-slate-700 border-slate-200';
    }
};

interface PurchaseOrderDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    poId: string | null;
}

export default function PurchaseOrderDetailDialog({ open, onOpenChange, poId }: PurchaseOrderDetailDialogProps) {
    const queryClient = useQueryClient();

    // Receive modal state & adjustments
    const [isReceiveDialogOpen, setIsReceiveDialogOpen] = React.useState(false);
    const [adjustPrices, setAdjustPrices] = React.useState(false);
    const [priceAdjustments, setPriceAdjustments] = React.useState<{ [ingredientId: string]: number }>({});

    // Fetch details for selected PO
    const { data: selectedPODetails, isLoading: isDetailsLoading } = useQuery({
        queryKey: [QUERY_KEY.PURCHASE_ORDERS.PURCHASE_ORDER_DETAILS, poId],
        queryFn: () => getPurchaseOrderById(poId!),
        enabled: open && !!poId
    });

    // Populate initial prices whenever receive modal opens
    React.useEffect(() => {
        if (isReceiveDialogOpen && selectedPODetails) {
            setAdjustPrices(false);
            const initialPrices: { [ingredientId: string]: number } = {};
            (selectedPODetails.items || []).forEach((item) => {
                initialPrices[item.ingredientId] = item.unitCost || 0;
            });
            setPriceAdjustments(initialPrices);
        }
    }, [isReceiveDialogOpen, selectedPODetails]);

    // Mutation: Update PO Status
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: IUpdatePurchaseOrderStatusPayload | 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED' }) =>
            updatePurchaseOrderStatus(id, data),
        onSuccess: (updatedPO) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PURCHASE_ORDERS.PURCHASE_ORDERS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.LEVELS_LIST] }); // Invalidate inventory stock levels
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PURCHASE_ORDERS.PURCHASE_ORDER_DETAILS, updatedPO.id] });
            toast.success(`Purchase order marked as ${updatedPO.status}`);
            setIsReceiveDialogOpen(false);
        },
        onError: (err) => {
            toast.error('Failed to update status', {
                description: getErrorMessage(err)
            });
        }
    });

    const handleConfirmReceive = () => {
        if (!selectedPODetails) return;

        if (adjustPrices) {
            const items = (selectedPODetails.items || []).map((item) => ({
                ingredientId: item.ingredientId,
                unitCost: Number(priceAdjustments[item.ingredientId] ?? 0)
            }));

            for (const item of items) {
                if (isNaN(item.unitCost) || item.unitCost < 0) {
                    toast.error('Please enter valid, non-negative unit costs for all items');
                    return;
                }
            }

            updateStatusMutation.mutate({
                id: selectedPODetails.id,
                data: {
                    status: 'RECEIVED',
                    items
                }
            });
        } else {
            updateStatusMutation.mutate({
                id: selectedPODetails.id,
                data: {
                    status: 'RECEIVED'
                }
            });
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-2xl w-full rounded-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="font-bold text-foreground flex items-center gap-2">
                            <FileText className="size-5 text-primary" />
                            Purchase Order Details
                        </DialogTitle>
                        <DialogDescription className="text-xs">Review procurement items list and coordinate status updates.</DialogDescription>
                    </DialogHeader>

                    {isDetailsLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 gap-2">
                            <span className="animate-spin text-primary size-5 border-2 border-primary border-t-transparent rounded-full" />
                            <span className="text-xs text-muted-foreground font-semibold">Loading details...</span>
                        </div>
                    ) : selectedPODetails ? (
                        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 my-2 min-h-0">
                            {/* Summary Card */}
                            <div className="p-4 bg-muted/30 border border-border/40 rounded-2xl grid grid-cols-2 gap-4">
                                <div className="space-y-0.5">
                                    <span className="text-xs uppercase font-bold text-muted-foreground">PO Number</span>
                                    <h4 className="font-mono font-bold text-sm text-foreground">{selectedPODetails.poNumber}</h4>
                                </div>
                                <div className="space-y-0.5 flex flex-col items-end">
                                    <span className="text-xs uppercase font-bold text-muted-foreground">Status</span>
                                    <Badge
                                        variant="outline"
                                        className={`text-xs font-bold py-0.5 px-2 capitalize ${getStatusBadgeClass(selectedPODetails.status)}`}
                                    >
                                        {selectedPODetails.status.toLowerCase()}
                                    </Badge>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-xs uppercase font-bold text-muted-foreground">Supplier</span>
                                    <p className="text-xs font-bold text-foreground">{selectedPODetails.supplier.name}</p>
                                </div>
                                <div className="space-y-0.5 flex flex-col items-end">
                                    <span className="text-xs uppercase font-bold text-muted-foreground">Total Amount</span>
                                    {selectedPODetails.status === 'RECEIVED' ? (
                                        <p className="text-sm font-bold text-foreground font-mono">
                                            ₱{selectedPODetails.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                    ) : selectedPODetails.status === 'CANCELLED' ? (
                                        <p className="text-sm font-bold text-muted-foreground font-mono">
                                            ₱{selectedPODetails.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                    ) : (
                                        <Badge variant="outline" className="text-xs font-semibold text-muted-foreground border-dashed bg-muted/20">
                                            Calculated upon delivery
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Additional Metadata */}
                            <div className="space-y-2 text-xs border-b border-border/30 pb-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground font-medium">Created By</span>
                                    <span className="font-bold text-foreground">
                                        {`${selectedPODetails.createdBy.firstName} ${selectedPODetails.createdBy.lastName} (@${selectedPODetails.createdBy.username})`}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground font-medium">Date Created</span>
                                    <span className="font-bold text-foreground">
                                        {format(new Date(selectedPODetails.createdAt), 'MMM dd, yyyy hh:mm a')}
                                    </span>
                                </div>
                                {selectedPODetails.orderedAt && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground font-medium">Date Sent/Ordered</span>
                                        <span className="font-bold text-foreground">
                                            {format(new Date(selectedPODetails.orderedAt), 'MMM dd, yyyy hh:mm a')}
                                        </span>
                                    </div>
                                )}
                                {selectedPODetails.receivedAt && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground font-medium">Date Received</span>
                                        <span className="font-bold text-emerald-600">
                                            {format(new Date(selectedPODetails.receivedAt), 'MMM dd, yyyy hh:mm a')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            {selectedPODetails.notes && (
                                <div className="space-y-1">
                                    <span className="text-xs uppercase font-bold text-muted-foreground">Notes</span>
                                    <p className="text-xs p-3 bg-muted/40 border border-border/20 rounded-xl text-foreground/90 italic">
                                        "{selectedPODetails.notes}"
                                    </p>
                                </div>
                            )}

                            {/* Items List */}
                            <div className="space-y-2">
                                <span className="text-xs uppercase font-bold text-muted-foreground">Procurement Line Items</span>
                                <div className="border border-border/40 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-muted/40 border-b border-border/40 font-bold text-muted-foreground">
                                                <th className="p-3">Ingredient</th>
                                                <th className="p-3 text-right">Quantity</th>
                                                <th className="p-3 text-right">Unit Cost</th>
                                                <th className="p-3 text-right">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedPODetails.items?.map((item: IPurchaseOrderItem) => {
                                                const abbrev = item.ingredient.defaultUnit?.abbreviation || '';
                                                const isPendingPrice = selectedPODetails.status === 'DRAFT' || selectedPODetails.status === 'SENT';

                                                return (
                                                    <tr
                                                        key={item.id}
                                                        className="border-b border-border/30 last:border-0 hover:bg-muted/10 font-medium"
                                                    >
                                                        <td className="p-3 font-bold text-foreground">{item.ingredient.name}</td>
                                                        <td className="p-3 text-right font-mono font-bold text-foreground">
                                                            {item.quantity} {abbrev}
                                                        </td>
                                                        <td className="p-3 text-right font-mono text-muted-foreground">
                                                            {isPendingPrice ? (
                                                                <span className="text-muted-foreground/70 italic text-xs">Pending delivery</span>
                                                            ) : (
                                                                `₱${item.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-right font-mono font-bold text-foreground">
                                                            {isPendingPrice ? (
                                                                <span className="text-muted-foreground/70 italic text-xs">—</span>
                                                            ) : (
                                                                `₱${item.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {selectedPODetails && (
                        <DialogFooter className="shrink-0 pt-4 border-t border-border/40 flex flex-wrap gap-2 justify-between items-center">
                            {/* Status transitions guard (DRAFT -> SENT -> RECEIVED) */}
                            <div className="flex gap-1.5 w-full sm:w-auto">
                                {selectedPODetails.status === 'SENT' && (
                                    <RequirePermission module="Purchase Orders Management" action="update">
                                        <Button
                                            size="sm"
                                            onClick={() => setIsReceiveDialogOpen(true)}
                                            disabled={updateStatusMutation.isPending}
                                            className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 shadow-sm"
                                        >
                                            <CheckCircle className="size-3.5" /> Mark as Received
                                        </Button>
                                    </RequirePermission>
                                )}
                            </div>

                            <Button variant="secondary" onClick={() => onOpenChange(false)} className="h-9 w-24 rounded-lg text-xs font-bold ml-auto">
                                Close
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>

            {/* Receive Order Confirmation & Price Adjustment Dialog */}
            <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
                <DialogContent className="sm:max-w-lg w-full rounded-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="font-bold text-foreground flex items-center gap-2">
                            <CheckCircle className="size-5 text-emerald-600" />
                            Receive Purchase Order
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Confirm receipt of shipment for <strong className="font-mono text-foreground">{selectedPODetails?.poNumber}</strong> and
                            update inventory stock.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 my-2">
                        {/* Notice */}
                        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">Catalog-Driven Pricing</span>
                            <p className="text-xs text-emerald-700 dark:text-emerald-400">
                                By default, unit costs and line-item totals are calculated automatically using current prices from{' '}
                                <strong className="font-semibold">{selectedPODetails?.supplier.name}</strong>'s catalog.
                            </p>
                        </div>

                        {/* Toggle Price Adjustments */}
                        <div className="flex items-center space-x-2 pt-1">
                            <Checkbox
                                id="adjust-prices"
                                checked={adjustPrices}
                                onCheckedChange={(checked) => setAdjustPrices(Boolean(checked))}
                                className="size-4"
                            />
                            <label htmlFor="adjust-prices" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                                Actual invoice prices differed from catalog (Adjust unit costs)
                            </label>
                        </div>

                        {/* Item Price Adjustment Form */}
                        {adjustPrices && (
                            <div className="space-y-2 border border-border/40 rounded-xl p-3 bg-muted/20">
                                <span className="text-xs font-bold text-foreground block">Invoice Unit Costs</span>
                                <p className="text-xs text-muted-foreground">
                                    Specify the exact unit cost on the delivery invoice for each ingredient:
                                </p>
                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                    {selectedPODetails?.items?.map((item) => {
                                        const unit = item.ingredient.defaultUnit?.abbreviation || '';
                                        return (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between gap-3 p-2 bg-background rounded-lg border border-border/40"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <span className="text-xs font-bold text-foreground block truncate">{item.ingredient.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        Qty: {item.quantity} {unit}
                                                    </span>
                                                </div>
                                                <div className="w-32 space-y-0.5 shrink-0">
                                                    <span className="text-xs font-semibold text-muted-foreground block text-right">
                                                        Unit Cost (₱)
                                                    </span>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        value={priceAdjustments[item.ingredientId] ?? ''}
                                                        onChange={(e) =>
                                                            setPriceAdjustments((prev) => ({
                                                                ...prev,
                                                                [item.ingredientId]: parseFloat(e.target.value) || 0
                                                            }))
                                                        }
                                                        className="h-8 text-xs font-bold font-mono text-right"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="shrink-0 pt-4 border-t border-border/40 gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsReceiveDialogOpen(false)}
                            className="h-9 w-24 rounded-lg text-xs font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmReceive}
                            disabled={updateStatusMutation.isPending}
                            className="h-9 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                        >
                            {updateStatusMutation.isPending
                                ? 'Processing...'
                                : adjustPrices
                                  ? 'Receive with Adjusted Prices'
                                  : 'Confirm & Receive Order'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
