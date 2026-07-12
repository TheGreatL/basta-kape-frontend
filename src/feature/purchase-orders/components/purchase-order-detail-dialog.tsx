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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '#/components/ui/dialog.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import type { IPurchaseOrder, IPurchaseOrderItem } from '#/api/purchase-orders.api.ts';

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

    // Fetch details for selected PO
    const { data: selectedPODetails, isLoading: isDetailsLoading } = useQuery({
        queryKey: [QUERY_KEY.PURCHASE_ORDERS.PURCHASE_ORDER_DETAILS, poId],
        queryFn: () => getPurchaseOrderById(poId!),
        enabled: open && !!poId
    });

    // Mutation: Update PO Status
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED' }) => updatePurchaseOrderStatus(id, status),
        onSuccess: (updatedPO) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PURCHASE_ORDERS.PURCHASE_ORDERS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.LEVELS_LIST] }); // Invalidate inventory stock levels
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PURCHASE_ORDERS.PURCHASE_ORDER_DETAILS, updatedPO.id] });
            toast.success(`Purchase order status updated to ${updatedPO.status}`);
        },
        onError: (err) => {
            toast.error('Failed to update status', {
                description: getErrorMessage(err)
            });
        }
    });

    return (
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
                                <p className="text-sm font-bold text-foreground">
                                    ₱{selectedPODetails.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
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
                                            return (
                                                <tr key={item.id} className="border-b border-border/30 last:border-0 hover:bg-muted/10 font-medium">
                                                    <td className="p-3 font-bold text-foreground">{item.ingredient.name}</td>
                                                    <td className="p-3 text-right font-mono font-bold text-foreground">
                                                        {item.quantity} {abbrev}
                                                    </td>
                                                    <td className="p-3 text-right font-mono text-muted-foreground">
                                                        ₱{item.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="p-3 text-right font-mono font-bold text-foreground">
                                                        ₱{item.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                                        onClick={() => updateStatusMutation.mutate({ id: selectedPODetails.id, status: 'RECEIVED' })}
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
    );
}
