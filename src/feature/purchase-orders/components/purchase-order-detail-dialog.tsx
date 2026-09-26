import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    FileText,
    CheckCircle,
    Truck,
    Plus,
    Trash2,
    History,
    AlertCircle,
    Check,
    Calendar as CalendarIcon,
    X,
    FileCheck,
    RotateCcw,
    Send
} from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import { toast } from 'sonner';

import { getPurchaseOrderById, updatePurchaseOrderStatus } from '#/api/purchase-orders.api.ts';
import { getIngredients } from '#/api/inventory.api.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Button } from '#/components/ui/button.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Checkbox } from '#/components/ui/checkbox.tsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '#/components/ui/dialog.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover.tsx';
import { Calendar } from '#/components/ui/calendar.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';
import { cn } from '#/lib/utils.ts';
import type { IPurchaseOrderItem, IPurchaseOrderBatch, IUpdatePurchaseOrderStatusPayload } from '#/api/purchase-orders.api.ts';
import type { IIngredient } from '#/feature/inventory/inventory.types';

const getStatusBadgeClass = (poStatus: string) => {
    switch (poStatus) {
        case 'DRAFT':
            return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800';
        case 'FINAL_DRAFT':
            return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/40';
        case 'SENT':
            return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40';
        case 'PARTIALLY_RECEIVED':
            return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40';
        case 'RECEIVED':
            return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40';
        case 'CANCELLED':
            return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40';
        default:
            return 'bg-slate-100 text-slate-700 border-slate-200';
    }
};

interface IOrderedReceiveItem {
    ingredientId: string;
    ingredientName: string;
    unit: string;
    orderedQty: number;
    alreadyReceivedQty: number;
    remainingQty: number;
    quantityReceiving: number | '';
    unitCost: number | '';
    batchNumber: string;
    expiryDate: string;
}

interface IBonusReceiveItem {
    id: string;
    ingredientId: string;
    ingredientName: string;
    unit: string;
    quantityReceiving: number | '';
    unitCost: number | '';
    batchNumber: string;
    expiryDate: string;
    ingredient?: IIngredient;
}

interface ExpiryDatePickerProps {
    value?: string;
    onChange: (dateStr: string) => void;
    placeholder?: string;
}

function ExpiryDatePicker({ value, onChange, placeholder = 'Pick date' }: ExpiryDatePickerProps) {
    const [open, setOpen] = React.useState(false);

    const date = React.useMemo(() => {
        if (!value) return undefined;
        const parsed = parse(value, 'yyyy-MM-dd', new Date());
        return isValid(parsed) ? parsed : undefined;
    }, [value]);

    return (
        <div className="relative w-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        className={cn(
                            'w-full h-8 pl-2.5 pr-7 justify-start text-left font-normal text-xs bg-background border-input shadow-none',
                            !date && 'text-muted-foreground'
                        )}
                    >
                        <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{date ? format(date, 'MMM dd, yyyy') : placeholder}</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(selectedDate) => {
                            onChange(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '');
                            setOpen(false);
                        }}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
            {date && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Clear date"
                    aria-label="Clear date"
                >
                    <X className="h-3 w-3" />
                </button>
            )}
        </div>
    );
}

interface PurchaseOrderDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    poId: string | null;
    initialOpenReceive?: boolean;
}

export default function PurchaseOrderDetailDialog({ open, onOpenChange, poId, initialOpenReceive = false }: PurchaseOrderDetailDialogProps) {
    const queryClient = useQueryClient();

    // Receive modal states
    const [isReceiveDialogOpen, setIsReceiveDialogOpen] = React.useState(false);
    const [deliveryRef, setDeliveryRef] = React.useState('');
    const [closeOrder, setCloseOrder] = React.useState(false);
    const [orderedItems, setOrderedItems] = React.useState<IOrderedReceiveItem[]>([]);
    const [bonusItems, setBonusItems] = React.useState<IBonusReceiveItem[]>([]);
    const hasAutoOpenedReceiveRef = React.useRef(false);

    // Fetch details for selected PO
    const { data: selectedPODetails, isLoading: isDetailsLoading } = useQuery({
        queryKey: [QUERY_KEY.PURCHASE_ORDERS.PURCHASE_ORDER_DETAILS, poId],
        queryFn: () => getPurchaseOrderById(poId!),
        enabled: open && !!poId
    });

    // Compute cumulative received quantities per ingredient from prior batches
    const receivedMap = React.useMemo(() => {
        const map: Record<string, number> = {};
        (selectedPODetails?.batches || []).forEach((batch) => {
            map[batch.ingredientId] = (map[batch.ingredientId] || 0) + batch.quantityReceived;
        });
        return map;
    }, [selectedPODetails?.batches]);

    React.useEffect(() => {
        if (!open) {
            hasAutoOpenedReceiveRef.current = false;
            setIsReceiveDialogOpen(false);
        }
    }, [open]);

    React.useEffect(() => {
        hasAutoOpenedReceiveRef.current = false;
    }, [poId]);

    // Handle auto-opening receive modal if opened directly from receive action button
    React.useEffect(() => {
        if (
            open &&
            initialOpenReceive &&
            (selectedPODetails?.status === 'SENT' || selectedPODetails?.status === 'PARTIALLY_RECEIVED') &&
            !hasAutoOpenedReceiveRef.current
        ) {
            hasAutoOpenedReceiveRef.current = true;
            setIsReceiveDialogOpen(true);
        }
    }, [open, initialOpenReceive, selectedPODetails]);

    // Populate initial receive form state whenever receive dialog opens
    React.useEffect(() => {
        if (isReceiveDialogOpen && selectedPODetails) {
            const nextDeliveryNum = (selectedPODetails.batches?.length || 0) + 1;
            setDeliveryRef(`${selectedPODetails.poNumber}-D${nextDeliveryNum}`);
            setCloseOrder(false);
            setBonusItems([]);

            const initialItems: IOrderedReceiveItem[] = (selectedPODetails.items || []).map((item) => {
                const already = receivedMap[item.ingredientId] || 0;
                const remaining = Math.max(0, item.quantity - already);
                return {
                    ingredientId: item.ingredientId,
                    ingredientName: item.ingredient.name,
                    unit: item.ingredient.defaultUnit?.abbreviation || '',
                    orderedQty: item.quantity,
                    alreadyReceivedQty: already,
                    remainingQty: remaining,
                    quantityReceiving: remaining > 0 ? remaining : 0,
                    unitCost: item.unitCost || 0,
                    batchNumber: '',
                    expiryDate: ''
                };
            });
            setOrderedItems(initialItems);
        }
    }, [isReceiveDialogOpen, selectedPODetails, receivedMap]);

    // Mutation: Update PO Status & Record Received Batches
    const updateStatusMutation = useMutation({
        mutationFn: ({
            id,
            data
        }: {
            id: string;
            data: IUpdatePurchaseOrderStatusPayload | 'DRAFT' | 'FINAL_DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED';
        }) => updatePurchaseOrderStatus(id, data),
        onSuccess: (updatedPO) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PURCHASE_ORDERS.PURCHASE_ORDERS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.LEVELS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.DELIVERIES_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PURCHASE_ORDERS.PURCHASE_ORDER_DETAILS, updatedPO.id] });
            toast.success(
                updatedPO.status === 'RECEIVED'
                    ? 'Purchase order delivery received and completed!'
                    : updatedPO.status === 'FINAL_DRAFT'
                      ? 'Purchase order marked as final draft.'
                      : updatedPO.status === 'SENT'
                        ? 'Purchase order marked as sent to supplier.'
                        : updatedPO.status === 'DRAFT'
                          ? 'Purchase order reverted to draft.'
                          : 'Delivery batch recorded! Order marked as partially received.'
            );
            setIsReceiveDialogOpen(false);
        },
        onError: (err) => {
            toast.error('Failed to update purchase order', {
                description: getErrorMessage(err)
            });
        }
    });

    // Form handlers for ordered items
    const handleUpdateOrderedItem = (index: number, field: keyof IOrderedReceiveItem, value: any) => {
        setOrderedItems((prev) =>
            prev.map((item, idx) => {
                if (idx !== index) return item;
                return { ...item, [field]: value };
            })
        );
    };

    const handleFillAllRemaining = () => {
        setOrderedItems((prev) =>
            prev.map((item) => ({
                ...item,
                quantityReceiving: item.remainingQty > 0 ? item.remainingQty : 0
            }))
        );
    };

    const handleClearAllReceiving = () => {
        setOrderedItems((prev) =>
            prev.map((item) => ({
                ...item,
                quantityReceiving: 0
            }))
        );
    };

    // Form handlers for bonus items
    const handleAddBonusItem = () => {
        setBonusItems((prev) => [
            ...prev,
            {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                ingredientId: '',
                ingredientName: '',
                unit: '',
                quantityReceiving: 1,
                unitCost: 0,
                batchNumber: '',
                expiryDate: ''
            }
        ]);
    };

    const handleRemoveBonusItem = (id: string) => {
        setBonusItems((prev) => prev.filter((item) => item.id !== id));
    };

    const handleUpdateBonusItem = (id: string, field: keyof IBonusReceiveItem, value: any) => {
        setBonusItems((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                return { ...item, [field]: value };
            })
        );
    };

    // Confirm & Submit Delivery
    const handleConfirmReceive = () => {
        if (!selectedPODetails) return;

        const totalReceiving =
            orderedItems.reduce((acc, i) => acc + (Number(i.quantityReceiving) || 0), 0) +
            bonusItems.reduce((acc, b) => acc + (Number(b.quantityReceiving) || 0), 0);

        if (totalReceiving <= 0) {
            toast.error('Please specify a received quantity greater than 0 for at least one item');
            return;
        }

        // Validate ordered items
        for (const item of orderedItems) {
            const qty = Number(item.quantityReceiving);
            const cost = Number(item.unitCost);
            if (isNaN(qty) || qty < 0) {
                toast.error(`Please enter a valid, non-negative quantity for ${item.ingredientName}`);
                return;
            }
            if (isNaN(cost) || cost < 0) {
                toast.error(`Please enter a valid, non-negative unit cost for ${item.ingredientName}`);
                return;
            }
        }

        // Validate bonus items
        for (const bonus of bonusItems) {
            const qty = Number(bonus.quantityReceiving);
            const cost = Number(bonus.unitCost);
            if (qty > 0 && !bonus.ingredientId) {
                toast.error('Please select an ingredient for all bonus items');
                return;
            }
            if (isNaN(qty) || qty < 0) {
                toast.error('Please enter a valid, non-negative quantity for all bonus items');
                return;
            }
            if (isNaN(cost) || cost < 0) {
                toast.error('Bonus item unit cost must be a valid, non-negative number');
                return;
            }
        }

        const itemsPayload = [
            ...orderedItems
                .filter((i) => Number(i.quantityReceiving) > 0)
                .map((i) => ({
                    ingredientId: i.ingredientId,
                    quantityReceived: Number(i.quantityReceiving),
                    unitCost: Number(i.unitCost),
                    batchNumber: i.batchNumber.trim() || deliveryRef.trim() || undefined,
                    expiryDate: i.expiryDate ? new Date(i.expiryDate).toISOString() : undefined
                })),
            ...bonusItems
                .filter((b) => Number(b.quantityReceiving) > 0 && b.ingredientId)
                .map((b) => ({
                    ingredientId: b.ingredientId,
                    quantityReceived: Number(b.quantityReceiving),
                    unitCost: Number(b.unitCost || 0),
                    batchNumber: b.batchNumber.trim() || deliveryRef.trim() || undefined,
                    expiryDate: b.expiryDate ? new Date(b.expiryDate).toISOString() : undefined
                }))
        ];

        updateStatusMutation.mutate({
            id: selectedPODetails.id,
            data: {
                status: 'RECEIVED',
                closeOrder,
                deliveryBatchNumber: deliveryRef.trim() || undefined,
                items: itemsPayload
            }
        });
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-4xl w-full rounded-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="font-bold text-foreground flex items-center gap-2">
                            <FileText className="size-5 text-primary" />
                            Purchase Order Details
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Review procurement items list, delivery history, and coordinate order status.
                        </DialogDescription>
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
                                        className={`text-xs font-bold py-0.5 px-2 ${getStatusBadgeClass(selectedPODetails.status)}`}
                                    >
                                        {selectedPODetails.status === 'FINAL_DRAFT'
                                            ? 'Final Draft'
                                            : selectedPODetails.status === 'PARTIALLY_RECEIVED'
                                              ? 'Partially Received'
                                              : selectedPODetails.status.toLowerCase()}
                                    </Badge>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-xs uppercase font-bold text-muted-foreground">Supplier</span>
                                    <p className="text-xs font-bold text-foreground">{selectedPODetails.supplier.name}</p>
                                </div>
                                <div className="space-y-0.5 flex flex-col items-end">
                                    <span className="text-xs uppercase font-bold text-muted-foreground">Total Amount</span>
                                    {selectedPODetails.status === 'RECEIVED' || selectedPODetails.status === 'PARTIALLY_RECEIVED' ? (
                                        <div className="flex flex-col items-end">
                                            <p className="text-sm font-bold text-foreground font-mono">
                                                ₱{selectedPODetails.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </p>
                                            {selectedPODetails.status === 'PARTIALLY_RECEIVED' && (
                                                <span className="text-xs text-muted-foreground font-medium">Billed so far</span>
                                            )}
                                        </div>
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
                                        <span className="text-muted-foreground font-medium">Date Completed</span>
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

                            {/* Procurement Line Items */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs uppercase font-bold text-muted-foreground">Procurement Line Items</span>
                                    {selectedPODetails.status === 'PARTIALLY_RECEIVED' && (
                                        <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                                            Partially fulfilled across delivery receipts
                                        </span>
                                    )}
                                </div>
                                <div className="border border-border/40 rounded-2xl overflow-x-auto">
                                    <table className="w-full min-w-[620px] text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-muted/40 border-b border-border/40 font-bold text-muted-foreground">
                                                <th className="p-3">Ingredient</th>
                                                <th className="p-3 text-right">Ordered</th>
                                                <th className="p-3 text-right">Received</th>
                                                <th className="p-3 text-right">Remaining</th>
                                                <th className="p-3 text-right">Unit Cost</th>
                                                <th className="p-3 text-right">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedPODetails.items?.map((item: IPurchaseOrderItem) => {
                                                const abbrev = item.ingredient.defaultUnit?.abbreviation || '';
                                                const received = receivedMap[item.ingredientId] || 0;
                                                const remaining = Math.max(0, item.quantity - received);
                                                const isFullyReceived = received >= item.quantity;
                                                const isPendingPrice =
                                                    (selectedPODetails.status === 'DRAFT' || selectedPODetails.status === 'SENT') &&
                                                    received === 0 &&
                                                    item.unitCost === 0;

                                                return (
                                                    <tr
                                                        key={item.id}
                                                        className="border-b border-border/30 last:border-0 hover:bg-muted/10 font-medium"
                                                    >
                                                        <td className="p-3">
                                                            <div className="font-bold text-foreground">{item.ingredient.name}</div>
                                                            {item.unitCost === 0 && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-xs py-0 px-1.5 mt-0.5 border-emerald-500/30 text-emerald-600 bg-emerald-500/10 font-semibold"
                                                                >
                                                                    Free / Bonus Item
                                                                </Badge>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-right font-mono font-bold text-foreground">
                                                            {item.quantity} {abbrev}
                                                        </td>
                                                        <td className="p-3 text-right font-mono font-bold">
                                                            <span
                                                                className={
                                                                    received > 0
                                                                        ? isFullyReceived
                                                                            ? 'text-emerald-600 dark:text-emerald-400'
                                                                            : 'text-amber-600 dark:text-amber-400'
                                                                        : 'text-muted-foreground'
                                                                }
                                                            >
                                                                {received} {abbrev}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-right font-mono font-bold">
                                                            {isFullyReceived ? (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-xs py-0 px-1.5 border-emerald-500/30 text-emerald-600 bg-emerald-500/10 gap-1 font-semibold"
                                                                >
                                                                    <Check className="size-3" /> Fulfilled
                                                                </Badge>
                                                            ) : remaining > 0 ? (
                                                                <span className="text-foreground">
                                                                    {remaining} {abbrev}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground">—</span>
                                                            )}
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

                            {/* Delivery Receipts & Goods Received History */}
                            {selectedPODetails.batches && selectedPODetails.batches.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-border/30">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                                            <History className="size-3.5 text-primary" />
                                            Delivery Receipts & Batches History ({selectedPODetails.batches.length})
                                        </span>
                                    </div>
                                    <div className="border border-border/40 rounded-2xl overflow-x-auto">
                                        <table className="w-full min-w-[760px] text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-muted/40 border-b border-border/40 font-bold text-muted-foreground">
                                                    <th className="p-3">Date Received</th>
                                                    <th className="p-3">Ref / Batch #</th>
                                                    <th className="p-3">Ingredient</th>
                                                    <th className="p-3 text-right">Qty Received</th>
                                                    <th className="p-3 text-right">Unit Cost</th>
                                                    <th className="p-3 text-right">Total</th>
                                                    <th className="p-3">Expiry</th>
                                                    <th className="p-3">Received By</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedPODetails.batches.map((batch: IPurchaseOrderBatch) => {
                                                    const abbrev = batch.ingredient?.defaultUnit?.abbreviation || '';
                                                    return (
                                                        <tr
                                                            key={batch.id}
                                                            className="border-b border-border/30 last:border-0 hover:bg-muted/10 font-medium"
                                                        >
                                                            <td className="p-3 text-muted-foreground whitespace-nowrap">
                                                                {format(new Date(batch.receivedAt), 'MMM dd, yyyy hh:mm a')}
                                                            </td>
                                                            <td className="p-3 font-mono font-bold text-foreground whitespace-nowrap">
                                                                {batch.batchNumber || '—'}
                                                            </td>
                                                            <td className="p-3 font-bold text-foreground">{batch.ingredient?.name || '—'}</td>
                                                            <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                                                +{batch.quantityReceived} {abbrev}
                                                            </td>
                                                            <td className="p-3 text-right font-mono text-muted-foreground whitespace-nowrap">
                                                                ₱{batch.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </td>
                                                            <td className="p-3 text-right font-mono font-bold text-foreground whitespace-nowrap">
                                                                ₱{batch.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </td>
                                                            <td className="p-3 text-muted-foreground whitespace-nowrap">
                                                                {batch.expiryDate ? format(new Date(batch.expiryDate), 'MMM dd, yyyy') : '—'}
                                                            </td>
                                                            <td className="p-3 text-muted-foreground whitespace-nowrap">
                                                                {batch.createdBy ? `${batch.createdBy.firstName} ${batch.createdBy.lastName}` : '—'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}

                    {selectedPODetails && (
                        <DialogFooter className="shrink-0 pt-4 border-t border-border/40 flex flex-wrap gap-2 justify-between items-center">
                            {/* Actions to transition status or trigger receive delivery */}
                            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                                {selectedPODetails.status === 'DRAFT' && (
                                    <RequirePermission module="Purchase Orders Management" action="update">
                                        <Button
                                            size="sm"
                                            onClick={() => updateStatusMutation.mutate({ id: selectedPODetails.id, data: 'FINAL_DRAFT' })}
                                            disabled={updateStatusMutation.isPending}
                                            className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-sm"
                                        >
                                            <FileCheck className="size-3.5" />
                                            Mark as Final Draft
                                        </Button>
                                    </RequirePermission>
                                )}

                                {selectedPODetails.status === 'FINAL_DRAFT' && (
                                    <RequirePermission module="Purchase Orders Management" action="update">
                                        <Button
                                            size="sm"
                                            onClick={() => updateStatusMutation.mutate({ id: selectedPODetails.id, data: 'SENT' })}
                                            disabled={updateStatusMutation.isPending}
                                            className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 shadow-sm"
                                        >
                                            <Send className="size-3.5" />
                                            Mark as Sent
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => updateStatusMutation.mutate({ id: selectedPODetails.id, data: 'DRAFT' })}
                                            disabled={updateStatusMutation.isPending}
                                            className="h-9 text-xs font-bold gap-1.5"
                                        >
                                            <RotateCcw className="size-3.5" />
                                            Revert to Draft
                                        </Button>
                                    </RequirePermission>
                                )}

                                {(selectedPODetails.status === 'SENT' || selectedPODetails.status === 'PARTIALLY_RECEIVED') && (
                                    <RequirePermission module="Purchase Orders Management" action="update">
                                        <Button
                                            size="sm"
                                            onClick={() => setIsReceiveDialogOpen(true)}
                                            disabled={updateStatusMutation.isPending}
                                            className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm"
                                        >
                                            <Truck className="size-3.5" />
                                            {selectedPODetails.status === 'PARTIALLY_RECEIVED' ? 'Receive Next Delivery' : 'Receive Delivery'}
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

            {/* Receive Delivery / Shipment Dialog */}
            <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
                <DialogContent className="sm:max-w-4xl w-full rounded-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="font-bold text-foreground flex items-center gap-2">
                            <Truck className="size-5 text-emerald-600" />
                            Receive Shipment & Record Delivery
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Record incoming stock shipment for <strong className="font-mono text-foreground">{selectedPODetails?.poNumber}</strong>.
                            Handles partial quantities, supplier bonus items, and inventory lots.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 my-2 min-h-0">
                        {/* Notice Banner */}
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                <AlertCircle className="size-3.5" /> Multi-Delivery & Goods Receipt
                            </span>
                            <p className="text-xs text-emerald-700 dark:text-emerald-400">
                                Enter the quantities received in this shipment. If not all items arrived, the order will remain open for future
                                deliveries unless you choose to close it below.
                            </p>
                        </div>

                        {/* Delivery Reference / Invoice # */}
                        <div className="p-3 border border-border/40 rounded-xl bg-muted/20 space-y-2">
                            <div className="space-y-0.5">
                                <label className="text-xs uppercase font-bold text-foreground">Delivery Receipt / Invoice # (Optional)</label>
                                <p className="text-xs text-muted-foreground">
                                    Supplier waybill number, invoice number, or delivery receipt identifier.
                                </p>
                            </div>
                            <Input
                                type="text"
                                placeholder={`e.g. ${selectedPODetails?.poNumber}-D${(selectedPODetails?.batches?.length || 0) + 1} or DR-8890`}
                                value={deliveryRef}
                                onChange={(e) => setDeliveryRef(e.target.value)}
                                className="h-8 text-xs font-mono bg-background"
                            />
                        </div>

                        {/* Ordered Items Fulfillment List */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs uppercase font-bold text-foreground">Ordered Line Items ({orderedItems.length})</span>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleFillAllRemaining}
                                        className="h-7 text-xs px-2 font-semibold"
                                    >
                                        Fill Remaining Balances
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleClearAllReceiving}
                                        className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground font-semibold"
                                    >
                                        Clear (0)
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                {orderedItems.map((item, index) => {
                                    return (
                                        <div
                                            key={item.ingredientId}
                                            className="p-3 border border-border/40 rounded-xl bg-background/50 hover:border-border transition-colors space-y-2.5"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-xs text-foreground">{item.ingredientName}</span>
                                                    <Badge variant="outline" className="text-xs py-0 px-1.5 font-normal text-muted-foreground">
                                                        Ordered: {item.orderedQty} {item.unit}
                                                    </Badge>
                                                    {item.alreadyReceivedQty > 0 && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs py-0 px-1.5 font-normal text-amber-600 bg-amber-500/10 border-amber-500/20"
                                                        >
                                                            Received: {item.alreadyReceivedQty} {item.unit}
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">
                                                        Remaining:{' '}
                                                        <strong className="text-foreground">
                                                            {item.remainingQty} {item.unit}
                                                        </strong>
                                                    </span>
                                                    {item.remainingQty > 0 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleUpdateOrderedItem(index, 'quantityReceiving', item.remainingQty)}
                                                            className="h-6 text-xs px-1.5 text-primary hover:text-primary/90 font-semibold"
                                                        >
                                                            Fill {item.remainingQty}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 border-t border-border/30">
                                                <div className="space-y-1">
                                                    <span className="text-xs font-semibold text-muted-foreground block">
                                                        Qty Receiving Now {item.unit && `(${item.unit})`} *
                                                    </span>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        value={item.quantityReceiving}
                                                        onChange={(e) =>
                                                            handleUpdateOrderedItem(
                                                                index,
                                                                'quantityReceiving',
                                                                e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                                                            )
                                                        }
                                                        className="h-8 text-xs font-mono font-bold"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <span className="text-xs font-semibold text-muted-foreground block">Unit Cost (₱)</span>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        value={item.unitCost}
                                                        onChange={(e) =>
                                                            handleUpdateOrderedItem(
                                                                index,
                                                                'unitCost',
                                                                e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                                                            )
                                                        }
                                                        className="h-8 text-xs font-mono font-bold"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <span className="text-xs font-semibold text-muted-foreground block">Lot / Batch #</span>
                                                    <Input
                                                        type="text"
                                                        placeholder="Optional batch #"
                                                        value={item.batchNumber}
                                                        onChange={(e) => handleUpdateOrderedItem(index, 'batchNumber', e.target.value)}
                                                        className="h-8 text-xs font-mono"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <span className="text-xs font-semibold text-muted-foreground block">Expiry Date</span>
                                                    <ExpiryDatePicker
                                                        value={item.expiryDate}
                                                        onChange={(val) => handleUpdateOrderedItem(index, 'expiryDate', val)}
                                                        placeholder="Pick date"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Free / Bonus Items Section */}
                        <div className="space-y-2 pt-2 border-t border-border/30">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-xs uppercase font-bold text-foreground block">Free / Bonus Items (Optional)</span>
                                    <p className="text-xs text-muted-foreground">
                                        Did the supplier include complimentary samples or bonus items in this shipment?
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddBonusItem}
                                    className="h-8 text-xs gap-1 font-semibold"
                                >
                                    <Plus className="size-3.5" /> Add Bonus Item
                                </Button>
                            </div>

                            {bonusItems.length > 0 && (
                                <div className="space-y-2.5">
                                    {bonusItems.map((bonus) => {
                                        return (
                                            <div key={bonus.id} className="p-3 border border-emerald-500/30 rounded-xl bg-emerald-500/5 space-y-2.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex-1">
                                                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                                                            Select Complimentary Ingredient
                                                        </span>
                                                        <InfiniteSelect<IIngredient>
                                                            queryKey={[QUERY_KEY.PURCHASE_ORDERS.ACTIVE_INGREDIENTS_LIST, 'bonus-select', bonus.id]}
                                                            fetchFn={async ({ pageParam, query }) => {
                                                                return getIngredients({
                                                                    page: pageParam || 1,
                                                                    limit: 20,
                                                                    search: query,
                                                                    status: 'active'
                                                                });
                                                            }}
                                                            getItems={(pageItem) => pageItem.data}
                                                            getNextPageParam={(lastPage) => {
                                                                return lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined;
                                                            }}
                                                            value={bonus.ingredientId}
                                                            onChange={(val, item) => {
                                                                setBonusItems((prev) =>
                                                                    prev.map((b) =>
                                                                        b.id === bonus.id
                                                                            ? {
                                                                                  ...b,
                                                                                  ingredientId: val || '',
                                                                                  ingredientName: item?.name || '',
                                                                                  unit: item?.defaultUnit?.abbreviation || '',
                                                                                  ingredient: item
                                                                              }
                                                                            : b
                                                                    )
                                                                );
                                                            }}
                                                            getOptionValue={(i) => i.id}
                                                            getOptionLabel={(i) => `${i.name}`}
                                                            selectedItem={bonus.ingredient}
                                                            placeholder="Search & select ingredient..."
                                                            searchPlaceholder="Type ingredient name..."
                                                            className="h-8 text-xs bg-background"
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveBonusItem(bonus.id)}
                                                        className="size-8 text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-4"
                                                    >
                                                        <Trash2 className="size-4" />
                                                        <span className="sr-only">Remove Bonus Item</span>
                                                    </Button>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 border-t border-emerald-500/20">
                                                    <div className="space-y-1">
                                                        <span className="text-xs font-semibold text-muted-foreground block">
                                                            Qty Received {bonus.unit && `(${bonus.unit})`} *
                                                        </span>
                                                        <Input
                                                            type="number"
                                                            min="0.01"
                                                            step="any"
                                                            value={bonus.quantityReceiving}
                                                            onChange={(e) =>
                                                                handleUpdateBonusItem(
                                                                    bonus.id,
                                                                    'quantityReceiving',
                                                                    e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                                                                )
                                                            }
                                                            className="h-8 text-xs font-mono font-bold"
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <span className="text-xs font-semibold text-muted-foreground block">Unit Cost (₱)</span>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="any"
                                                            value={bonus.unitCost}
                                                            onChange={(e) =>
                                                                handleUpdateBonusItem(
                                                                    bonus.id,
                                                                    'unitCost',
                                                                    e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                                                                )
                                                            }
                                                            className="h-8 text-xs font-mono font-bold"
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <span className="text-xs font-semibold text-muted-foreground block">Lot / Batch #</span>
                                                        <Input
                                                            type="text"
                                                            placeholder="Optional batch #"
                                                            value={bonus.batchNumber}
                                                            onChange={(e) => handleUpdateBonusItem(bonus.id, 'batchNumber', e.target.value)}
                                                            className="h-8 text-xs font-mono"
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <span className="text-xs font-semibold text-muted-foreground block">Expiry Date</span>
                                                        <ExpiryDatePicker
                                                            value={bonus.expiryDate}
                                                            onChange={(val) => handleUpdateBonusItem(bonus.id, 'expiryDate', val)}
                                                            placeholder="Pick date"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Order Completion & Close Option */}
                        <div className="p-3.5 border border-border/40 rounded-xl bg-muted/20 space-y-1">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="close-order"
                                    checked={closeOrder}
                                    onCheckedChange={(checked) => setCloseOrder(Boolean(checked))}
                                    className="size-4"
                                />
                                <label htmlFor="close-order" className="text-xs font-bold text-foreground cursor-pointer select-none">
                                    Mark purchase order as completed (Do not expect remaining balance)
                                </label>
                            </div>
                            <p className="text-xs text-muted-foreground pl-6">
                                Check this if the supplier will not deliver the remaining balance, or if this shipment finalizes the entire order.
                                Leaving this unchecked keeps the PO open for future delivery receipts.
                            </p>
                        </div>
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
                            {updateStatusMutation.isPending ? 'Recording Delivery...' : 'Confirm & Record Delivery'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
